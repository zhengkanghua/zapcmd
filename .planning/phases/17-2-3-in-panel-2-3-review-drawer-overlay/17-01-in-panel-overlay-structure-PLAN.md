---
phase: 17-2-3-in-panel-2-3-review-drawer-overlay
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/launcher/LauncherWindow.vue
  - src/components/launcher/parts/LauncherSearchPanel.vue
  - src/components/launcher/parts/LauncherReviewOverlay.vue
  - src/styles.css
autonomous: true
requirements: []
must_haves:
  truths:
    - "Review 抽屉只出现在搜索框下方内容区（search-main / 结果区），不覆盖 search capsule。"
    - "三层结构固定：结果层（可见但不可交互）→ 轻遮罩 scrim（仅 dim、不 blur）→ 抽屉 panel（从右向左滑入）。"
    - "抽屉宽度口径仍为“内容区 2/3 + clamp(420–480px)”且不溢出容器（必要时 max-width: 100%）。"
    - "关闭契约成立：点击 scrim / 关闭按钮 / Esc 关闭；关闭后焦点始终回到搜索输入框；点击搜索框等价退出 Review（先关再输入）。"
    - "保留 `prefers-reduced-motion` 降级，不引入新动画系统。"
  artifacts:
    - path: src/components/launcher/parts/LauncherSearchPanel.vue
      provides: "承载“内容区内”Review overlay 的挂载点与背景锁定（inert/aria-hidden）语义"
      contains: "inert|aria-hidden|pointerdown"
    - path: src/components/launcher/parts/LauncherReviewOverlay.vue
      provides: "复用既有 scrim/关闭/聚焦/滚轮语义（onScrimWheel）与 focus trap"
      contains: "onScrimWheel|role=\\\"dialog\\\"|aria-modal|focus"
    - path: src/styles.css
      provides: "in-panel overlay 的定位与动效（opening/closing 约 200ms，reduced motion 降级）"
      contains: "review-overlay--opening|review-overlay--closing|prefers-reduced-motion"
  key_links:
    - from: src/components/launcher/parts/LauncherSearchPanel.vue
      to: src/components/launcher/parts/LauncherReviewOverlay.vue
      via: "Review overlay 的 DOM 范围必须在 content 区内，才能保证 scrim 只覆盖内容区且点击 search capsule 触发关闭语义"
      pattern: "search-main|review-overlay"
    - from: src/components/launcher/LauncherWindow.vue
      to: src/components/launcher/parts/LauncherSearchPanel.vue
      via: "Review overlay 从 search-shell 迁移到 SearchPanel 子树，不再作为 search-shell sibling 覆盖整个 shell"
      pattern: "LauncherSearchPanel|LauncherReviewOverlay"
---

<objective>
把 Review 的呈现方式从“覆盖整个 search-shell 的 overlay”回归为 **同一张搜索面板内部（仅搜索框下方内容区）** 的抽屉式 overlay：scrim 只覆盖内容区，drawer 从右向左滑入覆盖内容区约 2/3（clamp 420–480），并严格遵循既有关闭/聚焦/滚轮与 reduced-motion 契约。
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
@src/components/launcher/parts/LauncherSearchPanel.vue
@src/components/launcher/parts/LauncherReviewOverlay.vue
@src/styles.css
</context>

<tasks>

<task type="auto">
  <name>Task 1: 将 Review overlay 的 DOM 范围迁移到 SearchPanel 内容区内（只覆盖搜索框下方）</name>
  <files>src/components/launcher/LauncherWindow.vue, src/components/launcher/parts/LauncherSearchPanel.vue</files>
  <action>
按 `17-CONTEXT.md` 的锁定决策，把 Review overlay 从 `search-shell` 级别迁移为 **SearchPanel 内容区内** 的 overlay：\n
1) 选择一个明确的内容区容器作为定位参考（建议 `.search-main` 或结果抽屉容器的直接子节点），确保 overlay 的布局边界天然等于“搜索框下方内容区”。\n
2) 确保迁移后仍复用既有 Review 打开/关闭状态（`stagingDrawerState`）与其 class 驱动；不要新造状态机。\n
3) 保持 SearchPanel 的背景锁定语义：Review 打开时结果区仍是“可见但不可交互”（继续使用既有 `inert` + `aria-hidden` 组合信号）。\n
4) 保持“点击搜索框等价退出 Review”的契约：点击 search capsule/输入区域时应先关闭 Review，再允许输入（不支持“开着 Review 直接改 query”新契约）。\n
5) **边界行为决策（明确收口）：** Review 打开时，点击 `search-main` 之外区域（例如 drag strip/窗口其余空白区域）**保持现状由 `useLauncherHitZones` 处理为“隐藏窗口”**；本 Phase 不把该点击改造成“关闭 Review”。因此 overlay/scrim 不应吞掉该区域的指针事件，避免出现“点空白无响应/无法隐藏窗口”的回归。\n
约束：不实现 deferred ideas（push 抽屉 / 列表+右预览分栏）。\n
  </action>
  <verify>
手动 UI smoke：\n
- Review 打开时，scrim 与 drawer 都只出现在搜索框下方内容区（不覆盖 search capsule）。\n
- 点击 search capsule 会关闭 Review，且关闭后焦点回到搜索输入框。\n
- Review 打开时，点击 `search-main` 之外区域仍按现状隐藏窗口（不要求关闭 Review），且 drag strip 不被 scrim 覆盖/可正常拖拽。\n
  </verify>
  <done>
Review overlay 的 DOM 范围归位到 SearchPanel 内容区内，scrim 不再覆盖 search capsule，且点击 search capsule 的退出契约保持成立。
  </done>
</task>

<task type="auto">
  <name>Task 2: 调整 in-panel overlay 的样式与动效（scrim 轻 dim + drawer 右滑入；reduced motion 降级）</name>
  <files>src/components/launcher/parts/LauncherReviewOverlay.vue, src/styles.css</files>
  <action>
在不引入新动画系统的前提下，将既有 `.review-overlay` / `.review-panel` 的样式从“覆盖整个 shell”调整为“覆盖内容区”：\n
1) overlay/scrim 定位：以内容区容器为边界，scrim 仅覆盖内容区；禁止 `backdrop-filter`，只做 dim（复用既有 dim token）。\n
2) drawer 宽度：继续使用既有 `--review-width`（2/3 + clamp 420–480）作为 panel 宽度；补齐容器上限（例如 `max-width: 100%`），避免窄宽溢出。\n
3) 动效：沿用 `review-overlay--opening/--closing` 机制与约 200ms 基线（Phase 16 对齐），并保留 `prefers-reduced-motion` 下的无动画/弱动画降级。\n
4) 滚轮语义：确保 scrim 上滚轮仍触发 `onScrimWheel`（scrim 上滚动抽屉列表），不改变交互路径。\n
  </action>
  <verify>
运行：\n
- `npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts`\n
手动：打开/关闭 Review 观察 dim 与 drawer 动效顺滑；系统开启 reduced motion 时无强制位移动画。\n
  </verify>
  <done>
in-panel overlay 的 scrim/drawer 样式与动效符合锁定决策：只覆盖内容区、轻 dim、drawer 右滑入、reduced motion 可用、滚轮语义不变。
  </done>
</task>

</tasks>

<verification>
Before declaring plan complete:
- [ ] Review overlay 只覆盖搜索框下方内容区（不覆盖 search capsule）
- [ ] 三层结构成立：结果层 → scrim（轻 dim）→ drawer panel（右滑入）
- [ ] 关闭契约成立：scrim/关闭按钮/Esc 都能关闭；关闭后焦点回搜索输入框；点击 search capsule 触发关闭
- [ ] `onScrimWheel` 语义保持（scrim 上滚轮滚动抽屉列表）
- [ ] `prefers-reduced-motion` 下可用（无强制位移动画）
</verification>

<success_criteria>
Phase 17 的 UI 结构目标成立：Review 不再呈现“右侧独立列/分离抽屉感”，而是回归为同面板内、仅覆盖内容区的 2/3 抽屉式 overlay；交互契约与可达性语义不回归。
</success_criteria>

<output>
After completion, create `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-01-in-panel-overlay-structure-SUMMARY.md`.
</output>
