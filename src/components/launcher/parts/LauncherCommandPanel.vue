<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useI18nText } from "../../../i18n";
import { getCommandArgs, renderCommand } from "../../../features/launcher/commandRuntime";
import {
  buildSafetyInputFromTemplate,
  checkSingleCommandSafety,
} from "../../../features/security/commandSafety";
import type { LauncherCommandPanelProps } from "../types";
import type { CommandArg } from "../../../features/commands/commandTemplates";
import LauncherIcon from "./LauncherIcon.vue";

const props = defineProps<LauncherCommandPanelProps>();

const emit = defineEmits<{
  submit: [args: Record<string, string>, dismissDanger: boolean];
  cancel: [];
  "toggle-staging": [];
  "arg-input": [key: string, value: string];
}>();

const { t } = useI18nText();

const args = computed<CommandArg[]>(() => getCommandArgs(props.command));
const hasArgs = computed(() => args.value.length > 0);

const renderedCommand = computed(() =>
  renderCommand(props.command, props.pendingArgValues)
);

const dangerReasons = computed(() => {
  const input = buildSafetyInputFromTemplate(
    props.command,
    renderedCommand.value,
    props.pendingArgValues,
    args.value
  );
  const result = checkSingleCommandSafety(input);
  return result.confirmationReasons;
});

const badge = computed(() => {
  if (props.isDangerous && hasArgs.value) {
    return t("commandPanel.badge.dangerWithParam");
  }
  if (props.isDangerous) {
    return t("commandPanel.badge.dangerConfirm");
  }
  return t("commandPanel.badge.paramInput");
});

const confirmLabel = computed(() => {
  if (props.mode === "execute") {
    return props.isDangerous
      ? t("commandPanel.btn.confirmExecute")
      : t("commandPanel.btn.execute");
  }
  return t("commandPanel.btn.addToFlow");
});

const isDangerBtn = computed(() => props.isDangerous);

const dismissChecked = ref(false);

const firstInputRef = ref<HTMLInputElement | null>(null);

function setFirstInputRef(el: Element | null, index: number): void {
  if (index !== 0) return;
  firstInputRef.value = el instanceof HTMLInputElement ? el : null;
}

onMounted(() => {
  void nextTick(() => {
    firstInputRef.value?.focus({ preventScroll: true });
  });
});

function onArgInput(key: string, value: string): void {
  emit("arg-input", key, value);
}

function onCancel(): void {
  emit("cancel");
}

function onSubmit(): void {
  emit("submit", props.pendingArgValues, dismissChecked.value);
}
</script>

<template>
  <section class="command-panel">
    <header class="command-panel__header" data-tauri-drag-region>
      <div class="command-panel__header-main" data-tauri-drag-region>
        <button
          type="button"
          class="command-panel__back"
          :aria-label="t('commandPanel.btn.cancel')"
          @click="onCancel"
        >
          ←
        </button>

        <h2 class="command-panel__title" data-tauri-drag-region>
          {{ props.command.title }}
        </h2>

        <span
          class="command-panel__badge"
          :class="{ 'command-panel__badge--danger': props.isDangerous }"
        >
          {{ badge }}
        </span>

        <div class="command-panel__header-spacer" />

        <button
          type="button"
          class="command-panel__queue-btn"
          :aria-label="t('launcher.queueToggleAria', { count: props.stagedCommandCount })"
          @click="emit('toggle-staging')"
        >
          <LauncherIcon name="queue" />
        </button>
      </div>
      <div class="command-panel__divider command-panel__divider--header" />
    </header>

    <div class="command-panel__content">
      <p
        v-if="props.executionFeedbackMessage"
        class="execution-feedback execution-toast m-0 absolute left-1/2 top-3 z-[12] max-w-[min(460px,calc(100%-24px))] -translate-x-1/2 pointer-events-none rounded-[8px] border border-[rgba(var(--ui-text-rgb),0.18)] bg-[var(--ui-glass-bg)] shadow-[0_8px_22px_rgba(var(--ui-black-rgb),0.34)] backdrop-blur-[12px] px-[10px] py-[6px] text-[12px] animate-[toast-slide-down_350ms_cubic-bezier(0.175,0.885,0.32,1.15)_both]"
        :class="{
          'execution-feedback--neutral text-[var(--ui-brand)]': props.executionFeedbackTone === 'neutral',
          'execution-feedback--success text-[var(--ui-success)]': props.executionFeedbackTone === 'success',
          'execution-feedback--error text-[var(--ui-danger)]': props.executionFeedbackTone === 'error'
        }"
        role="status"
        aria-live="polite"
      >
        {{ props.executionFeedbackMessage }}
      </p>

      <div
        v-if="props.isDangerous"
        class="command-panel__danger-banner"
        data-testid="danger-banner"
      >
        <div class="command-panel__danger-header">
          <span class="command-panel__danger-icon" aria-hidden="true">!</span>
          <strong>{{ t("commandPanel.danger.title") }}</strong>
        </div>
        <p class="command-panel__danger-desc">
          {{ t("commandPanel.danger.description") }}
        </p>
        <label
          class="command-panel__danger-dismiss"
          data-testid="dismiss-checkbox"
        >
          <input v-model="dismissChecked" type="checkbox" />
          {{ t("commandPanel.danger.dismissToday") }}
        </label>
      </div>

      <form
        v-if="hasArgs"
        class="command-panel__form"
        data-testid="param-form"
        @submit.prevent="onSubmit"
      >
        <div
          v-for="(arg, i) in args"
          :key="arg.key"
          class="command-panel__field"
        >
          <label class="command-panel__label">
            {{ arg.label }}
            <span v-if="arg.required !== false" class="command-panel__required"
              >*</span
            >
          </label>

          <select
            v-if="arg.argType === 'select' && arg.options?.length"
            :value="props.pendingArgValues[arg.key] ?? ''"
            class="command-panel__select"
            @change="
              onArgInput(arg.key, ($event.target as HTMLSelectElement).value)
            "
          >
            <option v-for="opt in arg.options" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>

          <input
            v-else
            :ref="(el) => setFirstInputRef(el as Element | null, i)"
            :value="props.pendingArgValues[arg.key] ?? ''"
            :type="arg.argType === 'number' ? 'number' : 'text'"
            :placeholder="arg.placeholder"
            class="command-panel__input"
            :class="{ 'command-panel__input--danger': props.isDangerous }"
            autocomplete="off"
            @input="
              onArgInput(arg.key, ($event.target as HTMLInputElement).value)
            "
          />
        </div>
      </form>

      <div class="command-panel__preview" data-testid="command-preview">
        <span class="command-panel__preview-label">
          {{ t("commandPanel.preview.label") }}:
        </span>
        <code class="command-panel__preview-code">{{ renderedCommand }}</code>
      </div>

      <ul v-if="dangerReasons.length > 0" class="command-panel__danger-reasons">
        <li v-for="reason in dangerReasons" :key="reason">
          {{ reason }}
        </li>
      </ul>
    </div>

    <footer class="command-panel__footer">
      <div class="command-panel__divider command-panel__divider--footer" />
      <div class="command-panel__footer-main">
        <span class="command-panel__hint">
          {{ t("commandPanel.hint.escCancel") }}
        </span>

        <button
          type="button"
          class="command-panel__btn command-panel__btn--cancel"
          @click="onCancel"
        >
          {{ t("commandPanel.btn.cancel") }}
        </button>

        <button
          type="button"
          class="command-panel__btn command-panel__btn--confirm"
          :class="{ 'command-panel__btn--danger': isDangerBtn }"
          data-testid="confirm-btn"
          @click="onSubmit"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </footer>
  </section>
</template>
