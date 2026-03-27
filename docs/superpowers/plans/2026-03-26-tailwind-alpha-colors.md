# Tailwind Alpha Colors (UI RGB Tokens) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做“alpha 色收口”：把 `src/` 中高频 `rgba(var(--ui-*-rgb), <alpha>)`、以及 `bg/border/text/outline/shadow` 等场景的 `[rgba(var(--ui-...))]` arbitrary，尽量替换为 **Tailwind 语义色 + `/opacity`**（含 `/[0.045]` 这类精确 alpha），减少 bracket arbitrary、提升一致性，并保持视觉零差异。

**Architecture:** 先在 `tailwind.config.cjs` 定义“可带 alpha 的语义色”（基于现有 `--ui-*-rgb` tokens，使用 `rgb(var(--ui-XXX-rgb) / <alpha-value>)`）；再按替换规则批量收口各组件中的 `bg-[rgba(...)]` / `border-[rgba(...)]` / `text-[rgba(...)]` / `from-[rgba(...)]` / `to-[rgba(...)]`；对 focus ring 优先用 `ring`（默认 3px），对 shadow 保留几何 arbitrary 但将颜色改为 `shadow-ui-xxx/yy + var(--tw-shadow-color)`（能改尽改）。

**Tech Stack:** Vue 3 + Tailwind CSS v4.2.2（preflight 禁用）+ Vitest（style contract tests）+ style-guard（禁止新 `<style>` 与硬编码色值）+ Tauri.

---

## 约束与范围

### 硬约束（必须遵守）
- Tailwind v4（`tailwindcss@4.2.2`）；`corePlugins.preflight=false`（不要改回）。
- style-guard 已接入门禁：避免引入新的 `<style>`（`SSlider` 伪元素除外）；也不要在 `src/**/*.vue|ts` 引入新的 `rgb()`/`rgba()` 硬编码（本任务目标是**减少**它们）。
- Tailwind 扫描源已通过 `src/styles/tailwind.css` 的 `@source not` 排除了 `src/**/__tests__`（不要回退/删除这些行）。

### 本计划的“做”与“不做”
- ✅ 做：把组件/原语里“颜色 + alpha”用法尽量收口到 `ui` 语义色并使用 `/opacity`。
- ✅ 做：尽量把 `bg-[rgba(...)]` / `border-[rgba(...)]` / `text-[rgba(...)]` / `from-[rgba(...)]` / `to-[rgba(...)]` 变为 `bg-ui-*/xx`、`border-ui-*/xx`、`text-ui-*/xx`、`from-ui-*/xx`、`to-ui-*/xx`。
- ✅ 做：把 focus ring 的 `shadow-[0_0_0_3px_rgba(...)]` 收口为 `ring`（默认 3px）+ `ring-ui-*/xx`。
- ⚠️ 视情况做：`shadow-[...]` 中包含多个不同颜色（例如同时含 `black` 与 `text`）时，优先收口“高频 + 单色 shadow”；复杂多色 shadow 可留作最后再评估（避免引入新 CSS 或破坏视觉零差异）。
- ❌ 不做：改动 `src/styles/tailwind.css` 的 `@source` 规则；改动 token 体系（例如把 `--ui-*-rgb` 从逗号改成空格）——这会造成全局连锁回归。
- ❌ 不做：把所有 arbitrary 一刀切清零（本任务聚焦 `rgba(var(--ui-*-rgb), alpha)` 这一类“高频 + 低收益的 bracket arbitrary”）。

---

## 0) 基线统计（执行前必须跑一遍并保存结果）

### 0.1 按次数排序（必须项）

> 说明：用 `--count-matches` 拿到“文件:次数”，再按次数排序，便于优先治理高频文件。

- [ ] 统计 `rgba(var(--ui-.*-rgb),`（src 维度）

```bash
rg --count-matches "rgba\\(var\\(--ui-.*-rgb\\)," -S src | sort -t: -k2,2nr | head -n 30
```

- [ ] 统计 `bg-[rgba(var(--ui-`（src 维度）

```bash
rg --count-matches "bg-\\[rgba\\(var\\(--ui-" -S src | sort -t: -k2,2nr | head -n 30
```

- [ ] 统计 `border-[rgba(var(--ui-`（src 维度）

```bash
rg --count-matches "border-\\[rgba\\(var\\(--ui-" -S src | sort -t: -k2,2nr | head -n 30
```

- [ ] 统计 `text-[rgba(var(--ui-`（src 维度）

```bash
rg --count-matches "text-\\[rgba\\(var\\(--ui-" -S src | sort -t: -k2,2nr | head -n 30
```

- [ ] 统计 `shadow-[...rgba(var(--ui-`（src 维度）

```bash
rg --count-matches "shadow-\\[.*rgba\\(var\\(--ui-" -S src | sort -t: -k2,2nr | head -n 30
```

### 0.2 当前仓库（HEAD=c224ef8）已观测到的 totals（便于 DoD 对照）

> 这些数字来自本会话在 `src/` 目录的统计（仅用于预估规模；执行会话请重新跑 0.1/0.2）。

- `rgba(var(--ui-*-rgb),`：124
- `bg-[rgba(var(--ui-`：61
- `border-[rgba(var(--ui-`：55
- `text-[rgba(var(--ui-`：38
- `shadow-[...rgba(var(--ui-`：27
- `from-[rgba(var(--ui-`：3（仅 `buttonPrimitives.ts`）
- `to-[rgba(var(--ui-`：3（仅 `buttonPrimitives.ts`）

---

## 1) Tailwind 语义色设计：可带 alpha 的 `ui` colors

### 1.1 设计原则
- 只为“确实存在 `--ui-*-rgb` token、且高频需要 alpha”的 key 提供 `<alpha-value>` 支持。
- 明确保留语义差异：
  - ✅ 适合改为可带 alpha：`text/brand/search-hl/black/success/danger/bg-rgb`（这些都有 `--ui-*-rgb`）
  - ❌ 不改：`ui.bg`（带 `--ui-opacity` 语义，当前定义为 `rgba(var(--theme-bg-rgb), var(--ui-opacity))`；继续保留为 `var(--ui-bg)`）
- 允许 `/[0.045]` 这种精确 alpha（满足“视觉零差异”）。

### 1.2 建议的 `tailwind.config.cjs` 变更（关键片段）

**Files:**
- Modify: `tailwind.config.cjs`（colors 位于约 `#L29` 起）

- [ ] 将以下 `ui` keys 改/增为可带 alpha（示意，执行时以最小 diff 合并到现有对象）

```js
// tailwind.config.cjs (theme.extend.colors.ui)
ui: {
  bg: "var(--ui-bg)", // 保留：带 ui-opacity 语义
  "bg-rgb": "rgb(var(--ui-bg-rgb) / <alpha-value>)",

  text: "rgb(var(--ui-text-rgb) / <alpha-value>)",
  black: "rgb(var(--ui-black-rgb) / <alpha-value>)",
  brand: "rgb(var(--ui-brand-rgb) / <alpha-value>)",
  "search-hl": "rgb(var(--ui-search-hl-rgb) / <alpha-value>)",
  success: "rgb(var(--ui-success-rgb) / <alpha-value>)",
  danger: "rgb(var(--ui-danger-rgb) / <alpha-value>)",

  // 其余保持现状：bg-soft/border/subtle/dim/brand-soft/brand-dim/...
}
```

- [ ] 为 Settings sticky toolbar 背景补齐语义色 key（用于替换 `var(--ui-settings-toolbar-sticky-bg)` 的 arbitrary）

```js
// tailwind.config.cjs (theme.extend.colors.settings)
settings: {
  // ...existing keys
  "toolbar-sticky": "var(--ui-settings-toolbar-sticky-bg)",
}
```

### 1.3 预期收益
- 组件内把 `rgba(var(--ui-*-rgb), <alpha>)` 转成 `*-ui-xxx/yy`，避免在 `src/**/*.vue|ts` 出现 `rgba(` 字符串（更贴合 style-guard 方向）。
- `bg/border/text/placeholder/focus` 等高频场景统一语义色与 alpha 表达（/10、/12、/[0.045]）。

---

## 2) 替换规则表（旧写法 -> 新写法）

> 执行时以“保持视觉零差异”为最高优先级：能用整数百分比就用 `/NN`，需要精确则用 `/[0.xxx]`。

### 2.1 纯色（bg / border / text / placeholder）

| 场景 | 旧写法（示例） | 新写法（示例） | 前置条件 |
|---|---|---|---|
| 背景色 | `bg-[rgba(var(--ui-text-rgb),0.06)]` | `bg-ui-text/6` | `ui.text` 可带 alpha |
| 背景色（精确） | `bg-[rgba(var(--ui-text-rgb),0.045)]` | `bg-ui-text/[0.045]` | 同上 |
| 边框色 | `border-[rgba(var(--ui-text-rgb),0.08)]` | `border-ui-text/8` | 同上 |
| 边框色（color: 前缀） | `border-[color:rgba(var(--ui-brand-rgb),0.24)]` | `border-ui-brand/24` | `ui.brand` 可带 alpha |
| 文本色 | `text-[rgba(var(--ui-text-rgb),0.7)]` | `text-ui-text/70` | `ui.text` 可带 alpha |
| placeholder | `placeholder:text-[rgba(var(--ui-text-rgb),0.28)]` | `placeholder:text-ui-text/28` | `ui.text` 可带 alpha |
| dialog 背景（bg-rgb） | `bg-[rgba(var(--ui-bg-rgb),0.92)]` | `bg-ui-bg-rgb/92` | `ui.bg-rgb` 可带 alpha |

### 2.2 Focus ring / inset outline（shadow -> ring）

| 场景 | 旧写法（示例） | 新写法（示例） | 说明 |
|---|---|---|---|
| 3px 外圈 | `focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]` | `focus-visible:ring focus-visible:ring-ui-search-hl/18` | Tailwind 默认 `ring`=3px（见默认 theme） |
| 1px inset | `focus-visible:shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.22)]` | `focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/22` | 比 `shadow-[inset...]` 更语义且无 rgba 字符串 |

### 2.3 Shadow（保留几何 arbitrary，收口颜色）

| 场景 | 旧写法（示例） | 新写法（示例） | 说明 |
|---|---|---|---|
| 单色 shadow | `shadow-[0_8px_22px_rgba(var(--ui-black-rgb),0.34)]` | `shadow-[0_8px_22px_var(--tw-shadow-color)] shadow-ui-black/34` | 用 `shadow-*` 设置 `--tw-shadow-color` |
| 发光 glow | `shadow-[0_0_10px_rgba(var(--ui-search-hl-rgb),0.6)]` | `shadow-[0_0_10px_var(--tw-shadow-color)] shadow-ui-search-hl/60` | 同上 |

### 2.4 Gradient stops（from/to）

| 场景 | 旧写法（示例） | 新写法（示例） |
|---|---|---|
| 渐变起止色 | `from-[rgba(var(--ui-brand-rgb),0.9)]` / `to-[rgba(var(--ui-brand-rgb),0.82)]` | `from-ui-brand/90` / `to-ui-brand/82` |

### 2.5 特例：透明色选择
- 如果旧代码用的是 `rgba(var(--ui-xxx-rgb), 0)`（透明但保留 RGB），新代码 **不要**用 `to-transparent`（透明黑会引入 hue drift），应使用 `to-ui-xxx/0`。
- 如果旧代码本身就是 `transparent`，才使用 `transparent`。

---

## 3) 预计修改文件清单（按“出现频率”优先）

### 3.1 Tailwind 配置与全局入口
- Modify: `tailwind.config.cjs`

### 3.2 共享原语（高复用，优先治理）
- Modify: `src/components/shared/ui/buttonPrimitives.ts`

### 3.3 Launcher（按出现次数排序）
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- Modify: `src/components/launcher/parts/LauncherQueueSummaryPill.vue`
- Modify: `src/components/launcher/LauncherWindow.vue`

### 3.4 Settings（按出现次数排序）
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/components/settings/ui/SettingItem.vue`
- Modify: `src/components/settings/ui/SettingSection.vue`
- Modify: `src/components/settings/SettingsWindow.vue`

### 3.5 可能需要同步更新的 style contract tests（预期“只增不改”，若失败再改）
- Modify (optional): `src/styles/__tests__/launcher-style-contract.test.ts`（新增“禁止 alpha arbitrary”的约束断言）
- Modify (optional): `src/__tests__/settings.topbar-nav-style-contract.test.ts`（仅当改动到其断言的类字符串时）

---

## 4) 任务拆解（可执行步骤）

> 注意：执行阶段**必须**在独立 worktree/分支进行，禁止直接在 `main` 上动手。

### Task 0: 建立隔离工作区 + 再跑基线统计

**Files:**
- (no code changes)

- [ ] **Step 1: 创建 worktree（推荐）并切新分支**

Run (示例)：`git worktree add ../zapcmd-wt-alpha-colors -b feat/tailwind-alpha-colors`

Expected：新目录创建成功；`git status` 干净。

- [ ] **Step 2: 运行 0.1 的 5 组统计命令**

Expected：输出按次数排序列表；把结果粘进本计划的“执行记录”或临时笔记（避免迷路）。

- [ ] **Step 3: 记录 totals（0.2 的 7 个 wc -l）**

Run：

```bash
rg -o "rgba\\(var\\(--ui-.*-rgb\\)," -S src | wc -l
rg -o "bg-\\[rgba\\(var\\(--ui-" -S src | wc -l
rg -o "border-\\[rgba\\(var\\(--ui-" -S src | wc -l
rg -o "text-\\[rgba\\(var\\(--ui-" -S src | wc -l
rg -o "shadow-\\[.*rgba\\(var\\(--ui-" -S src | wc -l
rg -o "from-\\[rgba\\(var\\(--ui-" -S src | wc -l
rg -o "to-\\[rgba\\(var\\(--ui-" -S src | wc -l
```

### Task 1: Tailwind 配置 — 引入可带 alpha 的 `ui` 语义色

**Files:**
- Modify: `tailwind.config.cjs`

- [ ] **Step 1: 在 `theme.extend.colors.ui` 中新增/替换 alpha 语义色 keys**

按 1.2 片段落地：`text/black/brand/search-hl/success/danger/bg-rgb`。

- [ ] **Step 2: 在 `theme.extend.colors.settings` 中新增 `toolbar-sticky`**

用于替换 `SettingsCommandsSection` 中对 `--ui-settings-toolbar-sticky-bg` 的 arbitrary 使用。

- [ ] **Step 3: 快速验证 Tailwind 可生成 `/opacity` 语法（最小验证）**

Run：`npm run build`

Expected：构建成功（无 Tailwind unknown utility 错误）。

### Task 2: 共享按钮原语收口（buttonPrimitives）

**Files:**
- Modify: `src/components/shared/ui/buttonPrimitives.ts`

- [ ] **Step 1: 将 `from-[rgba(var(--ui-*-rgb),x)]` 改为 `from-ui-*/NN`**
- [ ] **Step 2: 将 `to-[rgba(...)]` 改为 `to-ui-*/NN`**
- [ ] **Step 3: 将 `bg-[rgba(...)]`/`border-[rgba(...)]` 改为 `bg-ui-*/NN`/`border-ui-*/NN`**
- [ ] **Step 4: 运行 style-guard（确保未引入新 `rgba(`/`rgb(` 字符串）**

Run：`npm run check:style-guard`

Expected：输出 `[style-guard] OK`。

### Task 3: Launcher 组件收口（alpha 色高频区）

**Files:**
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- Modify: `src/components/launcher/parts/LauncherQueueSummaryPill.vue`
- Modify: `src/components/launcher/LauncherWindow.vue`

- [ ] **Step 1: CommandPanel — hover/bg/border/text 全量替换为 `ui-*/opacity`**
  - 重点：把 `focus-visible:shadow-[0_0_0_3px_rgba(var(--ui-search-hl-rgb),0.18)]` 改为 `focus-visible:ring focus-visible:ring-ui-search-hl/18`。
  - 重点：`border-[rgba(...)]`、`bg-[rgba(...)]`、`text-[rgba(...)]` 清零。

- [ ] **Step 2: FlowPanel — scrim/bg/border/shadow 颜色收口**
  - `bg-[rgba(var(--ui-black-rgb),0.2)]` -> `bg-ui-black/20`
  - `border-[rgba(var(--ui-text-rgb),0.14)]` -> `border-ui-text/14`
  - `shadow-[-4px_0_24px_rgba(...)]` -> `shadow-[-4px_0_24px_var(--tw-shadow-color)] shadow-ui-black/35`
  - 背景 gradient 若无法完全语义化：优先把每个 stop 的 `rgba(...)` 改为 `from/via/to` + `ui-*/opacity`；无法保证零差异再保留。

- [ ] **Step 3: SearchPanel — result-item 的 hover/focus/indicator glow 收口**
  - `hover:bg-[rgba(var(--ui-text-rgb),0.06)]` -> `hover:bg-ui-text/6`
  - `focus-visible:bg-[rgba(var(--ui-brand-rgb),0.12)]` -> `focus-visible:bg-ui-brand/12`
  - `focus-visible:shadow-[inset_0_0_0_1px_rgba(var(--ui-brand-rgb),0.22)]` -> `focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ui-brand/22`
  - glow：`shadow-[0_0_10px_rgba(...)]` -> `shadow-[0_0_10px_var(--tw-shadow-color)] shadow-ui-search-hl/60`

- [ ] **Step 4: StagingPanel — focus ring、active gradient、card 背景收口**
  - focus：优先用 `ring`/`ring-inset` 组合替换 `shadow-[inset...]`。
  - active gradient：`bg-gradient-to-b from-ui-brand/22 to-ui-bg`（避免 `bg-[linear-gradient(...)]`）。

- [ ] **Step 5: SafetyOverlay / QueueSummaryPill / LauncherWindow — 补齐剩余 alpha 颜色替换**
  - `bg-[rgba(var(--ui-bg-rgb),0.92)]` -> `bg-ui-bg-rgb/92`
  - `border-[rgba(var(--ui-black-rgb),0.8)]` -> `border-ui-black/80`
  - `bg-[linear-gradient(...rgba...)]` 如果 stop 需要透明但保留 hue，用 `to-ui-text/0` 而不是 `to-transparent`。

- [ ] **Step 6: 运行 Launcher focused tests（可选但推荐）**

Run：`npm run test:flow:launcher`

Expected：PASS。

### Task 4: Settings 组件收口（alpha 色高频区）

**Files:**
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/settings/parts/SettingsHotkeysSection.vue`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/components/settings/parts/SettingsGeneralSection.vue`
- Modify: `src/components/settings/ui/SDropdown.vue`
- Modify: `src/components/settings/ui/SettingItem.vue`
- Modify: `src/components/settings/ui/SettingSection.vue`

- [ ] **Step 1: CommandsSection — 替换 `bg/border/text` arbitrary + sticky toolbar gradient**
  - sticky toolbar：用 `bg-settings-toolbar-sticky bg-gradient-to-b from-ui-text/[0.03] to-ui-text/0` 替换当前 `bg-[linear-gradient(...),var(--ui-settings-toolbar-sticky-bg)]`。
  - search input：`bg-ui-text/[0.045]`、`placeholder:text-ui-text/28`、`focus-visible:border-ui-brand/22`、`focus-visible:bg-ui-text/[0.055]`。

- [ ] **Step 2: About/Hotkeys/General/Appearance — 批量收口 `text-[rgba]` / `bg-[rgba]` / `border-[rgba]`**
  - `text-[rgba(var(--ui-text-rgb),0.9)]` -> `text-ui-text/90`
  - `bg-[rgba(var(--ui-black-rgb),0.25)]` -> `bg-ui-black/25`
  - `border-[rgba(var(--ui-danger-rgb),0.3)]` -> `border-ui-danger/30`
  - Appearance preview 的动态 `:style="{ backgroundColor: \`rgba(var(--ui-bg-rgb), ${props.windowOpacity})\` }"`：保持不动（动态 alpha 无法由 Tailwind `/opacity` 表达）。

- [ ] **Step 3: SettingsWindow 顶层多层背景（可选，按风险评估）**
  - 若要进一步减少 `bg-[radial-gradient(...rgba...)]`：建议改为 `tailwind.config.cjs` 的 `theme.extend.backgroundImage` 语义 key（把 rgba 留在 config，而不是组件 class 字符串中），再组合 `bg-ui-bg-deep`。
  - 如果改动风险过高（担心 stop position 影响视觉）：可暂留，留待单独 PR/计划处理。

- [ ] **Step 4: 运行 Settings focused tests（可选但推荐）**

Run：`npm run test:flow:settings`

Expected：PASS。

### Task 5: style contract tests（建议加一道“alpha arbitrary 禁止回退”门禁）

**Files:**
- Modify (recommended): `src/styles/__tests__/launcher-style-contract.test.ts`
- Modify (maybe): `src/__tests__/settings.topbar-nav-style-contract.test.ts`

- [ ] **Step 1: 在 launcher-style-contract 增加“禁止 alpha arbitrary”断言（字符串级）**
  - 对以下文件源代码做 `expect(source).not.toContain(...)`：
    - `bg-[rgba(var(--ui-`
    - `border-[rgba(var(--ui-`
    - `text-[rgba(var(--ui-`
    - `from-[rgba(var(--ui-`
    - `to-[rgba(var(--ui-`
  - 覆盖至少：`LauncherCommandPanel.vue`、`LauncherSearchPanel.vue`、`LauncherFlowPanel.vue`、`LauncherStagingPanel.vue`、`LauncherQueueSummaryPill.vue`、`buttonPrimitives.ts`。

- [ ] **Step 2: 运行 style contract tests**

Run：`npm run test:contract:styles`

Expected：PASS。

---

## 5) Definition of Done (DoD)

- `tailwind.config.cjs` 中 `ui` 语义色支持 `/opacity` 与 `/[0.xxx]` 精确 alpha。
- 以下 grep 在 `src/` 返回空（或仅剩明确允许的例外，并在计划中注明原因）：

```bash
rg "bg-\\[rgba\\(var\\(--ui-" -S src
rg "border-\\[rgba\\(var\\(--ui-" -S src
rg "text-\\[rgba\\(var\\(--ui-" -S src
rg "from-\\[rgba\\(var\\(--ui-" -S src
rg "to-\\[rgba\\(var\\(--ui-" -S src
```

- 必跑验证命令全部通过：
  - `npm run test:contract:styles`
  - `npm run check:style-guard`
  - `npm run check:all`

---

## 6) 回滚策略

- 若出现视觉差异或 Tailwind 生成异常：优先 `git revert <commit>` 回滚（保持 history 可追溯）。
- 若仅个别组件出现回归：局部回退到旧的 `bg-[rgba(...)]` 写法（作为临时止血），并在后续单独计划中继续收口。

---

## 7) 下一会话执行入口（可直接复制粘贴）

> 说明：执行阶段请用 `$executing-plans`，严格按本计划逐步落地、跑门禁、更新短期记忆并提交 commit。

```text
$executing-plans

你在仓库 /home/work/projects/zapcmd（当前分支 main）。请先按仓库规则依次读取：CLAUDE.md -> .ai/AGENTS.md -> .ai/TOOL.md。

本次目标：按计划 docs/superpowers/plans/2026-03-26-tailwind-alpha-colors.md 落地“alpha 色收口”，将 src 中高频 rgba(var(--ui-*-rgb), alpha) 与 bg/border/text/… 的 [rgba(var(--ui-...))] arbitrary 尽量替换为 Tailwind 语义色 + /opacity（或 /[0.045]）。

执行要求：
1) 必须先创建独立 worktree/分支（禁止直接在 main 上修改）。
2) 严格按计划 Task 0 -> Task 5 执行，过程中不要改动 src/styles/tailwind.css 的 @source not 排除规则。
3) 必跑并全绿：npm run test:contract:styles / npm run check:style-guard / npm run check:all
4) 更新 docs/active_context.md：追加一句不超过 200 字的“本次 alpha 色收口”进展摘要（是补充，不是覆盖）。
5) 提交 commit（message 中文，遵循约定式前缀，例如：refactor(styles): 收口 Tailwind alpha 语义色）。

交付：变更文件列表 + 门禁输出摘要 + commit hash。
```

