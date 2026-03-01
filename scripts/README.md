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
