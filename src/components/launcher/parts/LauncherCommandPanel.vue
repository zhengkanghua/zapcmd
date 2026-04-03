<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { useI18nText } from "../../../i18n";
import {
  getCommandArgs,
  resolveCommandExecution
} from "../../../features/launcher/commandRuntime";
import {
  buildSafetyInputFromTemplate,
  collectTrustedArgKeysFromExecution,
  checkSingleCommandSafety,
} from "../../../features/security/commandSafety";
import { collectCommandArgValidationErrors } from "../../../features/security/commandArgValidation";
import type { LauncherCommandPanelProps } from "../types";
import type { CommandArg } from "../../../features/commands/commandTemplates";
import LauncherIcon from "./LauncherIcon.vue";

const props = defineProps<LauncherCommandPanelProps>();

const emit = defineEmits<{
  submit: [args: Record<string, string>, dismissDanger: boolean];
  cancel: [];
  "toggle-queue": [];
  "arg-input": [key: string, value: string];
}>();

const { t } = useI18nText();

const args = computed<CommandArg[]>(() => getCommandArgs(props.command));
const hasArgs = computed(() => args.value.length > 0);

const resolvedCommand = computed(() =>
  resolveCommandExecution(props.command, props.pendingArgValues)
);
const renderedPreview = computed(() => resolvedCommand.value.renderedPreview);
const resolvedScriptCommand = computed(() =>
  resolvedCommand.value.execution.kind === "script"
    ? resolvedCommand.value.execution.command
    : ""
);
const hasMultilineScriptPreview = computed(() => resolvedScriptCommand.value.includes("\n"));

const dangerReasons = computed(() => {
  const input = buildSafetyInputFromTemplate(
    props.command,
    renderedPreview.value,
    props.pendingArgValues,
    args.value
  );
  const result = checkSingleCommandSafety(input);
  return result.confirmationReasons;
});
const argValidationErrors = computed(() =>
  collectCommandArgValidationErrors(args.value, props.pendingArgValues, {
    trustedArgKeys: collectTrustedArgKeysFromExecution(props.command.execution, args.value)
  })
);
const hasArgValidationErrors = computed(() => Object.keys(argValidationErrors.value).length > 0);

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
  if (props.mode === "copy") {
    return t("commandPanel.btn.copy");
  }
  return t("commandPanel.btn.addToFlow");
});

const isDangerBtn = computed(() => props.isDangerous);

const dismissChecked = ref(false);

const firstControlRef = ref<HTMLInputElement | HTMLSelectElement | null>(null);
const dangerDescriptionId = computed(() => `${getPanelIdBase()}-danger-description`);

function setFirstInputRef(el: Element | null, index: number): void {
  if (index !== 0) {
    return;
  }
  firstControlRef.value =
    el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? el : null;
}

onMounted(() => {
  void nextTick(() => {
    firstControlRef.value?.focus({ preventScroll: true });
  });
});

function getPanelIdBase(): string {
  return `command-panel-${props.command.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/**
 * 参数控件 id / 描述 id 必须稳定，才能把 label、必填提示和高危说明可靠挂到同一语义链上。
 * @param argKey 参数 key。
 * @param index 参数顺序，用于兜底避免重复 id。
 * @returns 当前参数字段的稳定 DOM id 前缀。
 */
function getArgIdBase(argKey: string, index: number): string {
  return `${getPanelIdBase()}-${argKey.replace(/[^a-zA-Z0-9_-]/g, "-")}-${index}`;
}

function getArgControlId(argKey: string, index: number): string {
  return `${getArgIdBase(argKey, index)}-control`;
}

function getArgRequiredHintId(argKey: string, index: number): string {
  return `${getArgIdBase(argKey, index)}-required`;
}

function getArgErrorId(argKey: string, index: number): string {
  return `${getArgIdBase(argKey, index)}-error`;
}

function getArgDescribedBy(arg: CommandArg, index: number): string | undefined {
  const describedBy: string[] = [];
  if (arg.required !== false) {
    describedBy.push(getArgRequiredHintId(arg.key, index));
  }
  if (props.isDangerous) {
    describedBy.push(dangerDescriptionId.value);
  }
  if (argValidationErrors.value[arg.key]) {
    describedBy.push(getArgErrorId(arg.key, index));
  }
  return describedBy.length > 0 ? describedBy.join(" ") : undefined;
}

function getArgError(argKey: string): string | undefined {
  return argValidationErrors.value[argKey];
}

function onArgInput(key: string, value: string): void {
  emit("arg-input", key, value);
}

function onCancel(): void {
  emit("cancel");
}

function onSubmit(): void {
  if (hasArgValidationErrors.value) {
    return;
  }
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
          class="command-panel__back border-0 bg-transparent text-ui-subtle text-[18px] cursor-pointer p-[4px_8px] rounded-[6px] transition-launcher-interactive duration-150 hover:text-ui-text hover:bg-ui-text/6 focus-visible:outline-none focus-visible:ring focus-visible:ring-ui-search-hl/18"
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
          class="command-panel__badge text-[11px] p-[2px_8px] rounded-[6px] border border-ui-text/8 bg-ui-text/6 text-ui-subtle whitespace-nowrap"
          :class="{
            'command-panel__badge--danger bg-ui-danger/12 border-ui-danger/20 text-ui-danger':
              props.isDangerous
          }"
        >
          {{ badge }}
        </span>

        <div class="command-panel__header-spacer flex-1" />

        <button
          type="button"
          class="command-panel__queue-btn border-0 bg-transparent cursor-pointer p-[4px_6px] rounded-[6px] text-ui-subtle opacity-85 transition-launcher-interactive duration-150 hover:opacity-100 hover:text-ui-text hover:bg-ui-text/6 focus-visible:outline-none focus-visible:ring focus-visible:ring-ui-search-hl/18"
          :aria-label="t('launcher.queueToggleAria', { count: props.queuedCommandCount })"
          @click="emit('toggle-queue')"
        >
          <LauncherIcon name="queue" />
        </button>
      </div>
      <div class="command-panel__divider command-panel__divider--header h-px w-full m-0 bg-ui-text/8" />
    </header>

    <div class="command-panel__content min-h-0 overflow-y-auto scrollbar-subtle p-[16px] flex flex-col gap-[16px]">
      <p
        v-if="props.executionFeedbackMessage"
        class="execution-feedback execution-toast ui-glass-toast animate-launcher-toast-slide-down motion-reduce:animate-none"
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
        class="command-panel__danger-banner bg-ui-danger/8 border border-ui-danger/22 rounded-[12px] p-[12px_16px] flex flex-col gap-[6px]"
        data-testid="danger-banner"
      >
        <div class="command-panel__danger-header flex items-center gap-[8px] text-ui-danger text-[14px] font-semibold">
          <span
            class="command-panel__danger-icon w-[18px] h-[18px] inline-flex items-center justify-center rounded-[6px] border border-ui-danger/30 bg-ui-danger/12 text-[12px] leading-[1]"
            aria-hidden="true"
            >!</span
          >
          <strong>{{ t("commandPanel.danger.title") }}</strong>
        </div>
        <p
          :id="dangerDescriptionId"
          class="command-panel__danger-desc m-0 text-[13px] text-ui-subtle leading-[1.5]"
        >
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
          <label
            class="command-panel__label text-[12px] font-medium text-ui-subtle uppercase tracking-[0.5px]"
            :for="getArgControlId(arg.key, i)"
          >
            {{ arg.label }}
            <span v-if="arg.required !== false" class="command-panel__required text-ui-danger"
              >*</span
            >
          </label>
          <span
            v-if="arg.required !== false"
            :id="getArgRequiredHintId(arg.key, i)"
            class="sr-only"
          >
            {{ t("safety.validation.required", { label: arg.label }) }}
          </span>

          <select
            v-if="arg.argType === 'select' && arg.options?.length"
            :id="getArgControlId(arg.key, i)"
            :ref="(el) => setFirstInputRef(el as Element | null, i)"
            :value="props.pendingArgValues[arg.key] ?? ''"
            :name="arg.key"
            :required="arg.required !== false"
            :aria-required="arg.required !== false ? 'true' : undefined"
            :aria-describedby="getArgDescribedBy(arg, i)"
            :aria-invalid="getArgError(arg.key) ? 'true' : undefined"
            class="command-panel__select h-[34px] p-[0_10px] border border-ui-border rounded-[8px] bg-ui-black/20 text-ui-text outline-none transition-launcher-field duration-140 focus-visible:border-ui-search-hl/50 focus-visible:ring focus-visible:ring-ui-search-hl/18"
            :class="{
              'border-ui-danger/45 focus-visible:border-ui-danger/55 focus-visible:ring-ui-danger/18':
                !!getArgError(arg.key)
            }"
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
            :id="getArgControlId(arg.key, i)"
            :value="props.pendingArgValues[arg.key] ?? ''"
            :name="arg.key"
            :type="arg.argType === 'number' ? 'number' : 'text'"
            :placeholder="arg.placeholder"
            :required="arg.required !== false"
            :aria-required="arg.required !== false ? 'true' : undefined"
            :aria-describedby="getArgDescribedBy(arg, i)"
            :aria-invalid="getArgError(arg.key) ? 'true' : undefined"
            class="command-panel__input h-[34px] p-[0_10px] border border-ui-border rounded-[8px] bg-ui-black/20 text-ui-text outline-none transition-launcher-field duration-140 placeholder:text-ui-dim focus-visible:border-ui-search-hl/50 focus-visible:ring focus-visible:ring-ui-search-hl/18"
            :class="{
              'border-ui-danger/45 focus-visible:border-ui-danger/55 focus-visible:ring-ui-danger/18':
                !!getArgError(arg.key),
              'command-panel__input--danger focus-visible:border-ui-danger/55 focus-visible:ring focus-visible:ring-ui-danger/18':
                props.isDangerous
            }"
            autocomplete="off"
            @input="
              onArgInput(arg.key, ($event.target as HTMLInputElement).value)
            "
          />
          <p
            v-if="getArgError(arg.key)"
            :id="getArgErrorId(arg.key, i)"
            class="command-panel__field-error m-0 text-[12px] text-ui-danger"
          >
            {{ getArgError(arg.key) }}
          </p>
        </div>
      </form>

      <div
        class="command-panel__preview flex items-baseline gap-[8px] p-[8px_12px] bg-ui-black/12 rounded-surface border border-ui-text/8"
        data-testid="command-preview"
      >
        <span class="command-panel__preview-label text-[12px] text-ui-subtle whitespace-nowrap shrink-0">
          <span aria-hidden="true">&gt;_ </span>{{ t("commandPanel.preview.label") }}:
        </span>
        <div class="command-panel__preview-main min-w-0 flex-1">
          <code
            class="command-panel__preview-code block font-mono text-[13px] text-ui-brand/95 break-all"
            >{{ renderedPreview }}</code
          >
          <details
            v-if="hasMultilineScriptPreview"
            class="command-panel__script-details mt-[8px]"
          >
            <summary class="text-[12px] text-ui-subtle cursor-pointer">
              {{ t("commandPanel.preview.expandScript") }}
            </summary>
            <pre
              class="m-0 mt-[6px] whitespace-pre-wrap break-words font-mono text-[12px] text-ui-subtle"
              data-testid="command-script-preview"
            >{{ resolvedScriptCommand }}</pre>
          </details>
        </div>
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
      <div class="command-panel__divider command-panel__divider--footer h-px w-full m-0 bg-ui-text/8" />
      <div class="command-panel__footer-main flex items-center gap-[8px]">
        <span class="command-panel__hint text-[12px] text-ui-subtle flex-1">
          {{ t("commandPanel.hint.escCancel") }}
        </span>

        <button
          type="button"
          class="command-panel__btn command-panel__btn--cancel p-[8px_16px] rounded-surface text-[13px] font-semibold cursor-pointer border border-ui-text/8 bg-ui-text/6 text-ui-subtle transition-launcher-interactive duration-150 hover:bg-ui-text/10 hover:text-ui-text focus-visible:outline-none focus-visible:ring focus-visible:ring-ui-search-hl/18"
          @click="onCancel"
        >
          {{ t("commandPanel.btn.cancel") }}
        </button>

        <button
          type="button"
          class="command-panel__btn command-panel__btn--confirm p-[8px_16px] rounded-surface text-[13px] font-semibold cursor-pointer border border-transparent bg-ui-brand/95 text-ui-accent-text transition-launcher-emphasis duration-150 hover:opacity-92 focus-visible:outline-none focus-visible:ring focus-visible:ring-ui-search-hl/18"
          :class="{
            'command-panel__btn--danger bg-ui-danger text-ui-accent-text': isDangerBtn
          }"
          :disabled="hasArgValidationErrors"
          :aria-disabled="hasArgValidationErrors ? 'true' : undefined"
          data-testid="confirm-btn"
          @click="onSubmit"
        >
          {{ confirmLabel }}
        </button>
      </div>
    </footer>
  </section>
</template>
