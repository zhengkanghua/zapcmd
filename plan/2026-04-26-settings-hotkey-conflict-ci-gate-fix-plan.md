# 2026-04-26 Settings Hotkey Conflict CI Gate Fix Plan

## 背景
- CI 在 `src/__tests__/app.settings-hotkeys.test.ts` 的重复热键冲突用例上偶发失败。
- 本地单测、整文件测试与覆盖率单跑均可通过，现象更符合异步 UI/状态稳定时序抖动，而非热键冲突业务逻辑失效。

## 本轮子任务
1. 收紧回归测试：先等待第一次热键写入稳定，再触发第二次重复输入，并分别等待状态层与 DOM 冲突态稳定。
2. 补一个组件级双冲突断言，确保 `SettingsHotkeysSection` 能同时向两个 recorder 透传冲突提示。

## 验证
- `npm test -- src/__tests__/app.settings-hotkeys.test.ts`
- `npm test -- src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`
- 如通过，再跑 `npm run test:coverage -- src/__tests__/app.settings-hotkeys.test.ts src/components/settings/parts/__tests__/SettingsHotkeysSection.layout.test.ts`

## 后续待办
- 若 CI 仍偶发失败，再对 `useAppLifecycle` / `loadSettings` 初始化链路补竞态保护与更细粒度回归。
