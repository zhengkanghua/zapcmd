# 脚本

## 1. 同步脚本 `scripts/sync-keys.mjs`

新增脚本，职责：读取 `.env.keys` 并将值注入到以下位置：

| 目标文件 | 注入内容 |
|----------|----------|
| `src-tauri/tauri.conf.json` | `plugins.updater.pubkey` ← `TAURI_UPDATER_PUBKEY` |
| `src-tauri/tauri.conf.json` | `plugins.updater.endpoints[0]` ← `UPDATER_ENDPOINT` |

**运行方式**：
```bash
node scripts/sync-keys.mjs
```

可集成到现有 `npm run version:sync` 或 `tauri:dev` / `tauri:build` 前置钩子中。

## 2. 本地验证脚本 `scripts/verify-local-gate.mjs`

职责：将本地“质量门禁 + 桌面端 E2E 冒烟”串成一条命令，方便贡献者与维护者对齐 CI 验证口径。

平台口径：

- **Windows**：`npm run verify:local` 会先跑 `npm run check:all`，再执行 blocking 的 `npm run e2e:desktop:smoke`，最后运行 `npm run test:visual:ui` 作为本机 `non-blocking compare`。
- **WSL**：`npm run verify:local` 会先跑 `npm run check:all`，跳过桌面 smoke，但会执行 `npm run test:visual:ui` 作为本机 `non-blocking compare`，由 WSL 工作区桥接到 Windows Edge 做截图。
- **macOS**：`npm run verify:local` 默认只跑 `npm run check:all`，**不会**把 desktop smoke 当作默认 blocking gate。
- **macOS experimental**：仅在显式传入 `--macos-desktop-e2e-experimental`，或设置兼容环境变量 `ZAPCMD_E2E_EXPERIMENTAL_MACOS=1` 时，才手动探测 desktop smoke；该路径仅用于实验性探测，不代表稳定 gate。

默认执行：

```bash
npm run verify:local
```

本地贴近 CI 的静态前置检查：

```bash
npm run check:ci-parity
```

当前覆盖：
- builtin command 生成产物是否同步提交
- workflow / gate 合同测试

注意：Windows-only 的 desktop smoke 与 controlled-runner 仍然无法在 Linux/WSL 上完全等价复现。

说明：在 Windows 上会自动检测 `tauri-driver` / `msedgedriver`，缺失时先补装再继续执行。
在 WSL 上，视觉回归默认复用当前 Linux worktree 的 `dist` 与 baseline，并调用 Windows `msedge.exe` / `pwsh.exe` 完成截图与 diff。
在 macOS 上，只有显式启用 experimental probe 时才会预检 `tauri-driver` / `safaridriver`；前置不满足时直接失败并给出修复指引。
`npm run verify:local` 默认不会因为本机 visual mismatch 非零退出；失败只会保留 warning 和 artifact 路径，供 compare/诊断使用。

Windows 显式预装模式（每次都先执行驱动安装）：

```bash
npm run verify:local -- --install-webdriver
```

macOS experimental probe：

```bash
npm run verify:local -- --macos-desktop-e2e-experimental
```

macOS 兼容环境变量入口：

```bash
ZAPCMD_E2E_EXPERIMENTAL_MACOS=1 npm run verify:local
```

macOS experimental 常见前置命令：

```bash
cargo install tauri-driver --locked
safaridriver --enable
```

> 注意：以上 macOS 路径仅用于手动试验 unsupported / experimental 探测，不应视为默认 blocking gate。

### 2.1 视觉回归模式

```bash
npm run test:visual:ui
npm run test:visual:ui:runner
npm run test:visual:ui:update:runner
```

- `npm run test:visual:ui` = 开发机本机 compare / diagnose 入口
- `npm run test:visual:ui:runner` = 唯一 blocking visual gate
- `npm run test:visual:ui:update:runner` = 唯一允许更新 `controlled-runner` baseline 的入口
- Linux：默认走 Linux Chromium smoke（baseline 位于 `scripts/e2e/visual-baselines/linux-chromium/`）

### 2.2 Windows baseline 与跨设备诊断口径

- blocking visual gate 只来自 `controlled-runner`，baseline 目录为 `scripts/e2e/visual-baselines/controlled-runner/`。
- `WSL` 默认桥接到 Windows Edge，本质上是在复用同一套 `controlled-runner` baseline 做 compare；如果 `WSL` 跑出 mismatch，优先按“Windows 渲染环境差异”处理，而不是把它当作独立 Linux baseline 漂移。
- `Linux` 使用独立的 `linux-chromium` baseline，只用于开发期 smoke 反馈，不参与 Windows blocking baseline 判定。
- 本地 mismatch 不等价于最终 visual gate 失败。
- baseline 更新只能通过 `npm run test:visual:ui:update:runner` 在受控环境中完成；其他机器只做 compare，不直接 `--update`。
- 任何 Windows / WSL mismatch 回传必须至少包含：
  - `.tmp/e2e/visual-regression/**/environment.json`
  - `.tmp/e2e/visual-regression/**/*.browser.log`
  - `npm run build` 与 `npm run test:visual:ui` 的控制台输出

显式模式：

```bash
npm run test:visual:ui:wsl-bridge
npm run test:visual:ui:linux
```

仅预览将执行的命令（不实际执行）：

```bash
npm run verify:local -- --dry-run
```
