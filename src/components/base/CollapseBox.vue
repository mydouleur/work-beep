<script setup lang="ts">
// 可收起/展开的边框盒子：思考过程、Shell、工具调用等辅助内容共用
// open 为 true 时强制展开（如流式输出期间），结束后收起
withDefaults(defineProps<{
    title?: string
    open?: boolean
}>(), {
    title: "详情",
    open: false,
});
</script>

<template>
    <details class="collapse-box" :open="open">
        <summary class="summary">{{ title }}</summary>
        <div class="body"><slot /></div>
    </details>
</template>

<style scoped>
.collapse-box {
    border: 1px solid var(--color-secondary-2);
    border-radius: 4px;
    margin: 4px 0;
    /* 框内文字始终左对齐，不跟随外层容器的对齐方式 */
    text-align: left;
}

.summary {
    cursor: pointer;
    user-select: none;
    padding: 4px 8px;
    font-size: 0.75rem;
    color: var(--color-secondary-2);
}

.body {
    padding: 4px 8px 8px;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
}
</style>
