<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";

import SDropdown from "./components/settings/ui/SDropdown.vue";
import SSegmentNav from "./components/settings/ui/SSegmentNav.vue";
import SHotkeyRecorder from "./components/settings/ui/SHotkeyRecorder.vue";
import SSlider from "./components/settings/ui/SSlider.vue";
import SToggle from "./components/settings/ui/SToggle.vue";

type VisualScenarioId =
  | "settings-ui-overview"
  | "settings-ui-dropdown-open"
  | "settings-ui-slider"
  | "settings-ui-hotkey-recorder";

function normalizeScenario(hash: string): VisualScenarioId {
  const normalized = hash.replace(/^#/, "");
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

const segmentItems = [
  { id: "general", label: "通用", icon: "⚙" },
  { id: "appearance", label: "外观", icon: "✦" },
  { id: "about", label: "关于", icon: "ℹ" }
];

const dropdownOptions = [
  { value: "powershell", label: "PowerShell", description: "默认终端（示例）", meta: "C:\\Windows\\System32" },
  { value: "wt", label: "Windows Terminal", description: "推荐（示例）", meta: "wt.exe" },
  { value: "cmd", label: "CMD", description: "兼容（示例）", meta: "cmd.exe" }
];

const selectedTerminal = ref("powershell");
const formatSliderValue = (v: number) => `${Math.round(v * 100)}%`;

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
</script>

<template>
  <main class="min-h-screen px-8 py-10 text-ui-text">
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
            <SSegmentNav :items="segmentItems" model-value="general" />
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
    </div>
  </main>
</template>
