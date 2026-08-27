<script setup lang="ts">
// 通用下拉选择框：原生 Popover API + 自写 listbox。
// Popover 白送：top-layer 渲染（无 z-index 问题）、点击外部关闭、Esc 关闭；
// 自写部分：选项渲染/样式、键盘导航、定位（空间不足时翻成上拉）。
// 视觉语言与按钮一致：镂空底色 + 左下硬阴影，弹层圆角 + inverse 边框。
// 用于对话区参数选择，后续也复用于 TitleBar 的选项菜单
import { computed, nextTick, ref, useId } from "vue";

const model = defineModel<string>({ required: true });

const props = defineProps<{
    options: { label: string; value: string }[];
}>();

const popId = useId(); // 多个实例共存时 popovertarget 需要唯一 id
const triggerRef = ref<HTMLButtonElement | null>(null);
const popRef = ref<HTMLElement | null>(null);

const isOpen = ref(false);
const dropUp = ref(false);
// 键盘高亮的选项下标（鼠标悬停也同步到它，保证两套交互一致）
const activeIndex = ref(-1);
const popStyle = ref<Record<string, string>>({});

const POPUP_MAX_HEIGHT = 240;
const POPUP_GAP = 4;

const currentLabel = computed(
    () => props.options.find((o) => o.value === model.value)?.label ?? "",
);

// popover 的开关（含点击外部、Esc 触发的关闭）都会派发 toggle 事件，状态在这里统一同步
function onToggle(e: Event) {
    isOpen.value = (e as Event & { newState: string }).newState === "open";
    if (isOpen.value) {
        computePosition();
        // 高亮初始落在当前选中项上
        activeIndex.value = Math.max(
            0,
            props.options.findIndex((o) => o.value === model.value),
        );
        nextTick(scrollActiveIntoView);
    } else {
        activeIndex.value = -1;
    }
}

// 定位：弹层用 fixed 贴到触发器下方；下方空间不足且上方更宽时翻成上拉
function computePosition() {
    const rect = triggerRef.value!.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    dropUp.value = below < POPUP_MAX_HEIGHT && rect.top > below;
    popStyle.value = {
        left: `${rect.left}px`,
        minWidth: `${rect.width}px`,
        top: dropUp.value ? "auto" : `${rect.bottom + POPUP_GAP}px`,
        bottom: dropUp.value ? `${window.innerHeight - rect.top + POPUP_GAP}px` : "auto",
    };
}

function select(value: string) {
    model.value = value;
    popRef.value?.hidePopover();
    triggerRef.value?.focus();
}

function scrollActiveIntoView() {
    const el = popRef.value?.children[activeIndex.value];
    el?.scrollIntoView({ block: "nearest" });
}

// 键盘导航挂在触发按钮上（焦点全程不离开它）：上下键展开/移动，Enter/Space 选中
function onKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen.value) {
            popRef.value?.showPopover();
            return;
        }
        const dir = e.key === "ArrowDown" ? 1 : -1;
        activeIndex.value =
            (activeIndex.value + dir + props.options.length) % props.options.length;
        scrollActiveIntoView();
    } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOpen.value) {
            popRef.value?.showPopover();
        } else if (activeIndex.value >= 0) {
            select(props.options[activeIndex.value].value);
        }
    }
}
</script>

<template>
    <div class="select-wrap">
        <!-- popovertarget 声明式连接触发器与弹层：浏览器自动处理"再点一次收起"，不会双触发 -->
        <button
            ref="triggerRef"
            type="button"
            class="select"
            :class="{ open: isOpen }"
            :popovertarget="popId"
            aria-haspopup="listbox"
            :aria-expanded="isOpen"
            @keydown="onKeydown"
        >
            {{ currentLabel }}
        </button>
        <div
            :id="popId"
            ref="popRef"
            popover="auto"
            role="listbox"
            class="popup"
            :class="{ up: dropUp }"
            :style="popStyle"
            @toggle="onToggle"
        >
            <div
                v-for="(opt, i) in options"
                :key="opt.value"
                role="option"
                :aria-selected="opt.value === model"
                class="option"
                :class="{ active: i === activeIndex, selected: opt.value === model }"
                @click="select(opt.value)"
                @mouseenter="activeIndex = i"
            >
                {{ opt.label }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.select-wrap {
    position: relative;
    display: inline-block;
}

/* 尺寸对齐 SpaceButton small（padding 4px 12px / 12px 字号） */
.select {
    appearance: none;
    padding: 4px 12px;
    font-size: 0.75rem;

    background: var(--color-select-background);
    color: var(--color-select-text);

    border: none;
    border-radius: 4px;
    /* 去掉浏览器默认焦点框，焦点态由 .open/:hover 表达 */
    outline: none;

    box-shadow: -3px 3px 0 var(--color-select-shadow);
    transition: box-shadow 0.2s, filter 0.2s, background 0.2s;
    cursor: pointer;
}

/* 高亮：hover 或弹层展开期间（.open 由组件状态驱动，不会有原生 select 的锁死问题） */
.select:hover,
.select.open {
    filter: brightness(0.75);
    background: var(--color-select-background-active);
    box-shadow: -3px 3px 0 var(--color-select-shadow-active);
}

/* 弹层：覆盖 popover 的 UA 默认样式（居中 margin、边框、padding），
   位置由内联 style 的 left/top/bottom 决定 */
.popup {
    inset: auto;
    margin: 0;
    padding: 4px;

    border: 2px solid var(--color-select-popup-border);
    border-radius: 6px;
    background: var(--color-select-popup-background);
    box-shadow: -3px 3px 0 var(--color-select-popup-shadow);

    max-height: 240px;
    overflow-y: auto;
}

/* 上拉时阴影翻到左上，保持"光源"一致 */
.popup.up {
    box-shadow: -3px -3px 0 var(--color-select-popup-shadow);
}

.option {
    padding: 4px 12px;
    font-size: 0.75rem;
    border-radius: 4px;
    color: var(--color-select-text);
    white-space: nowrap;
    cursor: pointer;
}

/* 键盘/鼠标高亮 */
.option.active {
    background: var(--color-select-option-hover);
    color: var(--color-inverse);
}

/* 当前选中项标记 */
.option.selected {
    color: var(--color-select-option-selected);
    font-weight: bold;
}

.option.active.selected {
    color: var(--color-inverse);
}
</style>
