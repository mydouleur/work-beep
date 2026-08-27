// agent 循环：OpenAI 兼容接口流式 + 工具调用循环。
// 从 ChatView 抽出（原 send()）：UI 状态走 chat store，API 历史自持，
// 工具列表每轮现取注册表（内置工具 ∪ 活跃插件注入工具），派发前做 schema 校验。
import { reactive } from "vue";
import OpenAI from "openai";
import { useChatStore } from "../stores/chat";
import type { ChatMessage } from "../stores/chat";
import { execute, getOpenAITools } from "../tools/registry";

// OpenAI 兼容接口，配置见 .env.example
// VITE_LLM_API_URL 填服务商文档给的完整 baseURL（一般已含 /v1），代码原样透传
const API_URL = import.meta.env.VITE_LLM_API_URL as string | undefined;
const API_KEY = import.meta.env.VITE_LLM_API_KEY as string | undefined;
const MODEL = (import.meta.env.VITE_LLM_MODEL as string | undefined) ?? "gpt-4o-mini";

// 桌面应用 key 本来就在前端，本地服务也不校验 key
// timeout 30s（SDK 默认 10 分钟太久）、maxRetries 1（默认 2，失败时静默重试拖很久）
const client = new OpenAI({
    baseURL: API_URL ?? "",
    apiKey: API_KEY || "local",
    dangerouslyAllowBrowser: true,
    timeout: 30_000,
    maxRetries: 1,
});

// 系统提示：助手人设 + 工具纪律 + 排版要求，不进 UI 消息列表
const SYSTEM_PROMPT = [
    "你是 blenderBeeper 的助手。用户用自然语言描述需求，你通过调用提供的工具来完成：",
    "文件工具（read/write/edit/ls/grep）操作当前工作区，带命名空间前缀的工具操作已激活的外部应用。",
    "操作完成后用简短中文说明结果。",
    "回答一律使用 Markdown 排版，数学公式用 LaTeX（行内 $...$，独立公式 $$...$$），",
    "直接输出 Markdown 正文，不要用代码块包裹整篇回答。",
].join("");

// API 侧会话历史（含 system / assistant 的 tool_calls / 工具结果），与 UI 消息分开维护
const apiHistory: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
];

const MAX_TOOL_ROUNDS = 3;

// 当前请求的取消控制器，停止按钮（■）触发
let abortCtrl: AbortController | null = null;

export function stop() {
    abortCtrl?.abort();
}

export async function send() {
    const chat = useChatStore();
    const text = chat.input.trim();
    if (!text || chat.sending) return;

    // env 在 dev server 启动时注入：启动后才创建/修改 .env 需要重启才能读到
    if (!API_URL) {
        chat.messages.push({
            role: "assistant",
            content: "未读到 VITE_LLM_API_URL：请确认 .env 存在于项目根目录，并重启 pnpm tauri dev（.env 只在启动时加载）",
        });
        return;
    }

    chat.messages.push({ role: "user", content: text });
    apiHistory.push({ role: "user", content: text });
    chat.input = "";
    chat.sending = true;
    abortCtrl = new AbortController();

    // 先放一条空的助手消息，流式逐段往里追加（跨工具轮次共用同一条）
    // 注意必须是 reactive：普通对象 push 进数组后，改原始引用不会触发 Vue 更新，
    // 就会出现"流式期间界面不动、结束时一次性闪出来"
    const reply = reactive<ChatMessage>({ role: "assistant", content: "", think: "" });
    chat.messages.push(reply);

    try {
        // 工具调用循环：模型返回 tool_calls 就执行工具、把结果回灌进历史，再开下一轮
        for (let round = 0; ; round++) {
            // chat_template_kwargs 不在 SDK 类型里，先用变量装（避开字面量超额属性检查）再传入
            const body = {
                model: MODEL,
                messages: apiHistory,
                stream: true as const,
                tools: getOpenAITools(),
                chat_template_kwargs: { enable_thinking: chat.thinking === "on" },
            };
            const stream = await client.chat.completions.create(
                body,
                { signal: abortCtrl.signal },
            );

            // 流式 tool_calls 按 index 分片累积
            const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;
                const reasoning = (delta as { reasoning_content?: string }).reasoning_content;
                if (reasoning) reply.think = (reply.think ?? "") + reasoning;
                if (delta.content) reply.content += delta.content;
                for (const tc of delta.tool_calls ?? []) {
                    const idx = tc.index ?? 0;
                    if (!toolCalls.has(idx)) {
                        toolCalls.set(idx, { id: "", name: "", arguments: "" });
                    }
                    const acc = toolCalls.get(idx)!;
                    if (tc.id) acc.id += tc.id;
                    if (tc.function?.name) acc.name += tc.function.name;
                    if (tc.function?.arguments) acc.arguments += tc.function.arguments;
                }
            }

            // 无工具调用：本轮即最终回复，收尾
            if (toolCalls.size === 0) {
                apiHistory.push({ role: "assistant", content: reply.content });
                return;
            }

            // 有工具调用：记入 API 历史，逐个执行并回灌结果
            const calls = [...toolCalls.values()];
            apiHistory.push({
                role: "assistant",
                content: reply.content || null,
                tool_calls: calls.map((t) => ({
                    id: t.id,
                    type: "function" as const,
                    function: { name: t.name, arguments: t.arguments },
                })),
            });
            for (const call of calls) {
                chat.messages.push({ role: "tool", content: `调用工具 ${call.name}` });
                const result = await execute(call.name, call.arguments);
                apiHistory.push({ role: "tool", tool_call_id: call.id, content: result });
            }
            if (round + 1 >= MAX_TOOL_ROUNDS) throw new Error("工具调用轮次超限");
        }
    } catch (err) {
        if (abortCtrl.signal.aborted) {
            // 手动停止：保留已生成的部分内容
            if (!reply.content && !reply.think) reply.content = "已停止生成";
        } else {
            console.error("请求出错", err);
            reply.content += `请求失败：${err instanceof Error ? err.message : String(err)}`;
        }
    } finally {
        chat.sending = false;
        abortCtrl = null;
    }
}
