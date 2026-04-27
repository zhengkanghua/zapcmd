# 项目审查问题收口计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 收口本轮项目审查中确认的 3 个真实问题：Launcher 屏幕尺寸计算不响应环境变化、Settings Commands 长列表渐进渲染仍保留不必要主线程开销、Command Catalog 在 locale/激活态切换时缺少统一异步错误收口。

**Architecture:** 保持现有外部交互 contract 不变，只修正内部响应式来源、调度策略与错误边界。前端继续采用小步 TDD：先补回归测试，再做最小实现，最后跑定向与全量门禁。

**Tech Stack:** Vue 3、Pinia、Vitest、TypeScript、Vite、项目自定义 guard

---

### Task 1: 修复 Launcher 尺寸计算的非响应式屏幕来源

**Files:**
- Modify: `src/composables/launcher/useLauncherLayoutMetrics.ts`
- Modify: `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`
- Modify: `src/composables/app/useAppLifecycle.ts`（如需把屏幕刷新挂到现有生命周期）

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试，确认 screen 尺寸变化后 metrics 不会刷新**
- [ ] **Step 3: 引入响应式屏幕尺寸来源，并接入现有 resize/focus 链路**
- [ ] **Step 4: 运行定向测试，确认刷新行为与旧 contract 同时成立**

### Task 2: 优化 Settings Commands 的渐进渲染与默认排序路径

**Files:**
- Modify: `src/composables/settings/useCommandManagement/rows.ts`
- Modify: `src/composables/settings/useCommandManagement/index.ts`
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试，确认当前实现依赖组件内 `setTimeout(0)` 递归推进**
- [ ] **Step 3: 将渐进调度下沉到 composable，改成可取消的 `requestAnimationFrame` 调度**
- [ ] **Step 4: 避免默认排序路径上的不必要数组复制/排序**
- [ ] **Step 5: 运行定向测试，确认渲染窗口 contract 不变**

### Task 3: 统一 Command Catalog 的异步刷新与错误收口

**Files:**
- Modify: `src/composables/launcher/useCommandCatalog/lifecycle.ts`
- Modify: `src/composables/launcher/useCommandCatalog/controller.ts`
- Modify: `src/composables/launcher/useCommandCatalog/requestGuard.ts`（如需扩展）
- Modify: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- Modify: `src/composables/__tests__/launcher/commandCatalogController.test.ts`

- [ ] **Step 1: 写失败测试**
- [ ] **Step 2: 运行定向测试，确认 locale/activated 切换场景下存在未统一收口的失败路径**
- [ ] **Step 3: 把 locale/activated 触发统一收敛到同一刷新入口，并确保 latest-only/错误状态一致**
- [ ] **Step 4: 运行定向测试，确认失败时不会留下未处理 rejection 或陈旧状态**

### Task 4: 验证与短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 更新短期记忆，补充本轮修复摘要**
- [ ] **Step 2: 运行定向测试、`lint`、`typecheck`、`test:coverage`、`build`、`check:rust`、`test:rust`**
- [ ] **Step 3: 记录实际验证结果与剩余风险**
