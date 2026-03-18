# Settings 滚动 / 间距 / Select / Hotkeys 精修 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动 Settings 业务逻辑的前提下，修复内容区单滚动，收紧 `SSelect` 视觉密度，调整 General 的终端信息层级，并让 Hotkeys 的 label / recorder 布局在中窄宽度下更稳定。

**Architecture:** 这次改动建立在 2026-03-18 已完成的稳定版 Settings shell 之上，不再碰 Tauri 窗口、store、composable 或路由结构。`src/styles/settings.css` 负责单滚动高度链、页面节奏和 Hotkeys 响应式退化；`src/components/settings/ui/SSelect.vue` 负责通用下拉的紧凑化；`src/components/settings/parts/SettingsGeneralSection.vue` 只调整“选择 vs 详情”信息层级；`src/components/settings/parts/SettingsHotkeysSection.vue` 只调整 label / recorder 布局与必要 class hook。测试分三层：window/layout contract、component contract、app integration regression。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, CSS Custom Properties, Vitest, Vue Test Utils

**Specs:**
- `docs/superpowers/specs/2026-03-18-settings-ui-refinement-design.md`
- `docs/superpowers/specs/2026-03-18-settings-scroll-spacing-select-polish-design.md`

**Design Guardrails:**
- 顶部 tab 必须始终可见，滚动只发生在 `.settings-content`。
- hover / focus 只允许使用颜色、边框、阴影、透明度变化；不要用 scale 造成布局抖动。
- 继续保持语义结构和动态 ARIA：`tab` / `listbox` / `option` / `button` 语义不能回归。
- 下拉框只负责“选择项”；长路径等详情只能放在独立只读行。

---

## 文件结构

### 预期修改

| 文件路径 | 责任 |
| --- | --- |
| `src/styles/settings.css` | 建立稳定的单滚动高度链，统一 section / card 间距，收紧 `SSelect` 外部占位，完善 Hotkeys 的两栏与窄宽度退化。 |
| `src/components/settings/ui/SSelect.vue` | 收紧 trigger / panel / option 尺寸，保留 Teleport + 键盘行为，继续支持可选 description，但默认无 description 时更紧凑。 |
| `src/components/settings/ui/__tests__/SSelect.test.ts` | 锁定 description 为可选、trigger 只展示 label、键盘/关闭行为不回归。 |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 默认终端 options 去掉 path description；路径保留为独立只读行；必要时补局部 class hook。 |
| `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts` | 锁定“下拉只显示名称、路径单独显示”的层级 contract。 |
| `src/components/settings/parts/SettingsHotkeysSection.vue` | 优化 row 结构与 class hook，让 label / recorder 更稳；不改热键保存与冲突判定逻辑。 |
| `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts` | 锁定 Hotkeys 行结构仍为 label / recorder 双区，并确认冲突提示继续依附 recorder。 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定 topbar 与 `.settings-content` 的兄弟关系，确保只有一个应用层内容滚动容器。 |
| `src/__tests__/app.failure-events.test.ts` | 补充默认终端下拉 integration regression，确认 dropdown 只列 label、path 仍在详情行、外部点击关闭不回归。 |
| `src/__tests__/app.settings-hotkeys.test.ts` | 复用/小幅扩展冲突回归，确保 Hotkeys 精修后冲突仍定位在具体字段。 |
| `docs/active_context.md` | 追加 writing-plans 阶段摘要。 |

### 参考文件（预期不改）

| 文件路径 | 原因 |
| --- | --- |
| `src/components/settings/SettingsWindow.vue` | 当前 DOM 已具备 `topbar + content` 稳定壳体，本轮优先 CSS 收口；只有在 contract test 暴露缺少 hook 时才补最小改动。 |
| `src/styles/reset.css` | 已提供 `html/body/#app { height: 100% }` 与 `body { overflow: hidden }`；实现前先确认，不要重复造高度链。 |
| `src/components/settings/parts/SettingsCommandsSection.vue` | Commands 不在本轮结构改动面内，仅复用现有 `settings-content--commands` 宽度 hook。 |

---

## Chunk 1: 锁定单滚动与终端信息层级 Contract

### Task 1: 先补会真实约束实现的测试

**Files:**
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/components/settings/ui/__tests__/SSelect.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 扩展 `SettingsWindow.layout.test.ts`，锁定单滚动壳体关系**

在现有 stable shell 测试基础上追加：

```ts
it("keeps topbar outside the single application-level content container", () => {
  const wrapper = shallowMount(SettingsWindow, {
    props: createSettingsWindowProps({ settingsRoute: "general" })
  });

  expect(wrapper.find(".settings-window-topbar + .settings-content").exists()).toBe(true);
  expect(wrapper.findAll(".settings-content")).toHaveLength(1);
});
```

说明：
- 这条断言大概率现在就会通过，作用是把“topbar 固定、content 单滚动容器”钉死，防止后面为了修 CSS 又改坏 DOM。

- [ ] **Step 2: 扩展 `SSelect.test.ts`，锁定 description 为可选**

新增两条测试：

```ts
it("renders descriptions only when the option provides one", async () => {
  const wrapper = mount(SSelect, {
    props: {
      modelValue: "ps",
      options: [
        { value: "ps", label: "PowerShell", description: "powershell.exe" },
        { value: "wt", label: "Windows Terminal" }
      ]
    },
    attachTo: document.body
  });

  await wrapper.find(".s-select__trigger").trigger("click");
  const options = Array.from(document.body.querySelectorAll(".s-select__option"));
  expect(options[0]?.textContent).toContain("powershell.exe");
  expect(options[1]?.querySelector(".s-select__description")).toBeNull();
  wrapper.unmount();
});

it("keeps the trigger text label-only even when descriptions exist", () => {
  const wrapper = mount(SSelect, {
    props: {
      modelValue: "ps",
      options: [{ value: "ps", label: "PowerShell", description: "powershell.exe" }]
    }
  });

  expect(wrapper.find(".s-select__trigger").text()).toContain("PowerShell");
  expect(wrapper.find(".s-select__trigger").text()).not.toContain("powershell.exe");
});
```

- [ ] **Step 3: 更新 `SettingsGeneralSection.i18n.test.ts`，锁定默认终端层级**

把断言补到：

```ts
const trigger = wrapper.get(".s-select__trigger");
expect(trigger.text()).toContain("PowerShell");
expect(trigger.text()).not.toContain("powershell.exe");

const terminalPath = wrapper.get("code.settings-card__mono");
expect(terminalPath.text()).toContain("powershell.exe");
```

保留现有 i18n 断言，不要把这个文件改成只测布局。

- [ ] **Step 4: 扩展 `app.failure-events.test.ts` 的默认终端 dropdown regression**

在已有 `keeps terminal dropdown closed on loading/empty guards and closes on outside pointerdown` 测试里，打开下拉后增加：

```ts
const optionTexts = Array.from(document.body.querySelectorAll("[role='option']")).map(
  (node) => node.textContent ?? ""
);
expect(optionTexts.some((text) => text.includes("PowerShell"))).toBe(true);
expect(optionTexts.every((text) => !text.includes("powershell.exe"))).toBe(true);
expect(wrapper.get("code.settings-card__mono").text()).toContain("powershell.exe");
```

- [ ] **Step 5: 运行定向测试**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SSelect.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected:
- `SSelect.test.ts` 当前应通过或部分通过，用于锁定现有 label-only trigger 行为。
- `SettingsGeneralSection.i18n.test.ts` 与 `app.failure-events.test.ts` 应因默认终端 options 仍携带 `description/path` 而失败。

- [ ] **Step 6: Commit（测试先行）**

```bash
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/components/settings/ui/__tests__/SSelect.test.ts
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/__tests__/app.failure-events.test.ts
git commit -m "test(settings): 锁定滚动容器与终端选择层级"
```

---

## Chunk 2: 落地单滚动高度链与紧凑 Select

### Task 2: 只改 CSS/组件壳体，不碰业务逻辑

**Files:**
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/ui/SSelect.vue`
- Modify: `src/components/settings/ui/__tests__/SSelect.test.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`

- [ ] **Step 1: 先修 `settings.css` 的单滚动高度链**

目标：
- `.settings-window-root` 自己吃满 `#app` 高度，不再依赖 `min-height: 100vh` 撑高内容。
- 只有 `.settings-content` 拿 `overflow-y: auto`。
- topbar 不参与滚动；content 在超高时稳定出滚动条。

推荐改法：

```css
.settings-window-root {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: 52px minmax(0, 1fr);
  overflow: hidden;
}

.settings-content {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}
```

注意：
- 保留当前 topbar / commands width hook。
- 不要把滚动逻辑塞回 `body`、`main` 或额外 JS。

- [ ] **Step 2: 在 `settings.css` 同步拉开 section / card 节奏**

围绕本轮目标，只做以下收口：

```css
.settings-group {
  gap: 24px;
}

.settings-card {
  border-radius: 16px;
}

.settings-card__row {
  gap: 18px;
}

.settings-hint {
  padding-top: 10px;
}
```

说明：
- 这是“呼吸感增加一档”，不是重做整套 spacing token。
- 不要顺手波及 Appearance / About 的结构。

- [ ] **Step 3: 收紧 `SSelect.vue` 的 trigger / panel / option 尺寸**

保持现有逻辑和 ARIA，只改样式层。最低要求：

```css
.s-select__trigger {
  min-height: 32px;
  min-width: 160px;
  padding: 6px 10px;
  border-radius: 9px;
  gap: 8px;
}

.s-select__list {
  padding: 4px;
  border-radius: 10px;
  max-height: 240px;
  overflow-y: auto;
}

.s-select__option {
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 6px;
  padding: 7px 8px;
  border-radius: 8px;
}

.s-select__label {
  font-size: 12.5px;
}

.s-select__description {
  font-size: 10.5px;
  margin-top: 1px;
}
```

说明：
- 继续支持 `description`，但无 `description` 的 option 必须自然变矮。
- 不要改 `Teleport`、`pointerdown` 关闭、键盘导航、定位逻辑。

- [ ] **Step 4: 运行本任务相关测试**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SSelect.test.ts
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles/settings.css
git add src/components/settings/ui/SSelect.vue
git add src/components/settings/ui/__tests__/SSelect.test.ts
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "feat(settings): 修复单滚动并紧凑化通用下拉"
```

---

## Chunk 3: General 终端层级与 Hotkeys 布局收口

### Task 3: 先锁定 General / Hotkeys 的最小 contract

**Files:**
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 保持 `SettingsGeneralSection.i18n.test.ts` 的新断言**

如果 Chunk 1 已经补完并失败，这一步只需要保留，不再另起炉灶。

- [ ] **Step 2: 只在 Hotkeys 需要新增 class hook 时扩展 layout test**

如果 `SettingsHotkeysSection.vue` 只做 CSS 调整、无需改 DOM，保留现有测试即可。

如果你新增了真实有用的结构 hook，例如：

```vue
<div class="settings-hotkeys-row__meta">...</div>
```

再补对应断言：

```ts
expect(wrapper.findAll(".settings-hotkeys-row__meta")).toHaveLength(3);
expect(wrapper.get(".settings-hotkeys-row__recorder .s-hotkey-recorder-field__conflict").text())
  .toContain("duplicate hotkey");
```

硬规则：
- 不要为了“让测试先失败”生造没有语义价值的包装 div。
- Hotkeys 的布局变化主要靠 CSS，测试只锁定真正新增的结构 contract。

- [ ] **Step 3: 小幅扩展 `app.settings-hotkeys.test.ts`**

在现有 `shows conflict state when duplicate hotkeys are entered` 基础上追加一条更贴近本轮目标的断言：

```ts
const conflictField = wrapper
  .findAll(".s-hotkey-recorder-field")
  .find((item) => item.find(".s-hotkey-recorder-field__label").text() === "切换焦点区域");

expect(conflictField?.find(".s-hotkey-recorder-field__conflict").exists()).toBe(true);
```

这条回归不是测样式，而是确保冲突提示仍附着在具体字段，不会被错误提炼成全局提示。

- [ ] **Step 4: 运行定向测试**

Run:

```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```

Expected:
- `SettingsGeneralSection.i18n.test.ts` 仍失败，直到 `SettingsGeneralSection.vue` 改完。
- `SettingsHotkeysSection.layout.test.ts` / `app.settings-hotkeys.test.ts` 作为守卫，必要时新增断言后通过。

- [ ] **Step 5: Commit（测试守卫补齐后）**

```bash
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "test(settings): 补齐 General 与 Hotkeys 精修守卫"
```

### Task 4: 实现 General / Hotkeys 精修

**Files:**
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 调整 `SettingsGeneralSection.vue` 的终端 option 映射**

把：

```ts
return props.availableTerminals.map((item) => ({
  value: item.id,
  label: item.label,
  description: item.path
}));
```

改为：

```ts
return props.availableTerminals.map((item) => ({
  value: item.id,
  label: item.label
}));
```

同时保持：
- loading / empty guard 逻辑不变；
- `terminalSelectValue` 逻辑不变；
- 路径继续使用独立 `code.settings-card__mono` 展示。

- [ ] **Step 2: 只在有真实价值时给 General 增加局部 class hook**

如果 `settings.css` 需要更精确控制终端路径行，可增加最小 hook，例如：

```vue
<div class="settings-card__row settings-general__path-row">
  ...
</div>
```

禁止：
- 为了测试随意增加无语义包装层；
- 把 path 再塞回 `SSelect`。

- [ ] **Step 3: 调整 `SettingsHotkeysSection.vue` 的行结构与 class hook**

目标是更稳定的两栏布局，而不是重做录制器。

推荐保持：

```vue
<div class="settings-card__row settings-hotkeys-row">
  <div class="settings-hotkeys-row__label">
    <span class="settings-card__label">...</span>
  </div>
  <div class="settings-hotkeys-row__recorder">
    <SHotkeyRecorder ... />
  </div>
</div>
```

允许新增一个真实有用的中间层，例如：

```vue
<div class="settings-hotkeys-row__meta">...</div>
```

但前提是它确实服务于 CSS 布局，而不是测试。

- [ ] **Step 4: 在 `settings.css` 完成 General / Hotkeys 视觉收口**

最低要求：

```css
.settings-card__mono {
  max-width: min(100%, 460px);
}

.settings-hotkeys-row {
  align-items: flex-start;
}

.settings-hotkeys-row__label {
  min-width: 0;
  flex: 1 1 auto;
  padding-top: 2px;
}

.settings-hotkeys-row__recorder {
  flex: 0 0 auto;
  width: min(100%, 280px);
}

@media (max-width: 760px) {
  .settings-hotkeys-row {
    flex-direction: column;
  }

  .settings-hotkeys-row__recorder {
    width: 100%;
  }
}
```

可选增强：
- 给路径行和终端 hint 之间增加更清晰的节奏；
- 适度缩小 Hotkeys card 内行间距，但不要比 General 更拥挤。

- [ ] **Step 5: 跑本任务相关测试**

Run:

```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/parts/SettingsGeneralSection.vue
git add src/components/settings/parts/SettingsHotkeysSection.vue
git add src/styles/settings.css
git add src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git add src/__tests__/app.failure-events.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "feat(settings): 收口终端层级与热键布局"
```

---

## Chunk 4: 验证、文档与执行交接

### Task 5: 聚焦回归 + 总门禁 + 短期记忆

**Files:**
- Modify: `docs/active_context.md`
- Reference: `docs/superpowers/specs/2026-03-18-settings-ui-refinement-design.md`
- Reference: `docs/superpowers/specs/2026-03-18-settings-scroll-spacing-select-polish-design.md`
- Reference: `docs/superpowers/plans/2026-03-18-settings-scroll-spacing-select-polish.md`

- [ ] **Step 1: 运行 focused settings regression**

Run:

```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/components/settings/ui/__tests__/SSelect.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsGeneralSection.i18n.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/__tests__/app.failure-events.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```

Expected: 全绿。

- [ ] **Step 2: 跑总门禁**

Run:

```bash
npm run check:all
```

Expected: `lint -> typecheck -> typecheck:test -> test:coverage -> build -> check:rust -> test:rust` 全绿。

- [ ] **Step 3: 做 Windows 手动验收**

Run:

```bash
npm run dev
```

手动检查：
1. Settings 内容超出窗口时，只有内容区出现纵向滚动条，顶部 tab 始终固定。
2. General 页默认终端下拉只显示名称；长路径保留在独立只读 code 行，单行截断不撑破布局。
3. Language select 与 terminal select 使用同一套紧凑尺寸，不再显得过高过粗。
4. Hotkeys 在常规宽度下保持 label / recorder 两栏；在窄宽度下退化为上下结构，但不重叠、不挤爆。
5. 外部点击关闭下拉、键盘导航、冲突提示、即时保存都不回归。

- [ ] **Step 4: 更新短期记忆**

在 `docs/active_context.md` 末尾追加一条不超过 200 字的摘要，示例：

```md
## 补充（2026-03-18｜Settings 二次精修 writing-plans 完成）
- 已产出执行计划：`docs/superpowers/plans/2026-03-18-settings-scroll-spacing-select-polish.md`，仅覆盖 settings.css / SSelect / General / Hotkeys 与相关回归，不改业务逻辑。
```

- [ ] **Step 5: Commit**

```bash
git add docs/active_context.md
git add docs/superpowers/plans/2026-03-18-settings-scroll-spacing-select-polish.md
git commit -m "docs(plan): 更新 settings 二次精修实现计划"
```

---

## 执行顺序建议

1. 先做 `Task 1`
2. 再做 `Task 2`
3. 然后做 `Task 3` / `Task 4`
4. 最后做 `Task 5`

原因：
- `Task 1` 能快速把“单滚动容器”和“终端下拉不显示路径”钉成可验证 contract。
- `Task 2` 是全局基础设施，先修高度链和通用 select，后续 General / Hotkeys 才不会来回返工。
- `Task 3` / `Task 4` 属于局部页面精修，风险面小，且完全建立在前两步稳定之后。

## 不要做的事

- 不要修改 `useSettingsWindow`、settings store、Tauri 命令或任何持久化逻辑。
- 不要为了测试生造无语义 DOM。
- 不要把路径重新塞进 option description。
- 不要新增第二个滚动容器，也不要把滚动逻辑挪到 `body`。
- 不要顺手重做 Appearance / About / Commands 页面。

## 完成定义

- `.settings-content` 成为唯一应用层滚动容器，顶部 tab 固定。
- `SSelect` 视觉更紧凑，但 Teleport / keyboard / close-on-outside-pointerdown 行为不变。
- 默认终端 dropdown 只展示名称，路径仍在独立只读行中。
- Hotkeys 的 label / recorder 在桌面宽度下稳定，在窄宽度下自然退化，不出现重叠。
- focused settings regression 与 `npm run check:all` 全绿。
