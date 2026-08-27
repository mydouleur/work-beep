// 工作区状态：内置 5 工具的锚定目录。
// 拆分阶段的最小行为（语义细则属主项目后续设计）：
// 用户经系统对话框显式选择；Rust 侧把所选目录加进 fs 插件运行时 scope。
import { defineStore } from "pinia";
import { ref } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export const useWorkspaceStore = defineStore("workspace", () => {
    const path = ref<string | null>(null);

    async function choose() {
        const selected = await open({ directory: true, multiple: false, title: "选择工作区目录" });
        if (typeof selected !== "string") return; // 用户取消
        await invoke("set_workspace", { path: selected });
        path.value = selected;
    }

    return { path, choose };
});
