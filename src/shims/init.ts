// 共享依赖挂全局：运行时插件的 import { ... } from "vue" / "@beep/sdk"
// 在构建期被改写成从这两个全局命名空间解构（见 @beep/plugin-kit），
// 从而与 Host 共用同一份 vue/sdk 实例（CTX_KEY 必须是同一个 Symbol）。
// 命名空间整体挂上全局后，打包器会保留全部导出（外部消费者：运行时插件）。
import * as vue from "vue";
import * as sdk from "@beep/sdk";

(globalThis as Record<string, unknown>).__beepShimVue = vue;
(globalThis as Record<string, unknown>).__beepShimSdk = sdk;
