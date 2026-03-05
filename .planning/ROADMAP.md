# Roadmap: ZapCmd

## Overview

本里程碑聚焦 **质量门禁 + 回归基线 + 可测试性 + 稳定性**：把“功能改动必回归”变成默认工作流，把关键高风险路径（命令加载/安全拦截/终端执行/更新流程）补齐自动化覆盖，并通过必要的架构收敛与 UI/UX 小幅精修，确保后续迭代可持续、可验证、可回滚。

## 🚧 v1.0: 质量门禁与回归基线

**Milestone Goal:** 用测试覆盖率与回归链路把关键路径稳定下来，补齐 Rust 侧高风险模块的单测覆盖，并在不大改产品形态的前提下提升交互一致性与错误可见性。

## Phases

- [x] **Phase 1: 回归链路与最小桌面 E2E 基线** - 让“功能改动必回归”成为默认 (completed 2026-03-03)
- [x] **Phase 2: 覆盖率门禁提升到 90%** - 提升阈值并让失败可定位 (completed 2026-03-03)
- [x] **Phase 3: 关键用户路径回归补齐** - 核心路径覆盖为可回归用例 (completed 2026-03-04)
- [x] **Phase 4: Rust 终端执行模块单测** - 终端参数/转义高风险分支可测 (completed 2026-03-04)
- [x] **Phase 5: Rust 命令目录与边界模块单测** - 命令覆盖规则与边界检查可测 (completed 2026-03-04)
- [x] **Phase 6: 安全基线回归补齐** - 危险命令确认 + 注入拦截有自动化回归 (completed 2026-03-05)
- [ ] **Phase 7: 鲁棒性与错误提示增强** - 失败可见、可定位、可操作
- [ ] **Phase 8: 架构可测试性重构** - 收窄接口/解耦 IO，提升单测效率
- [ ] **Phase 9: UI/UX 小幅精修** - 键盘可达性与视觉一致性提升
- [x] **Phase 10: 补齐 macOS 桌面端 E2E 冒烟** - 桌面冒烟门禁扩展到 macOS（本地 + CI） (completed 2026-03-05)

## Phase Details

### Phase 1: 回归链路与最小桌面 E2E 基线
**Goal:** 建立本地与 CI 的回归门禁基线，并完成“最小桌面端 E2E 基线”的可执行方案或明确结论，为后续高频改动保驾护航。  
**Depends on:** Nothing (first phase)  
**Requirements:** [REG-01, REG-02, E2E-01]  
**Success Criteria** (what must be TRUE):
1. 本地 pre-commit 对“功能/行为改动”会强制执行全量回归（至少 `npm run test:coverage`），失败会阻止提交。
2. CI 持续以 `npm run check:all` 作为合并门禁，失败日志可直接定位到具体失败项（lint/typecheck/test/build/rust）。
3. 已产出“最小桌面端 E2E 基线”的结论：要么落地可运行的最小 E2E，要么记录不做的明确原因与替代验证方案。
**Plans:** 3/3 plans complete

Plans:
- [ ] 01-01-PLAN.md — 本地 pre-commit 双通道（条件触发 `test:coverage`）与可解释输出
- [ ] 01-02-PLAN.md — CI Gate / Release 门禁对齐（生成一致性检查 + 最小桌面 E2E 阻断）
- [ ] 01-03-PLAN.md — 最小桌面端 E2E 冒烟基线（启动 + 搜索 + 抽屉开合，截图/日志）

### Phase 2: 覆盖率门禁提升到 90%
**Goal:** 将覆盖率门禁提升到 lines/functions/statements/branches 四项 ≥90%，并确保失败信息可定位、可行动。  
**Depends on:** Phase 1  
**Requirements:** [COV-01, COV-02]  
**Success Criteria** (what must be TRUE):
1. `npm run test:coverage` 在本地与 CI 均通过，覆盖率四项阈值全部 ≥90%。
2. 覆盖率门禁失败时输出的日志信息足以定位缺口（例如关键文件/分支未覆盖点），补齐路径清晰。
3. 覆盖率提升不以“跳过/忽略”方式达成（例如禁止通过关闭分支统计或大范围排除文件来刷指标）。
**Plans:** 5/5 plans complete

Plans:
- [x] 02-01-PLAN.md — 覆盖率失败可定位输出（总览 + Top deficits + HTML 指引）
- [x] 02-02-PLAN.md — schemaGuard 分支覆盖提升（branches ≥90%）
- [x] 02-03-PLAN.md — useLauncherSessionState 分支覆盖提升（branches ≥90%）
- [x] 02-04-PLAN.md — useCommandManagement 分支覆盖提升（branches ≥90%）
- [x] 02-05-PLAN.md — 收尾：补齐剩余热点 + thresholds 提升到 90/90/90/90

### Phase 3: 关键用户路径回归补齐
**Goal:** 把核心用户路径覆盖为稳定、可回归的自动化用例，并覆盖关键失败分支。  
**Depends on:** Phase 2  
**Requirements:** [COV-03]  
**Success Criteria** (what must be TRUE):
1. 关键路径（搜索 → 填参 → 入队 → 会话恢复 → 系统终端执行）至少有 1 条端到端级别的“成功路径”自动化回归覆盖（可为组件/集成级，但必须覆盖真实行为而非假成功）。
2. 同一关键路径至少覆盖 1 条关键失败分支（例如参数非法/被安全策略拦截/终端不可用等），并有清晰错误提示断言。
3. 回归用例在 Windows/macOS/Linux 至少不引入平台依赖性崩溃（允许少量平台差异断言，但必须显式记录）。
**Plans:** 1/1 plans complete

Plans:
- [x] 03-01-PLAN.md — 关键用户路径回归补齐（成功链路 + 终端执行失败分支）

### Phase 4: Rust 终端执行模块单测
**Goal:** 为高风险的终端执行边界补齐 Rust 单元测试，优先覆盖跨 shell 参数/转义/拒绝路径。  
**Depends on:** Phase 1  
**Requirements:** [RUST-01]  
**Success Criteria** (what must be TRUE):
1. `src-tauri/src/terminal.rs` 的关键逻辑具备单元测试覆盖，至少覆盖 1 个跨平台差异或高风险分支。
2. Rust 侧测试可在 CI 稳定运行（不依赖交互式终端或本机特定环境）。
3. 相关边界行为在测试中被明确表达（输入/输出/错误），便于后续改动回归。
**Plans:** 3/3 plans complete

Plans:
- [x] 04-01-PLAN.md — 终端执行：build/spawn 可测试化 + argv/转义/拒绝路径单测
- [x] 04-02-PLAN.md — 终端探测：resolver 注入 + 回退/路径解析单测（不锁定排序/label/path）
- [x] 04-03-PLAN.md — Rust 单测纳入本地与 CI 门禁（check:all + precommit + 三平台 CI）

### Phase 5: Rust 命令目录与边界模块单测
**Goal:** 为命令加载覆盖规则与边界检查补齐 Rust 单元测试，确保行为可回归、可解释。  
**Depends on:** Phase 4  
**Requirements:** [RUST-02, RUST-03]  
**Success Criteria** (what must be TRUE):
1. `src-tauri/src/command_catalog.rs` 对“内置命令 + 用户命令冲突/覆盖”行为有单元测试覆盖，且规则清晰。
2. `src-tauri/src/bounds.rs`（若存在）边界检查/限制逻辑具备单元测试覆盖，至少覆盖 1 个拒绝路径。
3. Rust 测试结果能帮助定位行为回归（断言粒度适中，失败信息可读）。
**Plans:** 2/2 plans complete

Plans:
- [x] 05-01-PLAN.md — command_catalog 可测性最小重构 + Rust 单测（路径解析/递归/过滤/排序/fail-fast/modifiedMs=0）
- [x] 05-02-PLAN.md — bounds 可测性最小重构（提取纯逻辑）+ Rust 单测（restore + reposition + clamp + 拒绝路径）

### Phase 6: 安全基线回归补齐
**Goal:** 把“危险命令确认 + 参数注入拦截”的关键路径变成稳定的自动化回归，防止安全基线退化。  
**Depends on:** Phase 3  
**Requirements:** [SEC-01]  
**Success Criteria** (what must be TRUE):
1. 危险命令确认逻辑具备回归测试覆盖（确认/取消/绕过尝试等路径至少覆盖 2 条）。
2. 参数注入拦截逻辑具备回归测试覆盖（至少覆盖 1 条允许 + 1 条拦截 + 1 条边界输入）。
3. 安全相关失败提示清晰可操作（提示原因与下一步），且不会静默吞错。
**Plans:** 2/2 plans complete

Plans:
- [x] 06-01-PLAN.md — 安全判定与执行编排回归加固（allow/block/boundary + queue fail-fast）
- [x] 06-02-PLAN.md — App 热键与弹层防绕过回归（确认/取消/绕过 + 双语失败提示）

### Phase 7: 鲁棒性与错误提示增强
**Goal:** 提升关键模块的失败可见性与可操作性，确保错误不会被吞掉，并把边界条件纳入回归。  
**Depends on:** Phase 6  
**Requirements:** [ROB-01, ROB-02, ROB-03]  
**Success Criteria** (what must be TRUE):
1. 命令加载/解析失败会给出明确错误提示（包含来源、命令标识、失败原因），且有对应回归断言。
2. 命令执行失败（终端不可用/参数非法/被拦截）提示可操作的解决方案或下一步，并覆盖至少 1 条失败回归。
3. 更新流程（检查/下载/安装）失败提示清晰，且失败不会导致应用不可用或进入坏状态（至少覆盖 1 条失败回归）。
**Plans:** TBD

### Phase 8: 架构可测试性重构
**Goal:** 收窄高耦合模块的改动面，解耦 IO 与业务计算，把关键逻辑变成“可单测”的纯函数/窄接口。  
**Depends on:** Phase 2  
**Requirements:** [ARC-01, ARC-02]  
**Success Criteria** (what must be TRUE):
1. 至少 1 个高耦合模块（`App.vue` 或组合根相关）完成重构，使核心业务逻辑可在无 Tauri 环境下单测，并补齐关键分支用例。
2. 至少 1 个“难测/职责不清”的 store/service 完成拆分，业务部分可被单测覆盖，且接口更窄、更稳定。
3. 重构后改动不引入功能回归（关键用例/覆盖率门禁全绿）。
**Plans:** TBD

### Phase 9: UI/UX 小幅精修
**Goal:** 在不大改产品形态的前提下，打磨可达性与一致性，让高频操作更顺畅、更可预期。  
**Depends on:** Phase 8  
**Requirements:** [UX-01, UX-02]  
**Success Criteria** (what must be TRUE):
1. 启动器/设置页键盘可达性与焦点行为一致（focus 可见、Tab 顺序合理、Esc 行为一致且不误触）。
2. 信息层级、间距/对齐、对比度更一致；关键状态（空态/加载/错误）有清晰反馈。
3. UI 相关交互的回归覆盖得到补齐（至少覆盖 1-2 个关键键盘/焦点行为）。
**Plans:** TBD

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 回归链路与最小桌面 E2E 基线 | 3/3 | Complete   | 2026-03-03 |
| 2. 覆盖率门禁提升到 90% | 5/5 | Complete   | 2026-03-03 |
| 3. 关键用户路径回归补齐 | 1/1 | Complete   | 2026-03-04 |
| 4. Rust 终端执行模块单测 | 3/3 | Complete   | 2026-03-04 |
| 5. Rust 命令目录与边界模块单测 | 2/2 | Complete   | 2026-03-04 |
| 6. 安全基线回归补齐 | 2/2 | Complete   | 2026-03-05 |
| 7. 鲁棒性与错误提示增强 | 0/TBD | Not started | - |
| 8. 架构可测试性重构 | 0/TBD | Not started | - |
| 9. UI/UX 小幅精修 | 0/TBD | Not started | - |
| 10. 补齐 macOS 桌面端 E2E 冒烟 | 3/3 | Complete    | 2026-03-05 |

### Phase 10: 补齐 macOS 桌面端 E2E 冒烟

**Goal:** 在保持现有最小 smoke 口径不变的前提下，让 macOS 在本地与 CI 都能执行桌面端 E2E 冒烟并阻断失败，且提供可定位诊断产物。
**Requirements**: [E2E-02 (partial: macOS gate only)]
**Depends on:** Phase 9
**Plans:** 3/3 plans complete

Plans:
- [x] 10-01-PLAN.md — desktop-smoke 脚本跨平台化（win32 + darwin）与 macOS 可行性闸门
- [x] 10-02-PLAN.md — verify:local 接入 macOS 默认桌面冒烟 + 脚本文档对齐
- [x] 10-03-PLAN.md — CI/Release 纳入 macOS 桌面冒烟阻断 + 贡献者文档对齐
