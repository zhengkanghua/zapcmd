<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { CommandSubmitIntent } from "../../../features/launcher/types";
import { useI18nText } from "../../../i18n";

const props = defineProps<{
  command: CommandTemplate;
}>();

const emit = defineEmits<{
  (e: "select-intent", intent: CommandSubmitIntent): void;
  (e: "cancel"): void;
}>();

const { t } = useI18nText();
const intents: CommandSubmitIntent[] = ["execute", "stage", "copy"];
const keyboardIndex = ref(0);
const hoveredIndex = ref<number | null>(null);
const showKeyboardSelection = ref(true);
const panelRef = ref<HTMLElement | null>(null);
const hasBlockingIssue = computed(() => !!props.command.blockingIssue);
const actionLabels = computed<Record<CommandSubmitIntent, string>>(() => ({
  execute: t("launcher.actionPanel.execute"),
  stage: t("launcher.actionPanel.stage"),
  copy: t("launcher.actionPanel.copy")
}));
const activeVisualIndex = computed<number | null>(() =>
  hoveredIndex.value ?? (showKeyboardSelection.value ? keyboardIndex.value : null)
);

/** Shift+Enter 进入动作面板后要立刻接管焦点，本地 Arrow/Enter 才能直接生效。 */
onMounted(() => {
  void nextTick(() => {
    panelRef.value?.focus({ preventScroll: true });
  });
});

function clampIndex(nextIndex: number): number {
  if (nextIndex < 0) {
    return intents.length - 1;
  }
  if (nextIndex >= intents.length) {
    return 0;
  }
  return nextIndex;
}

function selectIntent(intent: CommandSubmitIntent): void {
  if (hasBlockingIssue.value) {
    return;
  }
  emit("select-intent", intent);
}

function setActiveIntent(index: number): void {
  keyboardIndex.value = clampIndex(index);
}

function onActionMouseEnter(index: number): void {
  hoveredIndex.value = clampIndex(index);
  showKeyboardSelection.value = false;
}

function onActionMouseLeave(): void {
  hoveredIndex.value = null;
}

function onActionFocus(index: number): void {
  hoveredIndex.value = null;
  showKeyboardSelection.value = true;
  setActiveIntent(index);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    emit("cancel");
    return;
  }
  if (event.key === "ArrowDown" || event.key === "Tab") {
    event.preventDefault();
    hoveredIndex.value = null;
    showKeyboardSelection.value = true;
    keyboardIndex.value = clampIndex(keyboardIndex.value + 1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    hoveredIndex.value = null;
    showKeyboardSelection.value = true;
    keyboardIndex.value = clampIndex(keyboardIndex.value - 1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    selectIntent(intents[keyboardIndex.value] ?? "execute");
  }
}
</script>

<template>
  <section
    ref="panelRef"
    class="launcher-action-panel flex h-full flex-col gap-[16px] p-[16px] outline-none focus:outline-none focus-visible:outline-none"
    tabindex="0"
    @keydown="onKeydown"
  >
    <header class="launcher-action-panel__header flex flex-col gap-[10px]">
      <div class="flex items-center gap-[10px]">
        <button
          type="button"
          class="launcher-action-panel__back inline-flex h-[28px] min-w-[28px] items-center justify-center rounded-[8px] border border-ui-text/8 bg-ui-text/6 text-[15px] text-ui-subtle shadow-launcher-chip-inset transition-launcher-interactive duration-150 hover:border-ui-text/12 hover:bg-ui-text/10 hover:text-ui-text focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/24"
          :aria-label="t('common.back')"
          @click="emit('cancel')"
        >
          ←
        </button>
        <div class="min-w-0 flex-1">
          <h2 class="text-[15px] font-semibold text-ui-text">{{ props.command.title }}</h2>
          <p class="truncate text-[13px] text-ui-subtle" :title="props.command.preview">
            {{ props.command.preview }}
          </p>
        </div>
      </div>
      <p class="text-[11px] leading-[1.45] text-ui-subtle/88">
        {{ t("launcher.actionPanel.hint") }}
      </p>
      <p
        v-if="props.command.blockingIssue"
        class="launcher-action-panel__issue rounded-[12px] border border-ui-danger/24 bg-ui-danger/8 px-[12px] py-[10px] text-[12px] leading-[1.5] text-ui-danger"
        :title="props.command.blockingIssue.detail"
      >
        {{ t("launcher.problemCommandBadge") }}：{{ props.command.blockingIssue.message }}
      </p>
    </header>

    <div class="launcher-action-panel__actions grid gap-[10px]">
      <button
        v-for="(intent, index) in intents"
        :key="intent"
        type="button"
        class="launcher-action-panel__action rounded-[12px] border border-ui-text/8 bg-ui-black/12 p-[14px] text-left text-ui-text transition-launcher-interactive duration-150 hover:border-ui-text/12 hover:bg-ui-text/6 hover:shadow-launcher-chip-inset focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/24"
        :class="{
          'border-ui-brand/24 bg-ui-brand/12 ring-1 ring-ui-brand/24 shadow-launcher-chip-inset':
            index === activeVisualIndex && !hasBlockingIssue,
          'cursor-not-allowed opacity-45 hover:border-ui-text/8 hover:bg-ui-black/12 hover:shadow-none':
            hasBlockingIssue
        }"
        :disabled="hasBlockingIssue"
        @mouseenter="onActionMouseEnter(index)"
        @mouseleave="onActionMouseLeave"
        @focus="onActionFocus(index)"
        @click="selectIntent(intent)"
      >
        {{ actionLabels[intent] }}
      </button>
    </div>
  </section>
</template>
