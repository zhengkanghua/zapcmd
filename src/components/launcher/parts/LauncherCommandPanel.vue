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
  <section
    class="command-panel grid grid-rows-launcher-panel h-full max-h-[var(--launcher-panel-max-height)] min-h-0 bg-transparent overflow-hidden"
  >
    <header class="command-panel__header grid grid-rows-[auto_auto] gap-[12px] p-[12px_16px_0]" data-tauri-drag-region>
      <div class="command-panel__header-main flex items-center gap-[8px]" data-tauri-drag-region>
        <button
          type="button"
          class="command-panel__back border-0 bg-transparent text-ui-subtle text-[18px] cursor-pointer p-[4px_8px] rounded-[6px] transition-[color,background-color,box-shadow] duration-150 hover:text-ui-text hover:bg-[rgba(var(--ui-text-rgb),0.06)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]"
          :aria-label="t('commandPanel.btn.cancel')"
          @click="onCancel"
        >
          ←
        </button>

        <h2
          class="command-panel__title text-[15px] font-semibold text-ui-text whitespace-nowrap overflow-hidden text-ellipsis"
          data-tauri-drag-region
        >
          {{ props.command.title }}
        </h2>

        <span
          class="command-panel__badge text-[11px] p-[2px_8px] rounded-[6px] border border-[rgba(var(--ui-text-rgb),0.08)] bg-[rgba(var(--ui-text-rgb),0.06)] text-ui-subtle whitespace-nowrap"
          :class="{
            'command-panel__badge--danger bg-[rgba(var(--ui-danger-rgb),0.12)] border-[rgba(var(--ui-danger-rgb),0.2)] text-ui-danger':
              props.isDangerous
          }"
        >
          {{ badge }}
        </span>

        <div class="command-panel__header-spacer flex-1" />

        <button
          type="button"
          class="command-panel__queue-btn border-0 bg-transparent cursor-pointer p-[4px_6px] rounded-[6px] text-ui-subtle opacity-85 transition-[opacity,background-color,color,box-shadow] duration-150 hover:opacity-100 hover:text-ui-text hover:bg-[rgba(var(--ui-text-rgb),0.06)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]"
          :aria-label="t('launcher.queueToggleAria', { count: props.stagedCommandCount })"
          @click="emit('toggle-staging')"
        >
          <LauncherIcon name="queue" />
        </button>
      </div>
      <div class="command-panel__divider command-panel__divider--header h-px w-full m-0 bg-[rgba(var(--ui-text-rgb),0.08)]" />
    </header>

    <div class="command-panel__content min-h-0 overflow-y-auto p-[16px] flex flex-col gap-[16px]">
      <p
        v-if="props.executionFeedbackMessage"
        class="execution-feedback execution-toast m-0 absolute left-1/2 top-3 z-[12] max-w-[min(460px,calc(100%-24px))] -translate-x-1/2 pointer-events-none rounded-[8px] border border-[rgba(var(--ui-text-rgb),0.18)] bg-ui-glass shadow-[0_8px_22px_rgba(var(--ui-black-rgb),0.34)] backdrop-blur-[12px] px-[10px] py-[6px] text-[12px] animate-launcher-toast-slide-down motion-reduce:animate-none"
        :class="{
          'execution-feedback--neutral text-ui-brand': props.executionFeedbackTone === 'neutral',
          'execution-feedback--success text-ui-success': props.executionFeedbackTone === 'success',
          'execution-feedback--error text-ui-danger': props.executionFeedbackTone === 'error'
        }"
        role="status"
        aria-live="polite"
      >
        {{ props.executionFeedbackMessage }}
      </p>

      <div
        v-if="props.isDangerous"
        class="command-panel__danger-banner bg-[rgba(var(--ui-danger-rgb),0.08)] border border-[rgba(var(--ui-danger-rgb),0.22)] rounded-[12px] p-[12px_16px] flex flex-col gap-[6px]"
        data-testid="danger-banner"
      >
        <div class="command-panel__danger-header flex items-center gap-[8px] text-ui-danger text-[14px] font-semibold">
          <span
            class="command-panel__danger-icon w-[18px] h-[18px] inline-flex items-center justify-center rounded-[6px] border border-[rgba(var(--ui-danger-rgb),0.3)] bg-[rgba(var(--ui-danger-rgb),0.12)] text-[12px] leading-[1]"
            aria-hidden="true"
            >!</span
          >
          <strong>{{ t("commandPanel.danger.title") }}</strong>
        </div>
        <p class="command-panel__danger-desc m-0 text-[13px] text-ui-subtle leading-[1.5]">
          {{ t("commandPanel.danger.description") }}
        </p>
        <label
          class="command-panel__danger-dismiss flex items-center gap-[6px] text-[12px] text-ui-subtle cursor-pointer opacity-85 hover:opacity-100"
          data-testid="dismiss-checkbox"
        >
          <input v-model="dismissChecked" type="checkbox" />
          {{ t("commandPanel.danger.dismissToday") }}
        </label>
      </div>

      <form
        v-if="hasArgs"
        class="command-panel__form flex flex-col gap-[12px]"
        data-testid="param-form"
        @submit.prevent="onSubmit"
      >
        <div
          v-for="(arg, i) in args"
          :key="arg.key"
          class="command-panel__field flex flex-col gap-[4px]"
        >
          <label class="command-panel__label text-[12px] font-medium text-ui-subtle uppercase tracking-[0.5px]">
            {{ arg.label }}
            <span v-if="arg.required !== false" class="command-panel__required text-ui-danger"
              >*</span
            >
          </label>

          <select
            v-if="arg.argType === 'select' && arg.options?.length"
            :value="props.pendingArgValues[arg.key] ?? ''"
            class="command-panel__select h-[34px] p-[0_10px] border border-ui-border rounded-[8px] bg-[rgba(var(--ui-black-rgb),0.2)] text-ui-text outline-none transition-[border-color,box-shadow,background-color] duration-140 focus-visible:border-[rgba(var(--ui-search-hl-rgb),0.5)] focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]"
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
            class="command-panel__input h-[34px] p-[0_10px] border border-ui-border rounded-[8px] bg-[rgba(var(--ui-black-rgb),0.2)] text-ui-text outline-none transition-[border-color,box-shadow,background-color] duration-140 placeholder:text-ui-dim focus-visible:border-[rgba(var(--ui-search-hl-rgb),0.5)] focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]"
            :class="{
              'command-panel__input--danger focus-visible:border-[rgba(var(--ui-danger-rgb),0.55)] focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-danger-rgb),0.18)]':
                props.isDangerous
            }"
            autocomplete="off"
            @input="
              onArgInput(arg.key, ($event.target as HTMLInputElement).value)
            "
          />
        </div>
      </form>

      <div
        class="command-panel__preview flex items-baseline gap-[8px] p-[8px_12px] bg-[rgba(var(--ui-black-rgb),0.12)] rounded-surface border border-[rgba(var(--ui-text-rgb),0.08)]"
        data-testid="command-preview"
      >
        <span class="command-panel__preview-label text-[12px] text-ui-subtle whitespace-nowrap shrink-0">
          <span aria-hidden="true">&gt;_ </span>{{ t("commandPanel.preview.label") }}:
        </span>
        <code
          class="command-panel__preview-code font-mono text-[13px] text-[rgba(var(--ui-brand-rgb),0.95)] break-all"
          >{{ renderedCommand }}</code
        >
      </div>

      <ul
        v-if="dangerReasons.length > 0"
        class="command-panel__danger-reasons m-0 pl-[16px] grid gap-[4px] text-ui-danger text-[12px]"
      >
        <li v-for="reason in dangerReasons" :key="reason">
          {{ reason }}
        </li>
      </ul>
    </div>

    <footer class="command-panel__footer grid grid-rows-[auto_auto] gap-[12px] p-[0_16px_12px]">
      <div class="command-panel__divider command-panel__divider--footer h-px w-full m-0 bg-[rgba(var(--ui-text-rgb),0.08)]" />
      <div class="command-panel__footer-main flex items-center gap-[8px]">
        <span class="command-panel__hint text-[12px] text-ui-subtle flex-1">
          {{ t("commandPanel.hint.escCancel") }}
        </span>

        <button
          type="button"
          class="command-panel__btn command-panel__btn--cancel p-[8px_16px] rounded-surface text-[13px] font-semibold cursor-pointer border border-[rgba(var(--ui-text-rgb),0.08)] bg-[rgba(var(--ui-text-rgb),0.06)] text-ui-subtle transition-[background-color,color,opacity,box-shadow] duration-150 hover:bg-[rgba(var(--ui-text-rgb),0.1)] hover:text-ui-text focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]"
          @click="onCancel"
        >
          {{ t("commandPanel.btn.cancel") }}
        </button>

        <button
          type="button"
          class="command-panel__btn command-panel__btn--confirm p-[8px_16px] rounded-surface text-[13px] font-semibold cursor-pointer border border-transparent bg-[rgba(var(--ui-brand-rgb),0.95)] text-ui-accent-text transition-[opacity,box-shadow] duration-150 hover:opacity-92 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]"
          :class="{
            'command-panel__btn--danger bg-ui-danger text-ui-accent-text': isDangerBtn
          }"
          data-testid="confirm-btn"
          @click="onSubmit"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </footer>
  </section>
</template>
