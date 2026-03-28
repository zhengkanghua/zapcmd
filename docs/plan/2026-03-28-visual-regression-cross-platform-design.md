# 视觉回归跨平台方案设计

> 日期：2026-03-28
> 状态：Approved by user conversation

## 背景

当前仓库的截图级视觉回归只在 Windows 启用。`scripts/e2e/visual-regression.cjs` 在非 `win32` 平台会直接跳过，导致 WSL/Linux 开发环境无法在本地得到截图级反馈。

与此同时，产品最终主要面向 Windows，Linux 渲染结果不能直接替代 Windows/Edge 基线；否则会把字体、抗锯齿、系统依赖和浏览器差异混进同一套 baseline。

## 目标

1. 保持 Windows 渲染为最终 blocking visual gate。
2. 允许在 WSL 中直接触发 Windows Edge 截图，不需要额外维护一份 Windows checkout。
3. 提供 Linux smoke visual 模式，给 WSL/Linux 开发期快速发现布局或样式回归。
4. Linux baseline 与 Windows baseline 必须隔离，禁止混用。

## 非目标

1. 不把 Linux smoke 升级为发布口径的最终视觉门禁。
2. 不引入第二套前端 harness；继续复用现有 `visual.html` 与截图场景定义。
3. 不要求纯 Linux 主机默认具备可运行浏览器；若缺失则给出明确提示。

## 方案

### 方案 A：自动模式 + 平台分层基线（采用）

- `npm run test:visual:ui`
  - Windows: 继续走原生 Windows Edge + PowerShell diff
  - WSL: 走 WSL 构建 + Windows Edge / Windows PowerShell 桥接
  - Linux: 走 Linux 本地 Chromium-family 浏览器 smoke
- `npm run test:visual:ui:linux`
  - 显式强制 Linux smoke，便于在 WSL 中先做快检

### 关键设计点

1. **同一份代码源**
   - build、静态服务、baseline、actual 目录都来自 WSL 当前 worktree。
   - Windows 浏览器只负责访问 URL 并写截图。

2. **WSL 桥接**
   - 通过 `wslpath -w` 将 WSL 路径转成 `\\wsl.localhost\\<distro>\\...` 供 Windows `msedge.exe` / `pwsh.exe` 使用。
   - 静态服务在 WSL 中绑定 `0.0.0.0`，Windows 侧通过当前 WSL IP 访问，不使用 `127.0.0.1`。

3. **Linux smoke**
   - 允许使用 Linux `chromium` / `chromium-browser` / `google-chrome` / `microsoft-edge` 系列浏览器。
   - baseline 存放到 `scripts/e2e/visual-baselines/linux-chromium/`，与现有 Windows baseline 隔离。

4. **脚本拆分**
   - 将平台识别、路径转换、baseline 目录策略等抽到独立 helper 模块。
   - 入口脚本只保留 orchestration，便于测试并控制文件体积。

## 验收

1. 在 Windows 上，`npm run test:visual:ui` 继续可用。
2. 在 WSL 上，`npm run test:visual:ui` 不再直接跳过，而是进入 Windows 桥接模式。
3. 在 WSL 上，`npm run test:visual:ui:linux` 可尝试 Linux smoke；若缺浏览器，报错必须可操作。
4. 新增测试覆盖：
   - 模式判定
   - baseline/output 目录策略
   - WSL 地址与路径转换决策
5. 文档说明 `verify:local` 与视觉回归的最新平台口径。
