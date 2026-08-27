// 运行时插件加载器：扫描插件目录（exe 旁 plugins/，dev 为仓库内 plugins/）→
// 读 plugin.json → 读 entry ESM → Blob URL 动态 import → 校验 definePlugin 返回值。
// 隔离原则：单个插件加载失败只记错误，绝不影响 Host 与其他插件。
// 共享依赖：插件 bundle 里的 vue/@beep/sdk 导入在构建期被改写成全局解构
// （globalThis.__beepShimVue/__beepShimSdk，见 @beep/sdk 的 ./kit 构建预设与 src/shims/init.ts），
// 与 Host 共用同一份实例。
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import type { PluginDef } from "@beep/sdk";

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    entry: string;
    sdkVersion?: string;
    description?: string;
}

export interface LoadedPlugin {
    manifest: PluginManifest;
    def: PluginDef;
    // 插件目录绝对路径（resolveAsset 的锚）
    dir: string;
}

// Host 内置 SDK 版本，与 manifest.sdkVersion 做主版本一致性提示（不拦截加载）
export const HOST_SDK_VERSION = "0.1.0";

export async function discoverPlugins(): Promise<LoadedPlugin[]> {
    const dir = await invoke<string>("plugins_dir");
    let entries;
    try {
        entries = await readDir(dir);
    } catch (e) {
        console.error("读取插件目录失败", e);
        return [];
    }

    const out: LoadedPlugin[] = [];
    for (const entry of entries) {
        if (!entry.isDirectory) continue;
        const pdir = `${dir}\\${entry.name}`;
        try {
            const manifest = JSON.parse(
                await readTextFile(`${pdir}\\plugin.json`),
            ) as PluginManifest;
            if (manifest.sdkVersion && manifest.sdkVersion.replace(/[^\d.]/g, "").split(".")[0] !== HOST_SDK_VERSION.split(".")[0]) {
                console.warn(`插件 ${manifest.id} 声明的 sdkVersion ${manifest.sdkVersion} 与 Host 内置 ${HOST_SDK_VERSION} 主版本不一致，尝试加载但可能不兼容`);
            }
            const code = await readTextFile(`${pdir}\\${manifest.entry || "plugin.js"}`);
            const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
            const mod = (await import(/* @vite-ignore */ url)) as { default?: PluginDef };
            const def = mod.default;
            if (!def || typeof def !== "object" || !def.id || !def.view) {
                throw new Error("默认导出不是合法的 definePlugin 返回值（缺 id 或 view）");
            }
            if (def.id !== manifest.id) {
                throw new Error(`插件 id 不一致：manifest 为 ${manifest.id}，definePlugin 为 ${def.id}`);
            }
            // 插件样式：构建抽出的 .css 逐个读入并注入页面（data-plugin 标记便于排查）
            for (const f of await readDir(pdir)) {
                if (f.isDirectory || !f.name.endsWith(".css")) continue;
                const style = document.createElement("style");
                style.dataset.plugin = manifest.id;
                style.textContent = await readTextFile(`${pdir}\\${f.name}`);
                document.head.appendChild(style);
            }
            out.push({ manifest, def, dir: pdir });
        } catch (e) {
            console.error(`插件 ${entry.name} 加载失败（已跳过）:`, e);
        }
    }
    return out;
}
