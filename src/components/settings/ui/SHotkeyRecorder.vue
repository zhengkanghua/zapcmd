<script setup lang="ts">
import { computed, nextTick, ref } from "vue";

import { hotkeyFromKeyboardEvent, normalizeHotkey } from "../../../shared/hotkeys";

interface SHotkeyRecorderProps {
  modelValue: string;
  label: string;
  conflict?: string;
}

const props = defineProps<SHotkeyRecorderProps>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const recording = ref(false);
const capturedKeys = ref("");

const recorderRef = ref<HTMLButtonElement | null>(null);

const displayHotkey = computed(() => {
  if (recording.value && capturedKeys.value) {
    return capturedKeys.value;
  }
  return normalizeHotkey(props.modelValue);
});

const displayTokens = computed(() => displayHotkey.value.split("+").filter(Boolean));

const isEmpty = computed(() => !displayHotkey.value && !recording.value);

function startRecording(): void {
  recording.value = true;
  capturedKeys.value = "";
  void nextTick(() => recorderRef.value?.focus());
}

function cancelRecording(): void {
  recording.value = false;
  capturedKeys.value = "";
}

function onKeydown(event: KeyboardEvent): void {
  if (!recording.value) {
    return;
  }

  if (event.key === "Escape") {
    cancelRecording();
    return;
  }

  const hotkey = hotkeyFromKeyboardEvent(event);
  if (!hotkey) {
    return;
  }

  event.preventDefault();
  capturedKeys.value = hotkey;
}

function onBlur(): void {
  if (!recording.value) {
    return;
  }
  recording.value = false;
  if (capturedKeys.value) {
    emit("update:modelValue", capturedKeys.value);
  }
  capturedKeys.value = "";
}
</script>

<template>
  <div class="s-hotkey-recorder-field">
    <div class="s-hotkey-recorder-field__label">{{ props.label }}</div>
    <button
      ref="recorderRef"
      type="button"
      :class="[
        's-hotkey-recorder',
        {
          's-hotkey-recorder--empty': isEmpty,
          's-hotkey-recorder--recording': recording,
          's-hotkey-recorder--conflict': Boolean(props.conflict)
        }
      ]"
      @click="startRecording"
      @keydown="onKeydown"
      @blur="onBlur"
    >
      <span v-if="recording && !capturedKeys" class="s-hotkey-recorder__hint">按下新的快捷键…</span>
      <span v-else-if="displayTokens.length === 0" class="s-hotkey-recorder__placeholder">未设置</span>
      <span v-else class="s-hotkey-recorder__keys" aria-hidden="true">
        <template v-for="(token, index) in displayTokens" :key="`${token}-${index}`">
          <kbd class="s-hotkey-recorder__kbd">{{ token }}</kbd>
          <span v-if="index < displayTokens.length - 1" class="s-hotkey-recorder__sep">+</span>
        </template>
      </span>
    </button>

    <div v-if="props.conflict" class="s-hotkey-recorder-field__conflict">
      <span class="s-hotkey-recorder-field__conflict-title">冲突</span>
      <span class="s-hotkey-recorder-field__conflict-text">{{ props.conflict }}</span>
    </div>
  </div>
</template>

<style scoped>
.s-hotkey-recorder-field {
  display: grid;
  gap: 8px;
}

.s-hotkey-recorder-field__label {
  font-size: 12px;
  color: var(--ui-subtle);
}

.s-hotkey-recorder {
  height: 34px;
  justify-self: start;
  inline-size: min(100%, 280px);
  border: 1px solid var(--ui-border);
  border-radius: 8px;
  background: var(--ui-input-bg);
  color: var(--ui-text);
  padding: 0 10px;
  outline: none;
  text-align: left;
  font-size: 13px;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color 150ms cubic-bezier(0.33, 1, 0.68, 1),
    box-shadow 150ms cubic-bezier(0.33, 1, 0.68, 1),
    background 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-hotkey-recorder--empty {
  color: var(--ui-subtle);
}

.s-hotkey-recorder--recording {
  border-color: var(--ui-brand-dim);
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}

.s-hotkey-recorder--conflict {
  border-color: var(--ui-danger);
  box-shadow: 0 0 0 2px var(--ui-danger-soft);
}

.s-hotkey-recorder:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
}

.s-hotkey-recorder__hint,
.s-hotkey-recorder__placeholder {
  font-size: 12px;
}

.s-hotkey-recorder__keys {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.s-hotkey-recorder__kbd {
  border: 1px solid var(--ui-border-light);
  border-bottom-width: 2px;
  border-radius: 6px;
  padding: 1px 6px;
  font-family: var(--ui-font-mono);
  font-size: 12px;
  background: var(--ui-kbd);
  color: var(--ui-text);
}

.s-hotkey-recorder__sep {
  color: var(--ui-subtle);
  font-size: 12px;
}

.s-hotkey-recorder-field__conflict {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ui-danger);
}

.s-hotkey-recorder-field__conflict-title {
  border: 1px solid var(--ui-danger);
  border-radius: 999px;
  padding: 1px 8px;
  background: var(--ui-danger-soft);
  font-weight: 600;
}

.s-hotkey-recorder-field__conflict-text {
  color: var(--ui-subtle);
}
</style>
