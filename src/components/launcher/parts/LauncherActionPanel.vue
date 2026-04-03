<script setup lang="ts">
import { computed, ref } from "vue";
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import type { CommandSubmitIntent } from "../../../features/launcher/types";

const props = defineProps<{
  command: CommandTemplate;
}>();

const emit = defineEmits<{
  (e: "select-intent", intent: CommandSubmitIntent): void;
  (e: "cancel"): void;
}>();

const intents: CommandSubmitIntent[] = ["execute", "stage", "copy"];
const activeIndex = ref(0);
const actionLabels = computed<Record<CommandSubmitIntent, string>>(() => ({
  execute: "执行",
  stage: "加入执行流",
  copy: "复制"
}));

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
  emit("select-intent", intent);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    emit("cancel");
    return;
  }
  if (event.key === "ArrowDown" || event.key === "Tab") {
    event.preventDefault();
    activeIndex.value = clampIndex(activeIndex.value + 1);
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    activeIndex.value = clampIndex(activeIndex.value - 1);
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    selectIntent(intents[activeIndex.value] ?? "execute");
  }
}
</script>

<template>
  <section
    class="launcher-action-panel flex h-full flex-col gap-[16px] p-[16px]"
    tabindex="0"
    @keydown="onKeydown"
  >
    <header class="launcher-action-panel__header flex flex-col gap-[6px]">
      <h2 class="text-[15px] font-semibold text-ui-text">{{ props.command.title }}</h2>
      <p class="text-[13px] text-ui-subtle">{{ props.command.preview }}</p>
    </header>

    <div class="launcher-action-panel__actions grid gap-[10px]">
      <button
        v-for="(intent, index) in intents"
        :key="intent"
        type="button"
        class="launcher-action-panel__action rounded-[12px] border border-ui-border bg-ui-bg p-[14px] text-left text-ui-text"
        :class="{ 'ring-1 ring-ui-search-hl/40': index === activeIndex }"
        @click="selectIntent(intent)"
      >
        {{ actionLabels[intent] }}
      </button>
    </div>
  </section>
</template>
