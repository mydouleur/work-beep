// 工具注册表：内置工具（无命名空间）+ 插件注入工具（强制 "插件id." 前缀）。
// 供 agent 循环拼 tools schema、校验参数、派发执行。
// 设计原则：schema 要短（token 大头），校验失败作为 tool 错误喂回模型。
import type OpenAI from "openai";
import type { PluginTool } from "@beep/sdk";

// Host 内部工具形状：与 SDK 的 PluginTool 同构，但 run 已绑定好 ctx（内置工具不需要 ctx）
export interface ToolDef extends Omit<PluginTool, "run"> {
    run: (args: Record<string, unknown>) => Promise<string>;
}

interface Entry {
    def: ToolDef;
    // null = 内置；否则为插件 id（用于随插件卸载移除）
    plugin: string | null;
}

const table = new Map<string, Entry>();

export function registerBuiltinTools(defs: ToolDef[]) {
    for (const def of defs) {
        if (def.name.includes(".")) throw new Error(`内置工具名不允许带命名空间: ${def.name}`);
        table.set(def.name, { def, plugin: null });
    }
}

export function registerPluginTools(pluginId: string, defs: ToolDef[]) {
    for (const def of defs) {
        if (!def.name.startsWith(pluginId + ".")) {
            throw new Error(`插件工具必须以 "${pluginId}." 为前缀: ${def.name}`);
        }
        if (table.has(def.name)) throw new Error(`工具名冲突: ${def.name}`);
        table.set(def.name, { def, plugin: pluginId });
    }
}

export function unregisterPlugin(pluginId: string) {
    for (const [name, entry] of table) {
        if (entry.plugin === pluginId) table.delete(name);
    }
}

export function getOpenAITools(): OpenAI.ChatCompletionTool[] {
    return [...table.values()].map(({ def }) => ({
        type: "function",
        function: {
            name: def.name,
            description: def.description,
            parameters: def.parameters,
        },
    }));
}

// 手写 JSON-Schema 子集校验：required 缺漏 + properties 基本类型。
// 校验失败返回错误文案（喂回模型自愈），通过返回 null。
function validate(def: ToolDef, args: Record<string, unknown>): string | null {
    const { properties = {}, required = [] } = def.parameters;
    for (const key of required) {
        if (!(key in args)) return `缺少必需参数: ${key}`;
    }
    for (const [key, value] of Object.entries(args)) {
        const spec = properties[key];
        if (!spec?.type) continue;
        const ok =
            (spec.type === "string" && typeof value === "string") ||
            (spec.type === "number" && typeof value === "number") ||
            (spec.type === "boolean" && typeof value === "boolean") ||
            (spec.type === "array" && Array.isArray(value)) ||
            (spec.type === "object" && typeof value === "object" && value !== null && !Array.isArray(value));
        if (!ok) return `参数 ${key} 类型应为 ${spec.type}，实际为 ${JSON.stringify(value)}`;
    }
    return null;
}

// 派发执行：JSON 解析失败、schema 校验失败、run 抛错都返回错误文案（进 tool 消息回灌模型）
export async function execute(name: string, argsJson: string): Promise<string> {
    const entry = table.get(name);
    if (!entry) return `未知工具: ${name}`;

    let args: Record<string, unknown>;
    try {
        args = argsJson.trim() ? JSON.parse(argsJson) : {};
    } catch {
        return `参数不是合法 JSON: ${argsJson}`;
    }
    const invalid = validate(entry.def, args);
    if (invalid) return `参数校验失败: ${invalid}`;

    try {
        return await entry.def.run(args);
    } catch (e) {
        return `工具执行失败: ${e instanceof Error ? e.message : String(e)}`;
    }
}
