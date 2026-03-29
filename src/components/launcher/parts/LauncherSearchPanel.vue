<script setup lang="ts">
import { computed, ref, watch } from "vue";

import type { CommandTemplate } from "../../../features/commands/commandTemplates";
import { useI18nText } from "../../../i18n";
import type { ElementRefArg, LauncherSearchPanelProps } from "../types";
import LauncherHighlightText from "./LauncherHighlightText.vue";
import LauncherIcon from "./LauncherIcon.vue";
import LauncherQueueSummaryPill from "./LauncherQueueSummaryPill.vue";

const SEARCH_RESULTS_INITIAL_RENDER_LIMIT = 60;
const SEARCH_RESULTS_RENDER_CHUNK_SIZE = 60;
const SEARCH_RESULTS_SCROLL_PREFETCH_PX = 88;

const props = defineProps<LauncherSearchPanelProps>();
const { t } = useI18nText();

const emit = defineEmits<{
  (e: "query-input", value: string): void;
  (e: "stage-result", command: CommandTemplate): void;
  (e: "execute-result", command: CommandTemplate): void;
  (e: "toggle-staging"): void;
  (e: "search-capsule-back"): void;
}>();

const drawerRef = ref<HTMLElement | null>(null);
const renderedResultCount = ref(SEARCH_RESULTS_INITIAL_RENDER_LIMIT);
const visibleResults = computed(() =>
  props.filteredResults.slice(0, renderedResultCount.value)
);

function normalizeToHTMLElement(el: ElementRefArg): HTMLElement | null {
  if (el instanceof HTMLElement) {
    return el;
  }
  if (el && typeof el === "object" && "$el" in el) {
    const maybeElement = (el as { $el?: unknown }).$el;
    return maybeElement instanceof HTMLElement ? maybeElement : null;
  }
  return null;
}

function growRenderedResults(targetCount = renderedResultCount.value + SEARCH_RESULTS_RENDER_CHUNK_SIZE): void {
  if (renderedResultCount.value >= props.filteredResults.length) {
    return;
  }
  renderedResultCount.value = Math.min(props.filteredResults.length, targetCount);
}

function setDrawerElementRef(el: ElementRefArg): void {
  props.setDrawerRef(el);
  drawerRef.value = normalizeToHTMLElement(el);
}

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

function onDrawerScroll(): void {
  const drawer = drawerRef.value;
  if (!drawer || renderedResultCount.value >= props.filteredResults.length) {
    return;
  }

  const remaining = drawer.scrollHeight - (drawer.scrollTop + drawer.clientHeight);
  if (remaining <= SEARCH_RESULTS_SCROLL_PREFETCH_PX) {
    growRenderedResults();
  }
}

watch(
  () => props.filteredResults,
  (results) => {
    renderedResultCount.value = Math.min(results.length, SEARCH_RESULTS_INITIAL_RENDER_LIMIT);
  },
  { immediate: true }
);

watch(
  () => props.activeIndex,
  (activeIndex) => {
    if (activeIndex < renderedResultCount.value) {
      return;
    }

    const chunkCount = Math.ceil((activeIndex + 1) / SEARCH_RESULTS_RENDER_CHUNK_SIZE);
    growRenderedResults(Math.max(SEARCH_RESULTS_INITIAL_RENDER_LIMIT, chunkCount * SEARCH_RESULTS_RENDER_CHUNK_SIZE));
  }
);
</script>

<template>
  <section class="search-panel w-full min-w-0">
    <section class="search-capsule w-full" aria-label="search-capsule">
      <form
        class="search-form grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[10px] p-[12px]"
        @submit.prevent
        @pointerdown.capture="onSearchFormPointerDown"
      >
        <LauncherIcon name="search" class="search-form__icon text-ui-subtle shrink-0" />
        <label class="search-label sr-only" for="zapcmd-search-input">
          {{ t("common.search") }}
        </label>
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
          class="search-input w-full h-[38px] border-0 outline-none bg-transparent text-ui-text text-[17px] select-text disabled:text-ui-dim focus-visible:outline-none"
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
    </section>

    <section class="relative">
      <section
        v-if="props.drawerOpen"
        :ref="setDrawerElementRef"
        class="result-drawer w-full m-0 border-t border-t-ui-text/8 border-x-0 border-b-0 rounded-none bg-transparent shadow-none p-[6px] overflow-auto"
        :inert="props.reviewOpen || props.flowOpen ? true : undefined"
        :aria-hidden="props.reviewOpen || props.flowOpen ? 'true' : undefined"
        :style="{ maxHeight: `${props.drawerViewportHeight}px` }"
        aria-label="result-drawer"
        data-testid="result-drawer"
        @scroll="onDrawerScroll"
      >
        <p
          v-if="props.keyboardHints?.length"
          class="keyboard-hint m-0 min-h-[20px] flex flex-wrap items-center gap-[6px] p-[2px_6px_6px] text-[10px] font-medium tracking-[0.03em] text-ui-subtle"
        >
          <span
            v-for="(hint, index) in props.keyboardHints"
            :key="index"
            class="keyboard-hint__item inline-flex items-center gap-[4px]"
          >
            <span class="keyboard-hint__keys inline-flex items-center gap-[2px]">
                <kbd
                  v-for="key in hint.keys"
                  :key="key"
                  class="ui-keycap"
                >
                  {{ key }}
                </kbd>
            </span>
            <span class="keyboard-hint__action text-ui-dim">{{ hint.action }}</span>
            <span
              v-if="index < props.keyboardHints.length - 1"
              class="keyboard-hint__sep ml-[2px] text-ui-text/15"
              >·</span
            >
          </span>
        </p>
        <ul v-if="props.filteredResults.length > 0" class="result-list m-0 p-0 list-none">
          <li v-for="(item, index) in visibleResults" :key="item.id">
            <button
              class="result-item group w-full m-0 h-[var(--drawer-row-height,44px)] min-h-[var(--drawer-row-height,44px)] px-[10px] py-[4px] pl-[12px] grid grid-cols-[minmax(0,1fr)_auto] items-center text-left gap-[10px] overflow-hidden border-0 rounded-surface bg-transparent text-ui-text cursor-pointer relative transition-launcher-pressable duration-motion-press ease-motion-emphasized active:scale-motion-press-active hover:bg-ui-text/6 focus-visible:outline-none focus-visible:bg-ui-brand/12 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/22"
              type="button"
              :class="{
                'result-item--active bg-ui-brand-soft hover:bg-ui-brand-soft focus-visible:bg-ui-brand-soft': index === props.activeIndex,
                'result-item--staged-feedback animate-launcher-staged-feedback motion-reduce:animate-none':
                  item.id === props.stagedFeedbackCommandId
              }"
              :ref="(el) => props.setResultButtonRef(el, index)"
              @click="emit('execute-result', item)"
              @contextmenu.prevent="emit('stage-result', item)"
            >
              <span
                aria-hidden="true"
                class="result-item__indicator absolute left-[5px] top-[11px] bottom-[11px] w-[2px] rounded-[2px] bg-transparent group-focus-visible:bg-ui-search-hl group-focus-visible:shadow-launcher-search-indicator group-focus-visible:shadow-ui-search-hl/60"
                :class="{
                  'bg-ui-search-hl shadow-launcher-search-indicator shadow-ui-search-hl/60': index === props.activeIndex
                }"
              ></span>
              <span class="result-item__content min-w-0 grid gap-[2px]">
                <span
                  class="result-item__meaning text-[13px] font-semibold text-ui-text overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  <LauncherHighlightText :text="item.description" :query="props.query" />
                </span>
                <code
                  class="result-item__command font-mono text-[11px] text-ui-subtle overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="item.preview"
                >
                  <LauncherHighlightText :text="item.preview" :query="props.query" />
                </code>
              </span>
              <span class="result-item__meta grid justify-items-end gap-[2px]">
                <span
                  class="result-item__folder px-1.5 rounded-full text-[10px] leading-[1.2] border border-ui-text/12 text-ui-subtle"
                >
                  <LauncherHighlightText :text="item.folder" :query="props.query" />
                </span>
                <span
                  class="result-item__category px-[6px] rounded-full text-[10px] leading-[1.2] border border-ui-brand/45 text-ui-brand/90"
                >
                  #
                  <LauncherHighlightText :text="item.category" :query="props.query" />
                </span>
              </span>
            </button>
          </li>
        </ul>
        <div
          v-else
          class="drawer-empty m-0 p-[12px_14px] flex items-center justify-between border border-transparent rounded-surface bg-transparent text-ui-subtle text-[13px]"
        >
          <div class="drawer-empty__body flex items-center gap-[8px]">
            <LauncherIcon
              name="search"
              :size="20"
              class="drawer-empty__icon text-ui-subtle shrink-0"
            />
            <span class="drawer-empty__title text-ui-text font-semibold text-[13px]">
              {{ t("launcher.noResult") }}
            </span>
            <span class="drawer-empty__hint text-[12px] leading-[1.45] text-ui-subtle">
              {{ t("launcher.noResultHint") }}
            </span>
          </div>
          <span
            class="keyboard-hint m-0 min-h-0 flex flex-wrap items-center gap-[6px] p-0 text-[10px] font-medium tracking-[0.03em] text-ui-subtle"
          >
            <span class="keyboard-hint__item inline-flex items-center gap-[4px]">
              <span class="keyboard-hint__keys inline-flex items-center gap-[2px]"
                ><kbd
                  class="ui-keycap"
                  >Esc</kbd
                ></span
              >
              <span class="keyboard-hint__action text-ui-dim">{{ t("common.cancel") }}</span>
            </span>
          </span>
        </div>
      </section>
    </section>
  </section>
</template>
