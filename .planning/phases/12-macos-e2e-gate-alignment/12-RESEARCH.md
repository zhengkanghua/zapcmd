# Phase 12: macOS 桌面冒烟门禁与口径收敛 - Research

**研究日期:** 2026-03-06  
**研究目标:** 为 Phase 12 重新生成可执行计划，基于官方支持现状与仓库真实实现，收敛 macOS desktop smoke 的本地、CI / Release、规划文档与历史证据口径。  
**整体置信度:** HIGH（关键判断同时来自官方主文档与仓库现状；唯一不确定项在于未来上游是否改变对 macOS / WKWebView 的支持）

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| E2E-02 | Windows/macOS/Linux 全矩阵桌面端自动化 E2E 覆盖（长期目标，当前 traceability 中额外挂了 `partial: macOS gate only` 子项） | 官方 Tauri WebDriver 文档当前只支持 Windows / Linux；本阶段应关闭“v1 中误把 macOS blocking gate 当作已交付能力”的口径漂移，而不是强推一个上游尚不支持的 gate。 |
</phase_requirements>

## 官方与仓库现状

### 1. 官方能力边界（最新）
1. Tauri v2 官方 WebDriver 文档当前明确写明：桌面 WebDriver 测试支持 **Windows 与 Linux**，**macOS 不受支持**，原因是当前缺少自动化 `WKWebView` 的工具。  
2. GitHub Actions 的 macOS runner 确实自带 Safari / SafariDriver，但这只说明它能自动化 Safari；并不能把 SafariDriver 等同为 Tauri / WKWebView 的稳定桌面自动化方案。  
3. 因此，“恢复 macOS desktop smoke 为默认 blocking gate”与官方支持边界冲突，风险不是实现细节，而是目标本身失真。

### 2. 仓库当前真实行为
1. `scripts/verify-local-gate.mjs` 当前保持：**Windows 默认执行 blocking desktop smoke；macOS 默认只跑 quality gate；如需试探 macOS，必须显式使用 experimental 开关。**
2. `.github/workflows/ci-gate.yml` 当前保持：Windows desktop smoke 为真实阻断；macOS / Linux 只在 `cross-platform-smoke` 中执行 build/test/rust smoke。  
3. `.github/workflows/release-build.yml` 当前保持：Windows `quality-gate` 含 desktop smoke；macOS 只参与 bundle，不存在真实的 macOS desktop smoke release gate。  
4. `README.md`、`CONTRIBUTING.md` 已基本回到“macOS experimental / non-blocking”的口径。  
5. 但 `docs/active_context.md`、`.planning/ROADMAP.md`、`.planning/phases/10-macos-e2e/*`、`.planning/v1.0-MILESTONE-AUDIT.md` 之间仍混有一批旧口径，继续把 unsupported macOS gate 写成已实现或待恢复的 blocking 能力。

### 3. 当前 blocker 的根因
- 当前 blocker 不是“代码里完全没有 macOS 线索”，而是**Phase 10 / 12 的规划与总结文档把 unsupported 的能力写成了已交付或应交付的 v1 blocking gate**。  
- 只要这个错误前提不被纠正，Phase 12 就会不断把仓库拉向一个与官方能力边界冲突的方向。

## Sources

- Tauri v2 official docs: https://v2.tauri.app/develop/tests/webdriver/  
- GitHub Actions runner images (official): https://github.com/actions/runner-images/blob/main/images/macos/macos-14-Readme.md

## Standard Stack

- **本地 gate 入口:** `scripts/verify-local-gate.mjs`
- **桌面 smoke 入口:** `npm run e2e:desktop:smoke` → `scripts/e2e/desktop-smoke.cjs`
- **Windows blocking path:** `tauri-driver` + `msedgedriver`
- **macOS experimental probe path:** `tauri-driver` + `safaridriver`（仅试探性，不应宣称为稳定 blocking gate）
- **远端编排:** `.github/workflows/ci-gate.yml`、`.github/workflows/release-build.yml`
- **规划/审计来源:** `.planning/ROADMAP.md`、`.planning/REQUIREMENTS.md`、`.planning/STATE.md`、`.planning/v1.0-MILESTONE-AUDIT.md`

## Architecture Patterns

### 1. 先服从官方能力边界，再谈 gate 设计
- 文档、workflow、summary 必须基于**当前官方支持**来描述。
- 不能因为仓库里存在 `darwin` 代码分支，就把它上升为“稳定 blocking gate”。

### 2. 将“实验性探测”与“稳定阻断门禁”分层
- Windows desktop smoke = stable blocking gate。  
- macOS desktop smoke = experimental probe path。  
- 这两者可以共存，但绝不能在文档或规划里混成同一等级。

### 3. 历史证据要“纠偏”，不要“改写历史”
- 对 `.planning/phases/10-macos-e2e/*-SUMMARY.md`、`10-VERIFICATION.md` 的处理，应该是**追加更正 / superseded note**，而不是假装当时就没有 scope drift。  
- 这样既保留审计轨迹，也能让后来者读到正确现状。

### 4. Phase 12 的真实目标是“关掉漂移”，不是“强造 unsupported gate”
- 本阶段应完成：本地脚本说明、workflow 语义、README/CONTRIBUTING、active context、roadmap/requirements/state/audit、Phase 10 历史证据 全部收敛到同一现实。  
- 同时明确：**E2E-02 full matrix 仍是 v2 / deferred 能力，不是本阶段要偷偷补完的内容。**

## Don’t Hand-Roll

- 不要引入新的 macOS WebDriver / automation 框架去“补齐” WKWebView 自动化。  
- 不要把 SafariDriver 的存在误写成“macOS desktop smoke 已受支持”。  
- 不要重新打开或扩大 macOS blocking gate。  
- 不要把 `E2E-02` 写成 “v1 已完整完成”；它仍是长期目标。  
- 不要抹掉 Phase 10 旧 summary / verification 的历史内容；应追加 Phase 12 更正说明。

## Common Pitfalls

1. **只改 README，不改 planning artifacts**  
   用户入口正确了，但审计仍会被 Phase 10 summary / verification / roadmap / audit 自己打脸。

2. **只改 audit，不改原始证据**  
   审计文件会说“已收敛”，但 Phase 10 summary / verification 仍宣称 macOS gate 已阻断，后续会再次漂移。

3. **把 `E2E-02 (partial: macOS gate only)` 直接标成 Complete**  
   若不先重命名/澄清 traceability 子项，很容易被理解成“macOS blocking gate 已实现”。

4. **为追求一致而修改 workflow 语义**  
   这会再次把仓库推向 unsupported 方向。Phase 12 应以澄清、标注、对齐为主，而不是恢复不存在的 gate。

## Repo Evidence Map

- `scripts/verify-local-gate.mjs`：真实本地 gate 语义（Windows blocking / macOS experimental）
- `.github/workflows/ci-gate.yml`：真实 CI 语义（Windows desktop smoke + macOS/Linux build/test smoke）
- `.github/workflows/release-build.yml`：真实 release 语义（Windows quality gate 含 desktop smoke；macOS 仅 bundle）
- `README.md`、`CONTRIBUTING.md`：公开入口，当前大体已回到现实口径
- `docs/active_context.md`：仍混有“Phase 10 已纳入 macOS 阻断”之类旧记忆
- `.planning/phases/10-macos-e2e/10-02-SUMMARY.md`、`10-03-SUMMARY.md`、`10-VERIFICATION.md`：仍把 unsupported gate 记为已完成
- `.planning/v1.0-MILESTONE-AUDIT.md`：已识别 scope drift，但仍把它记为当前 blocker

## Recommended Plan Split

| Plan | Wave | Focus | Why |
|------|------|-------|-----|
| `12-01` | 1 | 固化本地 experimental 口径与脚本文档 | 锁住本地入口，避免再出现 “默认执行 / experimental” 混写 |
| `12-02` | 1 | 澄清 CI/Release workflow 的真实职责边界 | 让 workflow 本身也表达“Windows blocking、macOS/Linux build/test smoke” |
| `12-03` | 2 | 对齐公开文档与 Phase 10 历史证据 | 关闭 README/CONTRIBUTING/active_context/summary/verification 漂移 |
| `12-04` | 3 | 收敛 roadmap / requirements / state / audit | 将 blocker 关闭为“口径收敛完成、能力继续 deferred” |

## Validation Path

### Local
- `node scripts/verify-local-gate.mjs --help`
- `node scripts/verify-local-gate.mjs --dry-run`
- `node scripts/verify-local-gate.mjs --macos-desktop-e2e-experimental --dry-run`

### Workflow / Docs
- 静态检查 `.github/workflows/ci-gate.yml` 与 `.github/workflows/release-build.yml` 的 job/step 命名和说明是否明确表达 Windows-only blocking smoke
- 核对 `README*`、`CONTRIBUTING*`、`scripts/README.md`、`docs/active_context.md` 是否都一致描述为 macOS experimental / non-blocking
- 核对 `10-02-SUMMARY.md`、`10-03-SUMMARY.md`、`10-VERIFICATION.md` 是否追加 Phase 12 更正说明

### Planning Closure
- 核对 `.planning/ROADMAP.md` 是否不再把 Phase 12 计划描述成“恢复 macOS 阻断”
- 核对 `.planning/REQUIREMENTS.md` 是否把 v1 traceability 子项与 v2 full-matrix 目标区分开
- 核对 `.planning/v1.0-MILESTONE-AUDIT.md` 是否把 macOS gate blocker 转为 deferred / tech debt 结论，而非继续保留为当前 blocker

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| 官方支持边界判断 | HIGH | 直接来自 Tauri 官方当前文档 |
| 仓库当前真实行为判断 | HIGH | 直接来自脚本、workflow、README、audit 与 planning artifacts |
| 新 Phase 12 执行方向 | HIGH | 能关闭 blocker 且不与官方支持边界冲突 |
| 后续里程碑 closure 风险 | MEDIUM | 取决于 execution 是否把 traceability / audit 的措辞处理得足够精确 |

## Open Questions

- `.planning/REQUIREMENTS.md` 的 v1 traceability 行在 execution 时是直接重命名并标记 `Complete`，还是保留 `Pending` 但在备注中明确 “moved to deferred / no longer blocker”；需要执行时选一个最少歧义的方案。  
- 若后续 Tauri 官方开始支持 macOS / WKWebView WebDriver，应新开后续 phase，而不是回头重写 Phase 12 的“现实对齐”结论。

## RESEARCH COMPLETE

研究完成。Phase 12 不应再尝试“恢复 unsupported 的 macOS blocking gate”，而应改为：**基于官方支持边界，收敛本地脚本、workflow、公开文档、历史证据和 planning 状态，让 macOS 明确回到 experimental / deferred 口径。**