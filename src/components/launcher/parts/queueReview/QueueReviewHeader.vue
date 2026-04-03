<script setup lang="ts">
import { useI18nText } from "../../../../i18n";
import type { ElementRefArg } from "../../types";
import UiIconButton from "../../../shared/ui/UiIconButton.vue";
import LauncherIcon from "../LauncherIcon.vue";

const props = defineProps<{
  queuedCommandCount: number;
  refreshingAllQueuedPreflight: boolean;
  setCloseButtonRef: (value: ElementRefArg) => void;
  onRefreshQueuePreflight: () => void;
  onClearQueue: () => void;
  onClose: () => void;
}>();

const { t } = useI18nText();
</script>

<template>
  <header
    class="flow-panel__header flex items-center justify-between gap-[8px] p-[12px_16px] border-b border-b-ui-border"
    data-tauri-drag-region
  >
    <div
      class="flow-panel__title-group flex items-center gap-[8px] min-w-0"
      data-tauri-drag-region
    >
      <h2
        class="flow-panel__heading text-[14px] font-semibold text-ui-text"
        data-tauri-drag-region
      >
        {{ t("launcher.queueTitle", { count: props.queuedCommandCount }) }}
      </h2>
    </div>
    <div class="flow-panel__header-actions flex items-center gap-[8px]">
      <UiIconButton
        class="flow-panel__refresh-all"
        :ariaLabel="t('launcher.queuePreflightRefreshAll')"
        size="small"
        variant="muted"
        :disabled="props.queuedCommandCount === 0 || props.refreshingAllQueuedPreflight"
        :title="t('launcher.queuePreflightRefreshAll')"
        @click="props.onRefreshQueuePreflight"
      >
        <LauncherIcon name="refresh" />
      </UiIconButton>
      <UiIconButton
        variant="danger"
        :ariaLabel="t('common.clear')"
        :disabled="props.queuedCommandCount === 0"
        @click="props.onClearQueue"
      >
        <LauncherIcon name="trash" />
      </UiIconButton>
      <UiIconButton
        :ref="props.setCloseButtonRef"
        class="flow-panel__close min-w-[44px] min-h-[44px]"
        :ariaLabel="t('common.close')"
        variant="muted"
        @click="props.onClose"
      >
        <LauncherIcon name="x" />
      </UiIconButton>
    </div>
  </header>
</template>
