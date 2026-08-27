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
        <span class="btn-content">
            <slot>
                {{ label }}
            </slot>
        </span>
    </button>
</template>

<style scoped>
/* 层叠方案：基础态 z-index: auto（不形成层叠上下文），::after 直接参与父容器层叠、
   盖过兄弟按钮的阴影；hover/active 时按钮整体抬到 z-index 2，避免位移时被兄弟盖住 */
.btn {
    position: relative;
    background: var(--color-solid-button-shadow-1);
    background-clip: padding-box;


    border: none;
    border-radius: 4px;

    box-shadow:
        -3px 3px 0 var(--color-solid-button-shadow-2),
        inset 0 0 0 1px var(--color-solid-button-shadow-1);
    transition: box-shadow 0.2s, transform 0.2s, filter 0.2s;
}

/* .is-hovered 是 snap-layout 插件在 Win11 下给目标按钮镜像的 hover 态
   （原生覆盖层会拦截指针事件，:hover 不会触发） */
.btn:hover,
.btn.is-hovered {
    filter: brightness(1.1);
    transform: translateY(-2px);
    z-index: 2;
}

/* .is-active 与 .is-hovered 同理：snap-layout 插件在 Win11 下镜像的按下态 */
.btn:active,
.btn.is-active {
    filter: brightness(0.75);
    z-index: 2;
    box-shadow:
        -3px -3px 0 var(--color-solid-button-shadow-2),
        inset 0 0 0 1px var(--color-solid-button-shadow-1);
    transform: translate(2px, 2px);
}

/* 按钮的"顶面"：向上右偏移，压在自己的底色（阴影面）和兄弟按钮的阴影之上 */
.btn::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--color-solid-button-background);

    border-radius: 4px;
    transform: translate(3px, -3px);
    z-index: 2;

    outline: 2px solid var(--color-solid-outline);
    outline-offset: -2px;

    transition: transform 0.2s;
}

.btn:active::after,
.btn.is-active::after {
    transform: translate(3px, 3px);
    /* 偏移 = 原来 box-shadow 的位置 */
}

/* 文字要压在 ::after 顶面之上 */
.btn-content {
    color: var(--color-solid-button-text);
    position: relative;
    z-index: 3;
}

.btn-content :deep(svg) {
    width: 1em;
    height: 1em;
    fill: var(--color-solid-button-text);
    stroke: var(--color-solid-button-text);
    /* 如果有描边 */
}
</style>
