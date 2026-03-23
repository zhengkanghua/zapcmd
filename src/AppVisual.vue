<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";

import SDropdown from "./components/settings/ui/SDropdown.vue";
import SSegmentNav from "./components/settings/ui/SSegmentNav.vue";
import SToggle from "./components/settings/ui/SToggle.vue";

type VisualScenarioId = "settings-ui-overview" | "settings-ui-dropdown-open";

function normalizeScenario(hash: string): VisualScenarioId {
  const normalized = hash.replace(/^#/, "");
  if (normalized === "settings-ui-dropdown-open") {
    return "settings-ui-dropdown-open";
  }
  return "settings-ui-overview";
}

const scenario = computed<VisualScenarioId>(() => normalizeScenario(window.location.hash));

const dropdownOpenHost = ref<HTMLElement | null>(null);

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

/**
 * 视觉回归中的“下拉框打开态”必须稳定复现：
 * - SDropdown 面板是 Teleport 到 body 的，无法通过纯 CSS 静态渲染。
 * - 这里用一次程序化 click 触发内部 open 状态，覆盖交互态样式（hover/focus/selected）。
 */
onMounted(async () => {
  if (scenario.value !== "settings-ui-dropdown-open") {
    return;
  }

  await nextTick();
  const trigger = dropdownOpenHost.value?.querySelector<HTMLButtonElement>(".s-dropdown__trigger");
  trigger?.click();
});
</script>

<template>
  <main class="min-h-screen px-8 py-10 text-[var(--ui-text)]">
    <div class="mx-auto grid w-full max-w-[920px] gap-10">
      <header class="grid gap-3">
        <h1 class="text-[15px] font-semibold tracking-wide text-[var(--ui-text)]">Visual Regression Harness</h1>
        <p class="text-[12.5px] leading-snug text-[var(--ui-subtle)]">
          该页面用于截图级视觉回归门禁（Tailwind 迁移期间防止样式丢失）。
        </p>
      </header>

      <section v-if="scenario === 'settings-ui-overview'" class="grid gap-8">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-[var(--ui-text)]">SSegmentNav</h2>
          <div class="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-bg-deep)] p-4">
            <SSegmentNav :items="segmentItems" model-value="general" />
          </div>
        </div>

        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-[var(--ui-text)]">SToggle</h2>
          <div class="grid gap-3 rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-bg-deep)] p-4">
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-[var(--ui-subtle)]">Off</span>
              <SToggle :model-value="false" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-[var(--ui-subtle)]">On</span>
              <SToggle :model-value="true" />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-[var(--ui-subtle)]">Compact</span>
              <SToggle :model-value="true" compact />
            </div>
            <div class="flex items-center justify-between">
              <span class="text-[12.5px] text-[var(--ui-subtle)]">Disabled</span>
              <SToggle :model-value="true" disabled />
            </div>
          </div>
        </div>

        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-[var(--ui-text)]">SDropdown</h2>
          <div class="grid gap-4 rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-bg-deep)] p-4">
            <div class="grid gap-2">
              <p class="text-[12.5px] text-[var(--ui-subtle)]">Default</p>
              <SDropdown v-model="selectedTerminal" :options="dropdownOptions" />
            </div>
            <div class="grid gap-2">
              <p class="text-[12.5px] text-[var(--ui-subtle)]">Ghost</p>
              <SDropdown v-model="selectedTerminal" :options="dropdownOptions" variant="ghost" />
            </div>
          </div>
        </div>
      </section>

      <section v-else class="grid gap-6">
        <div class="grid gap-3">
          <h2 class="text-[13px] font-semibold text-[var(--ui-text)]">SDropdown（打开态）</h2>
          <p class="text-[12.5px] leading-snug text-[var(--ui-subtle)]">
            覆盖：面板背景/边框/阴影、选中态、聚焦态、描述与 meta 排版。
          </p>
          <div
            ref="dropdownOpenHost"
            class="rounded-[14px] border border-[var(--ui-border)] bg-[var(--ui-bg-deep)] p-4"
          >
            <SDropdown v-model="selectedTerminal" :options="dropdownOptions" />
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

