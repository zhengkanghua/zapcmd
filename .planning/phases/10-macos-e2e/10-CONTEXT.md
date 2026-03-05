# Phase 10: 补齐 macOS 桌面端 E2E 冒烟 - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

为现有桌面端最小冒烟链路补齐 macOS 支持，使 `npm run verify:local` 与 CI Gate 在 macOS 上都能执行并阻断失败。  
本阶段聚焦“与 Windows 现有 smoke 用例对齐”的可执行性与稳定性，不扩展到 Linux 桌面 E2E 或更大范围场景扩展。

</domain>

<decisions>
## Implementation Decisions

### macOS WebDriver 路线
- macOS 桌面冒烟以 `safaridriver` 为优先/默认 native driver。
- 脚本需在 macOS 上自动探测 driver，可用时直接接入 `tauri-driver`。
- 若 driver 不可用，必须快速失败并给出可执行的修复提示（不允许静默跳过）。

### CI 门禁级别
- macOS 桌面冒烟纳入 PR/Push 的强制门禁（与 Windows 一样阻断）。
- Release 前质量门禁继续复用同一套桌面冒烟验证逻辑。
- 失败产物继续统一落在 `.tmp/e2e/desktop-smoke/` 并上传。

### 本地验证命令行为
- `npm run verify:local` 在 macOS 默认尝试执行桌面冒烟，不需要额外开关。
- 非满足运行前置条件时，输出明确指引并返回失败状态码。
- 继续保留现有参数化入口（如 `--skip-e2e`）用于调试与应急。

### 冒烟覆盖口径
- 继续沿用最小稳定路径：启动应用 → 搜索 → 结果抽屉出现 → `Esc` 关闭并清空输入。
- 不在本阶段增加更重的业务流程断言，优先保证跨平台稳定可回归。

### Claude's Discretion
- 是否引入 `safaridriver` 缺失时的可选回退策略（如提示后退出 vs 未来补充双驱动回退）。
- macOS 预检细节（探测命令、日志文案、超时阈值）的实现方式。
- CI job 命名与组织方式（独立 job 或矩阵扩展）在不改变门禁强度前提下可调整。

</decisions>

<specifics>
## Specific Ideas

- 贡献者在 macOS 上应能直接通过 `npm run verify:local` 做到“本地先过再提 PR”。
- CI 与本地保持相同 smoke 场景，减少“本地绿、CI 红”的偏差。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/e2e/desktop-smoke.cjs`: 已有 Selenium + `tauri-driver` 冒烟主流程与日志/截图落盘。
- `scripts/verify-local-gate.mjs`: 已有本地质量门禁编排与平台分支逻辑，可扩展 macOS 分支。
- `scripts/e2e/install-msedgedriver.ps1`: Windows driver 安装链路可作为“平台专用预检/安装”模式参考。

### Established Patterns
- 桌面 E2E 失败诊断产物统一写入 `.tmp/e2e/desktop-smoke/`。
- CI 现有 Windows 桌面冒烟采用“先装 driver，再跑 smoke，再上传产物”的固定结构。
- 本地 `verify:local` 默认覆盖 `check:all` +（平台允许时）桌面冒烟。

### Integration Points
- `package.json`：`e2e:desktop:smoke` 与 `verify:local` 是主要入口。
- `.github/workflows/ci-gate.yml`、`.github/workflows/release-build.yml`：需补齐/对齐 macOS 冒烟门禁。
- `README*.md`、`CONTRIBUTING*.md`、`scripts/README.md`：需同步 macOS 本地与 CI 用法。

</code_context>

<deferred>
## Deferred Ideas

- Linux 桌面端 E2E 冒烟（driver 选择与稳定性策略）作为后续独立阶段处理。
- 在桌面冒烟中扩展更多业务链路（如命令执行/会话恢复）作为后续增强，不并入本阶段。

</deferred>

---

*Phase: 10-macos-e2e*
*Context gathered: 2026-03-05*
