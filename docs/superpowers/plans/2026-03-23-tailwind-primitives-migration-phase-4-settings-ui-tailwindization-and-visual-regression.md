# Tailwind Primitives Migration Phase 4 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Settings 小组件（非窗口级 CSS）逐步 Tailwind 化并保持主题 tokens 体系不变，同时扩展截图级视觉回归门禁覆盖关键交互态，避免迁移后样式丢失。

**Architecture:** 采用 Hybrid（方案 A）：组件模板使用 Tailwind utilities 表达布局/排版/状态；组件继续保留既有 BEM 类名（避免测试与选择器断裂）；颜色/阴影等视觉语义只通过 `var(--ui-*)` tokens 消费（必要时在 `src/styles/tokens.css` 补充新的 `--ui-*` 语义 token），并用截图门禁锁定“视觉零差异”。

**Tech Stack:** Vue 3, Vite, TailwindCSS, Vitest, `style-guard`, Edge headless visual-regression

**设计文档:** `docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-4-settings-ui-tailwindization-and-visual-regression-design.md`

---

## 文件结构（File Map）

### 计划修改（按需）

| 文件 | 目的 |
|---|---|
| `src/AppVisual.vue` | 扩展视觉回归 harness：新增 slider / hotkey recorder 场景（必要时加“交互态稳定触发”逻辑） |
| `scripts/e2e/visual-regression.cjs` | 新增 screenshot 配置项（id/hash/viewport/阈值） |
| `scripts/e2e/visual-baselines/*.png` | 新增/更新 baseline（仅当视觉差异“被确认是预期”） |
| `src/styles/tokens.css` | 补齐 Settings 控件迁移所需的 `--ui-*` 语义 token（避免模板层出现 `rgba()`/hex） |
| `src/components/settings/parts/SettingsGeneralSection.vue` | reuse-policy 小块 scoped CSS → Tailwind utilities |
| `src/components/settings/ui/SToggle.vue` | scoped CSS → Tailwind utilities（含 shadow/focus/compact） |
| `src/components/settings/ui/SSegmentNav.vue` | scoped CSS → Tailwind utilities（含 hover/active/focus） |
| `src/__tests__/settings.topbar-nav-style-contract.test.ts` | style contract 从“匹配 CSS 文本”迁到“匹配 Tailwind class / 语义契约” |
| `src/components/settings/ui/SSlider.vue` | Hybrid：输入轨道/布局 Tailwind 化；保留 range 伪元素最小 CSS |
| `src/components/settings/ui/SHotkeyRecorder.vue`（可选） | scoped CSS → Tailwind utilities（录制态/冲突态不退化） |

---

## Chunk 1: 视觉回归覆盖扩展（先立“基线”，再迁移实现）

### Task 1: 扩展 `AppVisual`，增加 Phase 4 组件展示场景

**Files:**
- Modify: `src/AppVisual.vue`

- [ ] **Step 1: 新增 scenario id 并扩展 normalize**

建议新增（保持数量可控）：
- `settings-ui-slider`
- `settings-ui-hotkey-recorder`（若本 Phase 不改该组件，可先不加）

示例结构（仅示意，按 repo 实际代码风格落地）：

```ts
type VisualScenarioId =
  | "settings-ui-overview"
  | "settings-ui-dropdown-open"
  | "settings-ui-slider"
  | "settings-ui-hotkey-recorder";
```

- [ ] **Step 2: 在模板中为新场景增加单独 section**

要求：
- 使用与现有一致的容器（`rounded` + `border` + `bg`）保证截图一致性
- 交互态用“程序化 click”触发（参考 dropdown open 场景），避免 hover/鼠标时序抖动

- [ ] **Step 3: （如启用 hotkey recorder 场景）用 onMounted 稳定进入 recording**

示例（仅示意）：

```ts
onMounted(async () => {
  if (scenario.value !== "settings-ui-hotkey-recorder") return;
  await nextTick();
  const trigger = document.querySelector<HTMLButtonElement>(".s-hotkey-recorder");
  trigger?.click();
});
```

### Task 2: 让 visual-regression 脚本感知新场景

**Files:**
- Modify: `scripts/e2e/visual-regression.cjs`

- [ ] **Step 1: 为每个新场景增加 SCREENSHOTS 配置**

建议沿用现有 viewport（`1100x900`）与阈值（`maxDiffRatio=0.005`），先以稳定为主：

```js
{
  id: "settings-ui-slider",
  hash: "settings-ui-slider",
  width: 1100,
  height: 900,
  maxDiffRatio: 0.005,
  pixelTolerance: 0,
  sampleStep: 1
}
```

- [ ] **Step 2: 本地生成 baseline（必须先 build）**

Run:
- `npm run build`
- `npm run test:visual:ui:update`

Expected:
- `scripts/e2e/visual-baselines/settings-ui-slider.png`（以及可能的 hotkey recorder baseline）被生成
- 控制台出现 `updated baseline:` 日志

- [ ] **Step 3: 立刻跑一次门禁确认 baseline 可用**

Run:
- `npm run test:visual:ui`

Expected:
- 控制台对每个截图输出 `✅ <id>`

- [ ] **Step 4: Commit（只包含 harness + baseline 变更）**

```bash
git add src/AppVisual.vue scripts/e2e/visual-regression.cjs scripts/e2e/visual-baselines/*.png
git commit -m "test(ui):扩展 Settings 视觉回归场景与 baselines"
```

---

## Chunk 2: Tailwind 化 SettingsGeneral reuse-policy（低风险热身）

### Task 3: `SettingsGeneralSection` reuse-policy scoped CSS → Tailwind

**Files:**
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Test: `npm run test:visual:ui`（若 Chunk 1 已新增“general section”场景才需要；否则本 Task 只靠全量门禁兜底）

- [ ] **Step 1: 将 BEM 类保留，并在模板上叠加 Tailwind utilities**

建议映射（对齐现有 CSS）：
- `gap: 8px` → `gap-2`
- `gap: 6px` → `gap-1.5`
- `gap: 2px` → `gap-0.5`
- `font-size: 12px` → `text-[12px]`
- `line-height: 1.4` → `leading-[1.4]`
- `color: var(--ui-subtle)` → `text-[color:var(--ui-subtle)]`

示例（仅示意）：

```vue
<div class="settings-general__reuse-policy grid gap-2">
  <ul class="settings-general__reuse-policy-list m-0 grid list-none gap-1.5 p-0">
    <li class="settings-general__reuse-policy-item grid gap-0.5 text-[12px] leading-[1.4] text-[color:var(--ui-subtle)]">
      <strong class="font-semibold text-[color:var(--ui-text)]">...</strong>
      <span>...</span>
    </li>
  </ul>
</div>
```

- [ ] **Step 2: 删除 `<style scoped>` 对应规则块**
- [ ] **Step 3: 跑门禁**

Run:
- `npm run check:all`
- `npm run test:visual:ui`

Expected:
- PASS（无 style-guard 违规；截图全绿）

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/parts/SettingsGeneralSection.vue
git commit -m "refactor(settings-ui):reuse-policy 改为 Tailwind utilities"
```

---

## Chunk 3: Tailwind 化 `SToggle`（需要 tokens 支撑阴影避免 rgba 回流）

### Task 4: 为 `SToggle` 补齐必要的 `--ui-*` 语义 token

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: 新增 toggle 阴影 token（避免模板层出现 rgba）**

建议用 `--theme-text-rgb` 生成白色系 alpha（保证主题可扩展）：

```css
--ui-settings-toggle-track-shadow: inset 0 0 0 1px rgba(var(--theme-text-rgb), 0.06);
--ui-settings-toggle-thumb-shadow:
  0 1px 4px rgba(0, 0, 0, 0.28),
  0 0 0 1px rgba(var(--theme-text-rgb), 0.08);
```

> 注意：token 里允许 rgba（style-guard 不扫描 `.css`）；但组件模板里禁止出现 `rgba(...)` 字符串。

- [ ] **Step 2: Commit（单独提交 token 变更便于回滚）**

```bash
git add src/styles/tokens.css
git commit -m "chore(tokens):补齐 Settings toggle 阴影语义 token"
```

### Task 5: `SToggle` scoped CSS → Tailwind utilities

**Files:**
- Modify: `src/components/settings/ui/SToggle.vue`
- Test: `src/components/settings/ui/__tests__/SToggle.test.ts`
- Visual: `npm run test:visual:ui`（overview 截图已覆盖 toggle 的 on/off/compact/disabled）

- [ ] **Step 1: 保留既有 BEM class 与状态 class（兼容测试选择器）**
- [ ] **Step 2: 用 Tailwind utilities 表达布局与状态**

建议映射（对齐现有 CSS）：
- track：`w-9 h-5 rounded-full`
- compact track：`w-[30px] h-[17px]`
- thumb：`top-0.5 left-0.5`、默认 `size-4`、compact `w-[13px] h-[13px]`
- on：thumb 平移 `translate-x-4`（compact `translate-x-[13px]`）
- focus ring：`shadow-[0_0_0_3px_var(--ui-settings-focus-ring)]`
- shadow：`shadow-[var(--ui-settings-toggle-*-shadow)]`

- [ ] **Step 3: 删除 `<style scoped>`**
- [ ] **Step 4: 跑 focused 单测（先快反馈）**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SToggle.test.ts`

Expected:
- PASS

- [ ] **Step 5: 跑门禁（含视觉门禁）**

Run:
- `npm run check:all`
- `npm run test:visual:ui`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ui/SToggle.vue
git commit -m "refactor(settings-ui):SToggle 改为 Tailwind 实现"
```

---

## Chunk 4: Tailwind 化 `SSegmentNav` + 更新 style contract

### Task 6: 为 `SSegmentNav` 补齐必要 tokens（替代模板层 rgba）

**Files:**
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: 新增 segment nav 语义 token**

建议（对齐现有视觉，并保持主题可扩展）：

```css
--ui-settings-segment-tab-text: rgba(var(--theme-text-rgb), 0.56);
--ui-settings-segment-tab-text-hover: rgba(var(--theme-text-rgb), 0.82);
--ui-settings-segment-tab-text-active: rgba(var(--theme-text-rgb), 0.95);
--ui-settings-segment-tab-active-bg: rgba(var(--theme-text-rgb), 0.09);
```

hover 背景建议直接复用已存在的：
- `--ui-settings-table-row-hover`（obsidian=rgba(...,0.04)）

- [ ] **Step 2: Commit**

```bash
git add src/styles/tokens.css
git commit -m "chore(tokens):补齐 Settings segment-nav 语义 token"
```

### Task 7: `SSegmentNav` scoped CSS → Tailwind utilities

**Files:**
- Modify: `src/components/settings/ui/SSegmentNav.vue`
- Test: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`
- Visual: `npm run test:visual:ui`（overview 截图已覆盖默认/active）

- [ ] **Step 1: 保留 BEM 类（`.s-segment-nav` / `.s-segment-nav__tab--active` 等）**
- [ ] **Step 2: 将样式表达迁到模板（避免依赖 `<style scoped>`）**

建议关键类契约（用于后续 contract test）：
- nav：`flex justify-center gap-2.5 w-fit max-w-[min(100%,720px)] mx-auto pt-2 pb-2.5`
- tab：`min-h-[34px] px-4 py-2 rounded-[10px] border border-transparent bg-transparent`
- text：`text-[13px] font-medium text-[color:var(--ui-settings-segment-tab-text)]`
- hover：`hover:bg-[var(--ui-settings-table-row-hover)] hover:text-[color:var(--ui-settings-segment-tab-text-hover)]`
- active：`bg-[var(--ui-settings-segment-tab-active-bg)] text-[color:var(--ui-settings-segment-tab-text-active)] font-semibold`
- focus：`focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--ui-brand-soft)]`

- [ ] **Step 3: 删除 `<style scoped>`**
- [ ] **Step 4: 跑 focused 单测**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts`

Expected:
- PASS

### Task 8: 更新 `settings.topbar-nav-style-contract`（从 CSS 文本契约迁到 Tailwind class 契约）

**Files:**
- Modify: `src/__tests__/settings.topbar-nav-style-contract.test.ts`

- [ ] **Step 1: 保留原有“topbar separator”契约（settings.css）**
- [ ] **Step 2: 将 SSegmentNav 契约改为断言模板 class**

建议断言点（示意）：
- `<nav class="s-segment-nav ... gap-2.5 pt-2 pb-2.5 ...">`
- tab 基础类包含 `rounded-[10px] border border-transparent bg-transparent`
- hover/active 使用 token（不再断言 RGBA 字符串）

- [ ] **Step 3: 跑 contract + 全量门禁**

Run:
- `npm run test:run -- src/__tests__/settings.topbar-nav-style-contract.test.ts`
- `npm run check:all`
- `npm run test:visual:ui`

Expected:
- PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/ui/SSegmentNav.vue src/__tests__/settings.topbar-nav-style-contract.test.ts
git commit -m "refactor(settings-ui):SSegmentNav 改为 Tailwind 并更新样式契约"
```

---

## Chunk 5: Hybrid Tailwind 化 `SSlider`（保留 range 伪元素最小 CSS）+ 视觉覆盖

### Task 9: `SSlider` 迁移为 Hybrid（模板 Tailwind + 伪元素 CSS）

**Files:**
- Modify: `src/components/settings/ui/SSlider.vue`
- Test: `src/components/settings/ui/__tests__/SSlider.test.ts`
- Visual: `settings-ui-slider`（Chunk 1 已加场景）

- [ ] **Step 1: 让 input 轨道/布局迁到模板（Tailwind）**

建议类（示意）：
- wrapper：`flex items-center gap-3`
- range：`flex-1 h-1.5 appearance-none rounded-full outline-none`
- 背景渐变用 Tailwind arbitrary bg（避免写回 CSS）：

```text
bg-[linear-gradient(90deg,var(--ui-brand)_0%,var(--ui-brand)_var(--fill-percent),var(--ui-border)_var(--fill-percent),var(--ui-border)_100%)]
```

- value：`min-w-[44px] text-right text-[12px] text-[color:var(--ui-subtle)]`

- [ ] **Step 2: 保留（或收敛）伪元素 thumb CSS**

仅保留：
- `.s-slider__input::-webkit-slider-thumb`
- `.s-slider__input::-moz-range-thumb`

其余能用模板表达的移除，避免重复来源。

- [ ] **Step 3: 跑 focused 单测 + 视觉门禁**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SSlider.test.ts`
- `npm run check:all`
- `npm run test:visual:ui`

Expected:
- PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/ui/SSlider.vue
git commit -m "refactor(settings-ui):SSlider 采用 Hybrid Tailwind 化"
```

---

## Chunk 6（可选）: Tailwind 化 `SHotkeyRecorder` + 补齐交互态截图

> 如果本轮目标是“先把窗口级以外的组件尽量 Tailwind 化”，建议纳入；若担心录制交互引入不稳定，可延后到下一轮。

### Task 10: 扩展 AppVisual 场景覆盖录制/冲突/空态（若尚未完成）

**Files:**
- Modify: `src/AppVisual.vue`
- Modify: `scripts/e2e/visual-regression.cjs`
- Modify: `scripts/e2e/visual-baselines/*.png`

- [ ] **Step 1: 新增 `settings-ui-hotkey-recorder` 场景并生成 baseline**
- [ ] **Step 2: 跑 `npm run test:visual:ui` 确认稳定**
- [ ] **Step 3: Commit**

### Task 11: `SHotkeyRecorder` scoped CSS → Tailwind utilities

**Files:**
- Modify: `src/components/settings/ui/SHotkeyRecorder.vue`
- Test: `src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`

- [ ] **Step 1: 保留 BEM 类与状态类（`--empty/--recording/--conflict`）**
- [ ] **Step 2: 将布局/排版/状态类迁到模板（token 驱动，不写硬编码色值）**
- [ ] **Step 3: 删除 `<style scoped>`**
- [ ] **Step 4: 跑 focused 单测 + 全量门禁**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SHotkeyRecorder.test.ts`
- `npm run check:all`
- `npm run test:visual:ui`

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/ui/SHotkeyRecorder.vue
git commit -m "refactor(settings-ui):SHotkeyRecorder 改为 Tailwind 实现"
```

---

## 收尾：门禁验收 + 文档记录

### Task 12: Phase 4 阶段性验收（合并前必做）

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 跑总门禁**

Run:
- `npm run check:all`
- `npm run test:visual:ui`

Expected:
- PASS

- [ ] **Step 2: `docs/active_context.md` 追加 ≤200 字摘要（只补充，不覆盖）**
- [ ] **Step 3: Commit**

```bash
git add docs/active_context.md
git commit -m "docs:记录 Tailwind Phase 4 进展"
```

