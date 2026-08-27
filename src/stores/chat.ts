// 对话状态：消息列表与输入/发送态。apiHistory（API 侧会话）不在此——
// 它不是 UI 状态，由 agent/loop.ts 自持。
import { defineStore } from "pinia";
import { ref } from "vue";

export interface ChatMessage {
    role: "user" | "assistant" | "tool";
    content: string;
    // 模型思考内容（推理模型走 delta.reasoning_content）
    think?: string;
    // UI 状态：true 时显示 markdown 原文而非渲染结果（仅界面用，不会发给 API）
    showRaw?: boolean;
    // 进入原文模式时记录的渲染高度（px），用于切换后保持高度不动
    rawHeight?: number;
}

export const useChatStore = defineStore("chat", () => {
    const messages = ref<ChatMessage[]>([]);
    const input = ref("");
    const sending = ref(false);
    // 思考开关：on/off，agent 循环经 chat_template_kwargs 透传
    const thinking = ref("on");
    return { messages, input, sending, thinking };
});
