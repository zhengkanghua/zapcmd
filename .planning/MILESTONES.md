# Project Milestones: ZapCmd

## v2.0 主窗口 B4 UI 重构 (Shipped: 2026-03-11)

**Delivered:** 主窗口升级为 B4：单焦点搜索态 + Review overlay + floor height（无假结果 DOM）+ 新视觉系统与回归护栏，保持 `npm run check:all` 全绿。

**Phases completed:** 13-17（12 plans，35 tasks）

**Key accomplishments:**
- 建立 floor height / sizing 底座，并以 filler/spacer 达成“无假结果 DOM”约束，补齐可定位回归断言（Phase 13）。
- 将右侧常驻并列 staging 改为 Review overlay：背景锁定、可读宽度与摘要呈现（Phase 14）。
- 收口键盘/焦点/关闭语义：toggleQueue / switchFocus / Esc 分层后退 / Review 内 Tab 循环（Phase 15）。
- 视觉与动效系统落地：brand/success 分离、透明度与动画时序收敛，并保持窗口根背景透明规则（Phase 16）。
- Phase 17 将 Review 呈现回归为“同面板内 2/3 overlay 抽屉”，切断“打开导致窗口变宽”的链路并补齐回归护栏。

**Known gaps（accepted as tech debt）:**
- REQUIREMENTS 中 `KEY-01~KEY-05`、`TST-01` 仍标记为 Pending（后续 v2.1+ 复核与补齐）。

**Stats:**
- 238 files changed, +21,407 / -1,930 LOC（git range: `v1.0.1..HEAD`）
- 5 phases，12 plans，35 tasks，132 commits in milestone range
- 6 days from milestone start to ship（2026-03-05 → 2026-03-11）

**Git range:** `ffb7e92` → `00ade67`

**What's next:** 进入 `$gsd-new-milestone` 开启 v2.1（需求 → roadmap → phases）。

---

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
