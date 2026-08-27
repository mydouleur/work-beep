// 组装可独立调试的主程序包：dist-host/ = release exe + 空 plugins/ 目录。
// 前置：已跑过 pnpm tauri build（--no-bundle）。产物不进版本库。
// 用途：插件作者把这个文件夹拷走（或直接用 sdk/example/host-app、
// work-beep-plugin-blender/host-app 里的副本），把插件产物放进 plugins/<id>/ 即可调试。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const exe = path.resolve(here, "../src-tauri/target/release/miemiebeep.exe");
const dst = path.resolve(here, "../dist-host");

if (!fs.existsSync(exe)) {
    console.error("找不到 release exe：请先运行 pnpm tauri build --no-bundle");
    process.exit(1);
}

fs.mkdirSync(path.join(dst, "plugins"), { recursive: true });
fs.copyFileSync(exe, path.join(dst, "beep-host.exe"));
console.log("已组装到", dst);
console.log("调试用法：把插件构建产物放进 dist-host/plugins/<插件id>/，双击 beep-host.exe");
