<script setup lang="ts">
import { ref, onMounted } from "vue";
import SolidButton from "./base/SolidButton.vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import closeSvg from "../assets/icons/close.svg?raw";
import minimizeSvg from "../assets/icons/minimize.svg?raw";
import maximizeSvg from "../assets/icons/maximize.svg?raw";
import restoreSvg from "../assets/icons/restore.svg?raw";
const win = getCurrentWindow();
const isMaximized = ref(false);                                       // ← 加
onMounted(async () => {                                         // ← 加
    isMaximized.value = await win.isMaximized();
    win.onResized(() => win.isMaximized().then(v => isMaximized.value = v));
});
</script>
<template>
    <div class="title-bar" data-tauri-drag-region>
        <div class="windowbuttons">
            <SolidButton size="small" @click="win.minimize()">
                <span v-html="minimizeSvg" />
            </SolidButton>
            <!-- 这里的snapbtn是为了给一个win11 原生的snap-layout的拖拽区域，避免拖拽时被按钮遮挡 -->
            <SolidButton id="snap-btn" size="small" @click="win.toggleMaximize()">
                <span v-html="isMaximized ? restoreSvg : maximizeSvg" />
            </SolidButton>
            <SolidButton size="small" @click="win.close()">
                <span v-html="closeSvg" />
            </SolidButton>
        </div>
    </div>
</template>

<style scoped>
.title-bar {
    display: flex;
    border-bottom: 1px solid var(--color-neutral);
    background-color: var(--color-titlebar-background);
}

.windowbuttons {
    margin: 4px;
    margin-left: auto;
    display: flex;
    align-items: start;
    gap: 6px;
}
</style>
