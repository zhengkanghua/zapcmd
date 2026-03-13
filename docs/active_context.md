# 短期记忆（2026-03-05）

- 完成 Phase 10：补齐 desktop-smoke 的跨平台探测基础；最终口径已由 Phase 12 更正为 Windows 继续阻断、macOS 仅保留 experimental / non-blocking probe。
- `verify:local` 当前默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 手动探测。
- CI Gate / Release 当前只对 Windows desktop smoke 设阻断；macOS/Linux 保留在 cross-platform smoke / bundle 路径。
- Roadmap/State/Requirements 与 Phase 10 / Phase 12 evidence 已同步；剩余仅为 `E2E-02` full-matrix 的 v2 deferred tech debt。

## 补充（2026-03-05）

- macOS runner 上 `tauri-driver + safaridriver` 会话不稳定，已回退为实验能力，不再阻断 CI/Release。
- `verify:local` 默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 试验。
- 文档与工作流已统一：CI Gate 阻断项为 Windows quality + Windows desktop smoke + cross-platform smoke（macOS/Linux build+test）。

## 补充（流程文档分层）

- 贡献者共用节奏已沉淀到 `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`：日常开发、PR 门禁、触发矩阵统一口径。
- 维护者发布节奏集中到 `docs/.maintainer/work/release_runbook.md`：先 Dry Run 构建，再真实 Mac 人工冒烟，最后打 tag 正式发布。

## 补充（2026-03-05｜Phase 06 规划）

- 已完成 `06-CONTEXT.md` + `06-RESEARCH.md`，锁定安全回归口径：确认/取消/绕过、注入允许/拦截/边界、双语提示与不吞错。
- 新增 `06-01-PLAN.md`、`06-02-PLAN.md`（同属 Wave 1 并行），分别覆盖逻辑层与 App 热键交互层回归。
- `ROADMAP.md` 已同步 Phase 6 计划清单，下一步执行命令：`$gsd-execute-phase 06`。

## 补充（2026-03-06｜Phase 08 规划）

- 已完成 `08-RESEARCH.md` 与 `08-01/02/03-PLAN.md`，覆盖 ARC-01/ARC-02。
- 规划为两条并行主线（组合根解耦、settingsStore 拆分）+ 一条收敛验收（回归矩阵 + `check:all` + 架构文档）。
- `ROADMAP.md` 已把 Phase 8 从 `TBD` 更新为 `0/3` 计划清单；下一步执行：`$gsd-execute-phase 8`。

## 补充（2026-03-06｜Phase 08 执行完成）

- 已完成 `08-01/02/03` 全部执行与 `08-VERIFICATION.md`，状态 `passed`，ARC-01/ARC-02 均已达成。
- 关键落地：组合根新增 `ports/policies` 边界，`settingsStore` 拆为 `defaults/normalization/migration/storageAdapter/store`。
- 回归结果：定向测试通过，`npm run check:all` 全绿（含 test:coverage、build、check:rust、test:rust）。
- 文档与追踪已同步：`ROADMAP.md`（Phase 8=3/3 Complete）、`STATE.md`（推进到 Phase 9）、`REQUIREMENTS.md`（ARC-01/02=Complete）。

## 补充（2026-03-06｜更新检查修复）

- `src-tauri/capabilities/default.json` 补充 `updater:default`，修复 `updater.check not allowed`。

## 补充（2026-03-06｜里程碑补缺起步）

- 已新增仓库根 `AGENTS.md`，强制新会话与 `$gsd-*` 前先读 `CLAUDE.md -> .ai/AGENTS.md -> .ai/TOOL.md`。
- `v1.0` 审计结果为 `gaps_found`，已新增 Phase 11/12，分别处理 Phase 2/9 verification 缺口与 Phase 10 macOS gate 口径收敛。

## 补充（2026-03-06｜Phase 11 完成）

- 已补齐 `02-VERIFICATION.md`、`09-VERIFICATION.md` 与 Phase 9 summary frontmatter，`COV-01/02`、`UX-01/02` 的 orphaned 审计缺口已关闭。
- 当前唯一剩余 blocker 是 Phase 12：收敛 macOS desktop smoke 的本地、CI、Release 与文档口径。
- 关于页更新失败提示新增“权限缺失”分支，不再把权限问题误导为网络问题；新增 3 条组件测试覆盖该路径。
## 补充（2026-03-06｜Phase 09 讨论完成）
- 已创建 `09-CONTEXT.md`：锁定启动器键盘流与状态反馈。`Esc` 分层后退、主界面有查询时先清空；`Tab` 继续开关队列；设置保存成功/失败统一顶部 Toast；空态为“一句话+下一步”；功能错误留在各区，加载反馈更明显。

## 补充（2026-03-06｜Phase 09 规划完成）
- 已创建 `09-RESEARCH.md` 与 `09-01/02/03-PLAN.md`：分成键盘/焦点、状态反馈/层级、收敛验收三块，Phase 9 现已可直接进入 execute-phase。

## 补充（2026-03-06｜Phase 09 执行完成）
- 已完成 Phase 09：补了启动器与设置页高频焦点样式，锁定 `Esc` 层级回归；无结果空态增加下一步提示；设置保存失败改为顶部 Toast；终端检测与更新流程 loading 更明显；Phase 9 相关回归矩阵与 `check:all` 全绿。

## 补充（2026-03-06｜Phase 09 settings 再增强）
- settings 新增三点：1）快捷键冲突时，冲突字段标红，最后修改的冲突项高亮更强；2）跨路由保存错误会标红对应导航，并提供“前往对应路由”按钮；3）取消现在会在有未保存修改时弹确认，确认后恢复到打开设置时的基线值，确定仍是保存并关闭。

## 补充（2026-03-06｜settings 确定/取消语义修正）
- 关闭 settings 现在分成两条路径：取消/`Esc` 走“请求关闭”，有未保存修改时先确认再决定是否丢弃；确定走“先保存，成功后直接关闭”，不再复用取消路径，避免出现点确定却无反应。

## 补充（2026-03-06｜Phase 12 口径收敛）
- 已统一公开文档与 Phase 10 evidence：Windows desktop smoke 仍是唯一 blocking gate；macOS 仅保留 experimental / non-blocking probe。剩余 tech debt 仅为等待上游稳定性变化。

## 补充（2026-03-06｜v1.0 里程碑归档）
- 已归档 v1.0：ROADMAP/REQUIREMENTS/audit 已入 .planning/milestones/，当前无 blocker，下一步改为 $gsd-new-milestone。

## 补充（2026-03-07｜UI 评审）
- 已完成主窗口与 settings 截图评审：当前问题不在技术栈上，而在视觉系统与信息架构；后续优先收敛为更克制的深色专业风，弱化绿色品牌色，重做暂存区布局与 settings 卡片化层级。

## 补充（2026-03-07｜UI 重构文档工作区）
- 已新增 `docs/ui-redesign/`：包含重构背景、现状审计、方案对比、设计系统、代码影响图、Gemini Canvas Prompt 与执行路线；当前推荐主方向为“Search / Review 两态”，待外部 Demo 比较后再进入正式 phase。
## 补充（2026-03-07｜UI 方案锁定 B4）
- 已正式收敛界面大重构主方案为 `B4 = Overlay Review Mode with Floor Height Protection`：搜索态保持动态高度；Review 态在内部 shell 中右侧滑出；结果不足时使用左侧抽屉 floor height（= 4 条结果高度 + 搜索框高度，计算值）与 filler 补高；遮罩只作用于内部圆角 shell，不做整窗遮罩；若实时 resize 抖动则退回单次 resize + 内部动画。
## 补充（2026-03-07｜B4 交互与状态机文档）

- 已新增 `docs/ui-redesign/08-b4-interaction-state-machine.md`：明确 B4 的窗口/搜索/Review/Param/Safety 四维状态模型、层级优先级、键盘规则、焦点恢复策略，以及 `toggleQueue` / `switchFocus` 在兼容期的目标语义。
## 补充（2026-03-07｜B4 热键迁移表）
- 已新增 `docs/ui-redesign/09-b4-hotkey-migration-map.md`：明确 `toggleQueue` / `switchFocus` 在 B4 第一阶段的兼容语义、Review 态下 `Tab` 回归标准焦点循环的规则，以及热键文案/测试/设置模型的收口建议。
## 补充（2026-03-07｜B4 组件/视觉/验收文档）
- 已补齐 `docs/ui-redesign/10-b4-component-architecture.md`、`11-b4-visual-spec.md`、`12-b4-acceptance-matrix.md`：分别覆盖组件拆分与状态归属、主窗口/Review/Settings 视觉规格，以及 Demo 评审/手动验收/自动化测试优先级；当前 `docs/ui-redesign/` 已可作为进入正式 phase 前的完整前置方案包。
## 补充（2026-03-07｜范围再次收窄）
- 已在 `docs/ui-redesign/` 中明确写死：本轮只做 launcher 主窗口；`settings` 继续保持独立窗口，不并入 launcher，也不纳入本轮重构范围。后续若要做 settings 升级，另开独立专题。

## 补充（2026-03-07｜v2.0 里程碑启动）
- 启动 v2.0「主窗口 B4 UI 重构」：已生成 `.planning/REQUIREMENTS.md`/`.planning/ROADMAP.md` 与 `.planning/research/*`，Phase 13-16（底座→Overlay→键盘→动效）待执行；下一步 `$gsd-plan-phase 13`。

## 补充（2026-03-07｜Git hooks 修复）
- pre-commit hooks 改为平台目录：Windows=`.githooks/windows`（PowerShell），macOS/Linux=`.githooks/posix`（sh），规避 `sh.exe couldn't create signal pipe (Win32 error 5)`。

## 补充（2026-03-07｜Phase 13 讨论完成）
- Phase 13 已生成 CONTEXT（`.planning/phases/13-b4-layout-sizing-foundation/13-CONTEXT.md`）：floor 仅“打开 Review 前”触发（0~3 结果），floor height 由“4 条结果高度 + 搜索框高度”计算，content height 只排除顶端 drag strip，并要求 P0 单测锁定“无假结果 DOM”。

## 补充（2026-03-07｜Phase 13 规划完成）
- 已生成 `.planning/phases/13-b4-layout-sizing-foundation/13-RESEARCH.md` 与 `13-01/02/03-PLAN.md`（Wave 1：floor+filler、sizing 口径；Wave 2：回归单测）。下一步：`$gsd-execute-phase 13`。

## 补充（2026-03-08｜Phase 13 执行完成）
- Phase 13 已完成：floor/filler（aria-hidden、无假结果 DOM、仅 `stagingExpanded=true` 且 0~3 结果触发）+ sizing 排除 drag strip + 回归单测；`npm run check:all` 全绿；下一步 `$gsd-plan-phase 14`。

## 补充（2026-03-08｜Phase 14 讨论完成）
- 修复 gsd-tools 缺失 `core/state` 模块；并生成 Phase 14 `14-CONTEXT.md`：入口=搜索区 pill（仅队列非空）；关闭=按钮+点遮罩；面板宽度按搜索区宽度比例计算（推荐 2/3，clamp 到 420–480）、头尾固定列表内滚、轻 dim 锁背景；卡片=标题+摘要、复制+悬浮、参数仍可编辑。见 `.planning/phases/14-review-overlay/14-CONTEXT.md`。

## 补充（2026-03-09｜Phase 14 执行进展）
- 已完成 14-01：搜索态单列 + 队列 pill 入口；入队/会话恢复不再自动打开 Review；Review 宽度口径 `2/3 + clamp(420~480)` 通过 CSS 变量集中管理。

## 补充（2026-03-09｜Phase 14-03 回归迁移）
- 自动化回归迁移到 pill + Review overlay；新增 Review 组件级单测；`npm run check:all` 全绿，为 Phase 15 键盘/焦点收口提供稳定基线。

## 补充（2026-03-09｜Phase 14 UI 对齐）
- 队列 pill 移入搜索框右侧同排；Review overlay 的遮罩从搜索框下方覆盖结果抽屉区域（仅暗结果区）。
- Review 展开时：结果抽屉 inert/aria-hidden 锁定；点击搜索框关闭 Review，队列 pill 可切换；关闭后焦点回到搜索框。

## 补充（2026-03-09｜Phase 15 计划完成）
- 已生成 Phase 15 的 3 个执行计划（15-01/02/03）：热键语义、Esc 分层后退、Review 初始焦点/Tab focus trap、P0 自动化回归更新。下一步：`$gsd-execute-phase 15`。

## 补充（2026-03-09｜Phase 15 执行完成待复验）
- Phase 15 已落地：Tab/Ctrl+Tab 打开 Review、Review 内 Tab trap、Esc 先关 Review；但本容器无法跑 vitest（esbuild spawn EPERM），需本地 `npm run check:all` + 键盘 smoke（见 `.planning/phases/15-keyboard-focus-close-semantics/15-VERIFICATION.md`）。

## 补充（2026-03-09｜Phase 15 门禁已通过）
- 已在沙盒外跑通 `npm run check:all`（含回归/coverage/build/rust）；Phase 15 验证已更新为 `passed`，可推进 Phase 16（动画/视觉系统）。

## 补充（2026-03-09｜Phase 16 讨论完成）
- 视觉基线选 Beta Graphite Cyan；交互激活态统一用品牌色（不再用绿色做品牌）；success 色值先留给执行者。Review 动效：dim→滑入、滑出→去 dim，约 200ms；默认 opacity 调到 0.96（范围仍 0.2~1.0）、壁纸弱化、Review 层级高一阶；Windows 若 resize 抖动明显则降级“一次性 resize + 内部动画”。

## 补充（2026-03-10｜Phase 16 规划完成）
- 已生成 `.planning/phases/16-animation-visual-system/16-RESEARCH.md` 与 `16-01/02/03-PLAN.md`，并同步 `.planning/ROADMAP.md`；下一步：`$gsd-execute-phase 16`。

## 补充（2026-03-10｜Phase 16 研究完成）
- 已生成 `.planning/phases/16-animation-visual-system/16-RESEARCH.md`：覆盖 `SIZE-03`/`VIS-01`/`VIS-02`，梳理动效/令牌/Windows resize 降级落点与相关代码路径。

## 补充（2026-03-10｜Phase 16-01 执行完成）
- 主窗口完成 brand/success 分离：引入 `--ui-brand(#4CC9F0)` / `--ui-success(#2DD4BF)`；Queue pill、结果选中/聚焦、主按钮、focus ring、staged feedback 动画统一使用 brand；执行成功反馈仅使用 success。回归：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-02 执行完成）
- Review overlay 开合动效落地：opening dim 先出现再滑入；closing 先滑出再去 dim；总时长约 200ms，仅 `opacity/transform`。
- `STAGING_TRANSITION_MS=200` 并同步 staging-panel 动画时长；回归：`npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-03 执行完成）
- 默认透明度提升至 0.96（范围仍 0.2~1.0），同步 CSS `--ui-opacity` 与回归断言，并跑通 `npm run check:all`。

## 补充（2026-03-10｜Phase 16 验证）
- 已生成 `.planning/phases/16-animation-visual-system/16-VERIFICATION.md`（status=`human_needed`，score=3/3）；需在 Windows 手动确认 Review 开合动效与 resize 体感，以及透明度/品牌色观感基线。

## 补充（2026-03-10｜Review 打开背景修复）
- 修复“Review 打开但 query 为空时左侧背景塌陷、看起来像右侧独立抽屉”的观感问题：在 `reviewOpen && !drawerOpen` 时渲染左侧 floor 占位，并在 `stagingExpanded=true` 下始终提供 `drawerFloorViewportHeight`；定向单测已通过。
- 同步修复 Review 列表布局：移除列表 `minHeight`（避免卡片被拉伸出现大空隙），review 面板改为 3 行 grid 并补齐 `min-height: 0`，footer 按钮不再溢出。

## 补充（2026-03-10｜Phase 17 设计落盘）
- 已落盘“面板内 2/3 覆盖抽屉（搜索框下方三层：结果→遮罩→抽屉；点击遮罩关闭并回焦搜索框）”设计稿，并追加到 v2.0 Roadmap：见 `docs/superpowers/specs/2026-03-10-launcher-review-drawer-overlay-design.md` 与 `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-CONTEXT.md`。

## 补充（2026-03-10｜Phase 17 规划完成）
- 已生成 Phase 17 的 `17-01/02/03-*-PLAN.md`（3 waves）并补齐 `17-RESEARCH.md`，计划已校验通过；下一步执行：`$gsd-execute-phase 17`。

## 补充（2026-03-10｜Phase 17 执行完成）
- Review 已回归为“面板内容区内 2/3 overlay 抽屉”，并切断“打开导致窗口变宽”的链路；回归护栏已补齐且 `npm run check:all` 全绿。已生成 `17-VERIFICATION.md`（status=`human_needed`）待 Windows smoke。

## 补充（2026-03-10｜Review 体验微调）
- Review 体验微调（已回滚）：不再强制加深遮罩/增加 preopening 门控/调整 search-main floor 布局。

## 补充（2026-03-11｜Phase 16/17 Windows 验证通过）
- 透明度规则修正：窗口根背景永远保持透明；设置里的“窗口透明度”仅影响 UI 样式（`--ui-opacity` → `--ui-bg` 等），不改变窗口本身透明性。
# 短期记忆（2026-03-05）

- 完成 Phase 10：补齐 desktop-smoke 的跨平台探测基础；最终口径已由 Phase 12 更正为 Windows 继续阻断、macOS 仅保留 experimental / non-blocking probe。
- `verify:local` 当前默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 手动探测。
- CI Gate / Release 当前只对 Windows desktop smoke 设阻断；macOS/Linux 保留在 cross-platform smoke / bundle 路径。
- Roadmap/State/Requirements 与 Phase 10 / Phase 12 evidence 已同步；剩余仅为 `E2E-02` full-matrix 的 v2 deferred tech debt。

## 补充（2026-03-05）

- macOS runner 上 `tauri-driver + safaridriver` 会话不稳定，已回退为实验能力，不再阻断 CI/Release。
- `verify:local` 默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 试验。
- 文档与工作流已统一：CI Gate 阻断项为 Windows quality + Windows desktop smoke + cross-platform smoke（macOS/Linux build+test）。

## 补充（流程文档分层）

- 贡献者共用节奏已沉淀到 `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`：日常开发、PR 门禁、触发矩阵统一口径。
- 维护者发布节奏集中到 `docs/.maintainer/work/release_runbook.md`：先 Dry Run 构建，再真实 Mac 人工冒烟，最后打 tag 正式发布。

## 补充（2026-03-05｜Phase 06 规划）

- 已完成 `06-CONTEXT.md` + `06-RESEARCH.md`，锁定安全回归口径：确认/取消/绕过、注入允许/拦截/边界、双语提示与不吞错。
- 新增 `06-01-PLAN.md`、`06-02-PLAN.md`（同属 Wave 1 并行），分别覆盖逻辑层与 App 热键交互层回归。
- `ROADMAP.md` 已同步 Phase 6 计划清单，下一步执行命令：`$gsd-execute-phase 06`。

## 补充（2026-03-06｜Phase 08 规划）

- 已完成 `08-RESEARCH.md` 与 `08-01/02/03-PLAN.md`，覆盖 ARC-01/ARC-02。
- 规划为两条并行主线（组合根解耦、settingsStore 拆分）+ 一条收敛验收（回归矩阵 + `check:all` + 架构文档）。
- `ROADMAP.md` 已把 Phase 8 从 `TBD` 更新为 `0/3` 计划清单；下一步执行：`$gsd-execute-phase 8`。

## 补充（2026-03-06｜Phase 08 执行完成）

- 已完成 `08-01/02/03` 全部执行与 `08-VERIFICATION.md`，状态 `passed`，ARC-01/ARC-02 均已达成。
- 关键落地：组合根新增 `ports/policies` 边界，`settingsStore` 拆为 `defaults/normalization/migration/storageAdapter/store`。
- 回归结果：定向测试通过，`npm run check:all` 全绿（含 test:coverage、build、check:rust、test:rust）。
- 文档与追踪已同步：`ROADMAP.md`（Phase 8=3/3 Complete）、`STATE.md`（推进到 Phase 9）、`REQUIREMENTS.md`（ARC-01/02=Complete）。

## 补充（2026-03-06｜更新检查修复）

- `src-tauri/capabilities/default.json` 补充 `updater:default`，修复 `updater.check not allowed`。

## 补充（2026-03-06｜里程碑补缺起步）

- 已新增仓库根 `AGENTS.md`，强制新会话与 `$gsd-*` 前先读 `CLAUDE.md -> .ai/AGENTS.md -> .ai/TOOL.md`。
- `v1.0` 审计结果为 `gaps_found`，已新增 Phase 11/12，分别处理 Phase 2/9 verification 缺口与 Phase 10 macOS gate 口径收敛。

## 补充（2026-03-06｜Phase 11 完成）

- 已补齐 `02-VERIFICATION.md`、`09-VERIFICATION.md` 与 Phase 9 summary frontmatter，`COV-01/02`、`UX-01/02` 的 orphaned 审计缺口已关闭。
- 当前唯一剩余 blocker 是 Phase 12：收敛 macOS desktop smoke 的本地、CI、Release 与文档口径。
- 关于页更新失败提示新增“权限缺失”分支，不再把权限问题误导为网络问题；新增 3 条组件测试覆盖该路径。
## 补充（2026-03-06｜Phase 09 讨论完成）
- 已创建 `09-CONTEXT.md`：锁定启动器键盘流与状态反馈。`Esc` 分层后退、主界面有查询时先清空；`Tab` 继续开关队列；设置保存成功/失败统一顶部 Toast；空态为“一句话+下一步”；功能错误留在各区，加载反馈更明显。

## 补充（2026-03-06｜Phase 09 规划完成）
- 已创建 `09-RESEARCH.md` 与 `09-01/02/03-PLAN.md`：分成键盘/焦点、状态反馈/层级、收敛验收三块，Phase 9 现已可直接进入 execute-phase。

## 补充（2026-03-06｜Phase 09 执行完成）
- 已完成 Phase 09：补了启动器与设置页高频焦点样式，锁定 `Esc` 层级回归；无结果空态增加下一步提示；设置保存失败改为顶部 Toast；终端检测与更新流程 loading 更明显；Phase 9 相关回归矩阵与 `check:all` 全绿。

## 补充（2026-03-06｜Phase 09 settings 再增强）
- settings 新增三点：1）快捷键冲突时，冲突字段标红，最后修改的冲突项高亮更强；2）跨路由保存错误会标红对应导航，并提供“前往对应路由”按钮；3）取消现在会在有未保存修改时弹确认，确认后恢复到打开设置时的基线值，确定仍是保存并关闭。

## 补充（2026-03-06｜settings 确定/取消语义修正）
- 关闭 settings 现在分成两条路径：取消/`Esc` 走“请求关闭”，有未保存修改时先确认再决定是否丢弃；确定走“先保存，成功后直接关闭”，不再复用取消路径，避免出现点确定却无反应。

## 补充（2026-03-06｜Phase 12 口径收敛）
- 已统一公开文档与 Phase 10 evidence：Windows desktop smoke 仍是唯一 blocking gate；macOS 仅保留 experimental / non-blocking probe。剩余 tech debt 仅为等待上游稳定性变化。

## 补充（2026-03-06｜v1.0 里程碑归档）
- 已归档 v1.0：ROADMAP/REQUIREMENTS/audit 已入 .planning/milestones/，当前无 blocker，下一步改为 $gsd-new-milestone。

## 补充（2026-03-07｜UI 评审）
- 已完成主窗口与 settings 截图评审：当前问题不在技术栈上，而在视觉系统与信息架构；后续优先收敛为更克制的深色专业风，弱化绿色品牌色，重做暂存区布局与 settings 卡片化层级。

## 补充（2026-03-07｜UI 重构文档工作区）
- 已新增 `docs/ui-redesign/`：包含重构背景、现状审计、方案对比、设计系统、代码影响图、Gemini Canvas Prompt 与执行路线；当前推荐主方向为“Search / Review 两态”，待外部 Demo 比较后再进入正式 phase。
## 补充（2026-03-07｜UI 方案锁定 B4）
- 已正式收敛界面大重构主方案为 `B4 = Overlay Review Mode with Floor Height Protection`：搜索态保持动态高度；Review 态在内部 shell 中右侧滑出；结果不足时使用左侧抽屉 floor height（= 4 条结果高度 + 搜索框高度，计算值）与 filler 补高；遮罩只作用于内部圆角 shell，不做整窗遮罩；若实时 resize 抖动则退回单次 resize + 内部动画。
## 补充（2026-03-07｜B4 交互与状态机文档）
- 已新增 `docs/ui-redesign/08-b4-interaction-state-machine.md`：明确 B4 的窗口/搜索/Review/Param/Safety 四维状态模型、层级优先级、键盘规则、焦点恢复策略，以及 `toggleQueue` / `switchFocus` 在兼容期的目标语义。
## 补充（2026-03-07｜B4 热键迁移表）
- 已新增 `docs/ui-redesign/09-b4-hotkey-migration-map.md`：明确 `toggleQueue` / `switchFocus` 在 B4 第一阶段的兼容语义、Review 态下 `Tab` 回归标准焦点循环的规则，以及热键文案/测试/设置模型的收口建议。
## 补充（2026-03-07｜B4 组件/视觉/验收文档）
- 已补齐 `docs/ui-redesign/10-b4-component-architecture.md`、`11-b4-visual-spec.md`、`12-b4-acceptance-matrix.md`：分别覆盖组件拆分与状态归属、主窗口/Review/Settings 视觉规格，以及 Demo 评审/手动验收/自动化测试优先级；当前 `docs/ui-redesign/` 已可作为进入正式 phase 前的完整前置方案包。
## 补充（2026-03-07｜范围再次收窄）
- 已在 `docs/ui-redesign/` 中明确写死：本轮只做 launcher 主窗口；`settings` 继续保持独立窗口，不并入 launcher，也不纳入本轮重构范围。后续若要做 settings 升级，另开独立专题。

## 补充（2026-03-07｜v2.0 里程碑启动）
- 启动 v2.0「主窗口 B4 UI 重构」：已生成 `.planning/REQUIREMENTS.md`/`.planning/ROADMAP.md` 与 `.planning/research/*`，Phase 13-16（底座→Overlay→键盘→动效）待执行；下一步 `$gsd-plan-phase 13`。

## 补充（2026-03-07｜Git hooks 修复）
- pre-commit hooks 改为平台目录：Windows=`.githooks/windows`（PowerShell），macOS/Linux=`.githooks/posix`（sh），规避 `sh.exe couldn't create signal pipe (Win32 error 5)`。

## 补充（2026-03-07｜Phase 13 讨论完成）
- Phase 13 已生成 CONTEXT（`.planning/phases/13-b4-layout-sizing-foundation/13-CONTEXT.md`）：floor 仅“打开 Review 前”触发（0~3 结果），floor height 由“4 条结果高度 + 搜索框高度”计算，content height 只排除顶端 drag strip，并要求 P0 单测锁定“无假结果 DOM”。

## 补充（2026-03-07｜Phase 13 规划完成）
- 已生成 `.planning/phases/13-b4-layout-sizing-foundation/13-RESEARCH.md` 与 `13-01/02/03-PLAN.md`（Wave 1：floor+filler、sizing 口径；Wave 2：回归单测）。下一步：`$gsd-execute-phase 13`。

## 补充（2026-03-08｜Phase 13 执行完成）
- Phase 13 已完成：floor/filler（aria-hidden、无假结果 DOM、仅 `stagingExpanded=true` 且 0~3 结果触发）+ sizing 排除 drag strip + 回归单测；`npm run check:all` 全绿；下一步 `$gsd-plan-phase 14`。

## 补充（2026-03-08｜Phase 14 讨论完成）
- 修复 gsd-tools 缺失 `core/state` 模块；并生成 Phase 14 `14-CONTEXT.md`：入口=搜索区 pill（仅队列非空）；关闭=按钮+点遮罩；面板宽度按搜索区宽度比例计算（推荐 2/3，clamp 到 420–480）、头尾固定列表内滚、轻 dim 锁背景；卡片=标题+摘要、复制+悬浮、参数仍可编辑。见 `.planning/phases/14-review-overlay/14-CONTEXT.md`。

## 补充（2026-03-09｜Phase 14 执行进展）
- 已完成 14-01：搜索态单列 + 队列 pill 入口；入队/会话恢复不再自动打开 Review；Review 宽度口径 `2/3 + clamp(420~480)` 通过 CSS 变量集中管理。

## 补充（2026-03-09｜Phase 14-03 回归迁移）
- 自动化回归迁移到 pill + Review overlay；新增 Review 组件级单测；`npm run check:all` 全绿，为 Phase 15 键盘/焦点收口提供稳定基线。

## 补充（2026-03-09｜Phase 14 UI 对齐）
- 队列 pill 移入搜索框右侧同排；Review overlay 的遮罩从搜索框下方覆盖结果抽屉区域（仅暗结果区）。
- Review 展开时：结果抽屉 inert/aria-hidden 锁定；点击搜索框关闭 Review，队列 pill 可切换；关闭后焦点回到搜索框。

## 补充（2026-03-09｜Phase 15 计划完成）
- 已生成 Phase 15 的 3 个执行计划（15-01/02/03）：热键语义、Esc 分层后退、Review 初始焦点/Tab focus trap、P0 自动化回归更新。下一步：`$gsd-execute-phase 15`。

## 补充（2026-03-09｜Phase 15 执行完成待复验）
- Phase 15 已落地：Tab/Ctrl+Tab 打开 Review、Review 内 Tab trap、Esc 先关 Review；但本容器无法跑 vitest（esbuild spawn EPERM），需本地 `npm run check:all` + 键盘 smoke（见 `.planning/phases/15-keyboard-focus-close-semantics/15-VERIFICATION.md`）。

## 补充（2026-03-09｜Phase 15 门禁已通过）
- 已在沙盒外跑通 `npm run check:all`（含回归/coverage/build/rust）；Phase 15 验证已更新为 `passed`，可推进 Phase 16（动画/视觉系统）。

## 补充（2026-03-09｜Phase 16 讨论完成）
- 视觉基线选 Beta Graphite Cyan；交互激活态统一用品牌色（不再用绿色做品牌）；success 色值先留给执行者。Review 动效：dim→滑入、滑出→去 dim，约 200ms；默认 opacity 调到 0.96（范围仍 0.2~1.0）、壁纸弱化、Review 层级高一阶；Windows 若 resize 抖动明显则降级“一次性 resize + 内部动画”。

## 补充（2026-03-10｜Phase 16 规划完成）
- 已生成 `.planning/phases/16-animation-visual-system/16-RESEARCH.md` 与 `16-01/02/03-PLAN.md`，并同步 `.planning/ROADMAP.md`；下一步：`$gsd-execute-phase 16`。

## 补充（2026-03-10｜Phase 16 研究完成）
- 已生成 `.planning/phases/16-animation-visual-system/16-RESEARCH.md`：覆盖 `SIZE-03`/`VIS-01`/`VIS-02`，梳理动效/令牌/Windows resize 降级落点与相关代码路径。

## 补充（2026-03-10｜Phase 16-01 执行完成）
- 主窗口完成 brand/success 分离：引入 `--ui-brand(#4CC9F0)` / `--ui-success(#2DD4BF)`；Queue pill、结果选中/聚焦、主按钮、focus ring、staged feedback 动画统一使用 brand；执行成功反馈仅使用 success。回归：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-02 执行完成）
- Review overlay 开合动效落地：opening dim 先出现再滑入；closing 先滑出再去 dim；总时长约 200ms，仅 `opacity/transform`。
- `STAGING_TRANSITION_MS=200` 并同步 staging-panel 动画时长；回归：`npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-03 执行完成）
- 默认透明度提升至 0.96（范围仍 0.2~1.0），同步 CSS `--ui-opacity` 与回归断言，并跑通 `npm run check:all`。

## 补充（2026-03-10｜Phase 16 验证）
- 已生成 `.planning/phases/16-animation-visual-system/16-VERIFICATION.md`（status=`human_needed`，score=3/3）；需在 Windows 手动确认 Review 开合动效与 resize 体感，以及透明度/品牌色观感基线。

## 补充（2026-03-10｜Review 打开背景修复）
- 修复“Review 打开但 query 为空时左侧背景塌陷、看起来像右侧独立抽屉”的观感问题：在 `reviewOpen && !drawerOpen` 时渲染左侧 floor 占位，并在 `stagingExpanded=true` 下始终提供 `drawerFloorViewportHeight`；定向单测已通过。
- 同步修复 Review 列表布局：移除列表 `minHeight`（避免卡片被拉伸出现大空隙），review 面板改为 3 行 grid 并补齐 `min-height: 0`，footer 按钮不再溢出。

## 补充（2026-03-10｜Phase 17 设计落盘）
- 已落盘“面板内 2/3 覆盖抽屉（搜索框下方三层：结果→遮罩→抽屉；点击遮罩关闭并回焦搜索框）”设计稿，并追加到 v2.0 Roadmap：见 `docs/superpowers/specs/2026-03-10-launcher-review-drawer-overlay-design.md` 与 `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-CONTEXT.md`。

## 补充（2026-03-10｜Phase 17 规划完成）
- 已生成 Phase 17 的 `17-01/02/03-*-PLAN.md`（3 waves）并补齐 `17-RESEARCH.md`，计划已校验通过；下一步执行：`$gsd-execute-phase 17`。

## 补充（2026-03-10｜Phase 17 执行完成）
- Review 已回归为“面板内容区内 2/3 overlay 抽屉”，并切断“打开导致窗口变宽”的链路；回归护栏已补齐且 `npm run check:all` 全绿。已生成 `17-VERIFICATION.md`（status=`human_needed`）待 Windows smoke。

## 补充（2026-03-10｜Review 体验微调）
- Review 体验微调（已回滚）：不再强制加深遮罩/增加 preopening 门控/调整 search-main floor 布局。

## 补充（2026-03-11｜Phase 16/17 Windows 验证通过）
- 透明度规则修正：窗口根背景永远保持透明；设置里的“窗口透明度”仅影响 UI 样式（`--ui-opacity` → `--ui-bg` 等），不改变窗口本身透明性。
- 仅移除主窗外圈蓝色描边：删除 `.search-main:focus-within` 的蓝色 `border-color`；`npm run check:all` 全绿。
- 去蓝色主题：`--ui-brand` 改为灰色；搜索匹配高亮单独用 `--ui-search-hl` 保持蓝色。

## 补充（2026-03-11｜UI 微调：队列/暂存区图标按钮）
- 启动器队列入口改为图标按钮，非空显示数量徽标；Review Overlay 的关闭/复制/移除/清空改为纯图标，头部队列信息改为紧凑 Tab 并置于热键提示前。

## 补充（2026-03-11｜UI 设计与操作体验审查）
- 基于对主界面架构白盒审计的细节推导，出具涵盖产品（快捷热键提升、流式编排心智）、设计（高级毛玻璃质感、贝塞尔微动效）、前端技术（结构抽象、焦点管理）视角的综合审查文档，成果存放于 `plan/ui_design_review.md`。

## 补充（2026-03-11｜UI 设计规范一期落地）
- 根据新版对齐 Raycast/Alfred 的紧凑极客风格与系统原生要求，向 `src/styles.css` 大量注入改造代码：
  - **组件质感**：Review 遮罩启用 `backdrop-filter: blur(8px)` 取代纯色，危险按钮采用亮红半透明；
  - **动效弹簧化**：全部主要进入/退出机制及悬停交互 (`.result-item`, `.review-panel`, `.staging-panel`) 剥离默认 ease，切换至 `cubic-bezier(0.175, 0.885, 0.32, 1.15)`；
  - **等宽强约束**：通过 `--ui-font-mono` 强制约束所有的代码片、命令行、参数，并缩小 `padding` 与 `.staging-card` 高度以追求极致的紧凑高频信息密度。
  - **焦点发光**：抛弃灰色高光，启用高饱和 `--ui-search-hl` 色与外发光（`box-shadow`）。

## 补充（2026-03-11｜UI 设计规范二期落地）
- **按键徽标化**：将以往的纯文本拼接（如 `Enter 执行 · Tab 加入队列`）重构为了支持原生的 `<kbd>` 实体按键 UI。完成了 `messages.ts` 与 `useHotkeyBindings.ts` 的结构化对象升级，并打通至 `LauncherSearchPanel.vue`。
- **编排语义升级**：将原本受 Git 影响的“暂存区/队列（Queue）”产品语义全面提升至“执行流/流式编排（Flow）”概念，调整全部中英文本地化文案，为未来的组合技能释放空间。
## 补充（2026-03-11｜UI 设计规范三期落地）
- **动效与反馈强化**：为了达到更加细腻的弹簧交互质感，将原本的 Ease 过渡全面切换为 `cubic-bezier(0.175, 0.885, 0.32, 1.15)` 曲线。
- **毛玻璃悬浮栈 (Glassmorphism Modal)**：彻底重构了 `param-overlay` (参数模态框)、`safety-overlay` (安全拦截确认框) 以及顶部 `execution-toast` (执行反馈通知) 等组件的背景层级，注入 `backdrop-filter: blur` 搭配高半透黑色遮罩，从视觉上削弱了生硬感，强化了层级间的物理隐喻。
- **结构剥离适配 Tauri 窗口边界**：修复因为使用 `fixed` 而导致遮罩漫出圆角边界的渲染隐患，利用 `.launcher-overlays` 限定区域的同时保留了弹窗自身向上下溢出的堆叠感。

## 补充（2026-03-11｜UI 设计规范四期落地）
- **极客密度排版 (Information Density)**：大幅压缩了主搜索结果列表 (`.result-item` 高度从 `52px` 降至 `44px`) 和执行卡片 (`.staging-card` 高度降至 `56px`)，有效提升了单屏指令容纳量与效率感。
- **状态引导情感化 (Empty State Experience)**：彻底解决因 Tauri 固定高度策略导致的空态信息截断问题，把空面板文案改构为极致紧凑的单行 Flex 对齐（附加 `<kbd>Esc</kbd>` 徽标），确保在最极端的情况下也能完美渲染反馈。
- **弹性折叠消除卡片溢出**：放弃了陈腐的“一参一行” Grid 写法，将 `.staging-card__args` 变构为动态水平延伸的 `flex-wrap: wrap` 弹性流布局。如果暂存卡片存在多个参数（如多个路径或 User / Host 等），它们将横向并排贴合；同时解锁了 `.review-panel` 的绝对防截断 (`overflow-y: auto`)，告别长卡片被硬切的 Bug。
- **危险操作高可见性**：重塑了 `.btn-danger` 垃圾桶等毁灭性操作的视觉表达，改用 `bg-red/10` 辅以高饱和红色字号，消灭了深色模式下旧版暗红的黏滞感。

## 补充（2026-03-11｜暂存区 UI 三项修复）
- 多语言补全：`messages.ts` 新增 `common.copied`/`common.copyFailed`/`launcher.queueEmptyHint` 中英文 key，去除组件中硬编码 fallback。
- 卡片高度截断修复：`STAGING_CARD_EST_HEIGHT` 从 96→140，让 `maxHeight` 计算为多参数卡片预留更多空间。
- 参数弹窗加深：`.param-dialog` 背景 0.7→0.92，`.param-overlay` 加半透明遮罩 `rgba(0,0,0,0.35)`。
- 参数弹窗遮罩修复：`LauncherParamOverlay` 移入 `.search-shell` 内，`.param-overlay` 从 `fixed` 改为 `absolute` + `blur(8px)` + `border-radius`，遮罩不再溢出到窗口透明区域；`.param-dialog` 加 `max-height + overflow-y: auto` 溢出保护。

## 补充（2026-03-12｜弹窗替换为双抽屉导航栈设计稿）

- Launcher：参数/高危从弹窗改为左侧 Flow 抽屉导航栈（左进右出），可与右侧 Review 抽屉并存；单抽屉 2/3、双抽屉 1/2+1/2。设计稿：`docs/superpowers/specs/2026-03-12-launcher-flow-drawer-nav-stack-design.md`。

## 补充（2026-03-12｜安装 superpowers skills）

- 已按 superpowers 安装文档完成：克隆到 `~/.codex/superpowers`，并在 `~/.agents/skills/superpowers` 建立 junction 指向 `skills/`；需重启 Codex 以发现技能。

## 补充（2026-03-12｜superpowers 改为项目内生效）

- 已将 superpowers 克隆到 `D:/own_projects/zapcmd/.codex/superpowers`，并把其 skills 以 junction 挂入 `D:/own_projects/zapcmd/.codex/skills/`（同名 `brainstorming` 已跳过，保留项目定制版）。

## 补充（2026-03-12｜收敛 superpowers skills 命名空间）

- 已移除项目 `D:/own_projects/zapcmd/.codex/skills/` 下 13 个摊平的 superpowers skills junction，仅保留 `D:/own_projects/zapcmd/.codex/skills/superpowers` 入口；项目自带 `brainstorming` 未改动。

## 补充（2026-03-12｜superpowers 入口改为相对 symlink）

- 已将 `D:/own_projects/zapcmd/.codex/skills/superpowers` 从 junction 改为目录符号链接（symlink），Target 为相对路径 `../superpowers/skills`，提升跨设备/跨路径迁移的可用性（仍需确保仓库目录一并迁移）。

## 补充（2026-03-12｜superpowers 前置边界加载）

- 已新增项目覆盖 skill：`.codex/skills/using-superpowers`，用于在任何 superpowers 工作流（含自动/子代理）前强制读取 `AGENTS.md` / `CLAUDE.md` / `.ai/*` 规则。

## 补充（2026-03-12｜Launcher Flow 抽屉落地）

- 参数/高危确认改为左侧 Flow 抽屉（左进右出），与 Review 同开均分；Flow 打开禁用搜索输入，点 Search Capsule=Esc 回退；两抽屉共用 floor-height（最小 6 行：`LAUNCHER_DRAWER_FLOOR_ROWS`）与最大展示行数（10 行：`LAUNCHER_DRAWER_MAX_ROWS`），同款 scrim（滚动条隐藏）。
- 修复 Windows 下 Vite/Vitest 配置加载：`dev/build/preview` 用 `--configLoader native`，测试用 `vitest.config.js` + no-spawn 插件。

## 补充（2026-03-13｜收尾与回归）

- Settings 未保存关闭从 `window.confirm` 改为内置确认层；Flow 抽屉确认右退动效更明显；Flow 设计稿已补充“已实现”标注。

## 补充（2026-03-13｜Flow 动效与UI细化设计稿）

- 新增 `docs/superpowers/specs/2026-03-13-launcher-flow-drawer-motion-ux-polish-design.md`：改用状态类+keyframes，关闭先退场后 emit；提示统一 `.keyboard-hint`。
