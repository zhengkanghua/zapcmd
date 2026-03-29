<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18nText } from "../../../../i18n";
import SDropdown from "../../ui/SDropdown.vue";
import type { SecondaryFilter } from "./toolbarFilters";

const props = defineProps<{
  filters: SecondaryFilter[];
  hasActiveFilters: boolean;
  triggerElement: HTMLButtonElement | null;
}>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "reset-filters"): void;
}>();

const panelRef = ref<HTMLElement | null>(null);

function getFocusableElements(): HTMLElement[] {
  const root = panelRef.value;
  if (!root) {
    return [];
  }

  return Array.from(
    root.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])"
      ].join(",")
    )
  );
}

async function focusFirstInteractiveElement(): Promise<void> {
  await nextTick();
  getFocusableElements()[0]?.focus({ preventScroll: true });
}

function closeDialog(): void {
  emit("close");
}

function onResetFilters(): void {
  emit("reset-filters");
}

function isEventInside(event: PointerEvent): boolean {
  if (!(event.target instanceof Element)) {
    return false;
  }

  return (
    panelRef.value?.contains(event.target) === true ||
    props.triggerElement?.contains(event.target) === true
  );
}

function onGlobalPointerDown(event: PointerEvent): void {
  if (!isEventInside(event)) {
    closeDialog();
  }
}

/**
 * Dialog 内部必须自己兜底 Tab 循环与 Escape 关闭，避免焦点逃逸到 Settings 其他控件。
 * @param event 键盘事件。
 */
function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    closeDialog();
    return;
  }

  if (event.key !== "Tab" || event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }

  const focusable = getFocusableElements();
  if (focusable.length === 0) {
    return;
  }

  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const currentIndex = active ? focusable.indexOf(active) : -1;
  const delta = event.shiftKey ? -1 : 1;
  const nextIndexRaw = currentIndex === -1 ? 0 : currentIndex + delta;
  const nextIndex =
    nextIndexRaw < 0 ? focusable.length - 1 : nextIndexRaw % focusable.length;

  event.preventDefault();
  event.stopPropagation();
  focusable[nextIndex]?.focus({ preventScroll: true });
}

onMounted(() => {
  document.addEventListener("pointerdown", onGlobalPointerDown);
  void focusFirstInteractiveElement();
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onGlobalPointerDown);
});
</script>

<template>
  <div
    id="settings-commands-more-filters"
    ref="panelRef"
    class="settings-commands-toolbar__more-filters-panel absolute top-[calc(100%+8px)] right-0 w-[min(360px,calc(100vw-56px))] p-3 border border-settings-dropdown-border rounded-[16px] bg-settings-dropdown shadow-ui backdrop-blur-ui z-settings-popover settings-narrow:left-0 settings-narrow:right-auto settings-narrow:w-[min(100%,360px)]"
    data-local-escape-scope="true"
    role="dialog"
    aria-modal="true"
    :aria-label="t('settings.commands.moreFilters')"
    @keydown="onDialogKeydown"
  >
    <div class="settings-commands-toolbar__secondary-grid grid gap-2.5">
      <div
        v-for="filter in props.filters"
        :key="filter.key"
        class="settings-commands-toolbar__secondary-group grid gap-1.5"
      >
        <span
          class="settings-commands-toolbar__secondary-label text-[11px] font-semibold tracking-[0.04em] uppercase text-settings-hint"
          >{{ filter.label }}</span
        >
        <SDropdown
          class="settings-commands-toolbar__secondary-filter w-full"
          :model-value="filter.modelValue"
          :options="filter.options"
          variant="ghost"
          stretch
          @update:model-value="filter.onUpdate"
        />
      </div>
    </div>
    <div class="settings-commands-toolbar__actions mt-3 flex justify-end">
      <button
        type="button"
        class="settings-commands-toolbar__reset border-0 bg-transparent px-2 py-[5px] text-[12px] text-ui-text/52 underline cursor-pointer transition-colors duration-120 hover:text-ui-text/78 disabled:opacity-[0.35] disabled:text-ui-text/30 disabled:cursor-not-allowed disabled:no-underline"
        :disabled="!props.hasActiveFilters"
        @click="onResetFilters"
      >
        {{ t("settings.commands.resetFilters") }}
      </button>
    </div>
  </div>
</template>
