# Runtime Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复本轮审查中已定位的两个真实运行时问题，并保留可复现测试作为回归保护。

**Architecture:** 聚焦 Launcher 运行时的两个边界缺陷：搜索焦点调度的生命周期清理，以及搜索结果列表的错误复用。先用失败测试锁定行为，再以最小实现修复，最后补跑定向验证，避免把审查结论停留在主观判断。

**Tech Stack:** Vue 3 Composition API, Vitest, TypeScript

---

## Chunk 1: Search Focus Lifecycle

### Task 1: 为 `useSearchFocus` 补生命周期取消回归

**Files:**
- Modify: `src/composables/__tests__/launcher/useSearchFocus.test.ts`
- Modify: `src/composables/launcher/useSearchFocus.ts`

- [ ] **Step 1: 写失败测试，证明 scope 销毁后不会继续保留待执行 focus 调度**

```ts
it("cancels pending scheduled focus when scope is disposed", () => {
  // 创建 effectScope + 手动调度器，先触发 schedule，再 stop scope，
  // 断言取消函数被调用，且后续 callback 不会再触发 focus。
});
```

- [ ] **Step 2: 运行定向测试并确认 RED**

Run: `npm run test:run -- src/composables/__tests__/launcher/useSearchFocus.test.ts`
Expected: 新增用例失败，原因是当前实现没有在 scope dispose 时取消待执行调度。

- [ ] **Step 3: 以最小实现补生命周期取消与句柄清理**

```ts
// 记录当前调度句柄，新的 schedule 或 scope dispose 时统一取消。
// requestAnimationFrame / setTimeout 走同一套取消入口，避免卸载后残留回调。
```

- [ ] **Step 4: 重新运行定向测试并确认 GREEN**

Run: `npm run test:run -- src/composables/__tests__/launcher/useSearchFocus.test.ts`
Expected: 全部通过。

## Chunk 2: Result Watcher Reset Semantics

### Task 2: 为 `useLauncherWatchers` 补“同长度不同结果集”回归

**Files:**
- Modify: `src/composables/__tests__/launcher/useLauncherWatchers.test.ts`
- Modify: `src/composables/launcher/useLauncherWatchers.ts`

- [ ] **Step 1: 写失败测试，证明结果集内容变化但长度相同时也要重置列表视图**

```ts
it("resets result list view state when filtered result identity changes with the same length", async () => {
  // 先注入一组结果，再替换成等长但不同 id 的结果，
  // 断言 activeIndex / scrollTop / ensureActiveResultVisible 仍会重置。
});
```

- [ ] **Step 2: 运行定向测试并确认 RED**

Run: `npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts`
Expected: 新增用例失败，原因是当前 watcher 只监听 `length`。

- [ ] **Step 3: 以最小实现改为监听结果集身份变化**

```ts
// 不再只监听 length，而是监听 filteredResults 引用变化，
// 保证 query 切换到另一组等长结果时也会正确清理旧 UI 状态。
```

- [ ] **Step 4: 重新运行定向测试并确认 GREEN**

Run: `npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts`
Expected: 全部通过。

## Chunk 3: Verification And Review Output

### Task 3: 汇总验证结果并更新短期记忆

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 跑本轮相关定向测试**

Run: `npm run test:run -- src/composables/__tests__/launcher/useSearchFocus.test.ts src/composables/__tests__/launcher/useLauncherWatchers.test.ts`
Expected: 目标回归全绿。

- [ ] **Step 2: 补充 `docs/active_context.md`**

```md
- 2026-04-22：运行时审查补修已覆盖 search focus 生命周期取消与等长结果集重置回归；对应 launcher 定向测试已通过。
```

- [ ] **Step 3: 交付审查结论**

输出：
- 已修复问题
- 暂未落地但建议处理的架构/可维护性问题
- 本轮验证范围与剩余风险
