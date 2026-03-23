# Tailwind Primitives Migration Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在开发分支接入 Tailwind 工具链但保持视觉零差异，并把“开发期快速验证某个流程”的 focused Vitest 命令固化成 npm scripts（避免每次 UI 调整都跑 E2E）。

**Architecture:** 禁用 Tailwind preflight，继续使用现有 `reset.css + themes/* + tokens.css`；在 `src/styles/index.css` 末尾引入 Tailwind 输出，保证旧 CSS 行为不被重置干扰。新增 `test:flow:*`/`test:contract:*` 类脚本，用 focused tests 提供稳定的 UI 重构反馈回路。

**Tech Stack:** TailwindCSS, PostCSS, Vite, Vitest

**设计文档:** `docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-1-toolchain-and-fast-validation-design.md`

---

## 文件结构（File Map）

### 新增

| 文件 | 职责 |
|---|---|
| `tailwind.config.cjs` | Tailwind 配置（禁用 preflight；Phase 3 再扩展 token 映射） |
| `postcss.config.cjs` | PostCSS 管线（tailwindcss + autoprefixer） |
| `src/styles/tailwind.css` | Tailwind 入口（`@tailwind base/components/utilities`） |

### 修改

| 文件 | 变更 |
|---|---|
| `package.json` | 增加 Tailwind 依赖；增加 focused 验证 scripts（`test:flow:*`/`test:contract:*`） |
| `package-lock.json` | 随 npm install 更新 |
| `src/styles/index.css` | 末尾引入 `./tailwind.css`（preflight 已禁用，视觉零差异） |
| `docs/active_context.md` | 追加 ≤200 字摘要（只补充） |

---

## Chunk 1: 基线确认（可回滚起点）

### Task 1: 确认当前基线全绿

**Files:**
- (no code change)

- [ ] **Step 1: 跑一次全量门禁，锁定“迁移前基线”**

Run:
- `npm run check:all`

Expected:
- PASS

- [ ] **Step 2: 提交（若无改动可跳过）**

> 说明：本 Task 通常不会产生代码改动，因此无需 commit。

---

## Chunk 2: 接入 Tailwind 工具链（零视觉风险）

### Task 2: 安装 Tailwind 依赖并新增配置文件（禁用 preflight）

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

写入最小配置：

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 3: 创建 `tailwind.config.cjs`（禁用 preflight）**

要求：
- `corePlugins.preflight = false`
- `content` 覆盖多入口：`index.html`、`settings.html`、`src/**/*.{vue,ts}`

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
git commit -m "chore(styles):接入 Tailwind 工具链（禁用 preflight）"
```

### Task 3: 接入 Tailwind CSS 入口（视觉零差异）

**Files:**
- Create: `src/styles/tailwind.css`
- Modify: `src/styles/index.css`

- [ ] **Step 1: 创建 `src/styles/tailwind.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

> 说明：虽然引入 `@tailwind base`，但 preflight 已禁用，不会替换现有 reset。

- [ ] **Step 2: 在 `src/styles/index.css` 末尾引入 tailwind**

```css
@import "./tailwind.css";
```

- [ ] **Step 3: 验证 build 与测试仍全绿**

Run:
- `npm run build`
- `npm run test:run`

Expected:
- PASS；手动 `npm run tauri:dev` 观察 Launcher/Settings 视觉无变化

- [ ] **Step 4: 提交 checkpoint**

```bash
git add src/styles/index.css src/styles/tailwind.css
git commit -m "chore(styles):接入 tailwind 样式入口（视觉零差异）"
```

---

## Chunk 3: 快速验证命令固化（focused Vitest scripts）

### Task 4: 增加 `test:flow:*` / `test:contract:*` 脚本

**Files:**
- Modify: `package.json`
- (Docs) Optional: `scripts/README.md`

- [ ] **Step 1: 追加 scripts（watch 优先）**

建议新增（按需微调）：

```jsonc
{
  "scripts": {
    "test:flow:launcher": "npm test -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts",
    "test:flow:settings": "npm test -- src/components/settings/__tests__/SettingsWindow.layout.test.ts",
    "test:contract:styles": "npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts src/__tests__/settings.topbar-nav-style-contract.test.ts"
  }
}
```

验收口径：
- `test:flow:*` 适合开发时反复跑（watch）
- `test:contract:*` 用于样式栈迁移期的快速回归（run）

- [ ] **Step 2: 跑一遍新增脚本验证可用**

Run:
- `npm run test:contract:styles`

Expected:
- PASS

- [ ] **Step 3: 提交 checkpoint**

```bash
git add package.json
git commit -m "test(ui):补齐 focused flow/contract 快速验证脚本"
```

---

## 收尾：短期记忆 + Phase 验收

### Task 5: 记录 active_context 并做 Phase 1 总验收

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 追加 ≤200 字摘要**
- [ ] **Step 2: 跑总验收**

Run:
- `npm run check:all`

Expected:
- PASS

- [ ] **Step 3: 提交**

```bash
git add docs/active_context.md
git commit -m "docs:记录 Tailwind Phase 1 进展"
```

