<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";

import type { CommandTemplate } from "./features/commands/types";
import type { StagedCommand } from "./features/launcher/types";
import type { LauncherSafetyDialog } from "./components/launcher/types";
import { MOTION_PRESET_REGISTRY } from "./features/motion/motionRegistry";
import { THEME_REGISTRY } from "./features/themes/themeRegistry";
import {
  applyBlurState,
  applyMotionPresetState,
  applyThemeState
} from "./features/themes/appearanceBootstrap";
import LauncherQueueReviewPanel from "./components/launcher/parts/LauncherQueueReviewPanel.vue";
import LauncherSafetyOverlay from "./components/launcher/parts/LauncherSafetyOverlay.vue";
import LauncherSearchPanel from "./components/launcher/parts/LauncherSearchPanel.vue";
import SettingsAppearanceSection from "./components/settings/parts/SettingsAppearanceSection.vue";
import SDropdown from "./components/settings/ui/SDropdown.vue";
import SSegmentNav from "./components/settings/ui/SSegmentNav.vue";
import SHotkeyRecorder from "./components/settings/ui/SHotkeyRecorder.vue";
import SSlider from "./components/settings/ui/SSlider.vue";
import SToggle from "./components/settings/ui/SToggle.vue";
import type { SettingsSegmentNavItem } from "./components/settings/types";

type VisualScenarioId =
  | "settings-ui-overview"
  | "settings-ui-dropdown-open"
  | "settings-ui-slider"
  | "settings-ui-hotkey-recorder"
  | "settings-appearance-motion-preset"
  | "launcher-motion-surfaces-expressive"
  | "launcher-motion-surfaces-steady-tool";

function normalizeScenario(hash: string): VisualScenarioId {
  const normalized = hash.replace(/^#/, "");
  if (normalized === "settings-appearance-motion-preset") {
    return "settings-appearance-motion-preset";
  }
  if (normalized === "launcher-motion-surfaces-expressive") {
    return "launcher-motion-surfaces-expressive";
  }
  if (normalized === "launcher-motion-surfaces-steady-tool") {
    return "launcher-motion-surfaces-steady-tool";
  }
  if (normalized === "settings-ui-dropdown-open") {
    return "settings-ui-dropdown-open";
  }
  if (normalized === "settings-ui-slider") {
    return "settings-ui-slider";
  }
  if (normalized === "settings-ui-hotkey-recorder") {
    return "settings-ui-hotkey-recorder";
  }
  return "settings-ui-overview";
}

const scenario = computed<VisualScenarioId>(() => normalizeScenario(window.location.hash));

const dropdownOpenHost = ref<HTMLElement | null>(null);
const hotkeyRecorderHost = ref<HTMLElement | null>(null);
const sliderValue = ref(0.72);
const appearancePreviewOpacity = ref(0.96);
const appearanceTheme = ref("obsidian");
const appearanceBlurEnabled = ref(true);

const segmentItems: SettingsSegmentNavItem[] = [
  { id: "general", label: "通用", icon: "general", panelId: "settings-panel-general" },
  { id: "appearance", label: "外观", icon: "appearance", panelId: "settings-panel-appearance" },
  { id: "about", label: "关于", icon: "about", panelId: "settings-panel-about" }
];

const dropdownOptions = [
  { value: "powershell", label: "PowerShell", description: "默认终端（示例）", meta: "C:\\Windows\\System32" },
  { value: "wt", label: "Windows Terminal", description: "推荐（示例）", meta: "wt.exe" },
  { value: "cmd", label: "CMD", description: "兼容（示例）", meta: "cmd.exe" }
];

const selectedTerminal = ref("powershell");
const formatSliderValue = (v: number) => `${Math.round(v * 100)}%`;
const noopElementRef = () => {};
const noopIndexedElementRef = (_el: unknown, _index: number) => {};

const visualSearchResults: CommandTemplate[] = [
  {
    id: "cmd-docker-logs",
    title: "Docker Logs",
    description: "查看容器最近日志",
    preview: "docker logs app --tail 120",
    folder: "Builtins",
    category: "devops",
    needsArgs: false
  },
  {
    id: "cmd-sync-logs",
    title: "Sync Logs",
    description: "同步 prod 集群日志",
    preview: "sync-logs --target prod-cluster --since 7d",
    folder: "Workspace",
    category: "ops",
    needsArgs: false
  }
];

const visualStagedCommands: StagedCommand[] = [
  {
    id: "stage-1",
    title: "Docker Logs",
    renderedCommand: "docker logs app --tail 120",
    rawPreview: "docker logs app --tail 120",
    args: [],
    argValues: {}
  },
  {
    id: "stage-2",
    title: "Sync Logs",
    renderedCommand: "sync-logs --target prod-cluster --since 7d",
    rawPreview: "sync-logs --target prod-cluster --since 7d",
    args: [
      {
        key: "target",
        label: "Target",
        token: "{target}",
        placeholder: "prod-cluster"
      }
    ],
    argValues: {
      target: "prod-cluster"
    }
  }
];

const visualSafetyDialog: LauncherSafetyDialog = {
  mode: "queue",
  title: "执行前确认高风险命令",
  description: "以下命令可能修改生产环境或删除资源，请再次确认。",
  items: [
    {
      title: "Docker prune",
      renderedCommand: "docker system prune -af",
      reasons: ["会删除未使用镜像与容器", "可能影响正在排查的问题现场"]
    },
    {
      title: "Sync Logs",
      renderedCommand: "sync-logs --target prod-cluster --since 7d",
      reasons: ["会访问生产日志源", "命令包含远端集群上下文"]
    }
  ]
};

const launcherMotionPreset = computed(() =>
  scenario.value === "launcher-motion-surfaces-steady-tool" ? "steady-tool" : "expressive"
);

const freezeLauncherMotionSurfaces = computed(
  () =>
    scenario.value === "launcher-motion-surfaces-expressive" ||
    scenario.value === "launcher-motion-surfaces-steady-tool"
);

function onSliderValueUpdate(value: number) {
  sliderValue.value = value;
}

/**
 * 视觉回归中的“下拉框打开态”必须稳定复现：
 * - SDropdown 面板是 Teleport 到 body 的，无法通过纯 CSS 静态渲染。
 * - 这里用一次程序化 click 触发内部 open 状态，覆盖交互态样式（hover/focus/selected）。
 */
onMounted(async () => {
  if (scenario.value !== "settings-ui-dropdown-open" && scenario.value !== "settings-ui-hotkey-recorder") {
    return;
  }

  await nextTick();
  if (scenario.value === "settings-ui-dropdown-open") {
    const trigger = dropdownOpenHost.value?.querySelector<HTMLButtonElement>(".s-dropdown__trigger");
    trigger?.click();
    return;
  }

  const trigger = hotkeyRecorderHost.value?.querySelector<HTMLButtonElement>(
    ".visual-hotkey-recorder__recording .s-hotkey-recorder"
  );
  trigger?.click();
});

watch(
  launcherMotionPreset,
  (value) => {
    applyMotionPresetState(value);
  },
  { immediate: true }
);

watch(
  appearanceTheme,
  (value) => {
    applyThemeState(value);
  },
  { immediate: true }
);

watch(
  appearanceBlurEnabled,
  (value) => {
    applyBlurState(value);
  },
  { immediate: true }
);
</script>

<template>
  <main
    class="visual-regression-root min-h-screen px-8 py-10 text-ui-text"
    :class="{ 'visual-regression-root--freeze-motion': freezeLauncherMotionSurfaces }"
  >
    <div class="mx-auto grid w-full max-w-[920px] gap-10">
      <header class="grid gap-3">
        <h1 class="text-[15px] font-semibold tracking-wide text-ui-text">Visual Regression Harness</h1>
        <p class="text-[12.5px] leading-snug text-ui-subtle">
          该页面用于截图级视觉回归门禁（Tailwind 迁移期间防止样式丢失）。
        </p>
      </header>

      <section v-if="scenario === 'settings-ui-overview'" class="grid gap-8">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SSegmentNav</h2>
          <div class="rounded-panel border border-ui-border bg-ui-bg-deep p-4">
            <SSegmentNav :items="segmentItems" model-value="general" ariaLabel="设置分区" />
          </div>
        </div>

        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SToggle</h2>
          <div class="grid gap-3 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-ui-subtle">Off</span>
              <SToggle :model-value="false" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-ui-subtle">On</span>
              <SToggle :model-value="true" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-ui-subtle">Compact</span>
              <SToggle :model-value="true" compact />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-ui-subtle">Disabled</span>
              <SToggle :model-value="true" disabled />
            </div>
          </div>
        </div>

        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SDropdown</h2>
          <div class="grid gap-4 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Default</p>
              <SDropdown v-model="selectedTerminal" :options="dropdownOptions" />
            </div>
            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Ghost</p>
              <SDropdown v-model="selectedTerminal" :options="dropdownOptions" variant="ghost" />
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="scenario === 'settings-ui-dropdown-open'" class="grid gap-6">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SDropdown（打开态）</h2>
          <p class="text-[12.5px] leading-snug text-ui-subtle">
            覆盖：面板背景/边框/阴影、选中态、聚焦态、描述与 meta 排版。
          </p>
          <div
            ref="dropdownOpenHost"
            class="rounded-panel border border-ui-border bg-ui-bg-deep p-4"
          >
            <SDropdown v-model="selectedTerminal" :options="dropdownOptions" />
          </div>
        </div>
      </section>

      <section v-else-if="scenario === 'settings-ui-slider'" class="grid gap-8">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SSlider</h2>
          <div class="grid gap-4 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Opacity</p>
              <SSlider
                :model-value="sliderValue"
                :min="0.2"
                :max="1"
                :step="0.01"
                show-value
                :format-value="formatSliderValue"
                @update:model-value="onSliderValueUpdate"
              />
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="scenario === 'settings-ui-hotkey-recorder'" class="grid gap-8">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SHotkeyRecorder</h2>
          <p class="text-[12.5px] leading-snug text-ui-subtle">
            覆盖：空态/录制态/冲突态、kbd 渲染、ring 与边框色。
          </p>
          <div
            ref="hotkeyRecorderHost"
            class="grid gap-4 rounded-panel border border-ui-border bg-ui-bg-deep p-4"
          >
            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Empty</p>
              <SHotkeyRecorder model-value="" label="切换焦点区域" />
            </div>

            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Default</p>
              <SHotkeyRecorder model-value="Ctrl+K" label="唤起窗口" />
            </div>

            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Conflict</p>
              <SHotkeyRecorder model-value="Ctrl+K" label="唤起窗口" conflict="与「切换焦点区域」冲突" />
            </div>

            <div class="grid gap-2">
              <p class="text-[12.5px] text-ui-subtle">Recording（programmatic）</p>
              <div class="visual-hotkey-recorder__recording">
                <SHotkeyRecorder model-value="Alt+V" label="唤起窗口" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="scenario === 'settings-appearance-motion-preset'" class="grid gap-8">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-ui-text">SettingsAppearanceSection Motion Preset</h2>
          <p class="text-[12.5px] leading-snug text-ui-subtle">
            使用真实 Appearance section 同时展示 `expressive` 与 `steady-tool` 的 active 态。
          </p>
          <div class="grid gap-4 min-[1100px]:grid-cols-2">
            <section class="grid gap-2 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-[12px] font-semibold text-ui-text">Expressive</h3>
                <span class="rounded-full border border-ui-text/10 bg-ui-text/6 px-2 py-0.5 text-[11px] text-ui-subtle">
                  默认
                </span>
              </div>
              <SettingsAppearanceSection
                :window-opacity="appearancePreviewOpacity"
                :theme="appearanceTheme"
                :blur-enabled="appearanceBlurEnabled"
                motion-preset="expressive"
                :themes="THEME_REGISTRY"
                :motion-presets="MOTION_PRESET_REGISTRY"
              />
            </section>

            <section class="grid gap-2 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-[12px] font-semibold text-ui-text">Steady Tool</h3>
                <span class="rounded-full border border-ui-text/10 bg-ui-text/6 px-2 py-0.5 text-[11px] text-ui-subtle">
                  收紧
                </span>
              </div>
              <SettingsAppearanceSection
                :window-opacity="appearancePreviewOpacity"
                :theme="appearanceTheme"
                :blur-enabled="appearanceBlurEnabled"
                motion-preset="steady-tool"
                :themes="THEME_REGISTRY"
                :motion-presets="MOTION_PRESET_REGISTRY"
              />
            </section>
          </div>
        </div>
      </section>

      <section
        v-else-if="
          scenario === 'launcher-motion-surfaces-expressive' ||
          scenario === 'launcher-motion-surfaces-steady-tool'
        "
        class="grid gap-8"
      >
        <div class="grid gap-3">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-[13px] font-semibold text-ui-text">Launcher Motion Surfaces</h2>
            <span class="rounded-full border border-ui-text/10 bg-ui-text/6 px-2.5 py-1 text-[11px] text-ui-subtle">
              {{ launcherMotionPreset }}
            </span>
          </div>
          <p class="text-[12.5px] leading-snug text-ui-subtle">
            覆盖：toast、search result pressable、queue review overlay/panel、review card、safety dialog。
          </p>
        </div>

        <section class="grid gap-4 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
          <h3 class="text-[12px] font-semibold text-ui-text">Search + Toast</h3>
          <LauncherSearchPanel
            query="logs"
            :executing="false"
            execution-feedback-message="已加入 Flow"
            execution-feedback-tone="success"
            :drawer-open="true"
            :drawer-viewport-height="220"
            :keyboard-hints="[{ keys: ['Enter'], action: '执行' }, { keys: ['Tab'], action: '入队' }]"
            :filtered-results="visualSearchResults"
            :active-index="0"
            queued-feedback-command-id="cmd-sync-logs"
            :queued-command-count="visualStagedCommands.length"
            :flow-open="false"
            :review-open="false"
            :set-search-input-ref="noopElementRef"
            :set-drawer-ref="noopElementRef"
            :set-result-button-ref="noopIndexedElementRef"
          />
        </section>

        <section class="grid gap-4 rounded-panel border border-ui-border bg-ui-bg-deep p-4">
          <h3 class="text-[12px] font-semibold text-ui-text">Queue Review + Safety Dialog</h3>
          <div class="relative h-[420px] overflow-hidden rounded-ui border border-ui-border bg-ui-bg">
            <LauncherQueueReviewPanel
              queue-panel-state="open"
              :queue-open="true"
              :queued-commands="visualStagedCommands"
              :queue-hints="[{ keys: ['Ctrl+Enter'], action: '执行全部' }]"
              focus-zone="queue"
              :queue-active-index="0"
              :flow-open="true"
              :executing="false"
              execution-feedback-message="Flow 已就绪"
              execution-feedback-tone="neutral"
              :set-queue-panel-ref="noopElementRef"
              :set-queue-list-ref="noopElementRef"
            />
          </div>

          <div class="relative h-[320px] overflow-hidden rounded-ui border border-ui-border bg-ui-bg">
            <LauncherSafetyOverlay
              :safety-dialog="visualSafetyDialog"
              :executing="false"
            />
          </div>
        </section>
      </section>
    </div>
  </main>
</template>
