# Settings 顶部层叠 / 快捷键自适应 / 滚动命中区精修 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改动 Settings 业务逻辑、持久化结构和热键录制规则的前提下，完成顶部层叠头部、Hotkeys 录制器按内容自适应，以及“隐藏滚动条但左右留白区也可滚动”的 UI 精修。

**Architecture:** 保留 `SettingsWindow.vue` 现有 “topbar 在上、content 在下” 的物理分层，但把滚动容器拆成“全宽 scroll host + 内层限宽内容容器”。`SSegmentNav.vue` 去掉自身外层壳体，topbar 的双层感统一回收至 `settings.css`；`SHotkeyRecorder.vue` 改成内容驱动宽度，`SettingsHotkeysSection.vue` 只保留行级布局与冲突挂载关系。测试分为三层：shell/layout contract、组件 contract、AppSettings 集成回归。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, CSS Custom Properties, Vitest, Vue Test Utils

**Specs:**
- `docs/superpowers/specs/2026-03-19-settings-topbar-hotkeys-scroll-polish-design.md`

**Design Guardrails:**
- 只做 Settings 结构和样式精修，不碰 store、settings snapshot、热键规范化和冲突判定逻辑。
- topbar 固定不滚动，应用层只允许一个纵向滚动链。
- `SSegmentNav` 继续保留 `tablist/tab` 语义，`SHotkeyRecorder` 继续保留按钮录制语义。
- 隐藏滚动条只能隐藏视觉，不允许把 `overflow-y` 改成 `hidden` 或引入 JS 伪滚动。

---

## 文件结构

### 预期修改

| 文件路径 | 责任 |
| --- | --- |
| `src/components/settings/SettingsWindow.vue` | 去掉 `topbar` 里的 nav-shell 包裹，建立“全宽 scroll host + 内层限宽内容容器”结构，并把 commands 宽度 modifier 挂到内层容器。 |
| `src/components/settings/ui/SSegmentNav.vue` | 去除 tablist 外层卡片壳体视觉，保留轻胶囊激活态与键盘导航。 |
| `src/components/settings/ui/SHotkeyRecorder.vue` | 让录制按钮按内容宽度自适应，同时保持空值、录制中、冲突态的最小点击宽度与稳定高度。 |
| `src/components/settings/parts/SettingsHotkeysSection.vue` | 维持 label / recorder 双区结构，去掉把 recorder 强制拉满 100% 的布局约束，仅保留必要的局部 hook。 |
| `src/styles/settings.css` | 实现双层 topbar、头部与内容分界、全宽滚动宿主、隐藏滚动条、居中内容容器、Hotkeys 行节奏与窄宽度退化。 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定 topbar 直接承载 nav、scroll host 与内层内容容器的关系，以及 commands 宽度 hook。 |
| `src/components/settings/ui/__tests__/SSegmentNav.test.ts` | 锁定 tablist/tab 语义、active class 和键盘导航不回归。 |
| `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts` | 锁定空值/录制/冲突态与短/长快捷键展示 contract。 |
| `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts` | 锁定分组标题、label / recorder 双区，以及冲突提示继续挂在字段本地。 |
| `src/__tests__/app.settings-hotkeys.test.ts` | 作为集成回归，确保录制、冲突、segment 导航不因 UI 改造回归。 |
| `docs/active_context.md` | 追加 writing-plans 阶段摘要。 |

### 参考文件（预期不改）

| 文件路径 | 原因 |
| --- | --- |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 本轮不涉及 General 结构；只用它验证新滚动宿主与内容宽度在普通 route 下不回归。 |
| `src/components/settings/ui/SDropdown.vue` | 与本轮目标无关，不应被“顺手精修”。 |
| `src/styles/reset.css` | 高度链已经存在基础兜底，本轮只在 settings 局部建立 scroll host。 |

---

## Chunk 1: 先锁定新的 Shell / Scroll / Recorder Contract

### Task 1: 补会真实约束实现方向的测试

**Files:**
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`
- Modify: `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`

- [ ] **Step 1: 更新 `SettingsWindow.layout.test.ts`，锁定 topbar 不再依赖 nav-shell**

把现有 “renders app topbar” 相关断言改成：

```ts
const topbar = wrapper.get(".settings-window-topbar");
expect(topbar.find(".s-segment-nav").exists()).toBe(true);
expect(wrapper.find(".settings-window-topbar__nav-shell").exists()).toBe(false);
```

并保留：

```ts
expect(topbar.attributes("data-tauri-drag-region")).toBeUndefined();
```

- [ ] **Step 2: 在同一文件中补 scroll host / inner container contract**

新增断言：

```ts
expect(wrapper.findAll(".settings-content")).toHaveLength(1);
expect(wrapper.find(".settings-content > .settings-content__inner").exists()).toBe(true);
```

Commands route 下补：

```ts
expect(wrapper.get(".settings-content__inner").classes()).toContain("settings-content__inner--commands");
```

- [ ] **Step 3: 扩展 `SSegmentNav.test.ts`，锁定去壳后仍保持 tab 语义**

追加一条测试：

```ts
it("keeps tablist semantics without relying on a shell wrapper", () => {
  const wrapper = mount(SSegmentNav, {
    props: { items, modelValue: "hotkeys" }
  });

  expect(wrapper.get("[role='tablist']").classes()).toContain("s-segment-nav");
  expect(wrapper.findAll(".s-segment-nav__tab--active")).toHaveLength(1);
});
```

- [ ] **Step 4: 扩展 `SHotkeyRecorder.test.ts`，锁定短/长快捷键和录制态显示**

新增至少两条测试：

```ts
it("renders a single compact key token for short hotkeys", () => {
  const wrapper = mount(SHotkeyRecorder, {
    props: { modelValue: "Tab", label: "切换焦点区域" }
  });
  expect(wrapper.findAll(".s-hotkey-recorder__kbd")).toHaveLength(1);
});

it("keeps recording hint and conflict feedback in the same field flow", async () => {
  const wrapper = mount(SHotkeyRecorder, {
    props: { modelValue: "", label: "执行队列", conflict: "duplicate hotkey" },
    attachTo: document.body
  });

  await wrapper.find(".s-hotkey-recorder").trigger("click");
  expect(wrapper.text()).toContain("按下新的快捷键");
  expect(wrapper.find(".s-hotkey-recorder-field__conflict").exists()).toBe(true);
  wrapper.unmount();
});
```

- [ ] **Step 5: 扩展 `SettingsHotkeysSection.layout.test.ts`，锁定 recorder 不再被整列拉满**

不要测具体像素，测结构关系：

```ts
expect(wrapper.findAll(".settings-hotkeys-row__label")).toHaveLength(3);
expect(wrapper.findAll(".settings-hotkeys-row__recorder")).toHaveLength(3);
expect(wrapper.text()).not.toContain("全局错误");
```

如果实现里新增了真正有意义的 hook，例如 `settings-hotkeys-row__meta`，再补对应断言；不要为测试生造包装层。

- [ ] **Step 6: 运行定向测试，确认先红后绿的起点**

Run:

```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts
npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
```

Expected:
- `SettingsWindow.layout.test.ts` 会先因为 `nav-shell` 仍存在、`settings-content__inner` 尚未引入而失败。
- 其余测试应通过或部分失败，用于钉死去壳和 recorder state contract。

- [ ] **Step 7: Commit（测试先行）**

```bash
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/components/settings/ui/__tests__/SSegmentNav.test.ts
git add src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git commit -m "test(settings): 锁定顶部与热键精修契约"
```

---

## Chunk 2: 落地更强层叠感的 Topbar 与 Scroll Host

### Task 2: 改 `SettingsWindow.vue` 与 `settings.css` 的结构基线

**Files:**
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`

- [ ] **Step 1: 在 `SettingsWindow.vue` 去掉 nav-shell 包裹**

把：

```vue
<div class="settings-window-topbar">
  <div class="settings-window-topbar__nav-shell">
    <SSegmentNav ... />
  </div>
</div>
```

改成：

```vue
<div class="settings-window-topbar">
  <SSegmentNav :items="navItems" v-model="settingsRoute" />
</div>
```

说明：
- 不回退自定义标题栏。
- 不新增 drag-region。

- [ ] **Step 2: 把内容区拆成“scroll host + inner container”**

把当前单层：

```vue
<div class="settings-content" ...>
  <SettingsHotkeysSection v-if="..." />
  ...
</div>
```

改成：

```vue
<div class="settings-content" aria-label="settings-content">
  <div
    class="settings-content__inner"
    :class="{ 'settings-content__inner--commands': settingsRoute === 'commands' }"
  >
    <SettingsHotkeysSection v-if="..." />
    ...
  </div>
</div>
```

硬规则：
- `settings-content` 保持唯一滚动宿主。
- 宽度 modifier 从旧的 `.settings-content--commands` 迁移到 inner container。

- [ ] **Step 3: 在 `settings.css` 实现双层 topbar 的视觉基线**

最低实现建议：

```css
.settings-window-topbar {
  position: relative;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 0 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0)) top / 100% 26px no-repeat,
    linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
}

.settings-window-topbar::before {
  content: "";
  position: absolute;
  inset: 25px 0 auto;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

.settings-window-topbar::after {
  content: "";
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.05);
}
```

说明：
- 目标是“标题栏下第二层工具带”，不是重新做回圆角卡片。
- 阴影、边框、背景都要克制，避免卡片感回潮。

- [ ] **Step 4: 在 `settings.css` 建立全宽 scroll host 与内层限宽容器**

最低实现建议：

```css
.settings-content {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  width: 100%;
  padding: 0 0 24px;
  scrollbar-width: none;
}

.settings-content::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.settings-content__inner {
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 32px 32px;
}

.settings-content__inner--commands {
  max-width: 1120px;
}
```

关键点：
- 滚轮命中区属于 `.settings-content` 全宽层。
- 视觉居中与阅读宽度只由 inner container 负责。

- [ ] **Step 5: 更新定向测试**

Run:

```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/SettingsWindow.vue
git add src/styles/settings.css
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "feat(settings): 重构顶部层叠与滚动宿主"
```

---

## Chunk 3: 落地 Shell-less Segment Nav

### Task 3: 让 `SSegmentNav` 只负责 tab 本体，不再负责外层壳体

**Files:**
- Modify: `src/components/settings/ui/SSegmentNav.vue`
- Modify: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`

- [ ] **Step 1: 去掉 `s-segment-nav` 自身的壳体样式**

把当前 tablist 的背景、边框、圆角容器样式收掉，保留：

```css
.s-segment-nav {
  display: flex;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  max-width: min(100%, 720px);
  margin: 0 auto;
  padding: 6px 0 0;
}
```

禁止继续保留：
- `background: rgba(...)`
- `border: 1px solid ...`
- 大圆角外层容器

- [ ] **Step 2: 保留轻胶囊激活态，压低默认项卡片感**

建议最小目标：

```css
.s-segment-nav__tab {
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255, 255, 255, 0.58);
}

.s-segment-nav__tab:hover {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.82);
}

.s-segment-nav__tab--active {
  background: var(--ui-settings-tab-active-bg);
  border-color: var(--ui-settings-tab-active-border);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14);
}
```

说明：
- 默认项只能是透明 hover，不要再做成一排小卡片。
- active 保持轻胶囊，但阴影要比当前更轻。

- [ ] **Step 3: 运行导航相关测试**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/ui/SSegmentNav.vue
git add src/components/settings/ui/__tests__/SSegmentNav.test.ts
git commit -m "feat(settings): 去除顶部导航外壳体"
```

---

## Chunk 4: 落地 Hotkeys 自适应录制器与行布局

### Task 4: 先调整 recorder 本体，再调整 section 行布局

**Files:**
- Modify: `src/components/settings/ui/SHotkeyRecorder.vue`
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 把 `SHotkeyRecorder.vue` 从固定 280px 输入框改为内容驱动容器**

最低实现方向：

```css
.s-hotkey-recorder {
  min-height: 34px;
  inline-size: fit-content;
  min-inline-size: 92px;
  max-inline-size: min(100%, 280px);
  justify-self: start;
}
```

并保持：
- 空值态仍显示“未设置”
- 录制态仍显示“按下新的快捷键…”
- 冲突态仍只在当前字段展示

如果纯 CSS `fit-content` 导致长文本抖动，再加最小 UI 计算（例如基于 token 数量的 size class）；不要改录制业务流程。

- [ ] **Step 2: 让 `SettingsHotkeysSection.vue` 不再强制把 recorder 拉成整列宽度**

优先删或收窄这类约束：

```css
.settings-hotkeys-row__recorder :deep(.s-hotkey-recorder) {
  inline-size: 100%;
}
```

替代为：

```css
.settings-hotkeys-row__recorder {
  display: flex;
  justify-content: flex-end;
}

.settings-hotkeys-row__recorder :deep(.s-hotkey-recorder-field) {
  width: auto;
  max-width: 100%;
}
```

硬规则：
- 继续隐藏重复 label。
- 冲突提示仍跟随本字段。

- [ ] **Step 3: 在 `settings.css` 收口 Hotkeys 行节奏与窄宽度退化**

最低实现建议：

```css
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
  max-width: min(100%, 280px);
}

@media (max-width: 760px) {
  .settings-hotkeys-row {
    flex-direction: column;
  }

  .settings-hotkeys-row__recorder {
    width: 100%;
    max-width: 100%;
  }
}
```

- [ ] **Step 4: 更新 recorder / layout / integration 回归**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ui/SHotkeyRecorder.vue
git add src/components/settings/parts/SettingsHotkeysSection.vue
git add src/styles/settings.css
git add src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts
git add src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "feat(settings): 收口热键录制器自适应布局"
```

---

## Chunk 5: 验证、文档与执行交接

### Task 5: 聚焦回归、总门禁与手动验收

**Files:**
- Modify: `docs/active_context.md`
- Reference: `docs/superpowers/specs/2026-03-19-settings-topbar-hotkeys-scroll-polish-design.md`
- Reference: `plan/2026-03-19-settings-topbar-hotkeys-scroll-polish-implementation-plan.md`

- [ ] **Step 1: 跑 focused settings regression**

Run:

```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts
npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```

Expected: 全绿。

- [ ] **Step 2: 跑总门禁**

Run:

```bash
npm run check:all
```

Expected: `lint -> typecheck -> typecheck:test -> test:coverage -> build -> check:rust -> test:rust` 全绿。

- [ ] **Step 3: 做 Settings GUI 手动验收**

Run:

```bash
npm run dev
```

手动检查：
1. topbar 不再有独立外层卡片壳，但仍明显可见上下两层关系。
2. 激活 tab 保留轻胶囊，未激活项 hover 只是轻提亮，不像并排小卡片。
3. Hotkeys 中 `Tab`、`Esc` 之类短键明显更短，`Ctrl+Backspace` 之类长键自然变宽，但空值/录制态不会塌缩到难点。
4. 内容区滚动条视觉消失，但滚轮、触控板、方向键、Page Up/Page Down 仍正常。
5. 鼠标放在中间内容左右留白区域滚轮时，内容仍会滚动。
6. Commands route 仍保持更宽内容上限。

- [ ] **Step 4: 更新短期记忆**

在 `docs/active_context.md` 末尾追加不超过 200 字的摘要：

```md
## 补充（2026-03-19｜Settings 顶部/热键/滚动 writing-plans 完成）
- 已产出计划 `plan/2026-03-19-settings-topbar-hotkeys-scroll-polish-implementation-plan.md`：覆盖 topbar 去壳、全宽滚动宿主、Hotkeys 录制器自适应与相关回归，不改业务逻辑。
```

- [ ] **Step 5: Commit**

```bash
git add docs/active_context.md
git add plan/2026-03-19-settings-topbar-hotkeys-scroll-polish-implementation-plan.md
git commit -m "docs(plan): 补充 settings 顶部与热键精修计划"
```

---

## 执行顺序建议

1. 先做 `Task 1`
2. 再做 `Task 2`
3. 然后做 `Task 3`
4. 最后做 `Task 4` 和 `Task 5`

原因：
- `Task 1` 会先把“去 nav-shell、引入 inner content 容器、hotkey 自适应不改行为”钉成 contract。
- `Task 2` 是本轮最大结构变化，先落地 scroll host 才能保证“左右留白也可滚”。
- `Task 3` 与 `Task 4` 分别收口 topbar 与 Hotkeys，本质上是建立在新 shell 之上的局部视觉精修。

## 不要做的事

- 不要修改 `settingsStore`、`commandView`、终端选择逻辑、热键冲突逻辑。
- 不要把 topbar 重新做成圆角卡片容器。
- 不要引入 `wheel` 事件劫持或自定义 JS 滚动计算。
- 不要把 recorder 的自适应做成“所有字段等宽”。
- 不要顺手重做 General、Commands、Appearance 的视觉体系。

## 完成定义

- topbar 去掉独立 nav-shell，但保持明确双层头部结构。
- `settings-content` 成为全宽唯一滚动宿主，`settings-content__inner` 负责居中与路由宽度上限。
- 热键录制器按内容宽度自适应，空值/录制/冲突态仍稳定可点击。
- 鼠标位于左右留白区域时，滚轮也能驱动内容滚动。
- focused settings tests 与 `npm run check:all` 全绿。
