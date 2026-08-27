<script setup lang="ts">
import { computed } from 'vue';


const props = withDefaults(defineProps<{
    label?: string
    size?: 'small' | 'medium' | 'large'
}>(), {
    label: "实体按钮",
    size: "medium"
})

const sizeMap: Record<string, Record<string, string>> = {
    small: { padding: "4px 12px", fontSize: "0.75rem" },   // 12px
    medium: { padding: "8px 20px", fontSize: "0.875rem" },  // 14px
    large: { padding: "12px 28px", fontSize: "1rem" },
}
const btnStyle = computed(() => sizeMap[props.size])
</script>
<template>
    <button class="btn" :style="btnStyle">
        <slot>
            {{ label }}
        </slot>
    </button>
</template>

<style scoped>
/* 层叠方案与 SolidButton 一致：
    基础态 z-index: auto（不形成层叠上下文），::after 直接参与父容器层叠、
    盖过兄弟按钮的阴影；hover/active 时按钮整体抬到 z-index 2，避免位移时被兄弟盖住 */
.btn {
    position: relative;
    background: var(--color-space-button-background);
    background-clip: padding-box;

    color: var(--color-space-button-text);

    border: none;
    border-radius: 4px;

    outline: 2px dashed var(--color-space-outline);
    outline-offset: -2px;

    box-shadow:
        -3px 3px 0 var(--color-space-button-shadow-2),
        inset 0 0 0 1px var(--color-space-button-shadow-1);
    transition: box-shadow 0.2s, transform 0.2s, filter 0.2s;
}

.btn:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
    z-index: 2;
}

.btn:active {
    filter: brightness(0.75);
    z-index: 2;
    box-shadow:
        -3px -3px 0 var(--color-space-button-shadow-2),
        inset 0 0 0 1px var(--color-space-button-shadow-1);
    transform: translate(2px, 2px);
}

/* 虚线框"顶面"：向上右偏移，层级与 SolidButton 的 ::after 对齐 */
.btn::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;

    border-radius: 4px;
    transform: translate(3px, -3px);
    z-index: 2;

    outline: 2px dashed var(--color-space-outline);
    outline-offset: -2px;

    transition: transform 0.2s;
}

.btn:active::after {
    transform: translate(3px, 3px);
    /* 偏移 = 原来 box-shadow 的位置 */
}

/* 内置图标样式：slot 传入的 SVG 统一尺寸，颜色跟随按钮文字色 */
.btn :deep(svg) {
    width: 1em;
    height: 1em;
    fill: var(--color-space-button-text);
    stroke: var(--color-space-button-text);
    /* 如果有描边 */
}
</style>
