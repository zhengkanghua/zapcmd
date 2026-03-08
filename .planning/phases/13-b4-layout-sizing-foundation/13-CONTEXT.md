# Phase 13: B4 布局与尺寸底座 - Context

**Gathered:** 2026-03-07  
**Status:** Ready for planning

<domain>
## Phase Boundary

本 Phase 交付：

- 为 B4 引入 floor height（由“4 条结果高度 + 搜索框高度”计算得出，不写死 px）与 sizing 口径底座（**不计顶部拖拽区**）。
- 把 sizing / floor height 的关键分支锁进**可定位的自动化回归**（不依赖肉眼）。

本 Phase **不**交付：

- Review overlay 的结构接入（Phase 14）
- 键盘 / 焦点 / 关闭语义收口（Phase 15）
- 动画与新视觉系统落地（Phase 16）

</domain>

<decisions>
## Implementation Decisions

### floor height（计算值）：触发与表现

- floor **只在“打开 Review 前”触发**：搜索态可保持矮窗口；当进入 Review（当前以 `stagingExpanded` 作为 Review-open 代理）前先补齐到 floor height（= “4 条结果高度 + 搜索框高度”的计算值）。
- “搜索框高度”以 **`search-form` 这块完整样式区块的渲染高度**为准（包含 padding 等视觉样式），而不是 `input` 本体高度；实现时优先使用 DOM 测量避免写死。
- “4 条结果高度”以抽屉在 **4 rows** 下的 viewport height 为准（包含 `.keyboard-hint` + `.result-drawer` 的 padding/chrome），避免漏算与口径漂移。
- floor 覆盖 **0~3 条结果**（包含 0 结果空态）。
- 额外高度**只通过 filler/spacer 提供**：不添加假结果数据/DOM，不引入额外可聚焦/可读语义（避免污染可达性与测试语义）。
- filler **视觉为纯空白**，并且**放在内容底部**（内容从上往下自然排布）。
- 该 floor height 同时作为 Review/staging 面板的最小可视高度基准（后续 Phase 14 对齐）。

### sizing / content height 口径

- “顶部拖拽区不计入内容高度”：**只排除最顶端专用 drag strip**（`shell-drag-strip` / `--ui-top-align-offset`），不扩展到其它 drag 区域。
- sizing **稳定优先**：宁可略大，也不要出现偶发裁切/抖动/跳动。
- 触顶策略：窗口高度到 cap 即停，内容以 **drawer / 面板内部滚动**承接。
- Phase 13 的 sizing 高度变化 **不做动效**：先做稳定与回归底座；动效留到后续 Phase 16 打磨。

### 回归底座（单测锁定）

- 单测必须阻断：floor（结果数 `0/1/3/4`）×（Review 未触发 vs 打开 Review 前触发）+ 顶部 drag strip 排除口径 + 触发时机正确。
- 单测不写死具体 px：断言 floor height 由“4 条结果高度 + 搜索框高度”计算得出（并且不计顶部 drag strip）。
- “无假结果 DOM”用 **DOM 数量断言**证明：结果按钮/条目数量必须等于 `filteredResults.length`。
- 失败输出要求可定位：断言失败时应直接暴露关键数值（是否触发 floor、目标高度、strip 高度、实际高度等）。

### Claude's Discretion

- filler 的具体实现方式（例如 `min-height` vs spacer 元素），只要满足上述“无假结果语义 + 可达性不污染”的约束即可。
- 单测文件落点与断言组织方式（保持数值可见性与稳定性）。
- 常量命名、模块拆分与抽象边界的细节。

</decisions>

<specifics>
## Specific Ideas

- “单结果搜索态可以矮”，但在**打开 Review 前**先补 floor，避免 Review 打开时塌陷/割裂。
- “稳定优先，动效后置”：Phase 13 先把逻辑与回归底座做稳，动效集中到 Phase 16 处理。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/composables/launcher/useLauncherLayoutMetrics.ts`：已有 drawer/staging 的高度估算常量（`DRAWER_ROW_HEIGHT=72`、`DRAWER_HINT_HEIGHT=22`、`DRAWER_CHROME_HEIGHT=12` 等与 CSS 对齐），可扩展 `drawerFloorHeight` / `searchDrawerFillerHeight`。
- `src/components/launcher/parts/LauncherSearchPanel.vue`：`result-drawer` 当前只用 `maxHeight`，需要接入 filler/spacer 才能实现“不足 4 条高度仍稳定”的 floor 视觉。
- `src/composables/launcher/useWindowSizing/calculation.ts`：`resolveWindowSize()` 同时支持“测量”与“估算”，是落地 sizing 口径（排除顶端 drag strip）的核心位置。
- `src/components/launcher/LauncherWindow.vue` + `src/styles.css`：顶端 `shell-drag-strip` + `--ui-top-align-offset` 定义了专用拖拽区；`data-tauri-drag-region` + `app-region` 已建立 drag/no-drag 模式。
- `src/composables/launcher/useLauncherWatchers.ts`：窗口 resize sync 受 `stagingDrawerState` opening/closing 节流影响；可作为“打开 Review 前补 floor”的联动点。
- `src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`：已有 layout metrics 单测，可作为 Phase 13 扩展回归的落点之一。

### Established Patterns

- 窗口 resize：debounce + epsilon 跳过 + Tauri command resize 失败后 fallback `appWindow.setSize()`。
- Drag 语义：通过 `data-tauri-drag-region` 标记可拖拽区域，交互元素统一 `app-region: no-drag`。
- 高度策略：接近 cap 时通过内部滚动承接（`maxHeight` + `overflow: auto`），而不是继续拉高窗口。

### Integration Points

- floor 触发时机以 `stagingExpanded`（未来 Review-open）为代理，需要与 window sizing 的 sync 顺序配合（先补 floor，再进入 Review）。
- drag strip 排除口径需要在 window height 的测量/估算路径中一致生效，避免把 `--ui-top-align-offset` 误算进内容高度。
- 自动化回归需要验证到“可定位数值断言”，避免依赖肉眼布局判断。

</code_context>

<deferred>
## Deferred Ideas

- resize 的轻微过渡/动效（本 Phase 不做，留到 Phase 16）

</deferred>

---

*Phase: 13-b4-layout-sizing-foundation*  
*Context gathered: 2026-03-07*
