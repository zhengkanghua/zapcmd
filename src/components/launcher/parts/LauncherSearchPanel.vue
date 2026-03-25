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
  <section class="search-panel w-full min-w-0">
    <section class="search-capsule w-full" aria-label="search-capsule">
      <form
        class="search-form grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-[10px] p-[12px]"
        @submit.prevent
        @pointerdown.capture="onSearchFormPointerDown"
      >
        <LauncherIcon name="search" class="search-form__icon text-[var(--ui-subtle)] shrink-0" />
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
          class="search-input w-full h-[38px] border-0 outline-none bg-transparent text-[var(--ui-text)] text-[17px] select-text disabled:text-[var(--ui-dim)] focus-visible:outline-none"
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
    </section>

    <section class="relative">
      <section
        v-if="props.drawerOpen"
        :ref="props.setDrawerRef"
        class="result-drawer w-full m-0 border-t border-t-[rgba(var(--ui-text-rgb),0.08)] border-x-0 border-b-0 rounded-none bg-transparent shadow-none p-[6px] overflow-auto"
        :inert="props.reviewOpen || props.flowOpen ? true : undefined"
        :aria-hidden="props.reviewOpen || props.flowOpen ? 'true' : undefined"
        :style="{ maxHeight: `${props.drawerViewportHeight}px` }"
        aria-label="result-drawer"
        data-testid="result-drawer"
      >
        <p
          v-if="props.keyboardHints?.length"
          class="keyboard-hint m-0 min-h-[20px] flex flex-wrap items-center gap-[6px] p-[2px_6px_6px] text-[10px] font-medium tracking-[0.03em] text-[var(--ui-subtle)]"
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
                class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[4px] rounded-[4px] border border-[rgba(var(--ui-text-rgb),0.15)] [border-bottom-color:rgba(var(--ui-text-rgb),0.05)] bg-[linear-gradient(180deg,rgba(var(--ui-text-rgb),0.1),rgba(var(--ui-text-rgb),0.04))] text-[10px] leading-[1] text-[var(--ui-subtle)] [font-family:var(--ui-font-mono)] shadow-[0_1px_1px_rgba(var(--ui-black-rgb),0.2),inset_0_1px_0_rgba(var(--ui-text-rgb),0.1)]"
              >
                {{ key }}
              </kbd>
            </span>
            <span class="keyboard-hint__action text-[var(--ui-dim)]">{{ hint.action }}</span>
            <span
              v-if="index < props.keyboardHints.length - 1"
              class="keyboard-hint__sep ml-[2px] text-[rgba(var(--ui-text-rgb),0.15)]"
              >·</span
            >
          </span>
        </p>
        <ul v-if="props.filteredResults.length > 0" class="result-list m-0 p-0 list-none">
          <li v-for="(item, index) in props.filteredResults" :key="item.id">
            <button
              class="result-item group w-full m-0 h-[var(--drawer-row-height,44px)] min-h-[var(--drawer-row-height,44px)] px-[10px] py-[4px] pl-[12px] grid grid-cols-[minmax(0,1fr)_auto] items-center text-left gap-[10px] overflow-hidden border-0 rounded-[10px] bg-transparent text-[var(--ui-text)] cursor-pointer relative transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.175,0.885,0.32,1.15)] active:scale-[0.985] hover:bg-[rgba(var(--ui-text-rgb),0.06)] focus-visible:outline-none focus-visible:bg-[rgba(var(--ui-brand-rgb),0.12)] focus-visible:shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.22)]"
              type="button"
              :class="{
                'result-item--active bg-[var(--ui-brand-soft)] hover:bg-[var(--ui-brand-soft)] focus-visible:bg-[var(--ui-brand-soft)]': index === props.activeIndex,
                'result-item--staged-feedback animate-[staged-feedback_220ms_ease]': item.id === props.stagedFeedbackCommandId
              }"
              :ref="(el) => props.setResultButtonRef(el, index)"
              @click="emit('execute-result', item)"
              @contextmenu.prevent="emit('stage-result', item)"
            >
              <span
                aria-hidden="true"
                class="result-item__indicator absolute left-[5px] top-[11px] bottom-[11px] w-[2px] rounded-[2px] bg-transparent group-focus-visible:bg-[var(--ui-search-hl)] group-focus-visible:shadow-[0_0_10px_rgba(var(--ui-search-hl-rgb),0.6)]"
                :class="{
                  'bg-[var(--ui-search-hl)] shadow-[0_0_10px_rgba(var(--ui-search-hl-rgb),0.6)]': index === props.activeIndex
                }"
              ></span>
              <span class="result-item__content min-w-0 grid gap-[2px]">
                <span
                  class="result-item__meaning text-[13px] font-semibold text-[var(--ui-text)] overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  <LauncherHighlightText :text="item.description" :query="props.query" />
                </span>
                <code
                  class="result-item__command [font-family:var(--ui-font-mono)] text-[11px] text-[var(--ui-subtle)] overflow-hidden text-ellipsis whitespace-nowrap"
                  :title="item.preview"
                >
                  <LauncherHighlightText :text="item.preview" :query="props.query" />
                </code>
              </span>
              <span class="result-item__meta grid justify-items-end gap-[2px]">
                <span
                  class="result-item__folder px-[6px] rounded-full text-[10px] leading-[1.2] border border-[rgba(var(--ui-text-rgb),0.12)] text-[var(--ui-subtle)]"
                >
                  <LauncherHighlightText :text="item.folder" :query="props.query" />
                </span>
                <span
                  class="result-item__category px-[6px] rounded-full text-[10px] leading-[1.2] border border-[rgba(var(--ui-brand-rgb),0.45)] text-[rgba(var(--ui-brand-rgb),0.9)]"
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
          class="drawer-empty m-0 p-[12px_14px] flex items-center justify-between border border-transparent rounded-[10px] bg-transparent text-[var(--ui-subtle)] text-[13px]"
        >
          <div class="drawer-empty__body flex items-center gap-[8px]">
            <LauncherIcon
              name="search"
              :size="20"
              class="drawer-empty__icon text-[var(--ui-subtle)] shrink-0"
            />
            <span class="drawer-empty__title text-[var(--ui-text)] font-semibold text-[13px]">
              {{ t("launcher.noResult") }}
            </span>
            <span class="drawer-empty__hint text-[12px] leading-[1.45] text-[var(--ui-subtle)]">
              {{ t("launcher.noResultHint") }}
            </span>
          </div>
          <span
            class="keyboard-hint m-0 min-h-0 flex flex-wrap items-center gap-[6px] p-0 text-[10px] font-medium tracking-[0.03em] text-[var(--ui-subtle)]"
          >
            <span class="keyboard-hint__item inline-flex items-center gap-[4px]">
              <span class="keyboard-hint__keys inline-flex items-center gap-[2px]"
                ><kbd
                  class="inline-flex items-center justify-center min-w-[18px] h-[18px] px-[4px] rounded-[4px] border border-[rgba(var(--ui-text-rgb),0.15)] [border-bottom-color:rgba(var(--ui-text-rgb),0.05)] bg-[linear-gradient(180deg,rgba(var(--ui-text-rgb),0.1),rgba(var(--ui-text-rgb),0.04))] text-[10px] leading-[1] text-[var(--ui-subtle)] [font-family:var(--ui-font-mono)] shadow-[0_1px_1px_rgba(var(--ui-black-rgb),0.2),inset_0_1px_0_rgba(var(--ui-text-rgb),0.1)]"
                  >Esc</kbd
                ></span
              >
              <span class="keyboard-hint__action text-[var(--ui-dim)]">{{ t("common.cancel") }}</span>
            </span>
          </span>
        </div>
      </section>
    </section>
  </section>
</template>
