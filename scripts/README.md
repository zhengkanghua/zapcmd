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

默认执行：

```bash
npm run verify:local
```

说明：在 Windows 上会自动检测 `tauri-driver` / `msedgedriver`，缺失时先补装再继续执行。

Windows 显式预装模式（每次都先执行驱动安装）：

```bash
npm run verify:local -- --install-webdriver
```
