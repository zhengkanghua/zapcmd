<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useI18nText } from "../../../i18n";
import UiButton from "../../shared/ui/UiButton.vue";
import type { LauncherSafetyDialog } from "../types";

const props = defineProps<{
  safetyDialog: LauncherSafetyDialog | null;
  executing: boolean;
}>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "confirm-safety-execution"): void;
  (e: "cancel-safety-execution"): void;
}>();

type FocusableButton = { focus: () => void };

const dialogRef = ref<HTMLElement | null>(null);
const cancelButtonRef = ref<FocusableButton | null>(null);

watch(
  () => props.safetyDialog,
  async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    cancelButtonRef.value?.focus();
  }
);

function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key !== "Tab") {
    return;
  }

  const root = dialogRef.value;
  if (!root) {
    return;
  }

  const focusable = Array.from(
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
  focusable[nextIndex]?.focus();
}
</script>

<template>
  <aside
    v-if="props.safetyDialog"
    class="param-overlay safety-overlay absolute left-0 right-0 top-ui-top-align bottom-[12px] z-[40] grid place-items-center rounded-b-ui bg-ui-black/38 animate-launcher-fade-in motion-reduce:animate-none"
    data-hit-zone="overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="t('launcher.safetyDialogAria')"
    @click.self="emit('cancel-safety-execution')"
  >
    <section
      ref="dialogRef"
      class="param-dialog safety-dialog w-[min(680px,calc(100vw-24px))] max-h-[min(78vh,640px)] overflow-auto p-[16px] grid gap-[12px] bg-ui-bg-rgb/92 backdrop-blur-[20px] animate-launcher-dialog-scale-in motion-reduce:animate-none"
      @keydown="onDialogKeydown"
    >
      <h2 class="m-0 text-[16px]">{{ props.safetyDialog.title }}</h2>
      <p class="m-0 text-[13px] text-ui-subtle">{{ props.safetyDialog.description }}</p>

      <ul class="safety-list m-0 p-0 list-none grid gap-[10px]">
        <li
          v-for="(item, index) in props.safetyDialog.items"
          :key="`safety-${index}-${item.title}`"
          class="border border-ui-text/10 rounded-[8px] p-[8px_10px] bg-ui-black/16 grid gap-[6px]"
        >
          <h3 class="m-0 text-[13px] font-semibold">{{ item.title }}</h3>
          <code
            class="block font-mono text-[12px] whitespace-pre-wrap break-words text-ui-subtle"
            >{{ item.renderedCommand }}</code
          >
          <ul class="safety-reasons m-0 pl-[16px] grid gap-[4px] text-[12px] text-ui-danger">
            <li v-for="(reason, reasonIndex) in item.reasons" :key="`reason-${reasonIndex}`">
              {{ reason }}
            </li>
          </ul>
        </li>
      </ul>

      <footer class="flex justify-end items-center gap-[8px]">
        <UiButton
          ref="cancelButtonRef"
          variant="muted"
          :disabled="props.executing"
          @click="emit('cancel-safety-execution')"
        >
          {{ t("common.cancel") }}
        </UiButton>
        <UiButton
          variant="danger"
          :disabled="props.executing"
          @click="emit('confirm-safety-execution')"
        >
          {{ t("common.execute") }}
        </UiButton>
      </footer>
    </section>
  </aside>
</template>
