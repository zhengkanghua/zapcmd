# 短期记忆（2026-03-05）

- 修复 desktop-e2e-smoke 驱动链路：改用 `msedgedriver.microsoft.com`，兼容 `LATEST_STABLE` 编码解析。
- `desktop-smoke.cjs` 支持自动发现本地 `msedgedriver.exe`，并通过 `--native-driver` 注入。
- `verify:local` 现支持 Windows 自动检测并补装缺失驱动后继续；强制预装可用 `--install-webdriver` 参数。
