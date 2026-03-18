# Settings 面板重构实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Settings 窗口从左侧栏导航+手动保存重构为 Raycast 风格的顶部 Segment 导航+卡片分组+即时保存，同时通过独立入口拆分解决启动性能问题。

**Architecture:** 新建独立入口 `settings.html` + `main-settings.ts` + `AppSettings.vue`，彻底脱离 Launcher 初始化链。重写 6 个通用 UI 组件（SToggle/SSelect/SSlider/SHotkeyRecorder/SFilterChip/SSegmentNav），绑定 `--ui-*` 主题变量。简化 persistence 为即时保存模式，移除底部操作栏和关闭确认弹窗。

**Tech Stack:** Vue 3 + Pinia + TypeScript + Tauri 2 + CSS Custom Properties + Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-settings-panel-redesign-design.md`

---

## Chunk 1: 基础设施 — 独立入口 + CSS 变量 + 构建配置

### Task 1: 新增 CSS 主题变量

**Files:**
- Modify: `src/styles/themes/obsidian.css`
- Modify: `src/styles/tokens.css`
- Test: `src/features/themes/__tests__/themeRegistry.test.ts`（现有测试跑通即可）

- [ ] **Step 1: 在 obsidian.css 中新增 RGB 分量变量**

在 `:root[data-theme="obsidian"]` 中添加（紧跟 `--theme-surface-soft` 之后）：

```css
--theme-surface-rgb: 39, 39, 42;
--theme-text-rgb:    250, 250, 250;
```

- [ ] **Step 2: 在 tokens.css 中新增语义变量**

在 `:root` 块中添加（紧跟 `--ui-brand-soft` 之后）：

```css
--ui-brand-dim:  rgba(var(--theme-accent-rgb), 0.25);
```

- [ ] **Step 3: 运行现有测试验证无回归**

Run: `npx vitest run src/features/themes/__tests__/themeRegistry.test.ts`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/styles/themes/obsidian.css src/styles/tokens.css
git commit -m "feat(theme): 新增 settings 重构所需的 CSS 变量"
```

---

### Task 2: 创建 Settings 独立入口文件

**Files:**
- Create: `settings.html`
- Create: `src/main-settings.ts`
- Create: `src/AppSettings.vue`

- [ ] **Step 1: 创建 settings.html**

复制 `index.html` 的防闪烁脚本，修改入口脚本路径：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZapCmd Settings</title>
  <script>
    // 防闪烁：在 Vue 加载前同步应用主题
    ;(function () {
      try {
        var raw = localStorage.getItem("zapcmd.settings");
        if (raw) {
          var stored = JSON.parse(raw);
          var theme = (stored && stored.appearance && stored.appearance.theme) || "obsidian";
          var blur = stored && stored.appearance && stored.appearance.blurEnabled !== false;
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.blur = blur ? "on" : "off";
        } else {
          document.documentElement.dataset.theme = "obsidian";
          document.documentElement.dataset.blur = "on";
        }
      } catch (_) {
        document.documentElement.dataset.theme = "obsidian";
        document.documentElement.dataset.blur = "on";
      }
    })();
  </script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main-settings.ts"></script>
</body>
</html>
```

- [ ] **Step 2: 创建 main-settings.ts**

```typescript
import { createApp } from "vue";
import { createPinia } from "pinia";
import AppSettings from "./AppSettings.vue";
import { i18n, setAppLocale } from "./i18n";
import { readSettingsFromStorage } from "./stores/settingsStore";
import "./styles/index.css";

const initialSettings = readSettingsFromStorage();
setAppLocale(initialSettings.general.language);

createApp(AppSettings).use(createPinia()).use(i18n).mount("#app");
```

- [ ] **Step 3: 创建 AppSettings.vue 骨架**

```vue
<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useSettingsStore } from "./stores/settingsStore";
import { useTheme } from "./composables/app/useTheme";
import SettingsWindow from "./components/settings/SettingsWindow.vue";

const settingsStore = useSettingsStore();
const { theme, blurEnabled, windowOpacity } = storeToRefs(settingsStore);

useTheme({ themeId: theme, blurEnabled });

// TODO: Task 11 将在此处集成即时保存版 useSettingsWindow
</script>

<template>
  <SettingsWindow />
</template>
```

注意：这是骨架版本，后续 Task 会逐步完善 composable 集成和 props 传递。

- [ ] **Step 4: 提交**

```bash
git add settings.html src/main-settings.ts src/AppSettings.vue
git commit -m "feat(settings): 创建独立入口骨架文件"
```

---

### Task 3: Vite 多入口 + Rust 窗口改动

**Files:**
- Modify: `vite.config.js`（约 L100-105 附近的 `baseBuild` 区域）
- Modify: `src-tauri/src/windowing.rs`（L82-96）

- [ ] **Step 1: 在 vite.config.js 中添加多入口**

在 `baseBuild` 对象中添加 `rollupOptions`：

```javascript
const baseBuild = {
  target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
  minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
  sourcemap: !!process.env.TAURI_DEBUG,
  rollupOptions: {
    input: {
      main: "index.html",
      settings: "settings.html",
    },
  },
};
```

- [ ] **Step 2: 修改 windowing.rs 中 settings 窗口配置**

将 `open_or_focus_settings_window` 函数（L82-96）中的两处修改：

```rust
// L84: URL 改为 settings.html
tauri::WebviewUrl::App("settings.html".into()),
// L91: 移除原生标题栏
.decorations(false)
```

- [ ] **Step 3: 验证 Rust 编译通过**

Run: `cd src-tauri && cargo check`
Expected: 编译成功

- [ ] **Step 4: 验证前端构建通过**

Run: `npx vite build`
Expected: 生成 `dist/index.html` 和 `dist/settings.html` 两个入口

- [ ] **Step 5: 提交**

```bash
git add vite.config.js src-tauri/src/windowing.rs
git commit -m "feat(settings): 配置 Vite 多入口 + Rust 窗口指向独立入口"
```

---

### Task 4: 基础设施集成验证

**Files:**
- 无新文件，验证已有改动

- [ ] **Step 1: 运行完整质量门禁**

Run: `npm run check:all`
Expected: lint + typecheck + test + build + check:rust 全绿

- [ ] **Step 2: 若有失败，修复后重新运行**

常见问题：
- TypeScript 可能报 AppSettings.vue 中未使用的 import → 调整 import
- Lint 可能对 settings.html 内联脚本报警 → 添加 eslint-disable 注释（如有必要）

- [ ] **Step 3: 提交修复（如有）**

---

## Chunk 2: UI 组件库

### Task 5: SToggle 组件

**Files:**
- Create: `src/components/settings/ui/SToggle.vue`
- Create: `src/components/settings/ui/__tests__/SToggle.test.ts`

- [ ] **Step 1: 编写 SToggle 测试**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SToggle from "../SToggle.vue";

describe("SToggle", () => {
  it("renders on state when modelValue is true", () => {
    const wrapper = mount(SToggle, { props: { modelValue: true } });
    expect(wrapper.find("[role='switch']").attributes("aria-checked")).toBe("true");
  });

  it("renders off state when modelValue is false", () => {
    const wrapper = mount(SToggle, { props: { modelValue: false } });
    expect(wrapper.find("[role='switch']").attributes("aria-checked")).toBe("false");
  });

  it("emits update:modelValue on click", async () => {
    const wrapper = mount(SToggle, { props: { modelValue: false } });
    await wrapper.find("[role='switch']").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[true]]);
  });

  it("emits update:modelValue on Space keydown", async () => {
    const wrapper = mount(SToggle, { props: { modelValue: true } });
    await wrapper.find("[role='switch']").trigger("keydown", { key: " " });
    expect(wrapper.emitted("update:modelValue")).toEqual([[false]]);
  });

  it("supports compact size via prop", () => {
    const wrapper = mount(SToggle, { props: { modelValue: true, compact: true } });
    expect(wrapper.find(".s-toggle--compact").exists()).toBe(true);
  });

  it("is disabled when disabled prop is true", async () => {
    const wrapper = mount(SToggle, { props: { modelValue: false, disabled: true } });
    await wrapper.find("[role='switch']").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/components/settings/ui/__tests__/SToggle.test.ts`
Expected: FAIL（组件不存在）

- [ ] **Step 3: 实现 SToggle**

```vue
<script setup lang="ts">
interface SToggleProps {
  modelValue: boolean;
  compact?: boolean;
  disabled?: boolean;
}

const props = withDefaults(defineProps<SToggleProps>(), {
  compact: false,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
}>();

function toggle() {
  if (!props.disabled) {
    emit("update:modelValue", !props.modelValue);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggle();
  }
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :class="['s-toggle', { 's-toggle--on': modelValue, 's-toggle--compact': compact, 's-toggle--disabled': disabled }]"
    :aria-checked="String(modelValue)"
    :disabled="disabled"
    @click="toggle"
    @keydown="onKeydown"
  >
    <span class="s-toggle__thumb" />
  </button>
</template>

<style scoped>
.s-toggle {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 10px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--ui-toggle-off);
  transition: background 150ms cubic-bezier(0.33, 1, 0.68, 1);
  flex-shrink: 0;
}

.s-toggle--on {
  background: var(--ui-toggle-on);
}

.s-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ui-text-muted, #71717a);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 150ms cubic-bezier(0.33, 1, 0.68, 1), background 150ms;
}

.s-toggle--on .s-toggle__thumb {
  transform: translateX(16px);
  background: white;
}

.s-toggle--compact {
  width: 30px;
  height: 17px;
}

.s-toggle--compact .s-toggle__thumb {
  width: 13px;
  height: 13px;
}

.s-toggle--compact.s-toggle--on .s-toggle__thumb {
  transform: translateX(13px);
}

.s-toggle--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.s-toggle:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}
</style>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/components/settings/ui/__tests__/SToggle.test.ts`
Expected: PASS（6/6）

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/ui/SToggle.vue src/components/settings/ui/__tests__/SToggle.test.ts
git commit -m "feat(settings): 新增 SToggle 组件 + 测试"
```

---

### Task 6: SSegmentNav 组件

**Files:**
- Create: `src/components/settings/ui/SSegmentNav.vue`
- Create: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SSegmentNav from "../SSegmentNav.vue";

const items = [
  { id: "hotkeys", label: "快捷键", icon: "⌨" },
  { id: "general", label: "通用", icon: "⚙" },
  { id: "commands", label: "命令", icon: "☰" },
];

describe("SSegmentNav", () => {
  it("renders all nav items", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" },
    });
    expect(wrapper.findAll("[role='tab']")).toHaveLength(3);
  });

  it("marks active tab with aria-selected", () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "general" },
    });
    const tabs = wrapper.findAll("[role='tab']");
    expect(tabs[1].attributes("aria-selected")).toBe("true");
    expect(tabs[0].attributes("aria-selected")).toBe("false");
  });

  it("emits update:modelValue on click", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" },
    });
    await wrapper.findAll("[role='tab']")[2].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["commands"]]);
  });

  it("supports keyboard navigation with ArrowRight/ArrowLeft", async () => {
    const wrapper = mount(SSegmentNav, {
      props: { items, modelValue: "hotkeys" },
    });
    const tablist = wrapper.find("[role='tablist']");
    await tablist.trigger("keydown", { key: "ArrowRight" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["general"]]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/components/settings/ui/__tests__/SSegmentNav.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 SSegmentNav**

```vue
<script setup lang="ts">
import { computed } from "vue";

interface SegmentNavItem {
  id: string;
  label: string;
  icon: string;
}

const props = defineProps<{
  items: SegmentNavItem[];
  modelValue: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const activeIndex = computed(() =>
  props.items.findIndex((item) => item.id === props.modelValue)
);

function onKeydown(e: KeyboardEvent) {
  const idx = activeIndex.value;
  let next = idx;
  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    next = (idx + 1) % props.items.length;
  } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    next = (idx - 1 + props.items.length) % props.items.length;
  } else if (e.key === "Home") {
    next = 0;
  } else if (e.key === "End") {
    next = props.items.length - 1;
  } else {
    return;
  }
  e.preventDefault();
  emit("update:modelValue", props.items[next].id);
}
</script>

<template>
  <nav class="s-segment-nav" role="tablist" @keydown="onKeydown">
    <button
      v-for="item in items"
      :key="item.id"
      role="tab"
      type="button"
      :class="['s-segment-nav__tab', { 's-segment-nav__tab--active': modelValue === item.id }]"
      :aria-selected="String(modelValue === item.id)"
      :tabindex="modelValue === item.id ? 0 : -1"
      @click="emit('update:modelValue', item.id)"
    >
      <span class="s-segment-nav__icon">{{ item.icon }}</span>
      <span class="s-segment-nav__label">{{ item.label }}</span>
    </button>
  </nav>
</template>

<style scoped>
.s-segment-nav {
  display: flex;
  justify-content: center;
  gap: 3px;
  padding: 3px;
  background: var(--ui-bg-soft);
  border-radius: 10px;
  width: fit-content;
  margin: 0 auto;
}

.s-segment-nav__tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: var(--ui-subtle);
  opacity: 0.55;
  font-size: 13px;
  transition: all 150ms cubic-bezier(0.33, 1, 0.68, 1);
}

.s-segment-nav__tab:hover {
  opacity: 0.8;
}

.s-segment-nav__tab--active {
  background: var(--ui-brand-soft);
  border-color: var(--ui-brand-dim);
  color: var(--ui-brand);
  opacity: 1;
  font-weight: 500;
}

.s-segment-nav__tab:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ui-brand-soft);
}

.s-segment-nav__icon {
  font-size: 14px;
}

.s-segment-nav__label {
  font-size: 13px;
}
</style>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/components/settings/ui/__tests__/SSegmentNav.test.ts`
Expected: PASS（4/4）

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/ui/SSegmentNav.vue src/components/settings/ui/__tests__/SSegmentNav.test.ts
git commit -m "feat(settings): 新增 SSegmentNav 组件 + 测试"
```

---

### Task 7: SSelect 组件

**Files:**
- Create: `src/components/settings/ui/SSelect.vue`
- Create: `src/components/settings/ui/__tests__/SSelect.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SSelect from "../SSelect.vue";

const options = [
  { value: "ps", label: "PowerShell" },
  { value: "cmd", label: "Command Prompt" },
  { value: "wt", label: "Windows Terminal" },
];

describe("SSelect", () => {
  it("renders selected option label", () => {
    const wrapper = mount(SSelect, { props: { modelValue: "ps", options } });
    expect(wrapper.find(".s-select__trigger").text()).toContain("PowerShell");
  });

  it("opens dropdown on click", async () => {
    const wrapper = mount(SSelect, { props: { modelValue: "ps", options } });
    await wrapper.find(".s-select__trigger").trigger("click");
    expect(wrapper.find("[role='listbox']").exists()).toBe(true);
  });

  it("emits update:modelValue on option select", async () => {
    const wrapper = mount(SSelect, {
      props: { modelValue: "ps", options },
      attachTo: document.body,
    });
    await wrapper.find(".s-select__trigger").trigger("click");
    const items = wrapper.findAll("[role='option']");
    await items[1].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["cmd"]]);
    wrapper.unmount();
  });

  it("closes on Escape", async () => {
    const wrapper = mount(SSelect, {
      props: { modelValue: "ps", options },
      attachTo: document.body,
    });
    await wrapper.find(".s-select__trigger").trigger("click");
    expect(wrapper.find("[role='listbox']").exists()).toBe(true);
    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "Escape" });
    expect(wrapper.find("[role='listbox']").exists()).toBe(false);
    wrapper.unmount();
  });

  it("navigates with ArrowDown/ArrowUp", async () => {
    const wrapper = mount(SSelect, {
      props: { modelValue: "ps", options },
      attachTo: document.body,
    });
    await wrapper.find(".s-select__trigger").trigger("click");
    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "ArrowDown" });
    await wrapper.find(".s-select__trigger").trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("update:modelValue")).toEqual([["cmd"]]);
    wrapper.unmount();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/components/settings/ui/__tests__/SSelect.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 SSelect**

参考现有 `src/components/settings/parts/SettingsSelectControl.vue`（198 行）的键盘逻辑（L86-129），但使用 Teleport + fixed 定位替代绝对定位。

**实现要求**（执行者必须满足测试中的所有断言）：

- Props: `modelValue: string`、`options: Array<{ value: string; label: string; description?: string }>`、`disabled?: boolean`
- Emits: `update:modelValue`
- 触发器 `.s-select__trigger` button，显示当前选中值的 label + 箭头 SVG
- 下拉面板通过 `<Teleport to="body">` 挂载到 body 外部
- 面板使用 `position: fixed`，通过 `getBoundingClientRect()` 计算触发器位置动态定位
- 面板项 `role="option"`，`role="listbox"` 容器
- 完整键盘导航：ArrowUp/Down 移动 `focusIndex`，Enter 选中当前项，Esc 关闭面板
- 外部点击关闭：`onMounted` 注册 `document.addEventListener("pointerdown", ...)` + `onUnmounted` 移除
- 选中项左侧显示对勾
- 所有色值使用 `var(--ui-*)` 变量（Spec 6.2 节）

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/components/settings/ui/__tests__/SSelect.test.ts`
Expected: PASS（5/5）

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/ui/SSelect.vue src/components/settings/ui/__tests__/SSelect.test.ts
git commit -m "feat(settings): 新增 SSelect 组件 + Teleport 浮层 + 测试"
```

---

### Task 8: SSlider 组件

**Files:**
- Create: `src/components/settings/ui/SSlider.vue`
- Create: `src/components/settings/ui/__tests__/SSlider.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SSlider from "../SSlider.vue";

describe("SSlider", () => {
  it("renders with current value", () => {
    const wrapper = mount(SSlider, {
      props: { modelValue: 0.96, min: 0.2, max: 1, step: 0.01 },
    });
    const input = wrapper.find("input[type='range']");
    expect((input.element as HTMLInputElement).value).toBe("0.96");
  });

  it("emits update:modelValue on input", async () => {
    const wrapper = mount(SSlider, {
      props: { modelValue: 0.96, min: 0.2, max: 1, step: 0.01 },
    });
    await wrapper.find("input[type='range']").setValue("0.5");
    expect(wrapper.emitted("update:modelValue")?.[0][0]).toBeCloseTo(0.5);
  });

  it("displays formatted value when showValue is true", () => {
    const wrapper = mount(SSlider, {
      props: { modelValue: 0.96, min: 0.2, max: 1, step: 0.01, showValue: true, formatValue: (v: number) => `${Math.round(v * 100)}%` },
    });
    expect(wrapper.text()).toContain("96%");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现 SSlider**

**实现要求**（执行者必须满足测试断言）：

- Props: `modelValue: number`、`min: number`、`max: number`、`step: number`、`showValue?: boolean`、`formatValue?: (v: number) => string`
- Emits: `update:modelValue`
- 使用原生 `<input type="range">` 作为基础，通过 CSS 自定义样式覆盖
- 计算 `--fill-percent` CSS 变量驱动已填充部分的 accent 色轨道：`((modelValue - min) / (max - min)) * 100`
- 轨道样式：6px 高，`var(--ui-border)` 背景，`var(--ui-brand)` 填充（使用 `linear-gradient`）
- 拇指：16px 圆形，`var(--ui-brand)` 色，`border: 2px solid var(--ui-bg)`，外发光 `box-shadow`
- `showValue` 为 true 时右侧显示 `formatValue(modelValue)` 文本
- Spec 6.3 节

- [ ] **Step 4: 运行测试确认通过**

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/ui/SSlider.vue src/components/settings/ui/__tests__/SSlider.test.ts
git commit -m "feat(settings): 新增 SSlider 组件 + 测试"
```

---

### Task 9: SHotkeyRecorder 组件

**Files:**
- Create: `src/components/settings/ui/SHotkeyRecorder.vue`
- Create: `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import SHotkeyRecorder from "../SHotkeyRecorder.vue";

describe("SHotkeyRecorder", () => {
  it("displays current hotkey in kbd style", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Alt+V", label: "唤起窗口" },
    });
    expect(wrapper.text()).toContain("Alt");
    expect(wrapper.text()).toContain("V");
  });

  it("shows placeholder when no hotkey is set", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "显示/隐藏执行流" },
    });
    expect(wrapper.find(".s-hotkey-recorder--empty").exists()).toBe(true);
  });

  it("enters recording mode on click", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Alt+V", label: "唤起窗口" },
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(true);
  });

  it("captures key combination during recording", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "test" },
      attachTo: document.body,
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    await wrapper.find(".s-hotkey-recorder").trigger("keydown", {
      key: "v", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false,
      preventDefault: vi.fn(),
    });
    // 组件应捕获并显示 Ctrl+V
    expect(wrapper.text()).toContain("Ctrl");
    wrapper.unmount();
  });

  it("cancels recording on Escape", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Alt+V", label: "test" },
      attachTo: document.body,
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    await wrapper.find(".s-hotkey-recorder").trigger("keydown", { key: "Escape" });
    expect(wrapper.find(".s-hotkey-recorder--recording").exists()).toBe(false);
    // 原值不变
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    wrapper.unmount();
  });

  it("emits update:modelValue on blur after recording", async () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "", label: "test" },
      attachTo: document.body,
    });
    await wrapper.find(".s-hotkey-recorder").trigger("click");
    await wrapper.find(".s-hotkey-recorder").trigger("keydown", {
      key: "v", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false,
      preventDefault: vi.fn(),
    });
    await wrapper.find(".s-hotkey-recorder").trigger("blur");
    expect(wrapper.emitted("update:modelValue")?.[0][0]).toBe("Ctrl+V");
    wrapper.unmount();
  });

  it("shows conflict state", () => {
    const wrapper = mount(SHotkeyRecorder, {
      props: { modelValue: "Ctrl+Enter", label: "test", conflict: "与「加入执行流」冲突" },
    });
    expect(wrapper.find(".s-hotkey-recorder--conflict").exists()).toBe(true);
    expect(wrapper.text()).toContain("冲突");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现 SHotkeyRecorder**

**实现要求**（执行者必须满足测试中的所有 7 项断言）：

- Props: `modelValue: string`（如 `"Alt+V"`）、`label: string`、`conflict?: string`（冲突提示文本）
- Emits: `update:modelValue`
- 内部状态：`recording: boolean`、`capturedKeys: string`（临时捕获值）
- 交互流程：
  1. 点击 `.s-hotkey-recorder` → `recording = true`，自动聚焦
  2. keydown 处理：忽略纯修饰键（Shift/Ctrl/Alt/Meta 单独按下）；捕获 `修饰键+主键` 组合，格式化为 `"Ctrl+Alt+V"` 格式，更新 `capturedKeys`
  3. Escape → 取消录制（`recording = false`、`capturedKeys = ""`），**不** emit
  4. blur → 如果 `capturedKeys` 非空，emit `update:modelValue`；否则恢复原值
- CSS 状态类：`--recording`（accent 发光环）、`--conflict`（红色边框）、`--empty`（虚线边框，无值时）、`--saved`（绿色对勾闪现 300ms）
- 按键格式化逻辑可复用 `src/composables/settings/useSettingsWindow/hotkey.ts` 中的 `normalizeHotkeyValue`
- Spec 6.4 节

- [ ] **Step 4: 运行测试确认通过**

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/ui/SHotkeyRecorder.vue src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts
git commit -m "feat(settings): 新增 SHotkeyRecorder 组件 + 测试"
```

---

### Task 10: SFilterChip 组件

**Files:**
- Create: `src/components/settings/ui/SFilterChip.vue`
- Create: `src/components/settings/ui/__tests__/SFilterChip.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SFilterChip from "../SFilterChip.vue";

const options = [
  { value: "all", label: "全部来源" },
  { value: "builtin", label: "内置" },
  { value: "user", label: "用户" },
];

describe("SFilterChip", () => {
  it("renders default label when value equals defaultValue", () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "all", options, defaultValue: "all" },
    });
    expect(wrapper.find(".s-filter-chip--active").exists()).toBe(false);
    expect(wrapper.text()).toContain("全部来源");
  });

  it("shows active state when value differs from default", () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "user", options, defaultValue: "all" },
    });
    expect(wrapper.find(".s-filter-chip--active").exists()).toBe(true);
    expect(wrapper.text()).toContain("用户");
  });

  it("shows clear button when active", () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "user", options, defaultValue: "all" },
    });
    expect(wrapper.find(".s-filter-chip__clear").exists()).toBe(true);
  });

  it("emits defaultValue on clear click", async () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "user", options, defaultValue: "all" },
    });
    await wrapper.find(".s-filter-chip__clear").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["all"]]);
  });

  it("opens dropdown and selects option", async () => {
    const wrapper = mount(SFilterChip, {
      props: { modelValue: "all", options, defaultValue: "all" },
      attachTo: document.body,
    });
    await wrapper.find(".s-filter-chip__trigger").trigger("click");
    const items = wrapper.findAll("[role='option']");
    await items[2].trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([["user"]]);
    wrapper.unmount();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现 SFilterChip**

**实现要求**（执行者必须满足测试中的所有 5 项断言）：

- Props: `modelValue: string`、`options: Array<{ value: string; label: string }>`、`defaultValue: string`
- Emits: `update:modelValue`
- 触发器 `.s-filter-chip__trigger`：pill 形按钮，显示当前选中 option 的 label + 下箭头
- 激活态（`modelValue !== defaultValue`）：添加 `.s-filter-chip--active` 类（accent 高亮），显示 `.s-filter-chip__clear` × 按钮，点击 × 时 emit `defaultValue`
- 下拉面板复用 SSelect 的 Teleport + fixed 定位模式（`<Teleport to="body">`）
- 面板项 `role="option"`，选中态对勾
- Spec 6.5 节

- [ ] **Step 4: 运行测试确认通过**

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/ui/SFilterChip.vue src/components/settings/ui/__tests__/SFilterChip.test.ts
git commit -m "feat(settings): 新增 SFilterChip 组件 + 测试"
```

---

## Chunk 3: 即时保存 + 页面重构

### Task 11: 简化 persistence 为即时保存

**Files:**
- Modify: `src/composables/settings/useSettingsWindow/persistence.ts`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/index.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`

- [ ] **Step 1: 修改 model.ts**

精简 `SettingsWindowState`（保留冲突提示所需字段）：

**移除的字段**：`settingsDirty`、`settingsBaselineSnapshot`、`closeConfirmOpen`、`settingsSaved`
**保留的字段**：`settingsError`、`settingsErrorRoute`、`settingsErrorHotkeyFieldIds`、`settingsErrorPrimaryHotkeyField`（冲突提示仍需要）

**移除的函数**：
- `syncSettingsBaseline`（L114-120）
- `restoreSettingsBaseline`（L122-131）
- `hasUnsavedSettingsChanges`（L133-138）
- `markSettingsDirty`（L88-91）
- `resetSettingsDirty`（L93-95）

**保留的函数**（冲突提示需要）：
- `clearSettingsErrorState` → 保留不变
- `applySettingsValidationIssue` → 保留不变
- `getHotkeyEntries`、`getDuplicateHotkeyConflict`、`getDuplicateHotkeyIssue` → 保留
- `tryResolveRouteFromHash` → 保留
- `createSettingsState` → 精简后保留（移除 `settingsDirty`、`settingsBaselineSnapshot`、`closeConfirmOpen`、`settingsSaved`）

- [ ] **Step 2: 重写 persistence.ts**

简化为即时保存模式。移除 `saveSettings`（批量保存）、`prepareToCloseSettingsWindow`（关闭确认）、`cancelCloseConfirm`、`discardUnsavedChanges`。

新增单项保存函数：

```typescript
export interface InstantPersistenceActions {
  persistSetting: () => Promise<void>;
  loadSettings: () => void;
  applyHotkeyChange: (fieldId: HotkeyFieldId, value: string) => Promise<void>;
  applyAutoStartChange: (enabled: boolean) => Promise<void>;
}
```

- `persistSetting()`：`store.persist()` → `broadcastSettingsUpdated()`
- `applyHotkeyChange()`：校验冲突 → 无冲突则 `store.setHotkey()` → `writeLauncherHotkey()` → `persistSetting()`；失败回滚
- `applyAutoStartChange()`：`store.setLaunchAtLogin()` → `writeAutoStartEnabled()` → `persistSetting()`；失败回滚

- [ ] **Step 3: 更新 index.ts**

移除 `cancelHotkeyRecording` 传入 persistence 的关联、`prepareToCloseSettingsWindow` 相关逻辑。返回新的 `InstantPersistenceActions` 接口。

- [ ] **Step 4: 更新 persistence 测试**

移除已删除功能的测试用例（close confirm、discard changes），新增即时保存测试：

```typescript
it("persists and broadcasts on single setting change", async () => { ... });
it("rolls back hotkey on writeLauncherHotkey failure", async () => { ... });
it("rolls back auto-start toggle on write failure", async () => { ... });
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/composables/__tests__/settings/`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/composables/settings/useSettingsWindow/
git add src/composables/__tests__/settings/
git commit -m "refactor(settings): 简化 persistence 为即时保存模式"
```

---

### Task 12: SettingsWindow 主体重构

**Files:**
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/types.ts`
- Delete: `src/components/settings/parts/SettingsNav.vue`

- [ ] **Step 1: 更新 types.ts**

- 移除 `SettingsNavProps`（`settingsNavItems`、`settingsRoute`、`settingsErrorRoute`）
- 移除 `SettingsWindowProps` 中的 `settingsError`、`settingsSaved`、`closeConfirmOpen`
- 新增 `SettingsWindowProps` 的 `settingsRoute: SettingsRoute` 直接属性

- [ ] **Step 2: 重写 SettingsWindow.vue 模板**

新布局结构：

```
<main class="settings-window-root">
  <!-- 拖拽区（含自定义窗口控制按钮，因为 decorations=false） -->
  <div class="settings-drag-region" data-tauri-drag-region>
    <span class="settings-drag-region__title">ZapCmd Settings</span>
    <div class="settings-drag-region__controls">
      <button class="settings-drag-region__btn" aria-label="最小化" @click="minimizeWindow">─</button>
      <button class="settings-drag-region__btn" aria-label="最大化" @click="toggleMaximize">□</button>
      <button class="settings-drag-region__btn settings-drag-region__btn--close" aria-label="关闭" @click="closeWindow">×</button>
    </div>
  </div>

  <!-- Segment 导航 -->
  <div class="settings-nav-bar">
    <SSegmentNav :items="navItems" v-model="settingsRoute" />
  </div>

  <!-- 内容区 -->
  <div class="settings-content" :class="{ 'settings-content--full-width': settingsRoute === 'commands' }">
    <SettingsHotkeysSection v-if="settingsRoute === 'hotkeys'" ... />
    <SettingsGeneralSection v-else-if="settingsRoute === 'general'" ... />
    <SettingsCommandsSection v-else-if="settingsRoute === 'commands'" ... />
    <SettingsAppearanceSection v-else-if="settingsRoute === 'appearance'" ... />
    <SettingsAboutSection v-else ... />
  </div>
</main>
```

窗口控制按钮调用 Tauri API：
```typescript
import { getCurrentWindow } from "@tauri-apps/api/window";
const appWindow = getCurrentWindow();
const minimizeWindow = () => appWindow.minimize();
const toggleMaximize = () => appWindow.toggleMaximize();
const closeWindow = () => appWindow.close();
```

移除：底部 footer、close-confirm dialog、error/success toast、hotkey hint。

- [ ] **Step 3: 精简 emits**

移除 `close`、`apply`、`confirm`、`navigate-to-error`、`cancel-close-confirm`、`discard-close-confirm`。

- [ ] **Step 4: 删除 SettingsNav.vue**

- [ ] **Step 5: 运行 typecheck**

Run: `npx vue-tsc --noEmit`
Expected: 可能有类型错误（因为各 Section 组件的 props 还未更新），记录待修复项。

- [ ] **Step 6: 提交**

```bash
git add src/components/settings/
git rm src/components/settings/parts/SettingsNav.vue
git commit -m "refactor(settings): SettingsWindow 改为拖拽区+Segment导航+卡片内容布局"
```

---

### Task 13: SettingsHotkeysSection + SettingsGeneralSection 重构

**Files:**
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Delete: `src/components/settings/parts/SettingsSelectControl.vue`

- [ ] **Step 1: 重写 SettingsHotkeysSection**

改为卡片分组布局（全局 / 搜索区 / 执行流）。每行使用 `SHotkeyRecorder`，传入 `modelValue`（当前快捷键值）、`label`（快捷键名称）、`conflict`（冲突提示，来自 `settingsErrorHotkeyFieldIds`）。使用 `.settings-card` / `.settings-card__title` / `.settings-card__row` 类名。

- [ ] **Step 2: 重写 SettingsGeneralSection**

改为卡片分组布局（启动 / 终端 / 界面）。使用 `SToggle`（自动更新、开机自启）+ `SSelect`（默认终端、界面语言）。终端路径为只读 monospace 文本。移除内联终端下拉逻辑。

- [ ] **Step 3: 更新 SettingsGeneralSection.i18n.test.ts**

适配新的卡片布局和 SToggle/SSelect 组件。更新 DOM 选择器断言。

- [ ] **Step 4: 删除 SettingsSelectControl.vue**

- [ ] **Step 5: 运行测试**

Run: `npx vitest run src/components/settings/parts/__tests__/SettingsGeneralSection`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/settings/parts/
git rm src/components/settings/parts/SettingsSelectControl.vue
git commit -m "refactor(settings): 快捷键+通用页改为卡片布局 + 新组件"
```

---

### Task 14: SettingsCommandsSection 重构

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/settings/parts/commandFilterHelpers.ts`

- [ ] **Step 1: 重写 SettingsCommandsSection**

改为工具栏 + chip 筛选 + 表格布局：

- 工具栏：搜索输入框（`flex: 1`） + 统计徽标（筛选数/总数 + 已启用数）
- 筛选栏：6 个 `SFilterChip`（来源/状态/分类/文件/冲突/问题） + 排序 chip + 重置链接，`flex-wrap: wrap`
- 表格：CSS Grid `grid-template-columns: 1fr 80px 56px 44px`
- 命令行：命令名+ID 合并同行、分类文本、来源圆点+文字、`SToggle` compact 版
- 禁用命令：整行 `opacity: 0.5`
- Hover Tooltip：使用原生 `title` 属性显示 JSON 文件路径，如 `:title="row.sourcePath"`
- 移除分组模式（`groupedByFile`）

- [ ] **Step 2: 更新 commandFilterHelpers.ts**

适配新的 chip 式筛选结构（如有需要）。移除 `buildActiveFilterChips` 中与旧布局绑定的逻辑。

- [ ] **Step 3: 运行 typecheck**

Run: `npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/components/settings/parts/SettingsCommandsSection.vue src/components/settings/parts/commandFilterHelpers.ts
git commit -m "refactor(settings): 命令管理页改为表格+chip筛选布局"
```

---

### Task 15: SettingsAppearanceSection + SettingsAboutSection 重构

**Files:**
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] **Step 1: 重写 SettingsAppearanceSection**

改为卡片分组布局（主题 / 视觉效果 / 实时预览）。使用 `SToggle`（毛玻璃）+ `SSlider`（透明度，`min=0.2 max=1 step=0.01`，`formatValue: v => Math.round(v * 100) + '%'`）。

- [ ] **Step 2: 重写 SettingsAboutSection**

品牌头部（项目 logo `src/assets/logo.png` 或 SVG，56×56 圆角 14px）+ 信息卡片 + 操作卡片。

**注意**：确认项目中 logo 资源路径。若不存在，使用 `⚡` emoji 作为占位，后续由用户替换。

- [ ] **Step 3: 更新 SettingsAboutSection 测试**

适配新的品牌头部+操作卡片布局。更新 DOM 选择器断言。

- [ ] **Step 4: 运行测试**

Run: `npx vitest run src/components/settings/parts/__tests__/`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/components/settings/parts/SettingsAppearanceSection.vue src/components/settings/parts/SettingsAboutSection.vue src/components/settings/parts/__tests__/
git commit -m "refactor(settings): 外观+关于页改为卡片布局"
```

---

### Task 16: settings.css 全面重写

**Files:**
- Modify: `src/styles/settings.css`

- [ ] **Step 1: 重写 settings.css**

从 924 行的旧样式全面重写。新样式必须：
- 所有色值使用 `var(--ui-*)` 变量，**零硬编码色值**
- `.settings-window-root`：`display: grid; grid-template-rows: 32px auto 1fr; height: 100vh;`
- `.settings-drag-region`：32px 高，`-webkit-app-region: drag`，flex 水平布局（标题居中，右侧控制按钮 `-webkit-app-region: no-drag`）
- `.settings-nav-bar`：`padding: 12px 24px 0`，flex 居中
- `.settings-content`：`overflow-y: auto; padding: 20px 32px 24px; max-width: 640px; margin: 0 auto;`
- `.settings-content--full-width`：`max-width: none;`（命令页自适应）
- `.settings-card`：`background: rgba(var(--theme-surface-rgb), 0.035); border: 1px solid var(--ui-border-light); border-radius: 12px; padding: 16px 20px; margin-bottom: 12px;`
- `.settings-card__title`：`font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: var(--ui-subtle);`
- `.settings-card__row`：`display: flex; justify-content: space-between; align-items: center; padding: 8px 0;`，行间 `border-bottom: 1px solid var(--ui-border-light)`
- 命令页表格：`.settings-commands-table`、`.settings-commands-table__header`、`.settings-commands-table__row` 使用 CSS Grid
- 响应式断点：`@media (max-width: 760px)` 调整 padding 和导航

- [ ] **Step 2: 运行构建验证**

Run: `npx vite build`
Expected: 构建成功

- [ ] **Step 3: 提交**

```bash
git add src/styles/settings.css
git commit -m "style(settings): 全面重写 settings.css，绑定主题变量"
```

---

## Chunk 4: AppSettings 集成 + 测试回归 + 验收

### Task 17: AppSettings.vue 完整集成

**Files:**
- Modify: `src/AppSettings.vue`
- Modify: `src/composables/settings/useSettingsWindow/viewModel.ts`

- [ ] **Step 1: 更新 viewModel.ts**

在 `settingsNavItems` computed 中将 `route` 字段改为 `id`（与 SSegmentNav 的 `SegmentNavItem` 接口对齐），并补充 `icon` 字段：

```typescript
settingsNavItems: computed(() => [
  { id: "hotkeys" as const, label: t("settings.nav.hotkeys"), icon: "⌨" },
  { id: "general" as const, label: t("settings.nav.general"), icon: "⚙" },
  { id: "commands" as const, label: t("settings.nav.commands"), icon: "☰" },
  { id: "appearance" as const, label: t("settings.nav.appearance"), icon: "✦" },
  { id: "about" as const, label: t("settings.nav.about"), icon: "ℹ" },
]),
```

同时更新 `SettingsNavItem` 类型定义（`src/components/settings/types.ts`）：`route` → `id`，新增 `icon: string`。

- [ ] **Step 2: 完善 AppSettings.vue**

集成所有 composable：
- `useSettingsStore` + `storeToRefs`
- `useTheme`
- `useSettingsWindow`（即时保存版）
- `useCommandManagement`
- `useHotkeyBindings`

将所有 props 和事件处理器正确传递给 `SettingsWindow`。

**`--ui-opacity` watch 实现**（在 `AppSettings.vue` 的 setup 中）：

```typescript
import { watch } from "vue";

watch(windowOpacity, (value) => {
  document.documentElement.style.setProperty("--ui-opacity", String(value));
}, { immediate: true });
```

- [ ] **Step 3: 验证 typecheck**

Run: `npx vue-tsc --noEmit`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/AppSettings.vue src/composables/settings/useSettingsWindow/viewModel.ts
git commit -m "feat(settings): AppSettings.vue 完整集成所有 composable"
```

---

### Task 18: 更新现有测试

**Files:**
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Modify: `src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] **Step 1: 更新 app.settings-hotkeys.test.ts**

移除与旧行为相关的测试（close confirm、apply/cancel、save success toast）。适配新的即时保存行为和 SHotkeyRecorder 交互。

- [ ] **Step 2: 更新 SettingsGeneralSection.i18n.test.ts**

适配新的卡片布局结构和 SToggle/SSelect 组件。

- [ ] **Step 3: 更新 SettingsAboutSection 测试**

适配新的品牌头部+操作卡片布局。

- [ ] **Step 4: 运行全部 settings 相关测试**

Run: `npx vitest run --reporter=verbose -- settings`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/__tests__/ src/components/settings/parts/__tests__/ src/composables/__tests__/settings/
git commit -m "test(settings): 适配所有测试到新布局和即时保存行为"
```

---

### Task 19: 全量门禁验证 + 清理

**Files:**
- 可能需要微调的任何文件

- [ ] **Step 1: 运行完整门禁**

Run: `npm run check:all`
Expected: lint + typecheck + test:coverage + build + check:rust 全绿

- [ ] **Step 2: 修复任何失败项**

常见问题：
- 未使用的 import 需清理
- CSS 类名变更导致的选择器不匹配
- 测试中硬编码的 DOM 结构断言需更新
- Rust 编译警告

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "fix(settings): 全量门禁修复"
```

- [ ] **Step 4: 更新短期记忆**

更新 `docs/active_context.md`，补充 Settings 面板重构完成的摘要。

- [ ] **Step 5: 提交文档**

```bash
git add docs/active_context.md
git commit -m "docs: 更新短期记忆（Settings 面板重构完成）"
```
