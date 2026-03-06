---
phase: 10-macos-e2e
verified: 2026-03-05T15:50:41+08:00
status: passed
score: 96/100
phase12-correction: "Superseded by Phase 12: this verification report preserved the original review trail, but its macOS local/CI blocking-gate conclusion was later identified as scope drift. Current repo reality is Windows blocking desktop smoke; macOS remains experimental/non-blocking."
---

# Phase 10: 补齐 macOS 桌面端 E2E 冒烟 — Verification Report

## 结论摘要（评分摘要）

- **Status:** `passed`
- **Score:** `96/100`
- **总体判断:** 目标能力已达成，且上轮指出的 3 个缺口已全部修复；当前仅保留后续演进风险，不构成本 Phase 阻断。

## Phase 12 Correction Note (superseded / scope drift)

- 本报告保留 2026-03-05 的验证轨迹，但其“macOS 本地+CI 桌面冒烟门禁补齐”的结论已在 Phase 12 被更正。
- 后续审计见 `.planning/v1.0-MILESTONE-AUDIT.md`、`.planning/phases/12-macos-e2e-gate-alignment/12-01-SUMMARY.md` 与 `.planning/phases/12-macos-e2e-gate-alignment/12-02-SUMMARY.md`：当前仓库现实为 Windows blocking desktop smoke；macOS desktop smoke 仅为 experimental / non-blocking probe，CI/Release 也不存在独立 macOS blocking desktop smoke gate。

## 校验要点结果

| 校验点 | 结果 | 说明 |
|---|---|---|
| 1) 目标是否达成（macOS 本地+CI 桌面冒烟门禁补齐） | ✅ 达成 | `desktop-smoke` 支持 `win32/darwin`；`verify:local` 默认覆盖 Windows/macOS；CI/Release 均含 macOS 阻断 job。 |
| 2) 是否无越界（Linux desktop E2E 仍 deferred） | ✅ 达成 | 脚本对非 Windows/macOS 明确失败，工作流未新增 Linux desktop E2E；Linux 仍停留在 cross-platform smoke（build/test）层。 |
| 3) requirement 口径为 E2E-02 partial（macOS gate） | ✅ 达成 | `ROADMAP` 与 10-01/02/03 SUMMARY 的 requirement 口径已统一为 `E2E-02 (partial: macOS gate only)`。 |
| 4) 风险与后续建议 | ✅ 已给出 | 见下方“风险”与“后续建议”。 |

## Must-have 对照

### 10-01 must_haves（desktop-smoke 跨平台化）

| Must-have | 判定 | 证据 |
|---|---|---|
| 同一脚本入口覆盖 Windows + macOS | ✅ | `scripts/e2e/desktop-smoke.cjs` 中 `resolvePlatformProfile()` 分支 `win32/darwin`。 |
| macOS 默认探测 `safaridriver`，缺失快速失败+指引 | ✅ | `resolveSafariDriverPath()` + 缺失时输出 `safaridriver --enable` 并非 0 退出。 |
| 非 Windows/macOS 明确失败（非静默 pass） | ✅ | 脚本对非支持平台直接设置 `process.exitCode = 1`。 |
| 最小 smoke 口径保持：启动→搜索→抽屉→Esc 清空 | ✅ | `runSmokeCase()` 仍只校验上述最小链路。 |
| 本计划仅交付 macOS gate 子集，不扩展 Linux desktop E2E | ✅ | 脚本平台守卫 + phase 文档 deferred 约束保持一致。 |

### 10-02 must_haves（verify:local 接入 macOS）

| Must-have | 判定 | 证据 |
|---|---|---|
| `verify:local` 在 macOS 默认尝试桌面 smoke | ✅ | `supportsDesktopE2E = isWindows || isMacOS`，默认调用 `runDesktopSmokeIfNeeded()`。 |
| Windows 自动安装链路保持可用 | ✅ | Windows 分支仍执行 `cargo install tauri-driver --locked` + `install-msedgedriver.ps1`。 |
| macOS 前置不满足时失败并给修复指引 | ✅ | `preflightDesktopDependenciesIfNeeded()` 对 `safaridriver` 缺失抛错并给命令。 |
| `--skip-e2e / --e2e-only` 语义保持 | ✅ | 参数互斥与流程分支仍保留；新增 `--require-desktop-e2e` 同时兼容旧参数。 |

### 10-03 must_haves（CI/Release + 文档）

| Must-have | 判定 | 证据 |
|---|---|---|
| PR/Push CI 包含 macOS desktop smoke 阻断 | ✅ | `.github/workflows/ci-gate.yml` 存在 `desktop-e2e-smoke-macos` job。 |
| Release 前质量门禁包含 macOS desktop smoke 阻断 | ✅ | `.github/workflows/release-build.yml` 中 `bundle.needs` 依赖 `desktop-e2e-smoke-macos`。 |
| CI/Release 统一产物目录上传 | ✅ | 两个 workflow 都上传 `.tmp/e2e/desktop-smoke/`（按平台分 artifact 名称）。 |
| 贡献者文档职责边界清晰且一致 | ✅ | `CONTRIBUTING.zh-CN.md` 的 Windows-only 残留文案已修正为按平台说明，与当前脚本行为一致。 |

## 复核的修复点（均已关闭）

1. **ROADMAP 计划状态一致性**  
   - Phase 10 进度已为 `3/3`，Phase 10 子计划勾选已更新为 `[x]`。  

2. **Requirement partial 口径一致性**  
   - 10-01/10-02/10-03 SUMMARY 的 `requirements-completed` 已统一为 `E2E-02 (partial: macOS gate only)`。  

3. **中文文档平台说明一致性**  
   - `CONTRIBUTING.zh-CN.md` 中 Windows-only 残留描述已修复为 Windows/macOS 平台口径。  

## 风险

- **R1（高）:** macOS WebDriver 生态仍可能出现环境差异/不稳定（本地权限、runner 差异），需要持续观察 flakiness。  
- **R2（中）:** Linux desktop E2E 仍 deferred，跨平台桌面自动化覆盖仍非 full matrix。  
- **R3（中）:** macOS gate 依赖 Safari/SafariDriver 与 runner 环境，建议持续保留诊断产物并监控失败样本。

## 后续建议

1. 在后续 phase 单列 Linux desktop E2E，完成 `E2E-02` full matrix。  
2. 保持 `.tmp/e2e/desktop-smoke/` 诊断产物上传策略，持续跟踪 macOS flakiness。  
3. 若未来出现 SafariDriver 变更，优先更新 preflight 提示与 CI 文档说明。  

---

**Final Verdict:** `passed`（Phase 10 目标达成，且无越界；本阶段闭环完成）。
