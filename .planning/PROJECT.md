# ZapCmd

## 这是什么

ZapCmd 是一个跨平台桌面命令启动器（Tauri + Vue），面向重度命令行/开发者使用场景，强调**速度**、**安全基线**与**可重复工作流**。用户可以搜索命令、填写参数、把多条命令加入队列，并在系统终端中执行（而不是在应用内“模拟执行”）。

## 核心价值

用最少的操作，**快速且安全**地找到并执行命令工作流，并且每次迭代都能通过自动化回归验证保持稳定。

## 需求

### 已验证

- ✓ 启动器主流程：搜索 → 填参 → 入队 → 系统终端执行 — existing（`README.md`，`src/App.vue`，`src-tauri/src/terminal.rs`）
- ✓ 内置命令 + 用户命令 JSON 运行时加载，冲突时用户命令覆盖内置 — existing（`README.md`，`src/features/commands/runtimeLoader.ts`，`src-tauri/src/command_catalog.rs`）
- ✓ 设置窗口：快捷键、默认终端、语言、更新、开机启动、关于页等 — existing（`README.md`，`src/components/settings/`，`src-tauri/src/hotkeys.rs`，`src-tauri/src/autostart.rs`）
- ✓ 安全基线：危险命令确认 + 参数注入拦截 — existing（`src/features/security/commandSafety.ts`）
- ✓ 队列会话恢复（重启后恢复已暂存队列）— existing（`README.md`，相关逻辑见 `src/composables/launcher/`）
- ✓ GitHub Releases 自动更新检查/下载/安装 — existing（`src/services/updateService.ts`，`src-tauri/tauri.conf.json`）

### 当前目标

- [ ] **测试覆盖率门禁**：Vitest 覆盖率阈值（lines/functions/statements/branches）全部提升到 **≥ 90%**，并补齐缺失的关键回归用例（`vitest.config.ts`，`src/**/__tests__/**`）
- [ ] **回归测试链路**：功能改动在**本地 pre-commit**与**CI**都必须跑全量回归（至少 `npm run test:coverage`；CI 继续跑 `npm run check:all`）（`.githooks/pre-commit`，`scripts/precommit-guard.mjs`，`.github/workflows/ci-gate.yml`）
- [ ] **架构/质量审查与改进**：识别高耦合/高复杂度/难测模块并重构，目标是职责更清晰、接口更窄、可测试性更好（`src/App.vue`，`src/composables/app/useAppCompositionRoot/*`，`src/stores/settingsStore.ts`）
- [ ] **UI/UX 小幅精修**：保持现有产品形态不大改，重点打磨信息层级、间距/对齐、对比度、键盘可达性（focus、Esc）、动效一致性，让使用更顺畅舒适（`src/components/launcher/`，`src/components/settings/`，`src/styles.css`）
- [ ] **鲁棒性提升**：错误提示更清晰、边界条件处理更完整、失败不吞掉（尤其是命令加载/执行、窗口行为、更新流程）（`src/features/commands/`，`src/services/*`，`src-tauri/src/*`）

### 明确不做

- 大规模 UI 彻底重做或引入重型 UI 组件库 — 本次只做“小幅精修”
- 团队级安全治理（策略/白名单/组织规则/云同步等）— 先不进入本次里程碑（后续 v2 再评估）
- 一次性追求 Windows/macOS/Linux 全矩阵的“完整桌面端到端自动化” — 优先把单元/组件/关键回归补齐，端到端先做最小基线再逐步扩展

## 背景与现状

- 技术栈：Tauri 2（Rust）+ Vue 3（TypeScript）+ Pinia + Vitest（`src-tauri/`，`src/`，`package.json`）
- 当前质量门禁：`npm run check:all` 已包含覆盖率（阈值在 `vitest.config.ts`），但目标需要提升到 90%+ 并把回归补齐到“功能改动必跑全量”（`package.json`）
- 当前架构亮点：前端以组合式逻辑为主，依赖注入/装配集中在 `useAppCompositionRoot`（`src/composables/app/useAppCompositionRoot/*`）
- 当前风险点（需要重点审查与增强）：
  - 原生命令执行边界本身高风险，跨 shell 传参/转义容易出错（`src-tauri/src/terminal.rs`，`src/features/security/commandSafety.ts`）
  - `App.vue`/组合根暴露面很宽，改动容易遗漏联动（`src/App.vue`，`src/composables/app/useAppCompositionRoot/viewModel.ts`）
  - Rust 侧风险模块缺少测试覆盖（`src-tauri/src/terminal.rs`，`src-tauri/src/command_catalog.rs`，`src-tauri/src/bounds.rs`）

## 约束

- **技术栈**：保持 Tauri + Vue 3 + TypeScript 严格模式；不引入 `any`（`tsconfig.json`，`eslint.config.js`）
- **门禁**：`npm run check:all` 必须全绿；覆盖率阈值硬门禁提升到 90%（`package.json`，`vitest.config.ts`）
- **回归**：功能修改必须有自动化回归测试覆盖；本地 pre-commit 也要跑全量回归（`scripts/precommit-guard.mjs`）
- **跨平台**：Windows/macOS/Linux 主路径保持可用（`README.md`）
- **文档与提交**：规划文档与 git 提交信息使用中文（`.planning/*`，git history）

## 关键决策

| 决策 | 理由 | 结果 |
|------|------|------|
| Vitest 覆盖率四项阈值提升到 ≥90% | 用硬门禁推动补齐关键回归与鲁棒性 | — 待验证 |
| 本地 pre-commit 对功能改动跑全量回归 | 让“每次功能修改都可回归”成为习惯与流程 | — 待验证 |
| UI 方向采用“小幅精修”而非重做 | 控制风险与成本，优先把体验做顺滑 | — 待验证 |
| 是否引入桌面端 E2E（Tauri）测试基线 | 需要权衡成本/稳定性/收益 | — 待定 |

---
*最后更新：2026-03-03（初始化）*

