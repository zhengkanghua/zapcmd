---
phase: 12-macos-e2e-gate-alignment
verified: 2026-03-06T23:35:31.9238922+08:00
status: passed
score: 12/12 must-haves verified
must_have_score: 12/12
artifact_score: 12/12
key_link_score: 7/7
requirements:
  - "E2E-02 (partial: macOS gate only)"
human_verification_needed: false
verifier: Codex (main context)
---

# Phase 12: macOS E2E Gate Alignment — Verification Report

**Phase Goal:** 收敛 Phase 10 对 macOS desktop smoke 的真实交付口径，使本地脚本、CI / Release workflow、ROADMAP / REQUIREMENTS / SUMMARY / active context 之间完全一致；明确 v1 关闭的是口径漂移，而非补完 unsupported 的 macOS blocking gate。  
**Verified:** 2026-03-06T23:35:31.9238922+08:00  
**Status:** passed

## Goal Achievement

本次重新验证后，上一版报告指出的两处静态残留口径已被关闭：

- `docs/active_context.md:3`、`docs/active_context.md:4`、`docs/active_context.md:5` 现已直接陈述 Phase 12 之后的真实口径：Windows desktop smoke 继续阻断，macOS 仅保留 experimental / non-blocking probe。
- `.planning/STATE.md:81`、`.planning/STATE.md:82`、`.planning/STATE.md:83` 现已改为带更正语义的最终口径，不再把旧的 Phase 10 结论当作当前现实直接暴露。

结合脚本、workflow、公开文档、短期记忆、planning 文档与 Phase 10 correction notes，当前仓库对 macOS gate 的描述已收敛到同一现实：

- 本地：Windows 默认执行 blocking desktop smoke；macOS 默认只跑 quality gate，experimental 路径需显式开启。
- CI / Release：Windows desktop smoke 是唯一 blocking desktop gate；macOS/Linux 仅保留 cross-platform smoke / bundle 路径。
- planning / audit：Phase 12 关闭的是 v1 traceability drift；`E2E-02` full-matrix 目标继续 deferred 到 v2 / tech debt。

## Must-have Verification

| # | Must-have | 结果 | 证据 |
|---|---|---|---|
| 1 | `verify:local` 的帮助文本明确表达 Windows blocking、macOS experimental / non-blocking | ✓ VERIFIED | `scripts/verify-local-gate.mjs:13`, `scripts/verify-local-gate.mjs:17`, `scripts/verify-local-gate.mjs:35`, `scripts/verify-local-gate.mjs:46`；`node scripts/verify-local-gate.mjs --help` |
| 2 | `verify:local` 的 macOS 默认路径不会误跑 desktop smoke，experimental 入口仍保留 | ✓ VERIFIED | `scripts/verify-local-gate.mjs:18`, `scripts/verify-local-gate.mjs:20`, `scripts/verify-local-gate.mjs:298`, `scripts/verify-local-gate.mjs:305`, `scripts/verify-local-gate.mjs:309`；模拟 `darwin` dry-run 已输出默认跳过与 experimental 执行两种结果 |
| 3 | `scripts/README.md` 与脚本行为完全一致，不再暗示 macOS 默认 blocking | ✓ VERIFIED | `scripts/README.md:25`, `scripts/README.md:26`, `scripts/README.md:27`, `scripts/README.md:36`, `scripts/README.md:63` |
| 4 | `ci-gate.yml` 明确 Windows desktop smoke 是唯一 blocking desktop gate | ✓ VERIFIED | `.github/workflows/ci-gate.yml:16`, `.github/workflows/ci-gate.yml:17`, `.github/workflows/ci-gate.yml:57`, `.github/workflows/ci-gate.yml:83`, `.github/workflows/ci-gate.yml:90` |
| 5 | `ci-gate.yml` 明确 macOS/Linux 仅停留在 cross-platform build/test/Rust smoke | ✓ VERIFIED | `.github/workflows/ci-gate.yml:95`, `.github/workflows/ci-gate.yml:96`, `.github/workflows/ci-gate.yml:97`, `.github/workflows/ci-gate.yml:135` |
| 6 | `release-build.yml` 明确 Windows release quality gate 含 desktop smoke，macOS 只参与 bundle | ✓ VERIFIED | `.github/workflows/release-build.yml:12`, `.github/workflows/release-build.yml:13`, `.github/workflows/release-build.yml:16`, `.github/workflows/release-build.yml:57`, `.github/workflows/release-build.yml:59`, `.github/workflows/release-build.yml:60` |
| 7 | README / CONTRIBUTING 中英文公开文档全部与脚本 / workflow 现实一致 | ✓ VERIFIED | `README.md:114`, `README.md:121`, `README.md:122`, `README.zh-CN.md:114`, `README.zh-CN.md:121`, `README.zh-CN.md:122`, `CONTRIBUTING.md:38`, `CONTRIBUTING.md:39`, `CONTRIBUTING.zh-CN.md:38`, `CONTRIBUTING.zh-CN.md:39` |
| 8 | `docs/active_context.md` 顶部入口已改为 Phase 12 后的真实口径 | ✓ VERIFIED | `docs/active_context.md:3`, `docs/active_context.md:4`, `docs/active_context.md:5`, `docs/active_context.md:6` |
| 9 | Phase 10 的历史 evidence 以 correction note 收口，而不是继续裸露输出旧结论 | ✓ VERIFIED | `.planning/phases/10-macos-e2e/10-02-SUMMARY.md:33`, `.planning/phases/10-macos-e2e/10-02-SUMMARY.md:42`, `.planning/phases/10-macos-e2e/10-02-SUMMARY.md:45`, `.planning/phases/10-macos-e2e/10-03-SUMMARY.md:37`, `.planning/phases/10-macos-e2e/10-03-SUMMARY.md:46`, `.planning/phases/10-macos-e2e/10-03-SUMMARY.md:49`, `.planning/phases/10-macos-e2e/10-VERIFICATION.md:17`, `.planning/phases/10-macos-e2e/10-VERIFICATION.md:20` |
| 10 | ROADMAP / REQUIREMENTS / audit 明确区分：Phase 12 关闭的是 v1 drift，`E2E-02` full-matrix 继续 deferred 到 v2 | ✓ VERIFIED | `.planning/ROADMAP.md:211`, `.planning/ROADMAP.md:212`, `.planning/ROADMAP.md:214`, `.planning/ROADMAP.md:218`, `.planning/REQUIREMENTS.md:55`, `.planning/REQUIREMENTS.md:72`, `.planning/REQUIREMENTS.md:88`, `.planning/v1.0-MILESTONE-AUDIT.md:33`, `.planning/v1.0-MILESTONE-AUDIT.md:71`, `.planning/v1.0-MILESTONE-AUDIT.md:79` |
| 11 | `STATE.md` 已用最终更正语义表达 Phase 10 结果，并把下一步入口指向 audit / milestone close | ✓ VERIFIED | `.planning/STATE.md:81`, `.planning/STATE.md:82`, `.planning/STATE.md:83`, `.planning/STATE.md:96`, `.planning/STATE.md:97`, `.planning/STATE.md:107`, `.planning/STATE.md:108`, `.planning/STATE.md:112`, `.planning/STATE.md:113` |
| 12 | milestone audit 已不再把 macOS gate drift 视为 blocker，仅保留 v2 deferred / tech debt | ✓ VERIFIED | `.planning/v1.0-MILESTONE-AUDIT.md:4`, `.planning/v1.0-MILESTONE-AUDIT.md:33`, `.planning/v1.0-MILESTONE-AUDIT.md:75`, `.planning/v1.0-MILESTONE-AUDIT.md:77`, `.planning/v1.0-MILESTONE-AUDIT.md:80`, `.planning/v1.0-MILESTONE-AUDIT.md:85` |

## Required Artifacts

| Artifact | 用途 | 结果 | 说明 |
|---|---|---|---|
| `scripts/verify-local-gate.mjs` | 本地 gate 真实行为定义 | ✓ EXISTS + ALIGNED | 帮助文本、默认路径、experimental 开关与 skip 提示均一致。 |
| `scripts/README.md` | 脚本级说明 | ✓ EXISTS + ALIGNED | 与脚本行为一一对应。 |
| `.github/workflows/ci-gate.yml` | CI gate 职责边界 | ✓ EXISTS + ALIGNED | 明确 Windows-only blocking smoke。 |
| `.github/workflows/release-build.yml` | Release gate 职责边界 | ✓ EXISTS + ALIGNED | 明确 Windows quality gate / macOS bundle-only。 |
| `README.md` / `README.zh-CN.md` | 面向用户的公开说明 | ✓ EXISTS + ALIGNED | 中英文都写清 macOS experimental / non-blocking。 |
| `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md` | 贡献者流程说明 | ✓ EXISTS + ALIGNED | 本地验证、CI、Release 边界一致。 |
| `docs/active_context.md` | 短期记忆入口 | ✓ EXISTS + ALIGNED | 顶部 bullets 已收敛到最终现实。 |
| `.planning/ROADMAP.md` / `.planning/REQUIREMENTS.md` / `.planning/STATE.md` / `.planning/v1.0-MILESTONE-AUDIT.md` | planning / traceability / audit 口径 | ✓ EXISTS + ALIGNED | 已明确 v1 drift close / v2 deferred 边界。 |
| `.planning/phases/10-macos-e2e/10-02-SUMMARY.md` / `.planning/phases/10-macos-e2e/10-03-SUMMARY.md` / `.planning/phases/10-macos-e2e/10-VERIFICATION.md` | 历史 evidence | ✓ EXISTS + ALIGNED | 保留原记录，同时显式挂上 Phase 12 correction note。 |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `scripts/README.md` | `scripts/verify-local-gate.mjs` | `verify:local` usage / flags | ✓ WIRED | 文档与实现都保留 `--macos-desktop-e2e-experimental` / `ZAPCMD_E2E_EXPERIMENTAL_MACOS` 兼容入口。 |
| `.github/workflows/ci-gate.yml` | `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md` | CI Gate responsibilities | ✓ WIRED | 都明确 CI 中只有 Windows desktop smoke 是阻断桌面门禁。 |
| `.github/workflows/release-build.yml` | `README.md` / `README.zh-CN.md` | release gate description | ✓ WIRED | 都明确 Windows release quality gate 含 desktop smoke，macOS 仅参与 bundle。 |
| `README.md` / `README.zh-CN.md` | `docs/active_context.md` | public wording ↔ current short-term memory | ✓ WIRED | 公开文档与短期记忆对 macOS experimental / non-blocking 的表述一致。 |
| `.planning/phases/10-macos-e2e/10-02-SUMMARY.md` / `.planning/phases/10-macos-e2e/10-03-SUMMARY.md` / `.planning/phases/10-macos-e2e/10-VERIFICATION.md` | `.planning/v1.0-MILESTONE-AUDIT.md` | Phase 12 correction note | ✓ WIRED | 历史结论已显式指向 Phase 12 更正后的 repo reality。 |
| `.planning/REQUIREMENTS.md` | `.planning/v1.0-MILESTONE-AUDIT.md` | `E2E-02` deferred traceability | ✓ WIRED | 两处都把 full-matrix 目标保留在 v2 / tech debt。 |
| `.planning/ROADMAP.md` | `.planning/STATE.md` | Phase 12 completion / next action | ✓ WIRED | ROADMAP 的 drift-close 目标与 STATE 的当前现实 / 下一步入口一致。 |

## Previously Reported Gaps Closed

1. **`docs/active_context.md` 顶部旧 bullets 已关闭**  
   旧报告指出该文件顶部仍保留会误导当前读者的旧现实。现在 `docs/active_context.md:3` 到 `docs/active_context.md:6` 已直接改写为最终口径，且与 `docs/active_context.md:10` 到 `docs/active_context.md:12` 不再冲突。

2. **`.planning/STATE.md` 中旧 Phase 10 bullets 已关闭**  
   旧报告指出 `.planning/STATE.md` 仍把 Phase 10 旧结论当作 completed bullets 暴露。现在 `.planning/STATE.md:81` 到 `.planning/STATE.md:83` 已明确写成“最终口径已由 Phase 12 更正 / 收敛”的语义，与 `.planning/STATE.md:96` 到 `.planning/STATE.md:113` 的现状结论一致。

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| `E2E-02 (partial: macOS gate only)` | 12-01 / 12-02 / 12-03 / 12-04 | v1 中收敛 macOS gate traceability，明确 full-matrix 目标继续 deferred 到 v2 | ✓ VERIFIED | 脚本、workflow、README/CONTRIBUTING、active context、STATE、ROADMAP、REQUIREMENTS、milestone audit 与 Phase 10 correction notes 全部对齐。 |

## Anti-Patterns Found

None blocking.

说明：反向扫描仍能在 Phase 10 的历史 summary / verification 中找到旧结论文本，但这些条目现在都带有显式 correction note / `phase12-correction` frontmatter，属于保留原始执行记录后的可审计更正，不再构成当前 repo reality 的漂移。

## Gaps Summary

None.

**Phase 12 已真正达成目标，可以诚实地标记为 `passed`。** 当前仓库对 macOS desktop smoke 的所有关键入口都收敛到同一现实：

- Windows desktop smoke = 唯一 blocking desktop gate；
- macOS desktop smoke = experimental / non-blocking probe；
- `E2E-02` full-matrix = v2 deferred / tech debt，而非当前 v1 blocker。

## Human Verification Required

None.

本次 `passed` 结论可由静态文本证据、workflow 文件、脚本实现与最小自动化命令共同支撑，不依赖额外人工 runtime 验证。

## Verification Metadata

**Verification approach:** Goal-backward（以 Phase 12 Goal 与 `12-01`~`12-04` frontmatter must_haves 反推）  
**Must-haves source:** `.planning/phases/12-macos-e2e-gate-alignment/12-01-PLAN.md`, `.planning/phases/12-macos-e2e-gate-alignment/12-02-PLAN.md`, `.planning/phases/12-macos-e2e-gate-alignment/12-03-PLAN.md`, `.planning/phases/12-macos-e2e-gate-alignment/12-04-PLAN.md`  
**Primary evidence reviewed:** 用户要求的 28 个输入文件已按顺序读取；核心证据来自脚本、workflow、README / CONTRIBUTING、`docs/active_context.md`、`ROADMAP.md`、`REQUIREMENTS.md`、`STATE.md`、`v1.0-MILESTONE-AUDIT.md`、以及 Phase 10 / 12 summaries & verification。  
**Automated checks:**
- `node scripts/verify-local-gate.mjs --help`
- `node scripts/verify-local-gate.mjs --dry-run`
- `node -e "Object.defineProperty(process,'platform',{value:'darwin'}); process.argv=['node','scripts/verify-local-gate.mjs','--dry-run']; import('./scripts/verify-local-gate.mjs');"`
- `node -e "Object.defineProperty(process,'platform',{value:'darwin'}); process.argv=['node','scripts/verify-local-gate.mjs','--macos-desktop-e2e-experimental','--dry-run']; import('./scripts/verify-local-gate.mjs');"`
- 多轮 `Select-String` / 定向行号核对 / 反向扫描旧口径（含 `desktop-e2e-smoke-macos`、`macOS 默认执行 desktop smoke`、`CI/Release 均含 macOS` 等模式）
**Human checks required:** 0

---
*Verified: 2026-03-06T23:35:31.9238922+08:00*  
*Verifier: Codex (main context)*
