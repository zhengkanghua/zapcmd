# Phase 17 上下文：面板内 2/3 覆盖抽屉（in-panel 2/3 review drawer overlay）

## 设计稿（Source of Truth）

- `docs/superpowers/specs/2026-03-10-launcher-review-drawer-overlay-design.md`

## 核心约束（Must）

1. 窗口不变宽：Review 打开不引入额外列、不通过 `--review-width` 扩展布局。
2. 抽屉在面板内：抽屉必须挂载在搜索面板（search-main）内部，属于内容区 overlay。
3. 三层结构：结果层 → 遮罩层（轻遮罩）→ 抽屉层（2/3 覆盖，从右向左）。
4. 覆盖范围：只覆盖搜索框下方内容区（结果抽屉区域），不覆盖搜索框。
5. 关闭契约：点击遮罩关闭抽屉 + 遮罩；关闭后焦点回到搜索输入框。

## 验收（Done）

- 不再出现“右侧独立卡片/分离露底”的观感；抽屉呈现为同面板内的 overlay 抽屉。
- 动画顺滑（抽屉滑入/滑出 + scrim 淡入/淡出），并支持 `prefers-reduced-motion` 降级。

