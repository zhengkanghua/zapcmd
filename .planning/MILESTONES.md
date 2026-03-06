# Project Milestones: ZapCmd

## v1.0 质量门禁与回归基线 (Shipped: 2026-03-06)

**Delivered:** 建立以回归、覆盖率和可测试性为核心的 v1.0 质量基线，并把 macOS desktop smoke 的真实能力边界收敛到统一口径。

**Phases completed:** 1-12（35 plans，44 tasks）

**Key accomplishments:**
- 建立本地 pre-commit、CI Gate、Release 的统一质量门禁，并落地最小桌面端 E2E 基线。
- 将覆盖率门禁提升到 `90/90/90/90`，把关键用户路径与失败分支锁进自动化回归。
- 为 Rust 高风险模块、命令目录、安全拦截、更新失败与 UI/UX 关键路径补齐回归与验证证据。
- 完成组合根与 `settingsStore` 的可测试性重构，降低高耦合改动的回归风险。
- 收敛 macOS desktop smoke 的本地脚本、workflow、公开文档、短期记忆与 planning 审计口径。

**Stats:**
- 214 files changed（git range: `b572e1a^..b7112e4`）
- 67,037 lines of code scanned（frontend 17,392 + rust 49,645）
- 12 phases，35 plans，44 tasks，123 commits in milestone range
- 4 days from milestone execution start to ship（2026-03-03 → 2026-03-06）

**Git range:** `b572e1a` → `b7112e4`

**What's next:** 使用 `$gsd-new-milestone` 定义下一轮需求与路线图；`E2E-02` full-matrix、同步能力与团队级安全策略保留在后续 milestone / v2 backlog。

---