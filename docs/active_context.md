# 短期记忆（2026-03-05）

- 完成 Phase 10：桌面冒烟从 Windows 扩展到 Windows/macOS，`desktop-smoke.cjs` 增加平台画像与 macOS `safaridriver` 预检。
- `verify:local` 默认在 Windows/macOS 执行桌面冒烟；Windows 缺驱动自动补装，macOS 缺前置时给指引并失败退出。
- CI Gate 与 Release 门禁均新增 macOS desktop smoke 阻断，产物按平台上传，保持 `.tmp/e2e/desktop-smoke/`。
- Roadmap/State/Requirements 与 10-01~10-03 SUMMARY、10-VERIFICATION 已同步，Phase 10 验证状态为 `passed`。

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
