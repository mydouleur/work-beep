<script setup lang="ts">
import { ref } from "vue";
import TitleBar from "../components/TitleBar.vue";
import ChatView from "./ChatView.vue";
import PluginHost from "../components/PluginHost.vue";

// 左栏宽度百分比，默认 1:3（左 25%），可拖动分隔条调整
const leftPercent = ref(25);
// 左栏最小像素 = ChatView 输入区最小宽度（输入框 120 + 中号按钮约 68 + 内边距 24 + 间距 8）
const MIN_PX = 300;
const MAX_PERCENT = 60;

const bodyRef = ref<HTMLElement | null>(null);

function onDividerPointerDown(event: PointerEvent) {
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    const onMove = (e: PointerEvent) => {
        const rect = bodyRef.value?.getBoundingClientRect();
        if (!rect) return;
        const minPercent = (MIN_PX / rect.width) * 100;
        const percent = ((e.clientX - rect.left) / rect.width) * 100;
        leftPercent.value = Math.min(MAX_PERCENT, Math.max(minPercent, percent));
    };
    const onUp = () => {
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
    };
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
}
</script>

<template>
    <div class="home">
        <TitleBar/>
        <main ref="bodyRef" class="body">
            <section class="pane left" :style="{ width: leftPercent + '%' }">
                <ChatView />
            </section>
            <div
                class="divider"
                role="separator"
                aria-orientation="vertical"
                @pointerdown="onDividerPointerDown"
            />
            <section class="pane right">
                <PluginHost />
            </section>
        </main>
    </div>
</template>

<style scoped>
.home {
    display: grid;
    grid-template-rows: auto 1fr;
    height: 100vh;
}

/* 左右分栏：默认 1:3，分隔条可拖动调整比例 */
.body {
    display: flex;
    min-height: 0;
    background-color: var(--color-home-background);
}

.pane {
    min-width: 0;
    min-height: 0;
}

/* 像素级下限，与拖动约束的 MIN_PX 保持一致 */
.pane.left {
    min-width: 300px;
}

.pane.right {
    flex: 1;
}

.divider {
    width: 5px;
    cursor: col-resize;
    background: var(--color-border);
    /* 拖动时 WebView 会劫持文本选择，禁掉 */
    user-select: none;
    touch-action: none;
}

.divider:hover {
    background: var(--color-text);
}
</style>
