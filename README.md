# blenderBeeper Host

智能体启动器主项目：Tauri 2 + Vue 3 桌面应用。左侧 Chat 是本体（云端 LLM + 极简内置工具 +
插件注入工具），右栏运行时加载插件（Blender / 任意外部窗口……）。

- 插件 SDK 与开发指南：beep-sdk 仓库（`@beep/sdk` + `@beep/plugin-kit` + example）
- 参考插件：beep-plugin-blender
- 插件作者免构主项目：从 [Releases](../../releases) 下载 `beep-host-windows-x64.zip`，
  解压后把插件产物放进 `plugins/<插件id>/`，双击 `beep-host.exe` 即可调试。

## 开发

```bash
pnpm install
cp .env.example .env   # 填 VITE_LLM_API_URL / VITE_LLM_API_KEY / VITE_LLM_MODEL
pnpm tauri dev
```

更多约定见 [AGENTS.md](AGENTS.md)。
