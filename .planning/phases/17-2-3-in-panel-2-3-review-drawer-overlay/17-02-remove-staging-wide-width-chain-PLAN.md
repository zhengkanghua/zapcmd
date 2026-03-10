---
phase: 17-2-3-in-panel-2-3-review-drawer-overlay
plan: "02"
type: execute
wave: 2
depends_on: ["17-01"]
files_modified:
  - src/components/launcher/LauncherWindow.vue
  - src/composables/launcher/useLauncherLayoutMetrics.ts
  - src/composables/launcher/useWindowSizing/calculation.ts
  - src/styles.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Review 打开/关闭不再改变窗口宽度：不通过“search-shell 变宽 + 右侧列”表达 Review。"
    - "仍保留 `--review-width` 作为 drawer 宽度变量（语义从“右侧列宽”改为“内容区抽屉宽”）。"
    - "`useLauncherLayoutMetrics` 的 `minShellWidth` 与 `shellGap` 不再因 `stagingExpanded=true` 增加 reviewWidth（保持窗口 sizing 稳定）。"
    - "`resolveWindowWidth()` 不再在 `stagingExpanded` 时叠加 `reviewWidth`。"
  artifacts:
    - path: src/components/launcher/LauncherWindow.vue
      provides: "移除/停用 `.search-shell--staging-wide` 的触发，避免两列布局导致“右侧独立列”观感与窗口变宽"
      contains: "search-shell--staging-wide|stagingExpanded"
    - path: src/composables/launcher/useLauncherLayoutMetrics.ts
      provides: "Review 相关 CSS 变量与最小宽度口径；去除 stagingExpanded 下的 reviewWidth 宽度扩展链路"
      contains: "reviewWidth|minShellWidth|shellGap|stagingExpanded"
    - path: src/composables/launcher/useWindowSizing/calculation.ts
      provides: "窗口宽度计算不再依赖 stagingExpanded 扩展 reviewWidth"
      contains: "resolveWindowWidth|reviewWidth|stagingExpanded"
    - path: src/styles.css
      provides: "search-shell grid 不再因 stagingExpanded 进入“第二列 = reviewWidth”的布局口径"
      contains: "search-shell--staging-wide|grid-template-columns|--review-width"
  key_links:
    - from: src/composables/launcher/useLauncherLayoutMetrics.ts
      to: src/composables/launcher/useWindowSizing/calculation.ts
      via: "宽度口径必须一致：metrics 不加 reviewWidth，calculation 也不应在 stagingExpanded 时加 reviewWidth"
      pattern: "minShellWidth|resolveWindowWidth"
---

<objective>
移除“Review 打开导致窗口变宽”的宽度扩展链路：不再通过 `.search-shell--staging-wide` 的两列 grid 表达 Review；`useLauncherLayoutMetrics` 与 `resolveWindowWidth` 不再在 `stagingExpanded` 时叠加 `reviewWidth`，从而让 Review 打开/关闭的窗口宽度保持稳定。
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

@src/components/launcher/LauncherWindow.vue
@src/composables/launcher/useLauncherLayoutMetrics.ts
@src/composables/launcher/useWindowSizing/calculation.ts
@src/styles.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: 停用 search-shell staging-wide 两列布局（避免“右侧独立列”与窗口变宽）</name>
  <files>src/components/launcher/LauncherWindow.vue, src/styles.css</files>
  <action>
按 `17-RESEARCH.md` 的现状分析，去掉 “stagingExpanded → `.search-shell--staging-wide` → grid 第二列 = reviewWidth” 这条视觉/结构链路：\n
1) 在 `LauncherWindow.vue` 停止为 `stagingExpanded` 添加 `.search-shell--staging-wide`（或改为不影响 grid 的 class 名）。\n
2) 在 `src/styles.css` 移除/收敛 `.search-shell--staging-wide` 对 `grid-template-columns` 与 `--shell-gap` 的布局影响（若仍需要该 class 作为动画/状态钩子，必须确保它不改变布局宽度）。\n
约束：不得引入 push/挤压式布局；Review 只通过 in-panel overlay 呈现。\n
  </action>
  <verify>
手动：打开/关闭 Review 时窗口宽度不应变化；视觉不再出现“右侧独立列”的分离感。\n
  </verify>
  <done>
Review 不再触发 search-shell 两列布局；窗口宽度保持稳定，避免右侧独立列观感。
  </done>
</task>

<task type="auto">
  <name>Task 2: 移除 metrics + window sizing 的宽度扩展逻辑（stagingExpanded 不叠加 reviewWidth）</name>
  <files>src/composables/launcher/useLauncherLayoutMetrics.ts, src/composables/launcher/useWindowSizing/calculation.ts</files>
  <action>
1) `useLauncherLayoutMetrics.ts`：\n
   - 保留 `--review-width` 的计算与注入（仍用于 drawer panel 宽度）；\n
   - 但 `minShellWidth` / `shellGap` 不再因 `stagingExpanded=true` 而把 `reviewWidth` 纳入（或增大 gap）。\n
   - **明确口径：** 若存在 `resolveSearchMainWidth()`（或等价逻辑）在 `stagingExpanded` 时为 review “预留/扣减最大宽度”的计算（例如从 `searchMainWidth` 扣掉 `reviewMaxWidth` 或类似常量），在 Phase 17 **应移除该扣减**，因为 review 改为 in-panel overlay 不再占用布局列宽。\n
2) `useWindowSizing/calculation.ts`：\n
   - `resolveWindowWidth()`（或等价入口）不再在 `stagingExpanded` 时叠加 `reviewWidth`；\n
   - 保持高度相关逻辑与 `stagingPanelRef`/测量路径兼容（只移除 width 扩展，不做额外重构）。\n
3) 自检：Review 打开/关闭期间仍保持 Phase 16 的“先稳定尺寸再动画”策略（不要引入 opening/closing 期间反复 resize）。\n
  </action>
  <verify>
运行：\n
- `npm run test:run -- src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`\n
- `npm run test:run -- src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`\n
并做一次手动检查：Review 打开/关闭时，search-main 内容区宽度不应因“预留 review 列宽”而变窄（drawer 覆盖是 overlay 行为，不是 layout 扣减）。\n
  </verify>
  <done>
宽度扩展链路被彻底移除：stagingExpanded 不再影响 minShellWidth/resolveWindowWidth；`--review-width` 仅作为内容区 drawer 宽度变量保留。
  </done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] Review 打开/关闭不改变窗口宽度（不再走两列 grid）
- [ ] `useLauncherLayoutMetrics`：stagingExpanded 不叠加 reviewWidth 到 minShellWidth/shellGap
- [ ] `resolveSearchMainWidth`（或等价 search-main 宽度口径）不再因 review 预留/扣减列宽
- [ ] `resolveWindowWidth`：stagingExpanded 不叠加 reviewWidth
- [ ] `--review-width` 仍存在且用于 drawer panel 宽度（语义改为“内容区抽屉宽”）
</verification>

<success_criteria>
Phase 17 的 sizing/布局目标成立：Review 呈现回归 in-panel overlay，窗口宽度在 Review 开合时稳定不变；宽度口径一致且无隐藏回退。
</success_criteria>

<output>
After completion, create `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-02-SUMMARY.md`.
</output>
