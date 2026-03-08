# Phase 13: B4 布局与尺寸底座 - Research

**研究日期:** 2026-03-07  
**研究目标:** 为 Phase 13 生成可执行计划：落地 floor height（不足 4 条结果时补齐）与 sizing 口径底座（不计顶部 drag strip），并把关键分支锁进可定位单测回归。  
**整体置信度:** HIGH（核心结论均可由仓库现有布局实现与 sizing 代码直接推导）

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)

- resize 的轻微过渡/动效（本 Phase 不做，留到 Phase 16）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SIZE-01 | 当搜索结果不足 4 条高度时，用户打开 Review 前左侧抽屉会被补足到 floor height（= “4 条结果高度 + 搜索框高度”的计算值；搜索框高度以 `.search-form` 容器渲染高度为准，含 padding；仅 filler/spacer；无假结果数据/DOM） | `LauncherSearchPanel.vue` 的 `.result-drawer` 当前仅 `maxHeight`，需要引入 filler/spacer（或 `min-height`）并在 `stagingExpanded` 打开前触发；`.search-form` 高度可从 `searchShellRef` 下 DOM 测量；4 rows 口径可复用 `useLauncherLayoutMetrics.ts` 中的 drawer 常量/计算。 |
| SIZE-04 | sizing/floor height 的比较与补齐不把顶部拖拽区计入内容高度 | 顶部 drag strip 为 `.shell-drag-strip`，高度由 CSS 变量 `--ui-top-align-offset` 定义；`useWindowSizing/calculation.ts` 的 `measureWindowHeightFromLayout()` 目前把它算进内容高度，需要在 measured/estimated 两条路径里统一排除。 |
| TST-02 | sizing/布局相关逻辑具备可定位的单测断言（至少覆盖关键分支与边界场景） | 已有 `useLauncherLayoutMetrics` 单测可扩展；`resolveWindowSize()` 尚无单测，可新增覆盖 floor 触发、drag strip 排除、0/1/3/4 结果分支与可定位失败输出。 |
</phase_requirements>

## Repo 现状与关键落点

### 1. 现有布局/高度口径（可复用）
- `src/composables/launcher/useLauncherLayoutMetrics.ts`：已定义 drawer/staging 的高度估算常量（`DRAWER_ROW_HEIGHT=72`、`DRAWER_HINT_HEIGHT=22`、`DRAWER_CHROME_HEIGHT=12` 等），并提供 `drawerViewportHeight`、`windowHeightCap` 等。Phase 13 可以在此增加 “4 rows floor viewport height” 与 floor 触发条件的派生指标（但不要污染搜索态默认高度）。
- `src/components/launcher/parts/LauncherSearchPanel.vue`：drawer 仅用 `maxHeight`，不足 4 条会自然变矮；需要 filler/spacer（或 `min-height`）让 drawer 视觉高度在 floor 触发时补齐，同时保持 DOM 语义不变。
- `src/composables/launcher/useWindowSizing/calculation.ts`：`resolveWindowSize()` 同时支持 measured/estimated；Phase 13 要把 “顶部 drag strip 不计入内容高度” 在两条路径中收敛一致，避免 “测量算进、估算不算” 的口径漂移。
- `src/components/launcher/LauncherWindow.vue` + `src/styles.css`：`.shell-drag-strip` 使用 `--ui-top-align-offset`（默认 18px），且位于 `.search-shell` grid 的第一行；这是 **唯一**需要排除的顶部 drag 区。
- `src/composables/launcher/useLauncherWatchers.ts`：`stagingDrawerState === 'opening'` 时会 `syncWindowSizeImmediate()`；因为 `stagingExpanded` 在 opening 阶段即为 true（`useStagingQueue`），这正是“打开 Review 前触发 floor”的最佳接入点。

## Standard Stack

- Vue 3 + 组合式 API（computed/watch/nextTick）
- Vitest（现有 composable 单测）
- DOM 测量：`getBoundingClientRect()`（对 `.search-form` / `.shell-drag-strip` 使用；单测可通过 stub 返回值）

## Architecture Patterns

1. **把口径落在可复用的“指标/计算层”**  
   - 指标（例如 floor 是否触发、floor 目标高度、drag strip 高度）应集中在 composable / calculation 中，组件仅消费结果渲染 filler。
2. **Measured / Estimated 双路径一致性**  
   - `resolveWindowSize()` 必须保证 measured 与 estimated 对 drag strip 的排除口径一致；否则会出现“偶发抖动/跳动”或测试无法稳定复现。
3. **floor 的触发时机用 staging opening 锁定**  
   - 搜索态（staging closed）保持矮；staging opening/open 才进入 floor 保护区。

## Don’t Hand-Roll

- 不要通过“伪造结果项/多塞 DOM”去填充高度（会污染可达性语义与测试语义）。
- 不要把排除范围扩大到所有 drag 区域（本 Phase 只排除 `.shell-drag-strip` 这一块顶部专用 strip）。

## Common Pitfalls

1. **只改 `maxHeight` 不加 filler/min-height** → drawer 仍会随结果数变矮，floor 视觉不成立。  
2. **drag strip 只在测量路径排除** → estimate 路径仍包含/不包含导致抖动与断言漂移。  
3. **把 search-form 高度写死** → 与 Context 冲突；测试也会更脆。  
4. **filler 可聚焦/可读**（缺少 `aria-hidden` 或错误标签）→ 破坏可达性语义与“无假结果 DOM”的断言口径。  
5. **单测断言只看“像不像”**（截图/肉眼）→ 不符合 TST-02；需要可定位数值断言（目标高度、strip 高度、是否触发等）。

## Code Examples（仓库内）

- 口径常量与 drawer viewport：`src/composables/launcher/useLauncherLayoutMetrics.ts`
- floor 触发窗口 sync 时机：`src/composables/launcher/useLauncherWatchers.ts`
- sizing 计算主入口：`src/composables/launcher/useWindowSizing/calculation.ts`
- 顶部 drag strip 定义：`src/components/launcher/LauncherWindow.vue`、`src/styles.css`
- 既有单测落点：`src/composables/__tests__/launcher/useLauncherLayoutMetrics.test.ts`

## Recommended Plan Split

| Plan | Wave | Focus | Why |
|------|------|-------|-----|
| `13-01` | 1 | floor 指标 + drawer filler 落地（触发时机与语义约束） | 先把“看得见的 floor”做稳，避免后续 overlay 接入时高度口径继续漂移 |
| `13-02` | 1 | window sizing：drag strip 排除 + floor 与 cap 的比较口径收敛 | 把 sizing 的 measured/estimated 两条路径统一起来，减少 resize 抖动风险 |
| `13-03` | 2 | 单测回归底座：覆盖 0/1/3/4 结果、opening 触发、drag strip 排除与可定位输出 | 把关键分支锁进可定位断言，满足 TST-02 与 success criteria |

## RESEARCH COMPLETE

研究完成。Phase 13 的关键在于两条口径同时落地并可回归：  
1) floor 触发只在 staging opening/open，并通过 drawer filler/min-height 补齐到 4 rows + search-form；  
2) `resolveWindowSize()` 在 measured/estimated 中一致排除 `.shell-drag-strip`，并为关键分支补齐可定位单测断言。  
