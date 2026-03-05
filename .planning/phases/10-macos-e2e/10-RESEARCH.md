# Phase 10: 补齐 macOS 桌面端 E2E 冒烟 - Research

**研究日期:** 2026-03-05  
**研究目标:** 为 Phase 10 规划提供可直接执行的技术方案、风险闸门与验证口径  
**整体置信度:** MEDIUM（关键不确定性来自上游对 macOS 桌面 WebDriver 的支持状态）

<user_constraints>
## User Constraints (from 10-CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Linux 桌面端 E2E 冒烟（driver 选择与稳定性策略）作为后续独立阶段处理。
- 在桌面冒烟中扩展更多业务链路（如命令执行/会话恢复）作为后续增强，不并入本阶段。
</user_constraints>

## 现状基线（仓库已确认）

1. `scripts/e2e/desktop-smoke.cjs` 当前**硬编码 Windows**：
   - 非 Windows 直接失败退出；
   - native driver 仅探测 `msedgedriver(.exe)`；
   - 默认应用路径为 `src-tauri/target/debug/zapcmd.exe`。
2. `scripts/verify-local-gate.mjs` 当前仅在 Windows 执行桌面冒烟，非 Windows 默认跳过。
3. `.github/workflows/ci-gate.yml` 仅 `desktop-e2e-smoke`（Windows）执行桌面冒烟；`macos-latest` 只跑 cross-platform smoke（无桌面 E2E）。
4. `.github/workflows/release-build.yml` 仅 Windows `quality-gate` 跑桌面冒烟，macOS 只参与 bundle。
5. 文档（`README*`、`CONTRIBUTING*`、`scripts/README.md`）当前文案均为“Windows 桌面冒烟”。

## 可行性结论（规划前必须先过）

### 结论 A：当前实现层面“未支持 macOS”是事实
- 来自仓库代码的直接证据：桌面 smoke 与本地 gate 均把非 Windows 视为跳过/失败分支，不具备 macOS 路径。

### 结论 B：macOS runner 具备 Safari/SafariDriver 基础环境
- GitHub Actions macOS 14 镜像软件清单包含 Safari 与 SafariDriver，可作为 CI 侧前置基础。

### 结论 C（关键风险）：Tauri 官方文档声明 macOS 桌面 WebDriver 受限
- Tauri v2 官方文档指出：桌面 WebDriver 测试当前仅覆盖 Windows 与 Linux，原因是缺少针对 macOS `WKWebView` 的原生 driver。
- 这与“`tauri-driver + safaridriver` 直接打通 macOS 桌面冒烟”的目标存在冲突风险。

**规划含义（必须采纳）：**  
Phase 10 第一任务必须是“可行性闸门（PoC）”：在 macOS 上验证 `tauri-driver` 能否创建会话并驱动现有 smoke 流程。PoC 未通过时，不应继续推进大规模脚本/CI 改造，避免无效实现。

## 技术决策（供 PLAN 直接落任务）

### D1. `desktop-smoke.cjs` 改为“平台画像”实现（不拆多脚本）
- 保持单入口，新增 `platformProfile`：
  - `win32`：沿用 `msedgedriver` 逻辑；
  - `darwin`：新增 `safaridriver` 探测与错误指引；
  - 其他平台：保持明确失败（非静默 pass）。
- 保持统一产物目录 `.tmp/e2e/desktop-smoke/` 与现有断言流程（启动→搜索→抽屉→Esc）。

### D2. 预检策略：先探测后执行，失败即阻断
- 统一预检顺序：`tauri-driver` → native driver → app 路径。
- 每一步失败都输出“可执行修复命令/指引”，并以非 0 退出。
- 不引入静默回退，不在本 phase 新增 Linux/多场景支持。

### D3. app 路径策略必须跨平台
- 保留 `ZAPCMD_E2E_APP_PATH` 最高优先级；
- 默认路径按平台区分：
  - Windows：`src-tauri/target/debug/zapcmd.exe`
  - macOS：优先尝试 `src-tauri/target/debug/zapcmd`（必要时补充候选路径探测）
- 错误文案中给出对应平台的构建提示（仍基于 `npm run tauri:build:debug`）。

### D4. `verify-local-gate.mjs` 行为收敛到“Windows + macOS 默认都跑”
- `npm run verify:local`：在 macOS 默认执行桌面 smoke（与 CONTEXT 锁定决策一致）。
- Windows 保留自动安装流程；macOS 以“探测 + 明确指引 + 失败退出”为主（不在本 phase 扩展自动安装脚本）。
- 保留 `--skip-e2e`/`--e2e-only` 等已有调试入口，避免破坏现有使用习惯。

### D5. CI/Release 门禁采用“并列阻断 job”，不降级现有强度
- `ci-gate.yml`：新增 macOS desktop smoke 阻断 job（或扩展为 os 矩阵，但需保证失败可定位）。
- `release-build.yml`：在 bundle 前补齐 macOS desktop smoke 阻断，复用同一 smoke 逻辑。
- artifacts 继续上传 `.tmp/e2e/desktop-smoke/`，建议按 OS 分开命名，避免覆盖。

## 风险清单（供规划时转为验收项）

1. **R1 / 高风险：上游能力冲突**
   - 现象：`tauri-driver + safaridriver` 在 macOS 可能无法创建会话。
   - 缓解：把“PoC 会话建立成功”设为 Phase 10 首个硬门槛；不通过则停止后续实现并回写结论。

2. **R2 / 中高风险：macOS 运行前置条件差异**
   - 现象：本地/CI 对 Safari 自动化权限、系统配置要求不同，可能导致 flaky 或直接失败。
   - 缓解：在脚本中增加明确 preflight 日志，失败时输出固定诊断步骤，避免“看日志猜问题”。

3. **R3 / 中风险：构建产物路径在 macOS 不一致**
   - 现象：debug 产物位置/文件名差异导致 smoke 启动失败。
   - 缓解：引入平台候选路径探测 + `ZAPCMD_E2E_APP_PATH` 覆盖；将最终选中路径写入 e2e 日志。

4. **R4 / 中风险：CI 时间与稳定性回归**
   - 现象：新增 macOS 桌面冒烟后，CI 耗时与失败率上升。
   - 缓解：保留最小断言口径、不加重业务流程；job 超时与日志产物保持与 Windows 一致，便于定位。

## 验证建议（规划可直接转为 DoD）

### 本地验证（macOS）
1. `npm run verify:local -- --skip-e2e`：应只跑质量门禁并通过。
2. `npm run verify:local`（前置满足）：应执行桌面 smoke 并通过。
3. 刻意制造前置缺失（如 native driver 不可用）：应失败退出，且日志给出可执行修复指引。

### 脚本验证（跨平台）
1. Windows 现有 smoke 路径必须保持可用（防回归）。
2. macOS 新路径成功时，断言口径与 Windows 完全一致（启动→搜索→抽屉→Esc）。
3. 失败时 `.tmp/e2e/desktop-smoke/` 至少包含 `e2e.log`，并尽可能包含 `tauri-driver.log`/截图。

### CI/Release 验证
1. PR/Push：macOS desktop smoke job 失败必须阻断合并。
2. Release：macOS desktop smoke 失败必须阻断后续 bundle/publish。
3. artifact 上传路径保持 `.tmp/e2e/desktop-smoke/`，OS 维度可区分命名但不改目录结构。

## 范围守卫（防止 phase 膨胀）

- 不扩展到 Linux 桌面 E2E。
- 不扩展业务断言范围（保持最小 smoke 口径）。
- 不引入新的 E2E 框架替换（继续基于现有 `tauri-driver + selenium-webdriver` 链路验证）。

## 外部依据（关键结论来源）

- Tauri v2 WebDriver 文档（支持矩阵与 macOS 限制）：https://v2.tauri.app/develop/tests/webdriver/
- GitHub Actions macOS 14 runner 软件清单（含 Safari/SafariDriver）：https://raw.githubusercontent.com/actions/runner-images/main/images/macos/macos-14-Readme.md

## RESEARCH COMPLETE

