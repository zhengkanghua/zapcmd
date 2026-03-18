# Settings 通用与命令页深色精修 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Settings 的 General / Commands 两个核心页面重构为更接近 macOS 原生设置 / Raycast 的深色高级质感界面，并把 dropdown、toggle、theme token 收口成可复用的 settings 设计系统。

**Architecture:** 保留原生系统标题栏，但在 Windows 上显式切到 dark theme 消除白色割裂；WebView 内部不依赖“原生暗色”，而是由 `--theme-settings-* -> --ui-settings-*` token 体系驱动头部、卡片、dropdown、toolbar 与数据列表。实现上分三层推进：先锁定窗口壳体与重复页标题的 contract，再创建统一 `SDropdown` / `SettingSection` / `SettingItem` 基础组件并清理旧终端下拉状态链路，最后重构 Commands 的 sticky toolbar、精简筛选和轻量表格，并用 focused tests + `npm run check:all` 收敛。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Tauri 2, CSS Custom Properties, Vitest

**Spec:** `docs/superpowers/specs/2026-03-18-settings-general-commands-dark-polish-design.md`

**Recommended workflow:** `@superpowers:test-driven-development` → `@superpowers:verification-before-completion` → `@superpowers:requesting-code-review`

---

## 文件结构

### 修改文件（预期）

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `src-tauri/src/windowing.rs` | 为 settings 窗口补充 Windows 原生暗色标题栏主题，保留 `decorations(true)`。 |
| `src/components/settings/SettingsWindow.vue` | 精简 route props 透传，保留 topbar / content 壳体，不再给 General 传旧终端 dropdown 状态。 |
| `src/components/settings/types.ts` | 清理 `terminalDropdownOpen` / `terminalFocusIndex` / `selectedTerminalOption` 等旧 props，保留 General / Commands 新边界。 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定壳体结构仍为 topbar + content，并收口 General props。 |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 改为 `SettingSection + SettingItem + SDropdown(default) + 精修 SToggle` 的结构，移除重复页标题。 |
| `src/components/settings/parts/SettingsCommandsSection.vue` | 改为 sticky search toolbar + primary ghost dropdown filters + more-filters + grid table。 |
| `src/components/settings/parts/SettingsAppearanceSection.vue` | 删除重复的路由级标题，只保留真正有信息增量的卡片标题。 |
| `src/components/settings/parts/SettingsAboutSection.vue` | 删除重复的路由级“关于”标题与重复卡片标题，改为品牌区 + 信息卡 + 更新卡。 |
| `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts` | 更新为 General 新结构 contract：无重复页标题、使用 SettingItem 描述、dropdown 触发器 label-only。 |
| `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts` | 锁定 sticky toolbar、精简首排筛选、“更多筛选”入口、轻量表格列与 badge 结构。 |
| `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts` | 锁定 Appearance 页不再渲染重复 route heading。 |
| `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts` | 锁定 About 页不再渲染重复 route heading，同时保留现有 updater 错误引导。 |
| `src/components/settings/ui/SToggle.vue` | 精修为更小、更圆润、更贴近 macOS/iOS 的设置页开关。 |
| `src/components/settings/ui/__tests__/SToggle.test.ts` | 锁定 compact/default 尺寸语义与无障碍属性不回归。 |
| `src/components/settings/ui/SSegmentNav.vue` | 如有必要，微调顶部 tab 尺寸与激活态，使其与新头部材质一致。 |
| `src/components/settings/ui/__tests__/SSegmentNav.test.ts` | 若导航样式类或语义发生调整，补相应 contract。 |
| `src/styles/settings.css` | 统一窗口头部、General section/item、Commands sticky toolbar、dropdown 触发器、table / badge / hover 层次。 |
| `src/styles/tokens.css` | 增加 `--ui-settings-*` 映射，覆盖 dropdown / toolbar / badge / toggle / table / focus / status。 |
| `src/styles/themes/obsidian.css` | 增加 obsidian 下 settings 专属 token。 |
| `src/i18n/messages.ts` | 新增 “更多筛选”“软件信息”等文案，并清理旧标题依赖。 |
| `src/App.vue` | 清理 settings route 对旧 terminal dropdown props 的传递。 |
| `src/AppSettings.vue` | 清理 settings route 对旧 terminal dropdown props 的传递。 |
| `src/composables/settings/useSettingsWindow/model.ts` | 删除旧终端 dropdown open/focus 状态。 |
| `src/composables/settings/useSettingsWindow/terminal.ts` | 删除 `toggleTerminalDropdown` / `closeTerminalDropdown` 等过时行为，只保留终端加载与选择动作。 |
| `src/composables/settings/useSettingsWindow/viewModel.ts` | 删除 `selectedTerminalOption` 暴露，仅保留 `selectedTerminalPath` 与选项列表派生。 |
| `src/features/hotkeys/windowKeydownHandlers/settings.ts` | 删除全局 settings keydown 对终端 dropdown 的拦截逻辑。 |
| `src/features/hotkeys/windowKeydownHandlers/types.ts` | 清理 settings keydown handler 中与旧终端 dropdown 相关的依赖字段。 |
| `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts` | 更新设置窗口热键 contract，移除终端 dropdown 键盘分支的旧断言。 |
| `src/composables/app/useAppWindowKeydown.ts` | 收口 settingsWindow shape，删除旧 dropdown 状态依赖。 |
| `src/composables/__tests__/app/useAppWindowKeydown.test.ts` | 同步 settingsWindow harness 形状，确保 settings Escape / hotkey recording 路径保持通过。 |
| `src/__tests__/app.settings-hotkeys.test.ts` | 保持 settings 路由切换、命令开关持久化等集成行为在新 UI 下不回归。 |
| `docs/active_context.md` | 记录 executing-plans 阶段启动前的 plan 摘要。 |

### 新增文件（预期）

| 文件路径 | 职责 |
|---|---|
| `src/components/settings/ui/SDropdown.vue` | 统一 dropdown primitive，支持 `default` / `ghost` 变体、Teleport popover、click outside、键盘导航。 |
| `src/components/settings/ui/__tests__/SDropdown.test.ts` | 锁定 variant、click outside、键盘导航、选中项 check 和 popover 行为。 |
| `src/components/settings/ui/SettingSection.vue` | 提供 settings 分组容器，负责 section label + 卡片 shell，避免容器裁切浮层。 |
| `src/components/settings/ui/SettingItem.vue` | 提供 label / description / control 三段式 item 结构。 |
| `src/components/settings/ui/__tests__/SettingItem.test.ts` | 锁定 SettingItem 的 label、description 与 control slot 结构。 |

### 删除文件（预期）

| 文件路径 | 原因 |
|---|---|
| `src/components/settings/ui/SSelect.vue` | 被统一 `SDropdown` 取代。 |
| `src/components/settings/ui/SFilterChip.vue` | 被统一 `SDropdown` 取代。 |
| `src/components/settings/ui/__tests__/SSelect.test.ts` | 被 `SDropdown.test.ts` 覆盖。 |
| `src/components/settings/ui/__tests__/SFilterChip.test.ts` | 被 `SDropdown.test.ts` 覆盖。 |

---

## Chunk 1: 壳体与标题去重基线

### Task 1: 先写壳体 / 重复标题的 failing contract tests

**Files:**
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] **Step 1: 更新 `SettingsWindow.layout.test.ts`，去掉旧 terminal dropdown props 依赖**

```ts
const props = createSettingsWindowProps({
  settingsRoute: "general"
});

expect("terminalDropdownOpen" in props).toBe(false);
expect("selectedTerminalOption" in props).toBe(false);
```

说明：
- 这里不是要测试 TS 类型系统，而是强制测试工厂不再喂给 `SettingsWindow` 旧 dropdown 状态。
- 如果你更喜欢类型层收口，也至少要让测试工厂不再构造这些字段。

- [ ] **Step 2: 改 `SettingsGeneralSection.i18n.test.ts`，锁定“没有重复页标题”**

```ts
expect(wrapper.text()).not.toContain("通用");
expect(wrapper.text()).toContain("启动");
expect(wrapper.text()).toContain("终端");
expect(wrapper.text()).toContain("界面");
```

并新增结构断言：

```ts
expect(wrapper.findAll(".setting-item")).toHaveLength(5);
expect(wrapper.find(".setting-item__description").exists()).toBe(true);
```

- [ ] **Step 3: 改 `SettingsAppearanceSection.layout.test.ts`，锁定“无 route heading”**

```ts
expect(wrapper.find("#settings-group-appearance").exists()).toBe(false);
expect(wrapper.find(".appearance-card--theme").exists()).toBe(true);
expect(wrapper.find(".appearance-card--effects").exists()).toBe(true);
expect(wrapper.find(".appearance-card--preview").exists()).toBe(true);
```

- [ ] **Step 4: 改 `SettingsAboutSection.update-error-guidance.test.ts`，锁定“无重复关于标题”**

```ts
expect(wrapper.find("#settings-group-about").exists()).toBe(false);
expect(wrapper.text()).not.toContain("关于\n关于");
expect(wrapper.find('[data-testid="about-info-card"]').text()).not.toBe("关于");
```

- [ ] **Step 5: 运行定向测试并确认失败**

Run:
```bash
npx vitest run src/components/settings/__tests__/SettingsWindow.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
```

Expected:
- General / Appearance / About 断言因当前仍渲染 route heading 而失败。
- `SettingsWindow.layout.test.ts` 因测试工厂仍携带旧 terminal dropdown props 而失败。

- [ ] **Step 6: Commit（仅测试）**

```bash
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
git commit -m "test(settings): 锁定壳体与重复标题收口"
```

---

### Task 2: 实现壳体收口、标题去重与 token 基线

**Files:**
- Modify: `src-tauri/src/windowing.rs`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/themes/obsidian.css`
- Modify: `src/i18n/messages.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts`

- [ ] **Step 1: 为 settings 窗口补充 Windows-only 原生暗色标题栏**

目标代码：

```rust
use tauri::Theme;

let builder = tauri::WebviewWindowBuilder::new(
  app,
  SETTINGS_WINDOW_LABEL,
  tauri::WebviewUrl::App("settings.html".into()),
)
.title("ZapCmd Settings")
.inner_size(980.0, 700.0)
.min_inner_size(760.0, 560.0)
.resizable(true)
.decorations(true)
.maximizable(true)
.visible(false)
.focused(false);

#[cfg(target_os = "windows")]
let builder = builder.theme(Some(Theme::Dark));

let _window = builder.build()?;
```

说明：
- 不要对所有平台一刀切 `Theme::Dark`。
- 当前 spec 要求是 Windows 显式 dark；其他平台保持“跟随系统 / 不破坏头部融合”的降级口径。

- [ ] **Step 2: 从 `SettingsWindow` props 收口旧 terminal dropdown 状态**

删除这些 props 透传：

```ts
terminalDropdownOpen
terminalFocusIndex
selectedTerminalOption
```

同步修改：
- `src/components/settings/types.ts`
- `src/App.vue`
- `src/AppSettings.vue`

确保 `SettingsWindow` 只传 General 真正需要的数据：

```vue
<SettingsGeneralSection
  :available-terminals="props.availableTerminals"
  :terminal-loading="props.terminalLoading"
  :default-terminal="props.defaultTerminal"
  :selected-terminal-path="props.selectedTerminalPath"
  ...
/>
```

- [ ] **Step 3: 去掉 General / Appearance / About 的重复 route heading**

目标：
- `SettingsGeneralSection.vue` 去掉 `<h2>{{ t("settings.general.title") }}</h2>`
- `SettingsAppearanceSection.vue` 去掉 `#settings-group-appearance`
- `SettingsAboutSection.vue` 去掉 `#settings-group-about`
- `SettingsAboutSection.vue` 中 info card 的标题改成非 route 文案，例如 `软件信息 / App Info`

- [ ] **Step 4: 扩展 settings token 基线**

在 `obsidian.css` + `tokens.css` 中补至少以下映射：

```css
--theme-settings-toolbar-bg
--theme-settings-toolbar-sticky-bg
--theme-settings-dropdown-bg
--theme-settings-dropdown-border
--theme-settings-dropdown-hover
--theme-settings-badge-bg
--theme-settings-badge-text
--theme-settings-focus-ring
--theme-settings-toggle-off
--theme-settings-toggle-thumb
--theme-settings-table-row-hover
```

并映射为：

```css
--ui-settings-toolbar-bg
--ui-settings-toolbar-sticky-bg
--ui-settings-dropdown-bg
--ui-settings-dropdown-border
--ui-settings-dropdown-hover
--ui-settings-badge-bg
--ui-settings-badge-text
--ui-settings-focus-ring
--ui-settings-toggle-off
--ui-settings-toggle-thumb
--ui-settings-table-row-hover
```

- [ ] **Step 5: 收口头部与内容壳体样式**

在 `src/styles/settings.css` 完成：
- 修掉 Tab 下方多余浅色层
- 保持 `settings-window-topbar` 与内容区只有一条明确分隔
- 让 `settings-content` 继续支持 `settings-content--commands`
- 为后续 sticky toolbar / popover 预留层级 token hook

- [ ] **Step 6: 运行本任务定向测试**

Run:
```bash
npx vitest run src/components/settings/__tests__/SettingsWindow.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
```

Expected: PASS

- [ ] **Step 7: 记录无法自动化覆盖的手动验证点**

在本次实现说明或 commit note 中记下：
- Windows 实机确认原生标题栏已切为 dark
- 非 Windows 平台未出现主题强制错误

- [ ] **Step 8: Commit**

```bash
git add src-tauri/src/windowing.rs
git add src/components/settings/SettingsWindow.vue
git add src/components/settings/types.ts
git add src/components/settings/parts/SettingsGeneralSection.vue
git add src/components/settings/parts/SettingsAppearanceSection.vue
git add src/components/settings/parts/SettingsAboutSection.vue
git add src/styles/settings.css
git add src/styles/tokens.css
git add src/styles/themes/obsidian.css
git add src/i18n/messages.ts
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
git commit -m "refactor(settings): 收口壳体与重复标题"
```

---

## Chunk 2: Shared primitives 与 General 页面

### Task 3: 先写 `SDropdown` / `SettingItem` 的 failing tests

**Files:**
- Create: `src/components/settings/ui/__tests__/SDropdown.test.ts`
- Create: `src/components/settings/ui/__tests__/SettingItem.test.ts`
- Modify: `src/components/settings/ui/__tests__/SToggle.test.ts`
- Modify: `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- Modify: `src/composables/__tests__/app/useAppWindowKeydown.test.ts`

- [ ] **Step 1: 新增 `SDropdown.test.ts`**

覆盖至少这些 contract：

```ts
it("renders default variant with fixed trigger style")
it("renders ghost variant with toolbar style")
it("shows check icon for selected option")
it("closes on outside pointerdown")
it("supports ArrowDown / ArrowUp / Enter / Escape")
```

示例：

```ts
const wrapper = mount(SDropdown, {
  props: {
    modelValue: "powershell",
    variant: "ghost",
    options: [
      { value: "powershell", label: "PowerShell" },
      { value: "cmd", label: "Command Prompt" }
    ]
  },
  attachTo: document.body
});

await wrapper.get(".s-dropdown__trigger").trigger("click");
expect(document.body.querySelector(".s-dropdown__panel")).not.toBeNull();
expect(document.body.querySelector(".s-dropdown__option--selected .s-dropdown__check")).not.toBeNull();
```

- [ ] **Step 2: 新增 `SettingItem.test.ts`**

锁定结构：

```ts
expect(wrapper.get(".setting-item__label").text()).toContain("默认终端");
expect(wrapper.get(".setting-item__description").text()).toContain("执行命令时优先使用此终端");
expect(wrapper.find(".setting-item__control").exists()).toBe(true);
```

- [ ] **Step 3: 扩展 `SToggle.test.ts`**

新增断言：

```ts
expect(wrapper.classes()).toContain("s-toggle--compact");
expect(wrapper.attributes("role")).toBe("switch");
expect(wrapper.attributes("aria-checked")).toBe("true");
```

如果实现会增加新的 thumb / track class hook，也一并锁定。

- [ ] **Step 4: 更新 settings keydown tests，去掉终端 dropdown 导航假设**

把这类旧断言替换掉：

```ts
it("supports terminal dropdown keyboard navigation and select", ...)
```

改成：

```ts
it("does not reserve ArrowDown for terminal dropdown when not recording", () => {
  const { handler, options, spies } = createHarness();
  options.isSettingsWindow.value = true;

  handler(new KeyboardEvent("keydown", { key: "ArrowDown", cancelable: true }));

  expect(spies.selectTerminalOption).not.toHaveBeenCalled();
  expect(spies.closeSettingsWindow).not.toHaveBeenCalled();
});
```

并同步 `useAppWindowKeydown.test.ts` 的 harness 形状，不再包含：

```ts
terminalDropdownOpen
terminalFocusIndex
selectTerminalOption
closeTerminalDropdown
```

- [ ] **Step 5: 运行定向测试并确认失败**

Run:
```bash
npx vitest run src/components/settings/ui/__tests__/SDropdown.test.ts
npx vitest run src/components/settings/ui/__tests__/SettingItem.test.ts
npx vitest run src/components/settings/ui/__tests__/SToggle.test.ts
npx vitest run src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
npx vitest run src/composables/__tests__/app/useAppWindowKeydown.test.ts
```

Expected:
- `SDropdown.test.ts` / `SettingItem.test.ts` 因文件尚不存在而失败。
- hotkey / app keydown tests 因 settingsWindow shape 仍依赖 terminal dropdown 字段而失败。

- [ ] **Step 6: Commit（仅测试）**

```bash
git add src/components/settings/ui/__tests__/SDropdown.test.ts
git add src/components/settings/ui/__tests__/SettingItem.test.ts
git add src/components/settings/ui/__tests__/SToggle.test.ts
git add src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
git add src/composables/__tests__/app/useAppWindowKeydown.test.ts
git commit -m "test(settings): 锁定共享控件与终端下拉清理"
```

---

### Task 4: 实现 `SDropdown` / `SettingSection` / `SettingItem`，并收口旧终端下拉状态链路

**Files:**
- Create: `src/components/settings/ui/SDropdown.vue`
- Create: `src/components/settings/ui/SettingSection.vue`
- Create: `src/components/settings/ui/SettingItem.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/ui/SToggle.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/App.vue`
- Modify: `src/AppSettings.vue`
- Modify: `src/composables/settings/useSettingsWindow/model.ts`
- Modify: `src/composables/settings/useSettingsWindow/terminal.ts`
- Modify: `src/composables/settings/useSettingsWindow/viewModel.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/settings.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/types.ts`
- Modify: `src/composables/app/useAppWindowKeydown.ts`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/ui/__tests__/SDropdown.test.ts`
- Modify: `src/components/settings/ui/__tests__/SettingItem.test.ts`
- Modify: `src/components/settings/ui/__tests__/SToggle.test.ts`
- Modify: `src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- Modify: `src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- Delete: `src/components/settings/ui/SSelect.vue`
- Delete: `src/components/settings/ui/__tests__/SSelect.test.ts`

- [ ] **Step 1: 实现 `SDropdown.vue`**

能力要求：

```ts
type DropdownVariant = "default" | "ghost";

interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}
```

必须具备：
- `variant` prop
- Teleport 到 `body`
- `pointerdown` click outside
- `ArrowUp/ArrowDown/Home/End/Enter/Escape`
- 选中项 check
- 高层级 popover class hook，例如 `.s-dropdown__panel`

类名建议：

```html
<div class="s-dropdown">
  <button class="s-dropdown__trigger s-dropdown__trigger--default">
  <div class="s-dropdown__panel">
  <button class="s-dropdown__option s-dropdown__option--selected">
```

- [ ] **Step 2: 用 `SettingSection` / `SettingItem` 重写 General**

目标结构：

```vue
<section class="settings-general">
  <SettingSection label="启动">
    <SettingItem
      label="自动检查更新"
      description="启动时自动检查 GitHub 上的新版本。"
    >
      <SToggle ... />
    </SettingItem>
  </SettingSection>
</section>
```

具体要求：
- 不再渲染 route title “通用”
- `默认终端` 与 `界面语言` 改用 `SDropdown variant="default"`
- 终端 dropdown 只显示 label
- 路径保留为单独 SettingItem + mono capsule

- [ ] **Step 3: 精修 `SToggle.vue`**

实现要点：
- default 与 compact 两个尺寸都保留
- track 更小、更圆
- thumb 更细
- on/off 颜色改用 settings token
- focus ring 改用 `--ui-settings-focus-ring`

- [ ] **Step 4: 删除旧终端 dropdown 状态链路**

从以下文件移除：

```ts
terminalDropdownOpen
terminalFocusIndex
toggleTerminalDropdown
closeTerminalDropdown
selectedTerminalOption
```

涉及：
- `useSettingsWindow/model.ts`
- `useSettingsWindow/terminal.ts`
- `useSettingsWindow/viewModel.ts`
- `windowKeydownHandlers/settings.ts`
- `windowKeydownHandlers/types.ts`
- `useAppWindowKeydown.ts`
- `App.vue`
- `AppSettings.vue`

保留：
- `availableTerminals`
- `defaultTerminal`
- `selectedTerminalPath`
- `selectTerminalOption(id)`

- [ ] **Step 5: 运行定向测试**

Run:
```bash
npx vitest run src/components/settings/ui/__tests__/SDropdown.test.ts
npx vitest run src/components/settings/ui/__tests__/SettingItem.test.ts
npx vitest run src/components/settings/ui/__tests__/SToggle.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npx vitest run src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
npx vitest run src/composables/__tests__/app/useAppWindowKeydown.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ui/SDropdown.vue
git add src/components/settings/ui/SettingSection.vue
git add src/components/settings/ui/SettingItem.vue
git add src/components/settings/parts/SettingsGeneralSection.vue
git add src/components/settings/ui/SToggle.vue
git add src/components/settings/types.ts
git add src/App.vue
git add src/AppSettings.vue
git add src/composables/settings/useSettingsWindow/model.ts
git add src/composables/settings/useSettingsWindow/terminal.ts
git add src/composables/settings/useSettingsWindow/viewModel.ts
git add src/features/hotkeys/windowKeydownHandlers/settings.ts
git add src/features/hotkeys/windowKeydownHandlers/types.ts
git add src/composables/app/useAppWindowKeydown.ts
git add src/styles/settings.css
git add src/components/settings/ui/__tests__/SDropdown.test.ts
git add src/components/settings/ui/__tests__/SettingItem.test.ts
git add src/components/settings/ui/__tests__/SToggle.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
git add src/composables/__tests__/app/useAppWindowKeydown.test.ts
git rm src/components/settings/ui/SSelect.vue
git rm src/components/settings/ui/__tests__/SSelect.test.ts
git commit -m "feat(settings): 建立共享 dropdown 与通用页新骨架"
```

---

## Chunk 3: Commands 管理列表重构

### Task 5: 先写 Commands 新布局的 failing tests

**Files:**
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 扩展 `SettingsCommandsSection.layout.test.ts`**

新增断言，锁定新布局 contract：

```ts
expect(wrapper.find(".settings-commands-toolbar--sticky").exists()).toBe(true);
expect(wrapper.find(".settings-commands-toolbar__search").exists()).toBe(true);
expect(wrapper.findAll(".settings-commands-toolbar__primary-filter")).toHaveLength(4);
expect(wrapper.find(".settings-commands-toolbar__more-filters").exists()).toBe(true);
expect(wrapper.find(".settings-commands-table__container").exists()).toBe(true);
expect(wrapper.find(".settings-commands-table__badge").exists()).toBe(true);
```

其中 4 个首排筛选默认约束为：
- 来源
- 分类
- 状态
- 排序

- [ ] **Step 2: 在测试里显式锁定“低频筛选被收纳”**

```ts
expect(wrapper.text()).not.toContain("全部文件");
expect(wrapper.text()).toContain("更多筛选");
```

说明：
- 这里锁的是默认首屏，不是功能删除。
- 真正的 `文件 / 冲突状态 / 问题状态 / 覆盖状态` 会进入 more-filters popover。

- [ ] **Step 3: 更新 `app.settings-hotkeys.test.ts` 的命令路由集成断言**

新增至少一条：

```ts
expect(wrapper.find(".settings-commands-toolbar__more-filters").exists()).toBe(true);
expect(wrapper.find(".settings-commands-toolbar__summary").exists()).toBe(true);
```

并保留“切换某一行 toggle 后 store 被持久化”的原始断言。

- [ ] **Step 4: 运行定向测试并确认失败**

Run:
```bash
npx vitest run src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
npx vitest run src/__tests__/app.settings-hotkeys.test.ts
```

Expected:
- layout test 因 sticky toolbar / more-filters / badge 结构尚未存在而失败。
- 集成测试因新 class hook 尚未落地而失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "test(settings): 锁定命令页新工具栏与列表布局"
```

---

### Task 6: 实现 Commands toolbar / ghost dropdown / 轻量表格

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/styles/tokens.css`
- Modify: `src/styles/themes/obsidian.css`
- Modify: `src/i18n/messages.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Delete: `src/components/settings/ui/SFilterChip.vue`
- Delete: `src/components/settings/ui/__tests__/SFilterChip.test.ts`

- [ ] **Step 1: 将 Commands 首排筛选改为 primary + more-filters**

推荐实现方式：

```ts
const primaryFilters = [
  { key: "sourceFilter", label: t("settings.commands.source") },
  { key: "categoryFilter", label: t("settings.commands.category") },
  { key: "statusFilter", label: t("settings.commands.status") },
  { key: "sortBy", label: t("settings.commands.sort") }
] as const;

const secondaryFilters = [
  { key: "fileFilter", label: t("settings.commands.file") },
  { key: "overrideFilter", label: t("settings.commands.override") },
  { key: "issueFilter", label: t("settings.commands.issue") }
] as const;
```

首排每一项都用：

```vue
<SDropdown
  class="settings-commands-toolbar__primary-filter"
  variant="ghost"
  ...
/>
```

次级筛选通过：

```vue
<SDropdown
  class="settings-commands-toolbar__more-filters"
  variant="ghost"
  ...
/>
```

如果一个 dropdown 中承载多个次级筛选不易实现，允许采用“更多筛选”按钮 + popover 容器，容器内再嵌多个 ghost dropdown，但不要退回所有筛选横铺。

- [ ] **Step 2: 把搜索框和 summary 收口为 sticky toolbar**

目标结构：

```vue
<div class="settings-commands-toolbar settings-commands-toolbar--sticky">
  <div class="settings-commands-toolbar__search-row">...</div>
  <div class="settings-commands-toolbar__filters-row">...</div>
</div>
```

样式要求：
- `position: sticky`
- `top: 0`
- `z-index: var(--ui-settings-z-toolbar, 40)`
- 背景能盖住下方表格

- [ ] **Step 3: 把数据行收口为轻量表格**

目标结构：

```vue
<div class="settings-commands-table__container" role="table">
  <div class="settings-commands-table__header" role="row">...</div>
  <div class="settings-commands-table__row" role="row">...</div>
</div>
```

具体要求：
- 表头与数据行统一 `grid-cols-12`
- 分类使用 `.settings-commands-table__badge`
- 来源使用更轻文本 + dot
- 行 hover 仅微提亮，不要重卡片感

- [ ] **Step 4: 完成 `SDropdown` 的 ghost variant**

ghost 视觉至少满足：

```css
.s-dropdown__trigger--ghost {
  width: auto;
  min-width: 0;
  border: 1px solid transparent;
  background: rgba(255,255,255,0.05);
}

.s-dropdown__trigger--ghost:hover {
  background: rgba(255,255,255,0.08);
}
```

popover 继续沿用统一面板，而不是回退成 `SFilterChip` 的旧样式。

- [ ] **Step 5: 删除旧 `SFilterChip` 文件与测试**

确保搜索结果：

Run:
```bash
rg -n "SFilterChip" src
```

Expected:
- 仅剩计划文档或 git 历史；运行代码中无引用。

- [ ] **Step 6: 运行定向测试**

Run:
```bash
npx vitest run src/components/settings/ui/__tests__/SDropdown.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
npx vitest run src/__tests__/app.settings-hotkeys.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/settings/parts/SettingsCommandsSection.vue
git add src/components/settings/ui/SDropdown.vue
git add src/styles/settings.css
git add src/styles/tokens.css
git add src/styles/themes/obsidian.css
git add src/i18n/messages.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git rm src/components/settings/ui/SFilterChip.vue
git rm src/components/settings/ui/__tests__/SFilterChip.test.ts
git commit -m "feat(settings): 重构命令页工具栏与轻量列表"
```

---

## Chunk 4: 收尾、回归与手动验证

### Task 7: 代码清理与 focused regression

**Files:**
- Modify: `docs/active_context.md`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/styles/settings.css`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 用 `rg` 清掉旧术语和遗留引用**

Run:
```bash
rg -n "SSelect|SFilterChip|terminalDropdownOpen|terminalFocusIndex|selectedTerminalOption" src
```

Expected:
- 运行时代码中不再存在这些旧实现或旧状态字段。
- 若仍有命中，只保留非运行时文档或测试说明中必须存在的引用。

- [ ] **Step 2: 更新 `docs/active_context.md`**

补充 200 字以内摘要，例如：

```md
## 补充（2026-03-18｜settings 深色精修执行）
- Windows settings 标题栏切为原生暗色；WebView 内容区统一走 settings token。
- General 引入 SettingSection/Item 与 default dropdown；Commands 改为 sticky 搜索 + ghost 筛选 + 轻量表格。
- 旧 SSelect/SFilterChip 与终端 dropdown 外部状态链路已删除。
```

- [ ] **Step 3: 跑 focused settings regression**

Run:
```bash
npx vitest run src/components/settings/__tests__/SettingsWindow.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts
npx vitest run src/components/settings/parts/__tests__/SettingsAboutSection.update-error-guidance.test.ts
npx vitest run src/components/settings/ui/__tests__/SDropdown.test.ts
npx vitest run src/components/settings/ui/__tests__/SettingItem.test.ts
npx vitest run src/components/settings/ui/__tests__/SToggle.test.ts
npx vitest run src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts
npx vitest run src/composables/__tests__/app/useAppWindowKeydown.test.ts
npx vitest run src/__tests__/app.settings-hotkeys.test.ts
```

Expected: 全部 PASS

- [ ] **Step 4: Commit focused cleanup**

```bash
git add docs/active_context.md
git add src/components/settings/SettingsWindow.vue
git add src/components/settings/types.ts
git add src/styles/settings.css
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "refactor(settings): 清理旧下拉状态与回归断言"
```

---

### Task 8: 全量验证与 Windows 手动 smoke

**Files:**
- Reference: `docs/superpowers/specs/2026-03-18-settings-general-commands-dark-polish-design.md`
- Reference: `docs/superpowers/plans/2026-03-18-settings-general-commands-dark-polish.md`

- [ ] **Step 1: 运行全量门禁**

Run:
```bash
npm run check:all
```

Expected:
- lint PASS
- typecheck PASS
- vitest / coverage PASS
- build PASS
- rust check PASS

- [ ] **Step 2: Windows 手动 smoke**

Run:
```bash
npm run tauri:dev
```

Manual checklist:
- Settings 标题栏在 Windows 上为原生暗色，不再出现白色割裂
- General / Appearance / About 不再显示重复路由标题
- General 的 dropdown 为精致深色 default 变体，路径仍在独立只读 item 中
- Commands 工具栏 sticky 正常，ghost dropdown 展开时不会被列表遮挡
- “更多筛选”能访问低频筛选项
- 行 hover、badge、toggle 视觉一致且无突兀粗边框

- [ ] **Step 3: 产出执行总结**

在最终交付说明中明确：
- 自动化验证命令及结果
- 手动 smoke 的平台与结果
- 是否存在非阻断残余（例如某些平台只能跟随系统标题栏样式）

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat(settings): 完成通用与命令页深色精修"
```
