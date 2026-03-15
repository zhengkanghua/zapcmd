<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useI18nText } from "../../../i18n";
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

const dialogRef = ref<HTMLElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);

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
    class="param-overlay safety-overlay"
    data-hit-zone="overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="t('launcher.safetyDialogAria')"
    @click.self="emit('cancel-safety-execution')"
  >
    <section ref="dialogRef" class="param-dialog safety-dialog" @keydown="onDialogKeydown">
      <h2>{{ props.safetyDialog.title }}</h2>
      <p>{{ props.safetyDialog.description }}</p>

      <ul class="safety-list">
        <li v-for="(item, index) in props.safetyDialog.items" :key="`safety-${index}-${item.title}`">
          <h3>{{ item.title }}</h3>
          <code>{{ item.renderedCommand }}</code>
          <ul class="safety-reasons">
            <li v-for="(reason, reasonIndex) in item.reasons" :key="`reason-${reasonIndex}`">
              {{ reason }}
            </li>
          </ul>
        </li>
      </ul>

      <footer>
        <button
          ref="cancelButtonRef"
          type="button"
          class="btn-muted"
          :disabled="props.executing"
          @click="emit('cancel-safety-execution')"
        >
          {{ t("common.cancel") }}
        </button>
        <button
          type="button"
          class="btn-danger"
          :disabled="props.executing"
          @click="emit('confirm-safety-execution')"
        >
          {{ t("common.execute") }}
        </button>
      </footer>
    </section>
  </aside>
</template>
