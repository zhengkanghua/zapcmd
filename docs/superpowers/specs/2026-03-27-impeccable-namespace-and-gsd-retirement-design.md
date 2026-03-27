# Impeccable 命名空间收口与 Get-Shit-Done 退场设计稿

## 背景

当前项目的 UI 相关 skill 中，`impeccable` 被直接平铺在 `.codex/skills/` 根目录，目录噪音较大，不利于识别来源与维护边界。与此同时，`.codex/get-shit-done` 与 `gsd-file-manifest.json` 已不再是当前项目工作流的一部分，但根目录启动文档仍保留了 `gsd-*` 入口说明。

项目已明确采用 `superpowers` 作为核心流程引擎，因此本轮只做两件事：

1. 将 `impeccable` skills 收口到独立命名空间。
2. 将 `get-shit-done` 从当前活跃入口中退场。

## 目标

- `.codex/skills/` 根目录只保留少量顶层入口，不再平铺 20+ 个 `impeccable` skills。
- `impeccable` skill 形成清晰分组，后续 UI 规则引用统一指向“impeccable 技能组”。
- 删除 `.codex/get-shit-done` 与 `.codex/gsd-file-manifest.json`。
- 清理当前活跃入口文档中的 `gsd-*` 指令，但保留历史归档文档原样。

## 非目标

- 不重写 `docs/active_context.md` 中全部历史 `gsd-*` 记录。
- 不迁移 `docs/superpowers/*` 历史设计与计划文档。
- 不引入新的 git submodule、外部仓库嵌套或自动同步机制。

## 设计决策

### 1. Impeccable 改为命名空间目录

将以下 skills 从 `.codex/skills/` 根目录移动到 `.codex/skills/impeccable/`：

- `adapt`
- `animate`
- `arrange`
- `audit`
- `bolder`
- `clarify`
- `colorize`
- `critique`
- `delight`
- `distill`
- `extract`
- `frontend-design`
- `harden`
- `normalize`
- `onboard`
- `optimize`
- `overdrive`
- `polish`
- `quieter`
- `teach-impeccable`
- `typeset`

这样目录层次将与 `superpowers` 的入口方式一致：顶层以“技能组”聚合，而不是将子技能直接暴露在根目录。

### 2. 顶层 `.codex/impeccable` 只保留元信息

新增 `.codex/impeccable/README.md`，说明该目录是项目内的 `impeccable` skill 组入口元信息位置，真正生效的 skills 位于 `.codex/skills/impeccable/`。这样可以保留与 `.codex/superpowers` 相似的结构语义，而不额外引入 submodule 复杂度。

### 3. Get-Shit-Done 退场策略

删除：

- `.codex/get-shit-done/`
- `.codex/gsd-file-manifest.json`

同时清理当前活跃入口文档中的 `gsd-*` 触发语义：

- `AGENTS.md`
- `CLAUDE.md`

`docs/active_context.md` 只补充“已弃用”的新记忆，不全量重写历史记录。

## 风险与处理

### 风险 1：skill 路径调整影响后续引用

处理：

- `.ai/AGENTS.md` 不再依赖平铺路径，只引用“impeccable 技能组”。
- 目录完成后使用 `find` / `rg` 做 fresh 校验，确认根目录不再平铺 `impeccable` skills。

### 风险 2：误删历史流程信息

处理：

- 仅清理活跃入口文档，不批量修改历史计划与回顾文档。
- 在 `docs/active_context.md` 中明确声明 get-shit-done 已弃用。

## 验证标准

- `.codex/skills/` 根目录不再出现上述 21 个 `impeccable` skills。
- `.codex/skills/impeccable/` 下包含完整 skill 集合。
- `.codex/get-shit-done` 与 `.codex/gsd-file-manifest.json` 已删除。
- `AGENTS.md` 与 `CLAUDE.md` 不再包含 `gsd-*` 触发语义。
- `npm run check:all` 通过。
