<script setup lang="ts">
import { computed } from "vue";
import { useI18nText } from "../../../i18n";
import UiButton from "../../shared/ui/UiButton.vue";
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
    class="staging-panel col-start-2 row-start-2 relative w-full min-w-0 p-2.5 grid gap-2 rounded-ui border border-ui-border bg-ui-bg shadow-ui"
    data-hit-zone="interactive"
    :class="[
      `staging-panel--${props.stagingDrawerState}`,
      props.stagingDrawerState === 'opening'
        ? 'animate-launcher-staging-panel-enter motion-reduce:animate-none'
        : '',
      props.stagingDrawerState === 'closing'
        ? 'pointer-events-none animate-launcher-staging-panel-exit motion-reduce:animate-none'
        : '',
      props.stagingDrawerState === 'closed' ? 'hidden' : ''
    ]"
    aria-label="floating-staging"
  >
    <button
      type="button"
      class="staging-chip w-full min-h-[62px] grid justify-items-center content-center gap-[6px] border border-ui-border rounded-ui bg-ui-bg shadow-[inset_0_1px_0_rgba(var(--ui-text-rgb),0.04)] text-ui-text cursor-pointer focus-visible:outline-none focus-visible:border-[rgba(var(--ui-brand-rgb),0.54)] focus-visible:shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.22)]"
      :class="{
        'staging-chip--active border-[rgba(var(--ui-brand-rgb),0.48)] bg-[linear-gradient(180deg,rgba(var(--ui-brand-rgb),0.22),var(--ui-bg))]':
          props.stagingExpanded
      }"
      :aria-expanded="props.stagingExpanded"
      :aria-label="t('launcher.queueToggleAria', { count: props.stagedCommands.length })"
      @click="emit('toggle-staging')"
    >
      <span
        class="staging-chip__icon w-[16px] h-[12px] border border-[rgba(var(--ui-text-rgb),0.28)] rounded-[4px] relative"
        aria-hidden="true"
      >
        <span
          class="staging-chip__icon-bar absolute left-[2px] right-[2px] bottom-[-4px] h-[2px] rounded-[2px] bg-[rgba(var(--ui-text-rgb),0.25)]"
          aria-hidden="true"
        ></span>
      </span>
      <span
        class="staging-chip__count inline-flex items-center justify-center min-w-[24px] h-[18px] px-[6px] rounded-full border border-[rgba(var(--ui-text-rgb),0.16)] bg-[rgba(var(--ui-text-rgb),0.08)] text-ui-subtle text-[11px] font-semibold"
      >
        {{ props.stagedCommands.length }}
      </span>
    </button>

    <template v-if="props.stagingExpanded">
      <header
        class="staging-panel__header flex items-center justify-between gap-2"
        data-hit-zone="drag"
        data-tauri-drag-region
      >
        <h2 class="m-0 text-[13px]">{{ t("launcher.queueTitle", { count: props.stagedCommands.length }) }}</h2>
        <span v-if="stagingHintText" class="staging-panel__hint text-[11px] text-ui-subtle">
          {{ stagingHintText }}
        </span>
      </header>
      <p
        v-if="props.stagedCommands.length === 0"
        class="staging-empty m-0 p-[12px_10px] border border-dashed border-[rgba(var(--ui-text-rgb),0.16)] rounded-[8px] text-ui-subtle text-[12px]"
      >
        {{ t("launcher.queueEmpty") }}
      </p>
      <ul
        v-else
        :ref="props.setStagingListRef"
        class="staging-list m-0 p-0 pr-[2px] list-none flex flex-col gap-[8px] overflow-y-auto"
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
            class="staging-card border border-[rgba(var(--ui-text-rgb),0.08)] rounded-surface bg-[rgba(var(--ui-black-rgb),0.17)] p-[12px_14px] flex items-stretch gap-[10px] min-h-[56px] cursor-default transition-[transform,border-color,opacity,box-shadow] duration-150 ease-[cubic-bezier(0.175,0.885,0.32,1.15)] active:cursor-grabbing"
            :class="{
              'staging-card--active border-[rgba(var(--ui-brand-rgb),0.52)] shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.2)]':
                props.focusZone === 'staging' && index === props.stagingActiveIndex
            }"
          >
            <header class="staging-card__head flex items-center justify-between gap-[8px] w-full">
              <h3 class="m-0 text-[12px] overflow-hidden text-ellipsis whitespace-nowrap">
                {{ cmd.title }}
              </h3>
              <UiButton
                variant="danger"
                size="small"
                @click="emit('remove-staged-command', cmd.id)"
              >
                {{ t("common.remove") }}
              </UiButton>
            </header>
            <div
              v-if="cmd.args.length > 0"
              class="staging-card__args flex flex-wrap gap-x-[12px] gap-y-[6px] bg-[rgba(var(--ui-text-rgb),0.02)] p-[6px_8px] border border-[rgba(var(--ui-text-rgb),0.04)] rounded-[6px]"
            >
              <div
                v-for="arg in cmd.args"
                :key="`${cmd.id}-${arg.key}`"
                class="staging-card__arg flex items-center gap-[6px] flex-[1_1_120px] min-w-0"
              >
                <label class="text-[11px] text-ui-subtle whitespace-nowrap">
                  {{ arg.label }}
                </label>
                <input
                  type="text"
                  :value="cmd.argValues[arg.key] ?? ''"
                  :placeholder="arg.placeholder"
                  autocomplete="off"
                  class="h-[24px] px-[6px] border border-ui-border rounded-[6px] bg-[rgba(var(--ui-text-rgb),0.04)] text-ui-text text-[11px] outline-none flex-1 min-w-0 focus-visible:border-[rgba(var(--ui-brand-rgb),0.56)] focus-visible:shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.22)]"
                  @input="onStagingArgInput(cmd.id, arg.key, $event)"
                />
              </div>
            </div>
            <code
              :title="cmd.renderedCommand"
              class="block font-mono text-[11px] text-ui-subtle whitespace-nowrap overflow-hidden text-ellipsis mt-[2px]"
            >
              {{ cmd.renderedCommand }}
            </code>
          </article>
        </li>
      </ul>
      <footer class="staging-panel__footer flex items-center justify-between gap-[8px]">
        <UiButton variant="muted" @click="emit('clear-staging')">
          {{ t("common.clear") }}
        </UiButton>
        <UiButton
          variant="primary"
          :disabled="props.executing || props.stagedCommands.length === 0"
          @click="emit('execute-staged')"
        >
          {{ props.executing ? t("launcher.executing") : t("launcher.executeAll") }}
        </UiButton>
      </footer>
    </template>
  </aside>
</template>
