# AGENTS.md — blenderBeeper Host（主项目）

## 项目概览

blenderBeeper 的**主项目（Host）**：Tauri 2 + Vue 3 桌面壳，定位智能体启动器。
左侧 Chat 是软件本体（LLM 走云端 OpenAI 兼容 API，配置在 .env），右栏是**运行时加载**的插件容器
（exe 旁 `plugins/` 目录，dev 时为仓库内 `plugins/`）。插件契约见 `@beep/sdk`（beep-sdk 仓库），
首个参考插件是 beep-plugin-blender。设计与拍板记录见 `../task.md`（tidy-up/task.md）。

- 前端：Vue 3（`<script setup>` SFC）+ Vite 8 + TypeScript（strict）+ pinia
- 桌面壳：Tauri 2（Rust 后端，`src-tauri/`），仅 Windows 有窗口嵌入实现
- 包管理：pnpm

## 目录结构

```
src/
├── main.ts             # 入口：pinia + shims/init + HomeView
├── agent/loop.ts       # LLM 工具循环（流式 + tool_calls 累积 + 轮次控制），自持 apiHistory
├── tools/
│   ├── registry.ts     # 工具注册表：内置（无前缀）+ 插件注入（强制 "插件id." 前缀），schema 校验
│   └── builtin.ts      # 内置 5 工具 read/write/edit/ls/grep，锚定工作区，源头截断
├── plugins/loader.ts   # 运行时插件加载器：扫 plugins/ → plugin.json → Blob import → 校验
├── stores/             # pinia：chat（消息/发送态）、workspace（工作区）、plugins（激活生命周期 + ctx）
├── shims/init.ts       # 把 vue/@beep/sdk 挂 globalThis.__beepShim*（运行时插件共享实例）
├── components/PluginHost.vue  # 右栏插件容器：切换下拉 + View 挂载 + provide(CTX_KEY)
├── components/TitleBar.vue    # 自定义标题栏（无边框窗口）
├── components/base/    # SolidButton / SpaceButton / CollapseBox / BaseSelect
└── views/              # HomeView（分栏壳）、ChatView（纯 UI）

src-tauri/src/
├── lib.rs              # run() + 插件/command 注册，无业务逻辑
├── procs.rs            # 通用桌面能力：proc_start（{port}/{base} 占位符）/proc_embed/proc_move/
│                       #   proc_kill/bridge_call（TCP 转发）/plugins_dir/set_workspace（fs scope）
└── bridge.rs           # TCP JSON-lines 薄客户端（每条命令一次短连接）
```

## 构建与运行

```bash
pnpm install
pnpm dev                  # Vite dev server（固定端口 1420）
pnpm build                # vue-tsc --noEmit + vite build
pnpm tauri dev            # 开发模式桌面应用
pnpm tauri build --no-bundle   # release exe（不打安装包），产物 src-tauri/target/release/
pnpm dist:host            # 组装 dist-host/（beep-host.exe + plugins/），供插件作者调试
```

验证手段：`pnpm build` + `cargo check` 绿；暂无测试框架。

## 约定

- 代码注释与文档用中文；commit message 按 Conventional Commits、中文撰写。
- 颜色不硬编码：`assets/main.css` 调色板 + `assets/tokens.css` 语义映射，组件内 `var(--color-...)`。
- 新增 Tauri API 调用必须同步 `src-tauri/capabilities/default.json` 权限（最小权限原则）。
- 插件机制改动时同步 `../task.md`（设计文档）与 sdk 仓库的 example 说明。

## 安全

- `.env`（LLM API key）不进版本库；只走环境变量。
- fs 插件 scope 只放行：用户显式选择的工作区目录 + 插件目录（运行时 `allow_directory`）。
- 内置工具无 shell；插件工具注入是模型能力面的唯一扩展通道。
- 桥转发只连 `127.0.0.1`；`plugins/`、`dist-host/`、`blender_packges` 类大体积产物不进库。
