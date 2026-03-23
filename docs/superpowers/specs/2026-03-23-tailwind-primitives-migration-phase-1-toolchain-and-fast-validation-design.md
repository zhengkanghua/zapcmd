# Tailwind Primitives Migration Phase 1 设计稿：工具链 + 快速验证

> 日期：2026-03-23  
> 状态：Draft  
> 范围：开发分支内试验  

## 1. 目标

1) 接入 Tailwind 工具链，但保持 UI **视觉零差异**。  
2) 把“开发期验证某个流程”的经验固化为 npm scripts（focused Vitest），让 UI 重构有稳定反馈回路。  

## 2. 关键决策

### 2.1 禁用 preflight

为避免 reset 冲突导致“看起来不一样”：

- `tailwind.config.cjs`：`corePlugins.preflight = false`
- reset 继续使用 `src/styles/reset.css`

### 2.2 Tailwind 注入位置

为避免迁移期层叠冲突，Tailwind 输出从 `src/styles/index.css` **末尾引入**，先做到“引入但不生效”，后续原语开始使用 utilities 时再逐步接管。

## 3. 快速验证策略（你要的“一条命令验证某个流程”）

首选 Vitest focused：

- watch：`npm test -- <test-file>`
- run：`npm run test:run -- <test-file>`
- related：`npm run test:related`

在 Phase 1 中固化为脚本：

- `test:flow:launcher`：Launcher 主流程（watch）
- `test:flow:settings`：Settings 基线（watch）
- `test:contract:styles`：样式契约与关键 style contract（run）

## 4. 验收标准

- `npm run build` 成功
- `npm run test:run` 全绿
- `npm run check:all` 全绿
- 手动 `npm run tauri:dev` 观察 Launcher/Settings 视觉无变化

