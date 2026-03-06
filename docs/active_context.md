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
