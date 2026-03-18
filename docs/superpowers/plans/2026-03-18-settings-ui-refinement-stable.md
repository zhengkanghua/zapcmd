# Settings UI 精修（稳定版原生窗口）Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Settings 精修方案收口为“原生窗口 + 原生窗控 + 应用 topbar + 有上限响应式”的稳定实现，同时统一 5 个子页面的视觉节奏与卡片密度。

**Architecture:** 保留 Tauri 原生标题栏与原生控制按钮，放弃“窗控与 Tab 同一物理行”的自绘/overlay 路线；WebView 内只负责应用 topbar 与内容区。样式层通过 `--theme-settings-* -> --ui-settings-*` 双层变量管理，`src/styles/settings.css` 统一负责窗口壳体、topbar、内容宽度与页面级布局，各 section 组件只在现有边界内做精修。验证分为两层：先补 DOM/contract 测试锁定稳定版结构，再做样式与交互回归，最后执行 `npm run check:all`。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tauri 2, CSS Custom Properties, Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-settings-ui-refinement-design.md`

**Recommended workflow:** `@superpowers:test-driven-development` → `@superpowers:verification-before-completion` → `@superpowers:requesting-code-review`

---

## 文件结构

### 修改文件（预期）

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src-tauri/src/windowing.rs` | 将 settings 窗口从 `decorations(false)` 切回 `decorations(true)`，保留原生标题栏与原生窗控。 |
| `src-tauri/capabilities/default.json` | 清理只为自绘窗控服务的 `minimize/toggle-maximize/is-maximized` 权限，避免 capability 与真实实现脱节。 |
| `src/__tests__/tauri-capabilities.test.ts` | 为 capability 收口增加断言：默认 capability 不再声明自绘窗控专属权限。 |
| `src/components/settings/SettingsWindow.vue` | 删除 `getCurrentWindow()` / 自绘按钮 / drag region 逻辑，改为“原生标题栏 + 应用 topbar + 内容区”的稳定版结构。 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 新增稳定版窗口结构 contract test，锁定 topbar、route 宽度分支、无自绘窗控。 |
| `src/components/settings/ui/SSegmentNav.vue` | 调整 topbar 内的尺寸、激活态变量与导航簇上限，保证顶栏不随窗口放大而漂散。 |
| `src/components/settings/ui/__tests__/SSegmentNav.test.ts` | 补充 topbar 语义与 active state contract，避免改样式时破坏 tab 语义。 |
| `src/styles/themes/obsidian.css` | 新增 settings 专属主题变量（titlebar/topbar/card/hint 等）。 |
| `src/styles/tokens.css` | 新增 `--ui-settings-*` 语义映射，禁止 `settings.css` 继续写死颜色。 |
| `src/styles/settings.css` | 统一窗口壳体、topbar、bounded responsive、卡片密度、Commands 宽表格上限。 |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 补齐 hint、终端路径展示与 Language 独立小卡片。 |
| `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts` | 更新 DOM 断言，锁定 hint / code path / card 结构。 |
| `src/components/settings/parts/SettingsAppearanceSection.vue` | 调整为 theme / effects / preview 三块，effects 与 preview 走有边界的响应式重排。 |
| `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts` | 新增外观页 layout contract test。 |
| `src/components/settings/parts/SettingsHotkeysSection.vue` | 保留 section 边界，但将 recorder 行改为水平布局，冲突提示收口为行内 badge。 |
| `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts` | 新增热键页 contract test，锁定行内冲突显示。 |
| `src/components/settings/parts/SettingsCommandsSection.vue` | 调整 toolbar、summary、表格列宽与禁用态，不再无限拉伸。 |
| `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts` | 新增命令页 layout contract test。 |
| `src/components/settings/parts/SettingsAboutSection.vue` | 品牌区收紧、信息/操作单列化、状态区改左侧 3px 色条。 |
| `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts` | 保留错误引导断言，同时增加状态块结构断言。 |
| `src/__tests__/app.settings-hotkeys.test.ts` | 确保 Hotkeys / Commands 的现有集成行为在新结构下仍可用。 |
| `src/__tests__/app.failure-events.test.ts` | 验证 settings 行级错误/状态反馈在新结构下不回归。 |
| `docs/active_context.md` | 记录 writing-plans 阶段产出的稳定版执行计划摘要。 |

### 新增文件（预期）

| 文件路径 | 职责 |
|---|---|
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定稳定版窗口壳体结构。 |
| `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts` | 锁定 Appearance 卡片编排。 |
| `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts` | 锁定 Hotkeys 行级结构。 |
| `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts` | 锁定 Commands toolbar / table contract。 |

---

## Chunk 1: 稳定版窗口壳体（原生标题栏 + 应用 topbar）

### Task 1: 先写稳定版 contract tests（小步起手，5–10 分钟）

**Files:**
- Create: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/__tests__/tauri-capabilities.test.ts`

- [ ] **Step 1: 新增 `SettingsWindow` 壳体 contract test**

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SettingsWindow from "../SettingsWindow.vue";

describe("SettingsWindow stable shell", () => {
  it("renders app topbar without custom window controls", () => {
    const wrapper = mount(SettingsWindow, {
      props: createSettingsWindowProps({ settingsRoute: "general" }),
      global: {
        stubs: {
          SettingsHotkeysSection: true,
          SettingsGeneralSection: true,
          SettingsCommandsSection: true,
          SettingsAppearanceSection: true,
          SettingsAboutSection: true,
          SSegmentNav: true
        }
      }
    });

    expect(wrapper.find(".settings-window-topbar").exists()).toBe(true);
    expect(wrapper.find(".settings-drag-region__controls").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("ZapCmd Settings");
  });

  it("uses commands-specific content width hook only on commands route", async () => {
    const wrapper = mount(SettingsWindow, {
      props: createSettingsWindowProps({ settingsRoute: "commands" }),
      global: { stubs: { SettingsCommandsSection: true, SSegmentNav: true } }
    });

    expect(wrapper.get(".settings-content").classes()).toContain("settings-content--commands");
    await wrapper.setProps({ settingsRoute: "general" });
    expect(wrapper.get(".settings-content").classes()).not.toContain("settings-content--commands");
  });
});
```

- [ ] **Step 2: 扩展 capability 测试，确认不再声明自绘窗控专属权限**

```ts
it("does not keep custom-titlebar-only window permissions in default capability", () => {
  const capability = readJson<{ permissions: string[] }>("src-tauri/capabilities/default.json");
  expect(capability.permissions).not.toContain("core:window:allow-toggle-maximize");
  expect(capability.permissions).not.toContain("core:window:allow-minimize");
  expect(capability.permissions).not.toContain("core:window:allow-is-maximized");
});
```

- [ ] **Step 3: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/__tests__/tauri-capabilities.test.ts
```
Expected:
- `SettingsWindow.layout.test.ts` 因当前仍存在 `.settings-drag-region__controls` / 无 `.settings-window-topbar` 而失败。
- capability 断言因 `default.json` 仍保留 3 个旧权限而失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/__tests__/tauri-capabilities.test.ts
git commit -m "test(settings): 增加稳定版窗口壳体 contract tests"
```

---

### Task 2: 实现稳定版原生窗口壳体并清理旧权限

**Files:**
- Modify: `src-tauri/src/windowing.rs`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/__tests__/tauri-capabilities.test.ts`

- [ ] **Step 1: Rust 窗口配置切回原生标题栏**

将 `src-tauri/src/windowing.rs` 中 settings builder 的：

```rust
.decorations(false)
```

改为：

```rust
.decorations(true)
```

保留 `.title("ZapCmd Settings")`，让系统负责标题栏与窗控。

- [ ] **Step 2: 清理只为自绘窗控服务的 capability**

将 `src-tauri/capabilities/default.json` 的 permissions 收口到：

```json
["core:default", "core:window:allow-close", "updater:default"]
```

若 `src-tauri/gen/schemas/capabilities.json` 因生成脚本被更新，也一并纳入提交；若未变化，不强行改动。

- [ ] **Step 3: 重写 `SettingsWindow.vue` 顶部结构**

目标结构：

```vue
<main class="settings-window-root">
  <div class="settings-window-topbar">
    <SSegmentNav :items="navItems" v-model="settingsRoute" />
  </div>

  <div
    class="settings-content"
    :class="{ 'settings-content--commands': settingsRoute === 'commands' }"
    aria-label="settings-content"
  >
    <!-- 各 section 按当前 route 渲染 -->
  </div>
</main>
```

必须删除：
- `getCurrentWindow()` import
- `ref`, `onMounted`, `isMaximized`
- `minimizeWindow`, `toggleMaximize`, `closeWindow`
- `.settings-drag-region` 相关 DOM
- 内容内的 `"ZapCmd Settings"` 文案标题

说明：稳定版只保留“应用 topbar”，不再在 WebView 内伪造系统标题栏。

- [ ] **Step 4: 类型与 class hook 收口**

- 若 `SettingsWindowProps` 中有仅服务旧自绘标题栏的类型残留，顺手清掉。
- 将旧类名 `settings-content--full-width` 统一替换为 `settings-content--commands`，避免语义过宽。

- [ ] **Step 5: 运行本任务相关测试**

Run:
```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/__tests__/tauri-capabilities.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/windowing.rs
git add src-tauri/capabilities/default.json
git add src/components/settings/SettingsWindow.vue
git add src/components/settings/types.ts
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/__tests__/tauri-capabilities.test.ts
git commit -m "refactor(settings): 切换为稳定版原生窗口壳体"
```

---

## Chunk 2: 主题变量 + bounded responsive shell

### Task 3: 先补样式 contract tests（导航与页面结构）

**Files:**
- Modify: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Create: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] **Step 1: 为 `SSegmentNav` 增加 topbar 语义断言**

新增断言：

```ts
expect(wrapper.get("[role='tablist']").classes()).toContain("s-segment-nav");
expect(wrapper.findAll("[role='tab']").every((tab) => tab.attributes("type") === "button")).toBe(true);
```

若组件后续增加 `aria-label`，也一并锁定。

- [ ] **Step 2: 更新 `SettingsGeneralSection.i18n.test.ts`**

新增断言：
- Startup 两行均有 `.settings-hint`
- 终端路径使用 `code.settings-card__mono`
- Language section 单独存在

- [ ] **Step 3: 新增 `SettingsAppearanceSection.layout.test.ts`**

至少覆盖：

```ts
it("renders theme, effects and preview cards", () => {
  expect(wrapper.find(".appearance-card--theme").exists()).toBe(true);
  expect(wrapper.find(".appearance-card--effects").exists()).toBe(true);
  expect(wrapper.find(".appearance-card--preview").exists()).toBe(true);
});

it("marks the active theme card", () => {
  expect(wrapper.find(".theme-card--active").text()).toContain("Obsidian");
});
```

- [ ] **Step 4: 扩展 `SettingsAboutSection.update-error-guidance.test.ts`**

新增断言：
- 品牌区仍存在
- loading / error / success 使用 `.about-status*` 结构
- error 状态块仍位于 actions card 内

- [ ] **Step 5: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
```
Expected: 至少一项因当前结构/类名/断言不满足而失败。

- [ ] **Step 6: Commit（仅测试）**

```bash
git add src/components/settings/ui/__tests__/SSegmentNav.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
git commit -m "test(settings): 增加 shell 与页面结构 contract tests"
```

---

### Task 4: 实现 shell 样式、主题变量与 General / Appearance / About 精修

**Files:**
- Modify: `src/styles/themes/obsidian.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/ui/SSegmentNav.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] **Step 1: 增加 settings 专属主题变量与语义映射**

在 `obsidian.css` 中增加至少以下变量：

```css
--theme-settings-titlebar-bg: #0f0f11;
--theme-settings-topbar-bg: #0f0f11;
--theme-settings-topbar-border: rgba(255,255,255,0.06);
--theme-settings-tab-active-bg: rgba(255,255,255,0.13);
--theme-settings-tab-active-border: rgba(255,255,255,0.10);
--theme-settings-card-bg: rgba(255,255,255,0.035);
--theme-settings-card-border: rgba(255,255,255,0.09);
--theme-settings-card-title-color: rgba(255,255,255,0.38);
--theme-settings-row-border: rgba(255,255,255,0.06);
--theme-settings-row-hover: rgba(255,255,255,0.03);
--theme-settings-hint-color: rgba(255,255,255,0.32);
```

并在 `tokens.css` 建立 `--ui-settings-*` 对应映射，禁止 `settings.css` 继续写死 settings 专用颜色。

- [ ] **Step 2: 重写 `settings.css` 的窗口壳体与 bounded responsive**

关键规则：
- `.settings-window-root` 只负责 `topbar + content`
- `.settings-window-topbar` 高度 `52px`
- `.settings-content`：`padding: 24px 32px 32px; max-width: 720px; margin: 0 auto; width: 100%`
- `.settings-content--commands`：`max-width: 1120px`
- `topbar` 与内容之间只有一条明确边界线
- topbar 内导航簇本身有上限，不拉满整行
- 普通页/宽表格页都只“重排”，不“无限拉伸”

说明：这是稳定版的关键样式，不要尝试模拟 overlay 标题栏。

- [ ] **Step 3: 调整 `SSegmentNav.vue` 适配 topbar**

对齐 spec：
- tab padding 改为 `6px 14px`
- 整体圆角 `10px`
- 激活态颜色改用 `var(--ui-settings-tab-active-bg)` / `var(--ui-settings-tab-active-border)`
- 导航簇维持紧凑，不靠拉大 gap 占满空间

- [ ] **Step 4: 精修 `SettingsGeneralSection.vue`**

必须做到：
- Startup 两行均保留 hint
- Terminal 路径行为单行 `code`
- Language 单独成小卡片
- 不改动行为逻辑，只调结构与可读性

- [ ] **Step 5: 精修 `SettingsAppearanceSection.vue`**

必须做到：
- Theme cards 横向排布，激活态使用 `--ui-accent`
- Blur / Opacity 合并成一张 effects card
- Slider 行改为“label 在上、slider 在下”的全宽结构
- Preview 高度收敛到 `96px`
- 窄宽度下 preview 掉到下方，不强行并排

- [ ] **Step 6: 精修 `SettingsAboutSection.vue`**

必须做到：
- 品牌区 logo `60x60`，名称 `16px`
- version 使用 accent 点状强调
- info / actions 改为单列
- update status 使用左侧 `3px` 色条区分 loading / success / error

- [ ] **Step 7: 跑本任务相关测试**

Run:
```bash
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
```
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/styles/themes/obsidian.css
git add src/styles/tokens.css
git add src/styles/settings.css
git add src/components/settings/ui/SSegmentNav.vue
git add src/components/settings/parts/SettingsGeneralSection.vue
git add src/components/settings/parts/SettingsAppearanceSection.vue
git add src/components/settings/parts/SettingsAboutSection.vue
git add src/components/settings/ui/__tests__/SSegmentNav.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
git commit -m "feat(settings): 完成稳定版 shell 与通用页面精修"
```

---

## Chunk 3: Hotkeys / Commands 页面精修

### Task 5: 先写 Hotkeys / Commands 的 layout contract tests

**Files:**
- Create: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Create: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 新增 `SettingsHotkeysSection.layout.test.ts`**

至少覆盖：

```ts
it("renders each hotkey section inside settings-card", () => {
  expect(wrapper.findAll(".settings-card")).toHaveLength(3);
});

it("passes conflict text down to recorder rows instead of rendering a global banner", () => {
  expect(wrapper.text()).not.toContain("全局错误");
  expect(wrapper.findComponent(SHotkeyRecorder).props("conflict")).toContain("duplicate");
});
```

- [ ] **Step 2: 新增 `SettingsCommandsSection.layout.test.ts`**

至少覆盖：
- search input 存在且独占 toolbar 主区域
- summary badge 组存在
- table header 列为 `command/category/source/toggle`
- disabled row 使用 `settings-commands-table__row--disabled`

- [ ] **Step 3: 扩展现有集成测试**

在 `app.settings-hotkeys.test.ts` / `app.failure-events.test.ts` 中补至少一条回归：
- Hotkey 冲突仍能定位到具体字段
- Commands 首行 toggle 仍能正常改写 store
- settings 行状态/错误在新 DOM 下仍可被查到

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
```
Expected: 至少一项因结构尚未更新而失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git add src/__tests__/app.failure-events.test.ts
git commit -m "test(settings): 增加 Hotkeys 与 Commands 精修 contract tests"
```

---

### Task 6: 实现 Hotkeys / Commands 精修与 bounded responsive 宽表格

**Files:**
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 调整 `SettingsHotkeysSection.vue`**

必须做到：
- 每个 section 继续用 `.settings-card` 包裹
- 行布局改为 label + recorder 水平排列
- label 容器占 `minmax(0, 1fr)`，recorder 固定宽度
- 冲突显示为行内 badge / recorder 局部状态，不回退成全局消息

- [ ] **Step 2: 调整 `SettingsCommandsSection.vue`**

必须做到：
- toolbar 改为“两段式”：search input 独占一行，summary 右对齐
- 表格列宽改为 `1fr 100px 70px 52px`
- 行高改为 `padding: 10px 14px`
- disabled row opacity 改为 `0.5`
- 保留现有筛选/切换逻辑，不扩大功能范围

- [ ] **Step 3: 在 `settings.css` 完成对应样式落地**

特别注意：
- Commands 页面虽然更宽，但仍受 `max-width: 1120px` 限制
- 小窗口下 toolbar 与 summary 自动换行，不产生横向滚动
- 热键录制行在窄宽度下允许退化为两行，但视觉顺序不变

- [ ] **Step 4: 跑本任务相关测试**

Run:
```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/parts/SettingsHotkeysSection.vue
git add src/components/settings/parts/SettingsCommandsSection.vue
git add src/styles/settings.css
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git add src/__tests__/app.failure-events.test.ts
git commit -m "feat(settings): 完成 Hotkeys 与 Commands 稳定版精修"
```

---

## Chunk 4: 验证、文档与执行交接

### Task 7: 全量验证、短期记忆与执行准备

**Files:**
- Modify: `docs/active_context.md`
- Reference: `docs/superpowers/specs/2026-03-18-settings-ui-refinement-design.md`
- Reference: `docs/superpowers/plans/2026-03-18-settings-ui-refinement-stable.md`

- [ ] **Step 1: 跑 focused settings 测试集合**

Run:
```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
npm run test:run -- src/__tests__/tauri-capabilities.test.ts
```
Expected: 全绿。

- [ ] **Step 2: 跑全量门禁**

Run:
```bash
npm run check:all
```
Expected: `lint -> typecheck -> test:coverage -> build -> check:rust` 全绿。

- [ ] **Step 3: 做手动验收（至少 Windows）**

Run: `npm run dev`

手动检查：
1. Settings 使用原生标题栏与原生窗控，不再出现网页内的交通灯按钮。
2. 原生标题栏下方存在独立 topbar，视觉上与内容区分层明确但不割裂。
3. `General / Appearance / About` 在宽窗口下仍居中且不无限拉伸。
4. `Commands` 更宽，但仍受上限约束；窗口变宽时不会无限散开。
5. `Hotkeys` 冲突提示贴着字段显示；`Commands` toggle 与搜索仍可用。

- [ ] **Step 4: 更新短期记忆**

在 `docs/active_context.md` 末尾追加一条不超过 200 字的摘要，记录：
- 稳定版 settings 计划已产出
- 关键决策是“原生标题栏 + 应用 topbar + bounded responsive”

- [ ] **Step 5: Commit**

```bash
git add docs/active_context.md
git add docs/superpowers/plans/2026-03-18-settings-ui-refinement-stable.md
git commit -m "docs(plan): 补充 settings 稳定版精修实现计划"
```

---

## 验收对照表（与 spec 对齐）

- 原生窗口：`windowing.rs` 使用 `decorations(true)`，Settings 不再依赖自绘窗控。
- 稳定版壳体：物理上为“原生标题栏 + 应用 topbar + content”，视觉上收敛为“窗口头部 + 内容区”。
- 主题变量：settings 专属颜色全部走 `--theme-settings-* -> --ui-settings-*` 映射。
- bounded responsive：普通页面 `max-width: 720px`；`Commands` 页面 `max-width: 1120px`；不无限拉伸。
- 页面精修：General / Appearance / Hotkeys / Commands / About 都达到统一卡片密度与 hint 规范。
- 验证：focused settings 测试 + `npm run check:all` 全绿。

---

## 本轮执行入口

- **首个执行任务：** `Task 1`
- **原因：** 它最小、可快速失败，先锁定“稳定版窗口壳体”与 capability 收口，避免后面样式改动建立在错误前提上。
- **不要先做：**
  - 不要先改 `settings.css`
  - 不要先改五个 section 的视觉
  - 不要先跑全量门禁
  - 先用 contract test 把技术前提钉死，再做样式与页面层
