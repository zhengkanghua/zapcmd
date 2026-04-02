<script setup lang="ts">
import { useI18nText } from "../../../../i18n";
import type { ElementRefArg, FocusZone, QueuedCommand } from "../../types";
import UiIconButton from "../../../shared/ui/UiIconButton.vue";
import LauncherIcon from "../LauncherIcon.vue";

interface EditingParamState {
  cmdId: string;
  argKey: string;
  currentValue: string;
  originalValue: string;
}

const props = defineProps<{
  queuedCommands: QueuedCommand[];
  focusZone: FocusZone;
  queueActiveIndex: number;
  executing: boolean;
  gripReorderActive: boolean;
  draggingCommandId: string | null;
  dragOverCommandId: string | null;
  editingParam: EditingParamState | null;
  editingParamError: string | null;
  setParamEditInputRef: (value: ElementRefArg) => void;
  setReviewListRef: (el: ElementRefArg) => void;
  startGripReorder: (index: number, event: MouseEvent) => void;
  onDragStartWithEditGuard: (event: DragEvent, index: number) => void;
  onStagingDragOver: (index: number, event: DragEvent) => void;
  onDragEnd: () => void;
  focusQueueIndex: (index: number) => void;
  copyCommand: (command: string) => Promise<void>;
  removeQueuedCommand: (id: string) => void;
  startParamEdit: (cmdId: string, argKey: string, currentValue: string) => void;
  onParamEditInput: (cmdId: string, argKey: string, value: string) => void;
  commitParamEdit: (cmdId: string, argKey: string) => void;
  cancelParamEdit: () => void;
}>();

const { t } = useI18nText();

function getInlineErrorId(cmdId: string, argKey: string): string {
  return `queue-inline-arg-${cmdId}-${argKey}-error`;
}
</script>

<template>
  <TransitionGroup
    :ref="props.setReviewListRef"
    tag="ul"
    name="flow-panel-list"
    class="staging-list flow-panel__list flex-1 min-h-0 overflow-y-auto scrollbar-subtle pr-[2px]"
    :class="{ 'flow-panel__list--grip-reordering': props.gripReorderActive }"
  >
    <li
      v-for="(cmd, index) in props.queuedCommands"
      :key="cmd.id"
      :data-staging-index="index"
      class="flow-panel__list-item"
      draggable="true"
      @dragstart="props.onDragStartWithEditGuard($event, index)"
      @dragover="props.onStagingDragOver(index, $event)"
      @dragend="props.onDragEnd"
      @click="props.focusQueueIndex(index)"
    >
      <article
        class="staging-card flow-panel__card group border border-ui-text/8 rounded-surface bg-ui-black/17 p-[12px_14px] flex items-stretch gap-[10px] min-h-[56px] cursor-default transition-launcher-card duration-motion-press ease-motion-emphasized active:scale-motion-press-active active:cursor-grabbing"
        :class="{
          'staging-card--active border-ui-brand/52 ring-1 ring-inset ring-ui-brand/20':
            props.focusZone === 'queue' && index === props.queueActiveIndex,
          'staging-card--dragging opacity-[0.62] scale-[1.02] border-ui-brand/45 shadow-launcher-drag-card shadow-ui-black/28 cursor-grabbing':
            props.draggingCommandId === cmd.id,
          'staging-card--drag-over border-ui-brand/65 ring-1 ring-inset ring-ui-brand/18':
            props.dragOverCommandId === cmd.id && props.draggingCommandId !== cmd.id
        }"
        :tabindex="index === props.queueActiveIndex ? 0 : -1"
      >
        <div
          class="flow-card__grip flex items-center shrink-0 text-ui-dim cursor-grab opacity-50 transition-opacity duration-150 group-hover:opacity-100 active:cursor-grabbing"
          :class="{ 'cursor-grabbing': props.gripReorderActive }"
          aria-hidden="true"
          @mousedown="props.startGripReorder(index, $event)"
          @click.stop.prevent
        >
          <LauncherIcon name="grip" :size="12" />
        </div>
        <div class="flow-card__body flex-1 min-w-0 flex flex-col gap-[6px]">
          <header class="staging-card__head flex items-center justify-between gap-[8px]">
            <h3 class="text-[12px] overflow-hidden text-ellipsis whitespace-nowrap">
              {{ cmd.title }}
            </h3>
            <div class="flow-panel__card-actions flex items-center gap-[8px]">
              <UiIconButton
                :ariaLabel="t('common.copy')"
                variant="muted"
                size="small"
                :disabled="props.executing"
                :title="t('common.copy')"
                @click.stop="props.copyCommand(cmd.renderedPreview)"
              >
                <LauncherIcon name="copy" />
              </UiIconButton>
              <UiIconButton
                :ariaLabel="t('common.remove')"
                variant="danger"
                size="small"
                :disabled="props.executing"
                :title="t('common.remove')"
                @click.stop="props.removeQueuedCommand(cmd.id)"
              >
                <LauncherIcon name="x" />
              </UiIconButton>
            </div>
          </header>
          <div
            v-if="cmd.args.length > 0"
            class="flow-card__params flex flex-col gap-[6px] p-[8px_10px] bg-ui-text/4 border border-ui-text/6 rounded-[6px]"
          >
            <div
              v-for="arg in cmd.args"
              :key="arg.key"
              class="flow-card__param flex items-start gap-[8px] text-[12px]"
            >
              <span class="flow-card__param-key text-ui-subtle shrink-0">
                {{ arg.label }}:
              </span>
              <div class="flow-card__param-main flex min-w-0 flex-1 flex-col gap-[4px]">
                <button
                  v-if="props.editingParam?.cmdId !== cmd.id || props.editingParam?.argKey !== arg.key"
                  type="button"
                  class="flow-card__param-value inline-flex min-w-0 items-center text-left text-ui-accent cursor-pointer p-[2px_8px] bg-ui-brand/12 border border-ui-brand/20 rounded-[4px] transition-launcher-surface duration-120 hover:bg-ui-brand/20 hover:border-ui-brand/35 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/24 font-mono"
                  :aria-label="`${arg.label}: ${cmd.argValues[arg.key] || arg.defaultValue || '...'}`"
                  @click.stop="
                    props.startParamEdit(
                      cmd.id,
                      arg.key,
                      cmd.argValues[arg.key] || arg.defaultValue || ''
                    )
                  "
                  @keydown.enter.stop.prevent="
                    props.startParamEdit(
                      cmd.id,
                      arg.key,
                      cmd.argValues[arg.key] || arg.defaultValue || ''
                    )
                  "
                  @keydown.space.stop.prevent="
                    props.startParamEdit(
                      cmd.id,
                      arg.key,
                      cmd.argValues[arg.key] || arg.defaultValue || ''
                    )
                  "
                >
                  {{ cmd.argValues[arg.key] || arg.defaultValue || "..." }}
                </button>
                <input
                  v-else
                  :ref="props.setParamEditInputRef"
                  class="flow-card__param-input bg-ui-text/8 border border-ui-accent rounded-[4px] text-ui-accent text-[12px] font-mono p-[2px_8px] outline-none w-auto min-w-[60px]"
                  :class="{
                    'border-ui-danger/45 text-ui-danger': !!props.editingParamError
                  }"
                  :value="props.editingParam.currentValue"
                  :aria-invalid="props.editingParamError ? 'true' : undefined"
                  :aria-describedby="
                    props.editingParamError ? getInlineErrorId(cmd.id, arg.key) : undefined
                  "
                  @input="
                    props.onParamEditInput(
                      cmd.id,
                      arg.key,
                      ($event.target as HTMLInputElement).value
                    )
                  "
                  @keydown.enter.stop="props.commitParamEdit(cmd.id, arg.key)"
                  @keydown.escape.stop="props.cancelParamEdit()"
                  @blur="props.commitParamEdit(cmd.id, arg.key)"
                />
                <p
                  v-if="
                    props.editingParam?.cmdId === cmd.id &&
                    props.editingParam?.argKey === arg.key &&
                    props.editingParamError
                  "
                  :id="getInlineErrorId(cmd.id, arg.key)"
                  class="flow-card__param-error m-0 text-[11px] text-ui-danger"
                >
                  {{ props.editingParamError }}
                </p>
              </div>
            </div>
          </div>
          <code
            class="flow-card__command block p-[4px_0] font-mono text-[11px] text-ui-subtle whitespace-nowrap overflow-hidden text-ellipsis"
          >
            &gt; {{ cmd.renderedPreview }}
          </code>
        </div>
      </article>
    </li>
  </TransitionGroup>
</template>
