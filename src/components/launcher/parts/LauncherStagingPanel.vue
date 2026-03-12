<script setup lang="ts">
import { computed } from "vue";
import { useI18nText } from "../../../i18n";
import type { LauncherStagingPanelProps } from "../types";

const props = defineProps<LauncherStagingPanelProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "toggle-staging"): void;
  (e: "staging-drag-start", index: number, event: DragEvent): void;
  (e: "staging-drag-over", index: number, event: DragEvent): void;
  (e: "staging-drag-end"): void;
  (e: "focus-staging-index", index: number): void;
  (e: "remove-staged-command", id: string): void;
  (e: "update-staged-arg", id: string, key: string, value: string): void;
  (e: "clear-staging"): void;
  (e: "execute-staged"): void;
}>();

function onStagingDragStart(index: number, event: DragEvent): void {
  emit("staging-drag-start", index, event);
}

function onStagingDragOver(index: number, event: DragEvent): void {
  emit("staging-drag-over", index, event);
}

function onStagingArgInput(id: string, key: string, event: Event): void {
  emit("update-staged-arg", id, key, (event.target as HTMLInputElement).value);
}

const stagingHintText = computed(() => {
  if (!props.stagingHints?.length) {
    return "";
  }
  return props.stagingHints
    .map((hint) => {
      const keys = hint.keys.join("+");
      return `${keys} ${hint.action}`;
    })
    .join(" · ");
});
</script>

<template>
  <aside
    :ref="props.setStagingPanelRef"
    class="staging-panel"
    data-hit-zone="interactive"
    :class="`staging-panel--${props.stagingDrawerState}`"
    aria-label="floating-staging"
  >
    <button
      type="button"
      class="staging-chip"
      :class="{ 'staging-chip--active': props.stagingExpanded }"
      :aria-expanded="props.stagingExpanded"
      :aria-label="t('launcher.queueToggleAria', { count: props.stagedCommands.length })"
      @click="emit('toggle-staging')"
    >
      <span class="staging-chip__icon" aria-hidden="true"></span>
      <span class="staging-chip__count">{{ props.stagedCommands.length }}</span>
    </button>

    <template v-if="props.stagingExpanded">
      <header class="staging-panel__header" data-hit-zone="drag" data-tauri-drag-region>
        <h2>{{ t("launcher.queueTitle", { count: props.stagedCommands.length }) }}</h2>
        <span v-if="stagingHintText" class="staging-panel__hint">{{ stagingHintText }}</span>
      </header>
      <p v-if="props.stagedCommands.length === 0" class="staging-empty">{{ t("launcher.queueEmpty") }}</p>
      <ul
        v-else
        :ref="props.setStagingListRef"
        class="staging-list"
        :class="{ 'staging-list--scrollable': props.stagingListShouldScroll }"
        :style="{ maxHeight: props.stagingListMaxHeight }"
      >
        <li
          v-for="(cmd, index) in props.stagedCommands"
          :key="cmd.id"
          :data-staging-index="index"
          draggable="true"
          @dragstart="onStagingDragStart(index, $event)"
          @dragover="onStagingDragOver(index, $event)"
          @dragend="emit('staging-drag-end')"
          @click="emit('focus-staging-index', index)"
        >
          <article
            class="staging-card"
            :class="{ 'staging-card--active': props.focusZone === 'staging' && index === props.stagingActiveIndex }"
          >
            <header class="staging-card__head">
              <h3>{{ cmd.title }}</h3>
              <button
                type="button"
                class="btn-danger btn-small"
                @click="emit('remove-staged-command', cmd.id)"
              >
                {{ t("common.remove") }}
              </button>
            </header>
            <div v-if="cmd.args.length > 0" class="staging-card__args">
              <div v-for="arg in cmd.args" :key="`${cmd.id}-${arg.key}`" class="staging-card__arg">
                <label>{{ arg.label }}</label>
                <input
                  type="text"
                  :value="cmd.argValues[arg.key] ?? ''"
                  :placeholder="arg.placeholder"
                  autocomplete="off"
                  @input="onStagingArgInput(cmd.id, arg.key, $event)"
                />
              </div>
            </div>
            <code :title="cmd.renderedCommand">{{ cmd.renderedCommand }}</code>
          </article>
        </li>
      </ul>
      <footer class="staging-panel__footer">
        <button type="button" class="btn-muted" @click="emit('clear-staging')">{{ t("common.clear") }}</button>
        <button
          type="button"
          class="btn-primary"
          :disabled="props.executing || props.stagedCommands.length === 0"
          @click="emit('execute-staged')"
        >
          {{ props.executing ? t("launcher.executing") : t("launcher.executeAll") }}
        </button>
      </footer>
    </template>
  </aside>
</template>
