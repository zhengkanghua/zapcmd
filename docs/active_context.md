# 短期记忆（2026-03-05）

- 完成 Phase 10：桌面冒烟从 Windows 扩展到 Windows/macOS，`desktop-smoke.cjs` 增加平台画像与 macOS `safaridriver` 预检。
- `verify:local` 默认在 Windows/macOS 执行桌面冒烟；Windows 缺驱动自动补装，macOS 缺前置时给指引并失败退出。
- CI Gate 与 Release 门禁均新增 macOS desktop smoke 阻断，产物按平台上传，保持 `.tmp/e2e/desktop-smoke/`。
- Roadmap/State/Requirements 与 10-01~10-03 SUMMARY、10-VERIFICATION 已同步，Phase 10 验证状态为 `passed`。

## 补充（2026-03-05）

- macOS runner 上 `tauri-driver + safaridriver` 会话不稳定，已回退为实验能力，不再阻断 CI/Release。
- `verify:local` 默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 试验。
- 文档与工作流已统一：CI Gate 阻断项为 Windows quality + Windows desktop smoke + cross-platform smoke（macOS/Linux build+test）。

## 补充（流程文档分层）

- 贡献者共用节奏已沉淀到 `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`：日常开发、PR 门禁、触发矩阵统一口径。
- 维护者发布节奏集中到 `docs/.maintainer/work/release_runbook.md`：先 Dry Run 构建，再真实 Mac 人工冒烟，最后打 tag 正式发布。
