<script setup lang="ts">
import { ref } from "vue";
import { useI18nText } from "../../../i18n";
import type { LauncherParamOverlayProps } from "../types";

const props = defineProps<LauncherParamOverlayProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "submit-param-input"): void;
  (e: "cancel-param-input"): void;
  (e: "update-pending-arg", key: string, value: string): void;
}>();

const dialogRef = ref<HTMLElement | null>(null);

function onPendingArgInput(key: string, event: Event): void {
  emit("update-pending-arg", key, (event.target as HTMLInputElement).value);
}

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
    v-if="props.pendingCommand"
    class="param-overlay"
    data-hit-zone="overlay"
    role="dialog"
    aria-modal="true"
    @click.self="emit('cancel-param-input')"
  >
    <form
      ref="dialogRef"
      class="param-dialog"
      @keydown="onDialogKeydown"
      @submit.prevent="emit('submit-param-input')"
    >
      <h2>{{ t("launcher.paramTitle") }}</h2>
      <p>{{ props.pendingCommand.title }}</p>
      <p class="param-submit-hint">{{ props.pendingSubmitHint }}</p>
      <div v-for="(arg, argIndex) in props.pendingArgs" :key="`pending-${arg.key}`" class="param-field">
        <label :for="`param-input-${arg.key}`">
          {{ arg.label }}<span v-if="arg.required !== false"> *</span>
        </label>
        <input
          :id="`param-input-${arg.key}`"
          :ref="(el) => props.setParamInputRef(el, argIndex)"
          :value="props.pendingArgValues[arg.key] ?? ''"
          type="text"
          :placeholder="arg.placeholder"
          autocomplete="off"
          @input="onPendingArgInput(arg.key, $event)"
        />
      </div>
      <footer>
        <button type="button" class="btn-muted" @click="emit('cancel-param-input')">
          {{ t("common.cancel") }}
        </button>
        <button type="submit" class="btn-primary">
          {{ props.pendingSubmitMode === "execute" ? t("launcher.executeNow") : t("launcher.stageToQueue") }}
        </button>
      </footer>
    </form>
  </aside>
</template>
