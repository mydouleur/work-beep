import { createApp } from "vue";
import { createPinia } from "pinia";
// 共享依赖挂全局（vue/sdk 命名空间），运行时插件经全局解构与 Host 共用实例
import "./shims/init";
import Home from "./views/HomeView.vue";
import "./assets/tokens.css";
import { registerBuiltinTools } from "./tools/registry";
import { builtinTools } from "./tools/builtin";

document.documentElement.dataset.theme = 'dark'
registerBuiltinTools(builtinTools);
createApp(Home).use(createPinia()).mount("#app");
