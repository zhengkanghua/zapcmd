---
phase: 17-2-3-in-panel-2-3-review-drawer-overlay
plan: "03"
type: execute
wave: 3
depends_on: ["17-01", "17-02"]
files_modified:
  - src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
  - src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
  - src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
  - src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "自动化回归覆盖 Phase 17 的关键不变量：Review 打开不改变窗口宽度；scrim 只覆盖内容区；关闭回焦搜索输入框。"
    - "测试断言可定位（失败输出清晰），不依赖肉眼判断，也不引入“假结果 DOM”。"
  artifacts:
    - path: src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
      provides: "断言 stagingExpanded 不会扩大 minShellWidth/shellGap，但仍提供 `--review-width` 作为 drawer 宽度"
      contains: "minShellWidth|shellGap|reviewWidth|stagingExpanded"
    - path: src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
      provides: "断言 resolveWindowWidth 在 stagingExpanded 下不叠加 reviewWidth（宽度保持稳定）"
      contains: "resolveWindowWidth|reviewWidth|stagingExpanded"
    - path: src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
      provides: "复用 overlay 语义与焦点/滚轮回归断言，补齐 in-panel overlay 的定位/关闭行为"
      contains: "aria-modal|onScrimWheel|click|focus"
  key_links:
    - from: src/components/launcher/parts/LauncherSearchPanel.vue
      to: src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
      via: "结构迁移后必须用组件测试验证：scrim 不覆盖 search capsule，且点击 search capsule 触发关闭"
      pattern: "search-main|review-overlay|pointerdown"
---

<objective>
补齐 Phase 17 的自动化回归护栏：新增/更新单测以锁定“Review 打开不改变窗口宽度”的 sizing 口径，并为 in-panel overlay 的范围与关闭回焦契约提供可定位断言，确保后续迭代不会回到“右侧独立列/窗口变宽”的旧表现。
</objective>

<execution_context>
@./.codex/get-shit-done/workflows/execute-plan.md
@./.codex/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/STATE.md
@.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-CONTEXT.md
@.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-RESEARCH.md

@src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts
@src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
@src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts
@src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: 为“Review 打开不改变窗口宽度”新增回归断言（metrics + calculation）</name>
  <files>src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts, src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts</files>
  <action>
1) `useLauncherLayoutMetrics.test.ts`：新增/更新断言，确保 `stagingExpanded=true` 时：\n
   - `minShellWidth` 不因 reviewWidth 增加；\n
   - `shellGap` 不因 stagingExpanded 被强行放大（若 gap 仍存在，必须解释其不影响宽度/布局）。\n
   同时保持 `--review-width` 仍被计算/注入（用于 drawer 宽度）。\n
2) `useWindowSizing.calculation.test.ts`：新增/更新断言，确保 `resolveWindowWidth()`（或等价 API）在 `stagingExpanded=true` 时不会叠加 reviewWidth（与 Phase 17 契约一致）。\n
要求：失败输出可定位到“width 不应叠加 reviewWidth”的断言，不要用脆弱的 snapshot 兜底。\n
  </action>
  <verify>
运行：\n
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`\n
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`\n
  </verify>
  <done>
宽度不扩展的不变量被测试锁死：stagingExpanded 不影响 minShellWidth/resolveWindowWidth，且 `--review-width` 仍可用于 drawer 宽度。
  </done>
</task>

<task type="auto">
  <name>Task 2: 为“in-panel overlay 范围 + 关闭回焦”补齐组件级回归断言</name>
  <files>src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts, src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts</files>
  <action>
在不引入新测试基建的前提下，补齐结构迁移后的关键 UI 不变量：\n
1) 在 `LauncherReviewOverlay.test.ts` 增加断言（或新增专门 case）：\n
   - **用结构（DOM 归属）断言**覆盖范围：`.review-overlay` 必须位于 `.search-main`（或其等价内容区容器）子树内，从而保证 scrim 不覆盖 search capsule；避免在 JSDOM 下依赖 computed layout。\n
   - 点击 scrim 关闭后，焦点回到搜索输入框（或通过 SearchPanel 的 focus helper 验证）。\n
2) 在 `LauncherSearchPanel.floor-height.test.ts`（或更合适的 SearchPanel 组件测试文件）补齐：\n
   - Review 打开时结果区 inert/aria-hidden 仍成立；\n
   - 点击 search capsule/输入区域会关闭 Review（先关闭再输入的契约）。\n
   - 增加 1 条最小化手动 smoke 指引：Review 打开时点击 `search-main` 之外区域仍按现状隐藏窗口（不把它改造成“关闭 Review”）。\n
要求：不引入“假结果 DOM”；测试仅断言结构/交互契约。\n
  </action>
  <verify>
运行：\n
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts`\n
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`\n
并通过 `npm run check:all` 作为最终门禁。\n
  </verify>
  <done>
Phase 17 的核心 UI 契约被组件测试覆盖：scrim 范围正确、关闭回焦正确、inert/aria-hidden 不回归、点击 search capsule 退出 Review 成立。
  </done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] stagingExpanded 不会引起窗口宽度扩展（metrics + calculation 皆有断言）
- [ ] in-panel overlay 的范围不覆盖 search capsule（组件测试可定位）
- [ ] 关闭回焦搜索输入框与点击 search capsule 退出契约成立（组件测试可定位）
- [ ] 通过 `npm run check:all`
</verification>

<success_criteria>
Phase 17 的回归护栏补齐：后续任何改动若让 Review 再次触发窗口变宽、scrim 覆盖范围错误或关闭回焦回归，都将被自动化测试及时拦截。
</success_criteria>

<output>
After completion, create `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-03-SUMMARY.md`.
</output>
