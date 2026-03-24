# Tailwind Primitives Migration（工程化/清噪）Implementation Plan：定位并消除 LightningCSS 关于 shadow arbitrary 的 `*` 警告（或记录 TODO）

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**执行顺序：** 3/4  
**时间盒：** 15 分钟（超过则必须止损记录 TODO）

## 背景/约束（必须遵守）

- 仓库：`D:\\own_projects\\zapcmd`
- 开发位置：`.worktrees/feat-tailwind-primitives-migration`
- 分支：`feat/tailwind-primitives-migration`（不要自动合并到 main）
- 本环境常见限制：如遇 `spawn EPERM` / `index.lock`，`npm run check:all`、`npm run test:visual:ui`、以及 git add/commit/push 需要申请沙箱外（require_escalated）执行
- 样式硬门禁：
  - 只消费 `var(--ui-*)`
  - 禁止模板里硬编码色值（含 `#`/`rgb`/`rgba`/`hsl`）
  - 保留 BEM 类名与状态类
  - 为截图零差异优先用 arbitrary px（如 `gap-[10px]`），不要用近似的 Tailwind scale

## 强制启动读取（不可跳过）

1) `CLAUDE.md`  
2) `.ai/AGENTS.md`  
3) `.ai/TOOL.md`

## 目标（Goal）

若能稳定复现：定位产生 LightningCSS 警告的源头并修复（优先移除/替换不合法的 `shadow-[...]` arbitrary class）。  
若无法稳定复现：记录 TODO（≤200 字，追加到 `docs/active_context.md`，只追加不覆盖）。

## 操作清单（执行前先搜索定位，禁止猜测）

- [ ] `cd .worktrees/feat-tailwind-primitives-migration`
- [ ] `git status -sb`（如 ahead 则先 push；如一致则继续）

## Task 1：复现并完整记录 warning 文本（以事实为准）

- [ ] 跑门禁：`npm run check:all`
- [ ] 在终端输出中复制/记录 LightningCSS 警告的**完整文本**（包含 class 原文/文件位置/提示）

## Task 2：用 `rg` 定位产生问题的 class 源头（禁止猜测）

> 优先按 warning 给的 class/file 定位；没有就用模式检索兜底。

- [ ]（优先）若 warning 含具体 class：`rg -n "<class 原文>" src`
- [ ]（兜底）检索可能的 shadow arbitrary：
  - `rg -n -F "shadow-[" src`
  - `rg -n -F "shadow-[" src | rg -n -F "*"`（锁定包含 `*` 的可疑值）
  - 如 warning 指向 `drop-shadow-`，同样检索：`rg -n -F "drop-shadow-[" src`

## Task 3：修复策略（优先“改为合法 token”，避免继续扩散）

> 原则：不要在模板里拼 `*`，不要在 arbitrary value 里出现疑似非法语法；必要时将复杂 shadow 提升为语义 token（`--ui-*`）再消费。

- [ ] 若问题是 `shadow-[var(--...*...)]` / `shadow-[...*...]`：
  - 方案 A（优先）：新增语义 token（`src/styles/tokens.css`）承载完整 box-shadow 值（无 `*`），模板改为 `shadow-[var(--ui-...)]`
  - 方案 B：改用 `ring-*`/`outline-*` 等不依赖该 shadow arbitrary 的表达（仍需 `var(--ui-*)`）
- [ ] 若问题来自拼写错误/非法字符（例如 token 名里混入 `*`）：直接修正为合法命名
- [ ] 跑 `npm run check:all` 确认 warning 消失（或至少不再出现该条）

## Task 4：止损机制（15 分钟内无稳定结论则记录 TODO）

**Files:**
- Modify: `docs/active_context.md`

- [ ] 若 15 分钟内仍无法消除或无法稳定复现：
  - 在 `docs/active_context.md` **追加** ≤200 字，包含：
    - 现象（warning 原文或摘要）
    - 已定位线索（尝试过哪些 `rg`、命中哪些文件）
    - 下一步建议（下一次优先从哪里查/如何验证）

## Task 5：提交（仅当确实修复且可复现验证通过）

- [ ] `git add <涉及文件>`
- [ ] `git commit -m "chore(css):清理 LightningCSS shadow arbitrary warning"`
