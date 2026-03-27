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
    event.preventDefault();
    event.stopPropagation();
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
  <div class="s-hotkey-recorder-field grid w-fit max-w-full gap-[8px]">
    <div class="s-hotkey-recorder-field__label text-[12px] text-ui-subtle">{{ props.label }}</div>
    <button
      ref="recorderRef"
      type="button"
      :class="[
        's-hotkey-recorder min-h-[34px] justify-self-start w-fit min-w-[92px] max-w-[min(100%,280px)] border border-ui-border rounded-lg bg-ui-input px-2.5 text-left text-[13px] tracking-[0.02em] text-ui-text outline-none inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-[border-color,box-shadow,background] duration-150 ease-[cubic-bezier(0.33,1,0.68,1)] focus-visible:border-ui-brand-dim focus-visible:shadow-brand-soft-ring',
        {
          's-hotkey-recorder--empty text-ui-subtle': isEmpty,
          's-hotkey-recorder--recording border-ui-brand-dim shadow-brand-soft-ring':
            recording,
          's-hotkey-recorder--conflict border-ui-danger shadow-danger-soft-ring':
            Boolean(props.conflict)
        }
      ]"
      @click="startRecording"
      @keydown="onKeydown"
      @blur="onBlur"
    >
      <span v-if="recording && !capturedKeys" class="s-hotkey-recorder__hint text-[12px]">按下新的快捷键…</span>
      <span v-else-if="displayTokens.length === 0" class="s-hotkey-recorder__placeholder text-[12px]">未设置</span>
      <span v-else class="s-hotkey-recorder__keys inline-flex max-w-full items-center gap-[4px]" aria-hidden="true">
        <template v-for="(token, index) in displayTokens" :key="`${token}-${index}`">
          <kbd
            class="s-hotkey-recorder__kbd rounded-md border border-ui-border-light border-b-[2px] bg-ui-kbd px-1.5 py-[1px] text-[12px] text-ui-text font-mono"
          >
            {{ token }}
          </kbd>
          <span v-if="index < displayTokens.length - 1" class="s-hotkey-recorder__sep text-[12px] text-ui-subtle">
            +
          </span>
        </template>
      </span>
    </button>

    <div v-if="props.conflict" class="s-hotkey-recorder-field__conflict flex flex-wrap items-center gap-1.5 text-[12px] text-ui-danger">
      <span
        class="s-hotkey-recorder-field__conflict-title rounded-full border border-ui-danger bg-ui-danger-soft px-2 py-[1px] font-semibold"
      >
        冲突
      </span>
      <span class="s-hotkey-recorder-field__conflict-text text-ui-subtle">{{ props.conflict }}</span>
    </div>
  </div>
</template>
