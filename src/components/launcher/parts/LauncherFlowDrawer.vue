<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { CommandArg, CommandTemplate } from "../../../features/commands/commandTemplates";
import { useI18nText } from "../../../i18n";
import type { ElementRefArg, LauncherSafetyDialog, ParamSubmitMode } from "../types";
import LauncherIcon from "./LauncherIcon.vue";

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

const drawerOpen = computed(() => props.pendingCommand !== null || props.safetyDialog !== null);

watch(
  drawerOpen,
  (open) => {
    if (!open) {
      return;
    }
    exitDirection.value = "left";
  },
  { immediate: true }
);

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
  <Transition name="flow-drawer">
    <aside
      v-if="props.pendingCommand || props.safetyDialog"
      class="flow-overlay"
      data-hit-zone="overlay"
      :class="exitDirection === 'right' ? 'flow-overlay--exit-right' : 'flow-overlay--exit-left'"
    >
      <button
        v-if="!props.reviewOpen"
        type="button"
        class="drawer-scrim flow-overlay__scrim"
        data-hit-zone="overlay"
        :aria-label="t('common.close')"
        @click="onCloseButtonClick"
      ></button>
      <section ref="dialogRef" class="flow-panel" role="dialog" @keydown="onDialogKeydown">
        <header class="flow-panel__header">
          <button
            type="button"
            class="btn-muted btn-icon btn-small flow-close-button"
            :aria-label="t('common.close')"
            :title="t('common.close')"
            @click="onCloseButtonClick"
          >
            <LauncherIcon name="x" />
          </button>
        </header>
        <form
          v-if="props.pendingCommand && !props.safetyDialog"
          class="flow-page flow-page--param"
          @submit.prevent="onParamSubmit"
        >
          <div class="flow-page__scroll">
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
          </div>
          <footer class="flow-page__footer">
            <button
              type="button"
              class="btn-muted flow-param-cancel"
              @click="onParamCancel"
            >
              {{ t("common.cancel") }}
            </button>
            <button type="submit" class="btn-primary flow-param-submit">
              {{ props.pendingSubmitMode === "execute" ? t("launcher.executeNow") : t("launcher.stageToQueue") }}
            </button>
          </footer>
        </form>

        <section v-else-if="props.safetyDialog" class="flow-page flow-page--safety">
          <div class="flow-page__scroll">
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
  </Transition>
</template>
