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

- **Windows**：`npm run verify:local` 会先跑 `npm run check:all`，再执行默认 blocking 的 `npm run e2e:desktop:smoke`。
- **macOS**：`npm run verify:local` 默认只跑 `npm run check:all`，**不会**把 desktop smoke 当作默认 blocking gate。
- **macOS experimental**：仅在显式传入 `--macos-desktop-e2e-experimental`，或设置兼容环境变量 `ZAPCMD_E2E_EXPERIMENTAL_MACOS=1` 时，才手动探测 desktop smoke；该路径仅用于实验性探测，不代表稳定 gate。

默认执行：

```bash
npm run verify:local
```

说明：在 Windows 上会自动检测 `tauri-driver` / `msedgedriver`，缺失时先补装再继续执行。
在 macOS 上，只有显式启用 experimental probe 时才会预检 `tauri-driver` / `safaridriver`；前置不满足时直接失败并给出修复指引。

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

仅预览将执行的命令（不实际执行）：

```bash
npm run verify:local -- --dry-run
```
