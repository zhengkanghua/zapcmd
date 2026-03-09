<script setup lang="ts">
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { useI18nText } from "../../../i18n";
import type { LauncherSearchPanelProps } from "../types";
import LauncherHighlightText from "./LauncherHighlightText.vue";
import LauncherQueueSummaryPill from "./LauncherQueueSummaryPill.vue";

const props = defineProps<LauncherSearchPanelProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "query-input", value: string): void;
  (e: "stage-result", command: CommandTemplate): void;
  (e: "toggle-staging"): void;
}>();

function onSearchFormPointerDown(event: PointerEvent): void {
  if (!props.reviewOpen) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(".queue-summary-pill")) {
    return;
  }

  event.preventDefault();
  emit("toggle-staging");
}

function onSearchInput(event: Event): void {
  emit("query-input", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <section class="search-main" data-hit-zone="interactive">
    <section class="search-capsule" aria-label="search-capsule">
      <form class="search-form" @submit.prevent @pointerdown.capture="onSearchFormPointerDown">
        <label class="search-label" for="zapcmd-search-input">{{ t("common.search") }}</label>
        <input
          id="zapcmd-search-input"
          data-testid="zapcmd-search-input"
          :ref="props.setSearchInputRef"
          :disabled="props.executing"
          :value="props.query"
          class="search-input"
          type="text"
          :placeholder="t('launcher.searchPlaceholder')"
          autocomplete="off"
          @input="onSearchInput"
        />
        <LauncherQueueSummaryPill
          v-if="props.stagedCommandCount > 0"
          :count="props.stagedCommandCount"
          @toggle-staging="emit('toggle-staging')"
        />
      </form>
      <p
        v-if="props.executionFeedbackMessage"
        class="execution-feedback execution-toast"
        :class="`execution-feedback--${props.executionFeedbackTone}`"
        role="status"
        aria-live="polite"
      >
        {{ props.executionFeedbackMessage }}
      </p>
    </section>

    <section
      v-if="props.drawerOpen"
      :ref="props.setDrawerRef"
      class="result-drawer"
      :inert="props.reviewOpen ? true : undefined"
      :aria-hidden="props.reviewOpen ? 'true' : undefined"
      :style="{ maxHeight: `${props.drawerViewportHeight}px` }"
      aria-label="result-drawer"
      data-testid="result-drawer"
    >
      <p class="keyboard-hint">{{ props.keyboardHintText }}</p>
      <ul v-if="props.filteredResults.length > 0" class="result-list">
        <li v-for="(item, index) in props.filteredResults" :key="item.id">
          <button
            class="result-item"
            type="button"
            :class="{
              'result-item--active': index === props.activeIndex,
              'result-item--staged-feedback': item.id === props.stagedFeedbackCommandId
            }"
            :ref="(el) => props.setResultButtonRef(el, index)"
            @click="emit('stage-result', item)"
          >
            <span class="result-item__content">
              <span class="result-item__meaning">
                <LauncherHighlightText :text="item.description" :query="props.query" />
              </span>
              <code class="result-item__command" :title="item.preview">
                <LauncherHighlightText :text="item.preview" :query="props.query" />
              </code>
            </span>
            <span class="result-item__meta">
              <span class="result-item__folder">
                <LauncherHighlightText :text="item.folder" :query="props.query" />
              </span>
              <span class="result-item__category">
                #
                <LauncherHighlightText :text="item.category" :query="props.query" />
              </span>
            </span>
          </button>
        </li>
      </ul>
      <p v-else class="drawer-empty">
        <span class="drawer-empty__title">{{ t("launcher.noResult") }}</span>
        <span class="drawer-empty__hint">{{ t("launcher.noResultHint") }}</span>
      </p>
      <div
        v-if="props.drawerFillerHeight > 0"
        class="result-drawer__filler"
        :style="{ height: `${props.drawerFillerHeight}px` }"
        aria-hidden="true"
      ></div>
    </section>
  </section>
</template>
