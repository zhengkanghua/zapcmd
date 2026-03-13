<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import type { CommandArg, CommandTemplate } from "../../../features/commands/commandTemplates";
import { useI18nText } from "../../../i18n";
import type { ElementRefArg, LauncherSafetyDialog, ParamSubmitMode } from "../types";
import LauncherIcon from "./LauncherIcon.vue";
import {
  FLOW_DRAWER_EXIT_LEFT_MS,
  FLOW_DRAWER_EXIT_RIGHT_MS,
  FLOW_DRAWER_OPEN_MS
} from "./flowDrawerMotion";

const props = defineProps<{
  pendingCommand: CommandTemplate | null;
  pendingArgs: CommandArg[];
  pendingArgValues: Record<string, string>;
  pendingSubmitHint: string;
  pendingSubmitMode: ParamSubmitMode;
  setParamInputRef: (el: ElementRefArg, index: number) => void;
  safetyDialog: LauncherSafetyDialog | null;
  reviewOpen: boolean;
  executing: boolean;
}>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "submit-param-input"): void;
  (e: "cancel-param-input"): void;
  (e: "update-pending-arg", key: string, value: string): void;
  (e: "confirm-safety-execution"): void;
  (e: "cancel-safety-execution"): void;
}>();

const dialogRef = ref<HTMLElement | null>(null);
const cancelButtonRef = ref<HTMLButtonElement | null>(null);
const exitDirection = ref<"left" | "right">("left");
const flowDrawerState = ref<"closed" | "opening" | "open" | "closing-left" | "closing-right">("closed");
const closeTimeoutRef = ref<number | null>(null);
const openTimeoutRef = ref<number | null>(null);

const renderedPendingCommand = ref<CommandTemplate | null>(props.pendingCommand);
const renderedSafetyDialog = ref<LauncherSafetyDialog | null>(props.safetyDialog);
const renderedPendingArgs = ref<CommandArg[]>(props.pendingArgs);
const renderedPendingArgValues = ref<Record<string, string>>(props.pendingArgValues);
const renderedPendingSubmitMode = ref<ParamSubmitMode>(props.pendingSubmitMode);

const drawerOpen = computed(() => props.pendingCommand !== null || props.safetyDialog !== null);
const shouldRender = computed(() => flowDrawerState.value !== "closed");

const overlayClass = computed(() => {
  const classes = [
    exitDirection.value === "right" ? "flow-overlay--exit-right" : "flow-overlay--exit-left"
  ];
  if (props.reviewOpen) {
    classes.push("flow-overlay--review-open");
  }
  if (flowDrawerState.value === "opening") {
    classes.push("flow-overlay--opening");
  }
  if (flowDrawerState.value === "open") {
    classes.push("flow-overlay--open");
  }
  if (flowDrawerState.value === "closing-left") {
    classes.push("flow-overlay--closing", "flow-overlay--closing-left");
  }
  if (flowDrawerState.value === "closing-right") {
    classes.push("flow-overlay--closing", "flow-overlay--closing-right");
  }
  return classes.join(" ");
});

function getPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function clearTimers(): void {
  if (closeTimeoutRef.value !== null) {
    window.clearTimeout(closeTimeoutRef.value);
    closeTimeoutRef.value = null;
  }
  if (openTimeoutRef.value !== null) {
    window.clearTimeout(openTimeoutRef.value);
    openTimeoutRef.value = null;
  }
}

onBeforeUnmount(() => {
  clearTimers();
});

if (drawerOpen.value) {
  scheduleOpen();
}

function scheduleOpen(): void {
  clearTimers();
  if (getPrefersReducedMotion()) {
    flowDrawerState.value = "open";
    return;
  }
  flowDrawerState.value = "opening";
  openTimeoutRef.value = window.setTimeout(() => {
    flowDrawerState.value = "open";
    openTimeoutRef.value = null;
  }, FLOW_DRAWER_OPEN_MS);
}

function startClosing(direction: "left" | "right"): void {
  clearTimers();
  exitDirection.value = direction;
  flowDrawerState.value = direction === "right" ? "closing-right" : "closing-left";
}

function finishClosing(): void {
  flowDrawerState.value = "closed";
  renderedPendingCommand.value = null;
  renderedSafetyDialog.value = null;
  renderedPendingArgs.value = [];
  renderedPendingArgValues.value = {};
  renderedPendingSubmitMode.value = "stage";
}

watch(
  drawerOpen,
  (open) => {
    if (open) {
      renderedPendingCommand.value = props.pendingCommand;
      renderedSafetyDialog.value = props.safetyDialog;
      renderedPendingArgs.value = props.pendingArgs;
      renderedPendingArgValues.value = props.pendingArgValues;
      renderedPendingSubmitMode.value = props.pendingSubmitMode;
      exitDirection.value = "left";

      if (
        flowDrawerState.value === "closed" ||
        flowDrawerState.value === "closing-left" ||
        flowDrawerState.value === "closing-right"
      ) {
        scheduleOpen();
      }
      return;
    }

    if (flowDrawerState.value === "closing-left" || flowDrawerState.value === "closing-right") {
      return;
    }
    if (flowDrawerState.value === "closed") {
      return;
    }

    const direction = exitDirection.value;
    startClosing(direction);
    const duration = getPrefersReducedMotion()
      ? 0
      : direction === "right"
          ? FLOW_DRAWER_EXIT_RIGHT_MS
          : FLOW_DRAWER_EXIT_LEFT_MS;

    if (duration === 0) {
      finishClosing();
      return;
    }

    closeTimeoutRef.value = window.setTimeout(() => {
      closeTimeoutRef.value = null;
      finishClosing();
    }, duration);
  },
  { immediate: true }
);

watch(
  () => props.safetyDialog,
  async (value) => {
    if (value) {
      renderedSafetyDialog.value = value;
      await nextTick();
      cancelButtonRef.value?.focus();
      return;
    }

    if (drawerOpen.value) {
      renderedSafetyDialog.value = null;
    }
  }
);

watch(
  () => props.pendingCommand,
  (value) => {
    if (value) {
      renderedPendingCommand.value = value;
    }
  }
);

watch(
  () => props.pendingArgs,
  (value) => {
    if (drawerOpen.value) {
      renderedPendingArgs.value = value;
    }
  }
);

watch(
  () => props.pendingArgValues,
  (value) => {
    if (drawerOpen.value) {
      renderedPendingArgValues.value = value;
    }
  }
);

watch(
  () => props.pendingSubmitMode,
  (value) => {
    if (drawerOpen.value) {
      renderedPendingSubmitMode.value = value;
    }
  }
);

function onPendingArgInput(key: string, event: Event): void {
  emit("update-pending-arg", key, (event.target as HTMLInputElement).value);
}

function onParamCancel(): void {
  exitDirection.value = "left";
  emit("cancel-param-input");
}

function onParamSubmit(): void {
  exitDirection.value = "right";
  emit("submit-param-input");
}

function onSafetyCancel(): void {
  exitDirection.value = "left";
  emit("cancel-safety-execution");
}

function onSafetyConfirm(): void {
  exitDirection.value = "right";
  emit("confirm-safety-execution");
}

function onCloseButtonClick(): void {
  if (props.safetyDialog) {
    onSafetyCancel();
    return;
  }
  onParamCancel();
}

function onDialogKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    onCloseButtonClick();
    return;
  }
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
    v-if="shouldRender"
    class="flow-overlay"
    data-hit-zone="overlay"
    :class="overlayClass"
  >
    <button
      v-if="!props.reviewOpen"
      type="button"
      class="drawer-scrim flow-overlay__scrim"
      data-hit-zone="overlay"
      :aria-label="t('common.close')"
      @click="onCloseButtonClick"
    ></button>
    <section ref="dialogRef" class="flow-panel" role="dialog" aria-modal="true" @keydown="onDialogKeydown">
      <header class="flow-panel__header">
        <h2 class="flow-panel__title">
          {{ renderedSafetyDialog ? renderedSafetyDialog.title : t("launcher.paramTitle") }}
        </h2>
        <div class="flow-panel__header-right">
          <span
            v-if="renderedPendingCommand && !renderedSafetyDialog"
            class="keyboard-hint flow-panel__hint"
            style="padding: 0; min-height: auto;"
          >
            <span class="keyboard-hint__item">
              <span class="keyboard-hint__keys"><kbd>Enter</kbd></span>
              <span class="keyboard-hint__action">
                {{ renderedPendingSubmitMode === "execute" ? t("launcher.executeNow") : t("launcher.stageToQueue") }}
              </span>
            </span>
          </span>
          <button
            type="button"
            class="btn-muted btn-icon btn-small flow-close-button"
            :aria-label="t('common.close')"
            :title="t('common.close')"
            @click="onCloseButtonClick"
          >
            <LauncherIcon name="x" />
          </button>
        </div>
      </header>

      <form
        v-if="renderedPendingCommand && !renderedSafetyDialog"
        class="flow-page flow-page--param"
        @submit.prevent="onParamSubmit"
      >
        <div class="flow-page__scroll">
          <p class="flow-command-title">{{ renderedPendingCommand.title }}</p>
          <div v-for="(arg, argIndex) in renderedPendingArgs" :key="`pending-${arg.key}`" class="param-field">
            <label :for="`param-input-${arg.key}`">
              {{ arg.label }}<span v-if="arg.required !== false"> *</span>
            </label>
            <input
              :id="`param-input-${arg.key}`"
              :ref="(el) => props.setParamInputRef(el, argIndex)"
              :value="renderedPendingArgValues[arg.key] ?? ''"
              type="text"
              :placeholder="arg.placeholder"
              autocomplete="off"
              @input="onPendingArgInput(arg.key, $event)"
            />
          </div>
        </div>
        <footer class="flow-page__footer">
           <button
             type="button"
             class="btn-muted flow-param-cancel"
             @click="onParamCancel"
           >
             {{ t("common.cancel") }}
           </button>
           <button
             type="submit"
             :class="[
               renderedPendingSubmitMode === 'execute' ? 'btn-success' : 'btn-stage',
               'flow-param-submit'
             ]"
           >
             {{ renderedPendingSubmitMode === "execute" ? t("launcher.executeNow") : t("launcher.stageToQueue") }}
           </button>
         </footer>
       </form>

      <section v-else-if="renderedSafetyDialog" class="flow-page flow-page--safety">
        <div class="flow-page__scroll">
          <p>{{ renderedSafetyDialog.description }}</p>

          <ul class="safety-list">
            <li v-for="(item, index) in renderedSafetyDialog.items" :key="`safety-${index}-${item.title}`">
              <h3>{{ item.title }}</h3>
              <code>{{ item.renderedCommand }}</code>
              <ul class="safety-reasons">
                <li v-for="(reason, reasonIndex) in item.reasons" :key="`reason-${reasonIndex}`">
                  {{ reason }}
                </li>
              </ul>
            </li>
          </ul>
        </div>

        <footer class="flow-page__footer">
          <button
            ref="cancelButtonRef"
            type="button"
            class="btn-muted flow-safety-cancel"
            :disabled="props.executing"
            @click="onSafetyCancel"
          >
            {{ t("common.cancel") }}
          </button>
          <button
            type="button"
            class="btn-danger flow-safety-confirm"
            :disabled="props.executing"
            @click="onSafetyConfirm"
          >
            {{ t("common.execute") }}
          </button>
        </footer>
      </section>
    </section>
  </aside>
</template>
