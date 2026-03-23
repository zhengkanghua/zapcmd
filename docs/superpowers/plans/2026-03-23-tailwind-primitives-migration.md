# Tailwind Primitives Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在开发分支以“页面消费原语（Primitives-First）”的方式引入 Tailwind，保持运行时多主题（`data-theme` + `--theme-*`/`--ui-*`）不变，并以“视觉零差异”为阶段验收目标；同时把桌面 UI 自动化与 debug 入口纳入 UI 迭代的验证链路。

**Architecture:** 保留现有 CSS Variables 主题与 token 体系作为唯一真相源；Tailwind 仅负责“原语组件内部的样式表达”，页面/业务组件主要消费原语并只保留少量布局 utilities。迁移采取“先不改视觉→先改消费方式→再改实现方式→最后清理旧 CSS”的顺序，确保每一步可回滚、可验证。

**Tech Stack:** Vue 3, Vite, TailwindCSS, PostCSS, Tauri v2, Vitest, Selenium WebDriver, tauri-driver

**设计文档:** `docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-design.md`

---

## 0. 开发分支约束（必须遵守）

- 本计划 **只在开发分支执行**（建议分支名：`feat/tailwind-primitives-migration`）。
- 任何合并回 `main` 的动作必须先做一次独立 code review，并由仓库维护者显式确认（不要自动合并）。

---

## 文件结构（File Map）

### 新增

| 文件 | 职责 |
|---|---|
| `tailwind.config.cjs` | Tailwind 配置（禁用 preflight；token 映射到 `--ui-*`） |
| `postcss.config.cjs` | PostCSS 管线（tailwindcss + autoprefixer） |
| `src/styles/tailwind.css` | Tailwind 入口（`@tailwind base/components/utilities`） |
| `src/components/shared/ui/UiButton.vue` | 跨窗口 Button 原语（第一版复用旧 `.btn-*`，后续改为 Tailwind） |
| `src/components/shared/ui/UiIconButton.vue` | IconButton 原语（同上） |
| `src/components/shared/ui/__tests__/UiButton.test.ts` | 原语单测（variant/disabled/事件） |
| `src/components/shared/ui/__tests__/UiIconButton.test.ts` | 原语单测 |

> 说明：以上原语是迁移起点。后续按需要扩展（Card/Input/Popover 等），但每次扩展必须先确定“页面确实频繁重复”再抽象，避免过度设计。

### 修改

| 文件 | 变更 |
|---|---|
| `package.json` | 增加 Tailwind 依赖；增加 `e2e:desktop:debug` 脚本（可选） |
| `package-lock.json` | 随 npm 安装自动更新 |
| `src/styles/index.css` | 引入 `tailwind.css`（建议放在文件末尾，避免干扰现有 CSS；preflight 已禁用） |
| `scripts/e2e/desktop-smoke.cjs` | 增加 debug 模式（keep-open / step pause），用于 UI 开发调试 |
| `scripts/README.md` | 记录桌面 E2E 的运行与 debug 方式 |
| `docs/active_context.md` | 记录本轮“Tailwind primitives 迁移”计划已落盘 |

---

## Chunk 1: 基线确认 + Tailwind 工具链接入（零视觉风险）

### Task 1: 创建开发分支并确认当前基线全绿

**Files:**
- (no code change)

- [ ] **Step 1: 创建分支（若已在分支则跳过）**

Run:
- `git checkout -b feat/tailwind-primitives-migration`

Expected:
- 切到新分支，`git status -sb` 显示 `## feat/tailwind-primitives-migration`

- [ ] **Step 2: 跑一次全量门禁，确认“迁移前基线”可用**

Run:
- `npm run check:all`

Expected:
- PASS（这是后续视觉/行为回归对比的基线）

- [ ] **Step 3: （桌面 UI）确认本机可跑 desktop smoke**

Run:
- `npm run verify:local -- --dry-run`

Expected:
- 打印将执行的命令链；Windows 默认包含 `npm run e2e:desktop:smoke`

> 若缺驱动：Windows 可跑 `npm run verify:local -- --install-webdriver` 自动补齐 `tauri-driver` 与 `msedgedriver`。

### Task 2: 增加 Tailwind 依赖与配置文件（禁用 preflight）

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tailwind.config.cjs`
- Create: `postcss.config.cjs`

- [ ] **Step 1: 安装依赖**

Run:
- `npm install -D tailwindcss postcss autoprefixer`

Expected:
- `package.json` / `package-lock.json` 更新；安装成功

- [ ] **Step 2: 创建 `postcss.config.cjs`**

写入内容（保持最小化）：

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 3: 创建 `tailwind.config.cjs`（禁用 preflight + content 覆盖多入口）**

要求：
- `corePlugins.preflight = false`
- `content` 至少包含：`index.html`、`settings.html`、`src/**/*.{vue,ts}`

示例骨架：

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["index.html", "settings.html", "src/**/*.{vue,ts}"],
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: []
};
```

- [ ] **Step 4: 提交 checkpoint**

```bash
git add package.json package-lock.json tailwind.config.cjs postcss.config.cjs
git commit -m "chore(styles):引入 Tailwind 工具链（禁用 preflight）"
```

### Task 3: 接入 Tailwind 样式入口，但不修改任何 UI（保证零视觉风险）

**Files:**
- Create: `src/styles/tailwind.css`
- Modify: `src/styles/index.css`

- [ ] **Step 1: 创建 `src/styles/tailwind.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

> 说明：虽然引入 `@tailwind base`，但 preflight 已禁用，因此不会替换现有 reset。保留该层便于后续需要 base layer 时复用。

- [ ] **Step 2: 在 `src/styles/index.css` 末尾引入 tailwind**

在最后增加一行：

```css
@import "./tailwind.css";
```

> 约束：tailwind 放末尾，确保现有 `shared/launcher/settings/animations` 先保持原样；当原语开始消费 utilities 时，utilities 可以按需覆盖同元素的旧声明。

- [ ] **Step 3: 验证“引入 Tailwind 后仍零视觉差异”**

Run:
- `npm run build`
- `npm run test:run`

Expected:
- PASS；手动运行 `npm run tauri:dev` 观察 Launcher/Settings 视觉无变化

- [ ] **Step 4: 提交 checkpoint**

```bash
git add src/styles/index.css src/styles/tailwind.css
git commit -m "chore(styles):接入 tailwind 样式入口（视觉零差异）"
```

---

## Chunk 2: 桌面 UI 自动化补强 + Debug 入口（提升 UI 迭代反馈速度）

### Task 4: 为 `desktop-smoke` 增加 debug 模式（keep-open / step pause）

**Files:**
- Modify: `scripts/e2e/desktop-smoke.cjs`
- Modify: `scripts/README.md`
- (Optional) Modify: `package.json`

- [ ] **Step 1: 为 `desktop-smoke.cjs` 增加两个环境变量**

新增并在日志中输出（不影响默认行为）：
- `ZAPCMD_E2E_KEEP_OPEN=1`：用例跑完后不自动 quit，方便手动观察
- `ZAPCMD_E2E_STEP_PAUSE_MS=xxx`：每个关键步骤后 sleep（用于肉眼确认）

- [ ] **Step 2: 为 debug 模式打印“产物路径与下一步指引”**

要求至少提示：
- 日志路径：`.tmp/e2e/desktop-smoke/e2e.log`
- tauri-driver 日志：`.tmp/e2e/desktop-smoke/tauri-driver.log`
- 截图路径（失败时）：`.tmp/e2e/desktop-smoke/screenshot.png`

- [ ] **Step 3:（可选）增加 npm 脚本 `e2e:desktop:debug`**

建议脚本（Windows/macOS 都可用；依赖本机驱动已装好）：

```jsonc
"e2e:desktop:debug": "set ZAPCMD_E2E_KEEP_OPEN=1&& set ZAPCMD_E2E_STEP_PAUSE_MS=1200&& npm run e2e:desktop:smoke"
```

> 注意：跨平台环境变量写法不同；如果需要跨平台一致性，改为 node 脚本设置 env，再 spawn `npm run e2e:desktop:smoke`。

- [ ] **Step 4: 更新 `scripts/README.md` 说明如何跑与如何 debug**

必须写清楚：
- 最推荐入口：`npm run verify:local`
- Windows 一键补装：`npm run verify:local -- --install-webdriver`
- debug 示例：如何设置 env + 产物目录在哪里

- [ ] **Step 5: 提交 checkpoint**

```bash
git add scripts/e2e/desktop-smoke.cjs scripts/README.md package.json package-lock.json
git commit -m "test(e2e):增强 desktop-smoke 调试模式"
```

---

## Chunk 3: 引入共享原语（先复用旧语义类，保持视觉零差异）

### Task 5: 新增 `UiButton` / `UiIconButton` 原语（第一版复用 `.btn-*`）

**Files:**
- Create: `src/components/shared/ui/UiButton.vue`
- Create: `src/components/shared/ui/UiIconButton.vue`
- Test: `src/components/shared/ui/__tests__/UiButton.test.ts`
- Test: `src/components/shared/ui/__tests__/UiIconButton.test.ts`

- [ ] **Step 1: 定义对外 API（先小而稳）**

`UiButton` 建议 props（避免过度抽象）：
- `variant`: `"muted" | "primary" | "stage" | "success" | "danger"`
- `size`: `"md" | "sm"`
- `disabled`: `boolean`
- `type`: `"button" | "submit" | "reset"`

`UiIconButton` 建议额外：
- `ariaLabel`（强制要求，可访问性门禁）

> 第一版实现要求：**仍渲染旧 class**（`.btn-muted/.btn-primary/... + btn-small + btn-icon`），这样页面迁移后视觉零差异。

- [ ] **Step 2: 先写单测锁定 API 与输出 class（characterization tests）**

要求覆盖：
- variant 映射 class 正确
- disabled 语义正确（`disabled`/`aria-disabled`）
- click 在 disabled 下不触发

- [ ] **Step 3: 写最小实现让测试通过**

注意：
- 不引入 `any`
- 允许 `class` 透传，但要保证内部 class 优先级可控（后续 Tailwind 化需要）

- [ ] **Step 4: 跑 focused tests**

Run:
- `npm test -- src/components/shared/ui/__tests__/UiButton.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/components/shared/ui
git commit -m "feat(ui):新增 UiButton 原语（先复用 btn-* 以保持视觉零差异）"
```

### Task 6: 迁移少量调用点为原语（只改消费方式，不改视觉）

**Files:**
- Modify: `src/components/settings/parts/SettingsAboutSection.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Test: 对应已有单测（必要时微调选择器）

- [ ] **Step 1: 从最容易的区域开始（按钮集中且无复杂 slot）**

迁移策略：
- 先迁移 1-2 个组件
- 每迁移一个组件就跑它的 focused tests，避免积累大爆炸 diff

- [ ] **Step 2: 保持旧 `.btn-*` class 暂时仍存在（不动 CSS）**

验收：
- UI 视觉零差异
- 组件单测不回退（如依赖 `.btn-*` 选择器则先不改）

- [ ] **Step 3: 提交 checkpoint**

```bash
git add src/components/settings/parts/SettingsAboutSection.vue src/components/launcher/parts/LauncherSafetyOverlay.vue src/components/launcher/parts/LauncherStagingPanel.vue
git commit -m "refactor(ui):页面按钮改为消费 UiButton（视觉零差异）"
```

---

## Chunk 4: 原语 Tailwind 化（逐个替换实现 + 回归 + 删除旧 CSS）

> 这一 chunk 是迁移的主战场。原则：**每次只 Tailwind 化一个原语或一个可验证的子集**，并在删除旧 CSS 前确保“无引用 + 回归全绿”。

### Task 7: 把 `UiButton` 的实现从 `.btn-*` 切换为 Tailwind utilities

**Files:**
- Modify: `src/components/shared/ui/UiButton.vue`
- Modify: `tailwind.config.cjs`（增加 token 映射）
- Modify: `src/styles/shared.css`（逐步删除 `.btn-*`，仅在确认无引用后）
- Test: `src/components/shared/ui/__tests__/UiButton.test.ts`
- (Optional) Test: 增加视觉相关的 contract（仅锁关键 token，不锁像素）

- [ ] **Step 1: 在 tailwind theme 中映射关键 token 到 `--ui-*`**

至少覆盖：
- 圆角：`var(--ui-radius)`
- 字体：`var(--ui-font-mono)`（若按钮含 kbd/mono）
- 阴影/边框色：指向 `--ui-border`/`--ui-shadow`
- 颜色：指向 `--ui-text`/`--ui-accent-text`/`--ui-brand-rgb` 等

- [ ] **Step 2: 逐个 variant 对齐旧视觉（先 primary / muted / danger 三个）**

要求：
- hover/disabled/focus-visible 与旧行为一致
- 不引入硬编码色值

- [ ] **Step 3: 跑全量质量门禁 + 桌面 smoke**

Run:
- `npm run check:all`
- Windows: `npm run verify:local -- --e2e-only`（或直接 `npm run e2e:desktop:smoke`）

Expected:
- PASS

- [ ] **Step 4: 当且仅当确认无引用时删除 `.btn-*` 旧 CSS**

验证方式：
- `rg -n "\\bbtn-(muted|primary|stage|success|danger)\\b" src`

Expected:
- 只剩原语内部或测试中的引用（确认策略后再删）

- [ ] **Step 5: 提交 checkpoint**

```bash
git add tailwind.config.cjs src/components/shared/ui/UiButton.vue src/styles/shared.css src/components/shared/ui/__tests__/UiButton.test.ts
git commit -m "refactor(ui):UiButton 改为 Tailwind 实现并对齐旧视觉"
```

### Task 8: 逐步 Tailwind 化其它原语（IconButton、卡片、表单控件…）

**Files:**
- Modify/Create: `src/components/shared/ui/*`
- Modify: `tailwind.config.cjs`
- Modify: `src/styles/shared.css` / `src/styles/settings.css` 中对应旧实现

- [ ] **Step 1: 每次只处理一个原语，并把“对齐点”写成 checklist**
- [ ] **Step 2: 对每个原语新增/更新单测（锁 API 与关键状态）**
- [ ] **Step 3: 每个原语完成后跑 `npm run check:all` 再前进**
- [ ] **Step 4: 当确认无引用后删除旧 CSS（先 rg 验证再删）**

---

## Chunk 5: 收口与治理（防止退化成 A：页面到处堆 class）

### Task 9: 建立 repo-level guardrails（不让 token 体系被绕开）

**Files:**
- Create: `scripts/style-guard.mjs`（示例：扫描 hardcoded color / arbitrary color）
- Modify: `package.json`（增加 `check:style-guard` 并接入 `check:all`）
- Docs: `docs/project_constitution.md`（补充 UI 样式治理规则）

- [ ] **Step 1: 明确禁止项**

建议禁止：
- `.vue` 模板里出现 `#RRGGBB` / `rgb(` / `hsl(`（允许 `var(--ui-*)`）
- Tailwind arbitrary color（如 `text-[#fff]`）

- [ ] **Step 2: 脚本只做“提示型失败”，并给出具体文件行号**
- [ ] **Step 3: 接入 `npm run check:all`，作为样式迁移期间的门禁**
- [ ] **Step 4: 提交 checkpoint**

```bash
git add scripts/style-guard.mjs package.json docs/project_constitution.md
git commit -m "chore(styles):增加样式 token guard，防止硬编码色值回流"
```

---

## Chunk 6: 桌面 UI 自动化扩展（可选，但强烈建议至少覆盖 Settings 可用性）

### Task 10: 扩展 `desktop-smoke` 覆盖“设置页可用性”与“主题切换不炸”

**Files:**
- Modify: `scripts/e2e/desktop-smoke.cjs`

- [ ] **Step 1: 明确“稳定断言”原则**

不要做像素级 diff（跨平台/缩放易抖），优先：
- 元素可定位（id/aria-label）
- 关键交互可达（点击/键盘）
- 关键状态变化可观察（drawer 出现/消失、输入框值变化）

- [ ] **Step 2: 增加最小 Settings 覆盖（两种路径二选一）**

方案 A（优先）：通过现有 UI/热键打开 Settings，再断言 Settings 顶层容器存在。  
方案 B：在 dev-only 模式提供一个“打开 settings 的测试入口”（例如隐藏按钮/命令行 flag），仅供 E2E 使用。

- [ ] **Step 3: 将新增断言放在现有 smoke 之后，避免影响主用例**
- [ ] **Step 4: 提交 checkpoint**

```bash
git add scripts/e2e/desktop-smoke.cjs
git commit -m "test(e2e):desktop-smoke 增加 settings 可用性断言"
```

---

## 执行交接（减少上下文污染）

当准备开始真正落地（写代码）时，建议按 chunk 新开会话执行，并在每个 chunk 完成后：

1) 跑 `npm run check:all`（以及 Windows 的 `npm run verify:local`）  
2) 更新 `docs/active_context.md`（追加 ≤200 字摘要）  
3) 提交 checkpoint（保持可回滚）  

执行入口建议：
- **本地一键**：`npm run verify:local`
- **桌面冒烟（仅）**：`npm run verify:local -- --e2e-only`

