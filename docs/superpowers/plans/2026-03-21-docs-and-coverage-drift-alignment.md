# Docs And Coverage Drift Alignment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 README / docs / CI / coverage 的口径统一到当前仓库真实行为，清理僵尸引用，并把前端 coverage 范围扩大到组件层。

**Architecture:** 文档一律以当前代码与 CI 为真相源：生成产物提交规则跟随 `ci-gate.yml`，样式入口与 Tailwind 现状跟随 `package.json + src/styles/index.css`，搜索字段说明跟随真实实现。coverage 方面不降低阈值，而是在最后一轮把 `src/components/**/*.vue` 纳入 `vitest` include，并用前面各计划新增的组件测试一起吃到门禁；如果扩容后阈值不达标，则停下补测试，不允许弱化文案或降低阈值蒙混过关。

**Tech Stack:** Markdown, Vitest, GitHub Actions, Node.js

**设计文档:** `docs/superpowers/specs/2026-03-21-execution-contract-settings-hardening-design.md`

---

## 文件结构

### 修改

| 文件 | 职责 |
|---|---|
| `docs/README.md` | 修正 docs 入口说明、去掉 `.github/README*.md` 僵尸引用 |
| `docs/command_sources/README.md` | 明确内置命令生成产物必须提交 |
| `README.md` | 修正生成产物、搜索字段、GitHub automation 引用、coverage 口径 |
| `README.zh-CN.md` | 同步中文口径 |
| `docs/architecture_plan.md` | 修正样式栈、样式入口、E2E/coverage 真实现状 |
| `docs/project_structure.md` | 修正 `src/styles/index.css`、移除 Tailwind 当前时表述 |
| `docs/ui-redesign/README.md` | 把 `src/styles.css` 改成历史路径说明，不再写成当前入口 |
| `docs/project_constitution.md` | 必要时补充 coverage 口径与文档真相源说明 |
| `vitest.config.js` | 把 `src/components/**/*.vue` 纳入 coverage include |
| `.github/workflows/ci-gate.yml` | 仅在文案或注释层需要时同步说明，不改现有阻断语义 |
| `docs/active_context.md` | 记录本轮计划摘要 |

---

## Chunk 1: 文档事实对齐

### Task 1: 统一“生成产物必须提交”的公开口径

**Files:**
- Modify: `docs/command_sources/README.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/README.md`

- [ ] **Step 1: 先写文档变更清单，锁定必须出现的统一口径**

在计划执行前先列出必须出现的事实：

```text
assets/runtime_templates/commands/builtin 与 docs/builtin_commands.generated.md 都必须提交
CI 会阻断未提交的生成产物
README 中的 git add 示例必须覆盖这两类产物
```

- [ ] **Step 2: 按事实修改四份文档**

要求：
- 删除“可选且无需提交”的旧说法
- README 中保留实际 `git add assets/runtime_templates/commands/builtin docs/builtin_commands.generated.md`
- `docs/README.md` 不再误导维护者以为生成产物可以不提交

- [ ] **Step 3: 用搜索验证文档已对齐**

Run:
- `rg -n "可选|无需提交|generated.md|builtin_commands.generated" docs README.md README.zh-CN.md`

Expected:
- 不再出现与 CI 冲突的旧表述

- [ ] **Step 4: 提交 checkpoint**

```bash
git add docs/command_sources/README.md README.md README.zh-CN.md docs/README.md
git commit -m "docs:统一生成产物提交口径"
```

### Task 2: 修正样式入口、Tailwind 现状、搜索字段与僵尸引用

**Files:**
- Modify: `docs/architecture_plan.md`
- Modify: `docs/project_structure.md`
- Modify: `docs/ui-redesign/README.md`
- Modify: `docs/README.md`
- Modify: `README.md`
- Modify: `README.zh-CN.md`

- [ ] **Step 1: 先列出必须统一的事实**

必须与代码一致：
- 当前样式入口是 `src/styles/index.css`
- 当前仓库已移除 Tailwind 依赖
- Tailwind 只是历史/延期架构议题，不是当前实现
- 搜索匹配字段包括 `title/description/preview/folder/category`
- `.github/README*.md` 当前不存在，引用必须删掉或改成真实路径

- [ ] **Step 2: 修改架构与 README 文档**

要求：
- `architecture_plan.md` / `project_structure.md` 不再写 “Tailwind + 手写 CSS” 作为当前事实
- `ui-redesign/README.md` 把 `src/styles.css` 改为“历史入口/已迁移”
- README 搜索说明同步到真实实现
- 删除 `.github/README*.md` 僵尸引用

- [ ] **Step 3: 用 `rg` 验证旧事实已清干净**

Run:
- `rg -n "TailwindCSS \\+ `src/styles.css`|src/styles.css|\\.github/README|folder|category" docs README.md README.zh-CN.md`

Expected:
- 当前时描述只剩 `src/styles/index.css`
- `folder/category` 搜索说明存在
- `.github/README` 僵尸引用被清掉

- [ ] **Step 4: 提交 checkpoint**

```bash
git add docs/architecture_plan.md docs/project_structure.md docs/ui-redesign/README.md docs/README.md README.md README.zh-CN.md
git commit -m "docs:按当前实现修正文档事实"
```

---

## Chunk 2: coverage 扩容与门禁对齐

### Task 3: 把前端 coverage 范围扩展到 `src/components/**/*.vue`

**Files:**
- Modify: `vitest.config.js`
- Modify: `README.md`
- Modify: `README.zh-CN.md`
- Modify: `docs/architecture_plan.md`
- Modify: `docs/project_constitution.md`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先写配置变更，锁定新的 include 范围**

把 `vitest.config.js` 的 coverage include 改成至少包含：

```ts
include: [
  "src/App.vue",
  "src/components/**/*.vue",
  "src/composables/**/*.ts",
  "src/features/**/*.ts",
  "src/services/**/*.ts",
  "src/stores/**/*.ts"
]
```

- [ ] **Step 2: 更新文档里的 coverage 口径**

统一说法：
- “前端核心逻辑与组件层纳入 JS coverage”
- Rust 单独用 `check:rust` / `cargo test` / smoke gate 描述
- 不再写成“全仓统一 90%+”

- [ ] **Step 3: 运行 coverage gate，确认真实结果**

Run:
- `npm run test:coverage`

Expected:
- 理想情况：PASS
- 若 FAIL：停止，不调低阈值；补测试应在当前失败文件上继续做，不允许改文案掩盖

- [ ] **Step 4: 通过后再跑全量门禁**

Run:
- `npm run check:all`

Expected:
- PASS

- [ ] **Step 5: 记录上下文并提交 checkpoint**

```bash
git add vitest.config.js README.md README.zh-CN.md docs/architecture_plan.md docs/project_constitution.md docs/active_context.md
git commit -m "test(docs):扩大前端 coverage 并同步口径"
```

---

## 最终验证

- [ ] `rg -n "无需提交|src/styles.css|\\.github/README" docs README.md README.zh-CN.md`
- [ ] `npm run test:coverage`
- [ ] `npm run check:all`

Expected:
- 文档事实与代码一致
- coverage 扩容后仍满足门禁
- 若 coverage 因组件纳入后失败，必须在本计划内补测试或另开明确 follow-up，不允许降阈值
