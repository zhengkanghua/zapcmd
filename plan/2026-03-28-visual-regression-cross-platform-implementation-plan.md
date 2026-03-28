# Visual Regression Cross-Platform Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `test:visual:ui` 支持 Windows 原生、WSL 桥接和 Linux smoke 三种运行口径，同时隔离 Linux baseline。

**Architecture:** 将视觉回归的环境探测、路径转换和目录策略抽成可测试 helper；入口脚本负责截图循环与错误汇总。Windows 继续保留现有 baseline 目录，Linux smoke 新增独立 baseline 子目录，避免跨平台像素污染。

**Tech Stack:** Node.js, Vitest, PowerShell, Chromium-family CLI screenshot, WSL interop

---

### Task 1: 设计可测试的运行时决策层

**Files:**
- Create: `scripts/e2e/visual-regression-lib.cjs`
- Test: `scripts/__tests__/visual-regression-lib.test.ts`

- [ ] **Step 1: 写失败测试，锁定运行模式与目录策略**
- [ ] **Step 2: 运行目标测试，确认当前实现缺少对应导出/行为**
- [ ] **Step 3: 实现最小 helper，提供模式判定、baseline/output 目录、WSL 服务地址决策**
- [ ] **Step 4: 重新运行目标测试，确认通过**

### Task 2: 改造视觉回归入口脚本

**Files:**
- Modify: `scripts/e2e/visual-regression.cjs`
- Reference: `scripts/e2e/visual-diff.ps1`
- Reference: `scripts/e2e/install-msedgedriver.ps1`

- [ ] **Step 1: 接入 helper，降低入口脚本体积**
- [ ] **Step 2: 为 Windows / WSL / Linux 选择对应浏览器与 diff 执行路径**
- [ ] **Step 3: 在 WSL 模式下把 screenshot/profile/baseline/actual 路径转换成 Windows 可访问路径**
- [ ] **Step 4: 在 Linux smoke 下切到独立 baseline/output 子目录**

### Task 3: 扩展 package scripts 与说明文档

**Files:**
- Modify: `package.json`
- Modify: `scripts/README.md`

- [ ] **Step 1: 新增显式 Linux smoke 脚本**
- [ ] **Step 2: 更新文档，说明 Windows native / WSL bridge / Linux smoke 的职责边界**

### Task 4: 验证与上下文更新

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 跑 focused Vitest，确认红绿循环完成**
- [ ] **Step 2: 运行 `node scripts/e2e/visual-regression.cjs --help` 等轻量自检（如实现支持）或直接运行脚本探针命令**
- [ ] **Step 3: 更新 `docs/active_context.md`，补充本次跨平台视觉回归支持摘要（200 字内）**
