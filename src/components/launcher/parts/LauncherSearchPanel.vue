<script setup lang="ts">
import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { useI18nText } from "../../../i18n";
import type { LauncherSearchPanelProps } from "../types";
import LauncherHighlightText from "./LauncherHighlightText.vue";
import LauncherIcon from "./LauncherIcon.vue";
import LauncherQueueSummaryPill from "./LauncherQueueSummaryPill.vue";

const props = defineProps<LauncherSearchPanelProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "query-input", value: string): void;
  (e: "stage-result", command: CommandTemplate): void;
  (e: "execute-result", command: CommandTemplate): void;
  (e: "toggle-staging"): void;
  (e: "search-capsule-back"): void;
}>();

function onSearchFormPointerDown(event: PointerEvent): void {
  if (!props.reviewOpen && !props.flowOpen) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest(".queue-summary-pill")) {
    return;
  }

  event.preventDefault();
  emit("search-capsule-back");
}

function onSearchInput(event: Event): void {
  if (props.flowOpen) {
    return;
  }
  emit("query-input", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <section class="search-panel">
    <section class="search-capsule" aria-label="search-capsule">
      <form class="search-form" @submit.prevent @pointerdown.capture="onSearchFormPointerDown">
        <LauncherIcon name="search" class="search-form__icon" />
        <label class="search-label" for="zapcmd-search-input">{{ t("common.search") }}</label>
        <input
          id="zapcmd-search-input"
          data-testid="zapcmd-search-input"
          :ref="props.setSearchInputRef"
          :disabled="props.executing"
          :inert="props.reviewOpen ? true : undefined"
          :readonly="props.flowOpen"
          :tabindex="props.flowOpen ? -1 : undefined"
          :aria-disabled="props.flowOpen ? 'true' : undefined"
          :value="props.query"
          class="search-input"
          type="text"
          :placeholder="t('launcher.searchPlaceholder')"
          autocomplete="off"
          @input="onSearchInput"
        />
        <LauncherQueueSummaryPill :count="props.stagedCommandCount" @toggle-staging="emit('toggle-staging')" />
      </form>
      <!-- search-capsule 内的 toast：仅在 FlowPanel 关闭时显示 -->
      <p
        v-if="props.executionFeedbackMessage && !props.reviewOpen"
        class="execution-feedback execution-toast"
        :class="`execution-feedback--${props.executionFeedbackTone}`"
        role="status"
        aria-live="polite"
      >
        {{ props.executionFeedbackMessage }}
      </p>
    </section>

    <section style="position: relative">
      <section
        v-if="props.drawerOpen"
        :ref="props.setDrawerRef"
        class="result-drawer"
        :inert="props.reviewOpen || props.flowOpen ? true : undefined"
        :aria-hidden="props.reviewOpen || props.flowOpen ? 'true' : undefined"
        :style="{ maxHeight: `${props.drawerViewportHeight}px` }"
        aria-label="result-drawer"
        data-testid="result-drawer"
      >
        <p v-if="props.keyboardHints?.length" class="keyboard-hint">
          <span v-for="(hint, index) in props.keyboardHints" :key="index" class="keyboard-hint__item">
            <span class="keyboard-hint__keys">
              <kbd v-for="key in hint.keys" :key="key">{{ key }}</kbd>
            </span>
            <span class="keyboard-hint__action">{{ hint.action }}</span>
            <span v-if="index < props.keyboardHints.length - 1" class="keyboard-hint__sep">·</span>
          </span>
        </p>
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
              @click="emit('execute-result', item)"
              @contextmenu.prevent="emit('stage-result', item)"
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
        <div v-else class="drawer-empty">
          <div class="drawer-empty__body">
            <LauncherIcon name="search" :size="20" class="drawer-empty__icon" />
            <span class="drawer-empty__title">{{ t("launcher.noResult") }}</span>
            <span class="drawer-empty__hint">{{ t("launcher.noResultHint") }}</span>
          </div>
          <span class="keyboard-hint" style="padding: 0; min-height: auto;">
            <span class="keyboard-hint__item">
              <span class="keyboard-hint__keys"><kbd>Esc</kbd></span>
              <span class="keyboard-hint__action">{{ t("common.cancel") }}</span>
            </span>
          </span>
        </div>
        <div
          v-if="props.drawerFillerHeight > 0"
          class="result-drawer__filler"
          :style="{ height: `${props.drawerFillerHeight}px` }"
          aria-hidden="true"
        ></div>
      </section>

      <section
        v-else-if="(props.reviewOpen || props.flowOpen) && props.drawerFloorViewportHeight > 0"
        class="result-drawer"
        inert
        aria-hidden="true"
        :style="{ height: `${props.drawerFloorViewportHeight}px` }"
        aria-label="result-drawer-floor"
         data-testid="result-drawer-floor"
       ></section>
     </section>
  </section>
</template>
