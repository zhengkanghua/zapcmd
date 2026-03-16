# 启动器统一外框（LauncherFrame）：高度口径统一 + CommandPanel 对齐修复

> 日期：2026-03-16  
> 状态：approved  
> 范围：Launcher 主窗口（Search / CommandPanel / FlowPanel / SafetyOverlay）视觉规范与窗口尺寸策略修复
>
> 关联设计（已实现）：`docs/superpowers/specs/2026-03-15-command-panel-nav-stack-design.md`

---

## 1. 背景与问题

我们已经按 2026-03-15 的“导航栈 + CommandPanel”设计完成了整体流程开发，但在实际体验中暴露出若干与预期不一致的问题，需要补一轮“规范化修复”：

1. **进入参数面板（CommandPanel）时窗口高度变化过度**  
   - 目标：尽量避免“无意义的缩放/抖动”；窗口仅在“不够高”时增高。  
   - 目标：增高的**最高高度**要与“搜索框 + 搜索结果可达到的最高高度”一致；参数再多则面板内部滚动。
2. **CommandPanel 外观与搜索页外框不一致**  
   - 目标：参数面板与搜索框+搜索结果保持同一套“外框”视觉（圆角/边框/背景/阴影）。  
   - 体验口径：进入参数面板后，本质上是“搜索框区域变为标题栏、搜索结果区域变为参数内容区域”。
3. **Bug：进入参数面板后点击任意位置触发隐藏**  
   - 表现：点击 CommandPanel 任意区域都会触发“点空白隐藏窗口”，像是事件穿透到背后。

此外，我们需要把“窗口的视觉分层/高度预算”规范化，避免后续面板继续出现同类问题。

---

## 2. 目标与非目标

### 2.1 目标

1. 明确并落地统一的“主外框容器”：**LauncherFrame**
   - 结构口径：最上层保留拖拽区（drag strip），其下方为唯一的 LauncherFrame。
   - Search / CommandPanel / FlowPanel / 后续新增面板，均在 LauncherFrame 内渲染与约束。
2. **统一最大高度口径**
   - LauncherFrame 的最大高度由“搜索页最大行数（结果列表）”定义（并受屏幕上限约束）。
   - Search 与 CommandPanel 的窗口高度上限一致；FlowPanel/SafetyOverlay 也必须在该外框内展示。
3. **CommandPanel 高度策略**
   - 进入 CommandPanel 时：如果当前（搜索页）高度已足够，则**不缩小**窗口；仅在不够高时按需增高。
   - 增高上限为 LauncherFrame 最大高度；超出部分由 CommandPanel 内容区内部滚动承担。
4. 修复“点击任意位置触发隐藏”的命中规则问题（禁止事件被误判为空白点击）。
5. CommandPanel 视觉对齐 SearchPanel 外框（圆角、边框、背景、阴影一致）。

### 2.2 非目标（本次不做）

- 不调整搜索结果最大行数、行高、键位提示布局等既有交互。
- 不重做 FlowPanel 的交互与样式（仅保证其在 LauncherFrame 内一致裁剪与高度口径一致）。
- 不改变顶层 drag-strip 的存在与功能（必须保留）。

---

## 3. 视觉分层与容器职责（统一规范）

### 3.1 分层定义

```
Tauri Window（真实窗口）
└─ Launcher Root（监听 pointerdown.capture 的根）
   └─ search-shell（网格容器）
      ├─ shell-drag-strip（拖拽区：不计入面板内容高度）
      └─ LauncherFrame（统一外框：所有面板内容必须被“框”在此）
         ├─ Page：SearchPanel | CommandPanel（导航栈切页）
         └─ Overlays（在 Frame 内绝对定位）
            ├─ FlowPanel overlay（scrim + panel）
            └─ SafetyOverlay（队列安全确认）
```

### 3.2 LauncherFrame 的职责（必须满足）

- 统一外观：圆角/边框/背景/阴影、裁剪（`overflow: hidden`）。
- 统一最大高度口径：Frame 高度上限由“搜索最大行数”决定（并受屏幕上限约束）。
- 统一点击命中：Frame 内任何点击都应被认为是“交互区域”，不应触发“点空白隐藏窗口”。

> 备注：目前搜索页中存在 `result-drawer-floor`（在打开 overlay 时的抽屉地板占位），其目的就是**锁定外框下半区高度**避免塌陷。这个占位属于 Frame 内部布局策略的一部分，不是“额外的外框外内容”。

---

## 4. 点击命中规则（修复点击即隐藏 Bug）

当前“点空白隐藏窗口”的判定基于 `data-hit-zone`：

| hit-zone | 含义 | 行为 |
|---|---|---|
| `drag` | 可拖拽区域（或 `data-tauri-drag-region`） | 不隐藏 |
| `interactive` | 主 UI 交互区域 | 不隐藏 |
| `overlay` | overlay/scrim 等覆盖层 | 不隐藏（由 overlay 自己决定是否关闭） |
| none | 未命中以上区域 | 视为“空白点击”，隐藏窗口 |

### 修复策略

- 将 LauncherFrame 作为**统一的 `interactive` 命中容器**：  
  即便未来新增页面忘记加标记，也不会再出现“点任意处隐藏”的问题。
- overlay 继续使用 `overlay` 命中：FlowPanel/SafetyOverlay 的 scrim/面板必须在 Frame 内，且由 overlay 自己决定点击关闭逻辑。

---

## 5. 高度口径（Search / CommandPanel / Overlays 统一上限）

### 5.1 术语

- `dragStripHeight`：拖拽区高度（不计入 Frame 内容）。
- `frameHeight`：LauncherFrame 的内容高度（Search/Command/Overlay 都在其中）。
- `windowHeight`：真实窗口高度，`windowHeight = dragStripHeight + frameHeight`。
- `screenCap`：屏幕允许的最高窗口高度（现有逻辑为 `screen.availHeight * 0.82`，并非设计口径）。
- `designCap`：设计口径的最高 Frame 高度（由“搜索最大行数”定义，**可计算且可单测**）。

#### 5.1.1 术语 ↔ 代码变量/常量对照（实现口径对齐用）

| 术语 | 代码侧对应 | 备注 |
|---|---|---|
| `dragStripHeight` | `.shell-drag-strip` 的 `getBoundingClientRect().height`；fallback 为 `UI_TOP_ALIGN_OFFSET_PX_FALLBACK` | `src/composables/launcher/useWindowSizing/calculation.ts` |
| `windowHeightCap`（screenCap 的实现上限） | `useLauncherLayoutMetrics().windowHeightCap` | 当前为 `screen.availHeight * 0.82` |
| `frameHeight` | `windowHeight - dragStripHeight` | sizing 内部用 content height 表示 |
| `frameMinHeight`（Search） | `WINDOW_SIZING_CONSTANTS.windowBaseHeight` | `src/composables/launcher/useLauncherLayoutMetrics.ts` |
| `frameMinHeight`（Command） | `WINDOW_SIZING_CONSTANTS.paramOverlayMinHeight` | 进入参数面板的最小内容高度 |
| 搜索最大行数 | `LAUNCHER_DRAWER_MAX_ROWS` | 当前为 10（不在本次修改） |
| 结果行高 | `LAUNCHER_DRAWER_ROW_HEIGHT_PX` | 当前为 44（不在本次修改） |
| 抽屉 padding（上下） | `LAUNCHER_DRAWER_CHROME_HEIGHT_PX` | 当前为 12（与 `.result-drawer { padding: 6px }` 对齐） |
| 抽屉 hint（键位提示区） | `LAUNCHER_DRAWER_HINT_HEIGHT_PX` | 当前为 22（与 `.keyboard-hint` 视觉口径对齐） |
| 抽屉额外估算间距 | `DRAWER_GAP_EST_PX`（建议引入为常量） | 当前实现里是 sizing 估算中的 `+ 10` |

### 5.2 统一上限

```
frameMaxHeight = min(screenCap - dragStripHeight, designCap)
```

其中 `designCap` 为**唯一、可复用的计算口径**（禁止在多个模块用不同公式各算一遍）：

```
// 注意：designCap 指的是 frameHeight（不含 dragStripHeight）
drawerMaxViewportHeightDesign =
  LAUNCHER_DRAWER_MAX_ROWS * LAUNCHER_DRAWER_ROW_HEIGHT_PX
  + (LAUNCHER_DRAWER_CHROME_HEIGHT_PX + LAUNCHER_DRAWER_HINT_HEIGHT_PX)

designCap =
  WINDOW_SIZING_CONSTANTS.windowBaseHeight
  + drawerMaxViewportHeightDesign
  + DRAWER_GAP_EST_PX
```

说明：

- `designCap` 的直观含义：**搜索页在“结果达到最大行数”时，搜索框 + 结果列表可达到的最大 Frame 高度**。
- `DRAWER_GAP_EST_PX` 为现有 sizing 估算中的 `+10`，本次会将其显式命名为常量（否则口径容易漂移）。
- 最终使用时仍需与屏幕上限结合（`screenCap`），避免小屏越界。

> 直观理解：Search 页能长到多高，CommandPanel/FlowPanel/SafetyOverlay 就最多也只能长到同样高；再多内容只能内部滚动。

### 5.3 CommandPanel 进入时的“只增不减”规则

进入 CommandPanel 时（以 `pendingCommand: null -> 非 null` 作为进入信号）：

1. 记录进入前的 `frameHeightBeforeEnter`（来自进入前一次 `resolveWindowSize` 的结果：`lastWindowSize.height - dragStripHeight`）。
2. 计算 CommandPanel 的 `frameHeightNeeded`（沿用现有逻辑：`max(measured, estimated)`，再 clamp 到 `frameMaxHeight`，且最小不低于 `WINDOW_SIZING_CONSTANTS.paramOverlayMinHeight`）。
3. 应用“只增不减”：

```
nextFrameHeight = clamp(
  max(frameHeightBeforeEnter, frameHeightNeeded),
  min = WINDOW_SIZING_CONSTANTS.paramOverlayMinHeight,
  max = frameMaxHeight
)
```

4. 若 `frameHeightNeeded > frameMaxHeight`：  
   不再增高，改由 CommandPanel 内容区（参数列表）启用滚动。

#### 5.3.1 退出/返回 Search 时的高度回落口径（避免粘住/抖动分歧）

- 当退出 CommandPanel（`pendingCommand: 非 null -> null`）并返回 Search：
  - 清理 `frameHeightBeforeEnter`（不再作为 floor）。
  - Search 页恢复现有 sizing 逻辑：窗口可以随结果变化自然回落/增长，但仍受 `designCap` 上限约束。
- 该口径的目的：CommandPanel 内避免“缩小”，但不改变 Search 页原有的动态高度体验（只是统一了最大高度）。

#### 5.3.2 边界与特殊场景口径补充（实现必须一致）

- 首次进入 CommandPanel：若 `lastWindowSize` 不存在（例如应用首次同步 sizing 前），则 `frameHeightBeforeEnter` fallback 为 `WINDOW_SIZING_CONSTANTS.windowBaseHeight`。
- CommandPanel 内切换命令（`pendingCommand: 非 null -> 非 null`）：
  - “只增不减”仍然生效：以首次进入时记录的 `frameHeightBeforeEnter` 作为 floor（直到退出 CommandPanel）。
  - 允许在参数变多时继续增高，但仍受 `frameMaxHeight` 上限约束；参数变少时不回落（避免二次抖动）。

---

## 6. 视觉对齐（SearchPanel ↔ CommandPanel）

### 6.1 外框一致

- LauncherFrame 负责外框：圆角/边框/背景/阴影。
- SearchPanel 与 CommandPanel 仅负责内部结构，不应各自再“造一层外框”导致样式分裂。

### 6.2 “搜索框 → 标题栏”的语义映射

当页面从 Search → CommandPanel：

- `search-capsule` 的位置语义变为 CommandPanel 的 header（标题/徽标/队列入口）。
- `result-drawer` 的位置语义变为 CommandPanel 的 content（参数表单/危险提示/预览）。

---

## 7. 影响范围（预期改动点）

- 结构/样式：
  - `src/components/launcher/LauncherWindow.vue`：引入常驻 LauncherFrame 容器，承载切页与 overlays。
  - `src/styles/launcher.css`：将 `.search-main` 的外框样式上提/复用到 LauncherFrame；对齐圆角裁剪与 overlay scrim。
  - `src/components/launcher/parts/LauncherSearchPanel.vue`：SearchPanel 内部不再承担“外框容器职责”（仅保留内容布局）。
  - `src/components/launcher/parts/LauncherCommandPanel.vue`：去除与外框冲突的背景/圆角假设，确保内容区可滚动且可被 Frame 裁剪。
- Overlay 挂载去重（必须统一）：
  - `src/components/launcher/LauncherWindow.vue`：FlowPanel/SafetyOverlay 最终都在 LauncherFrame 内部挂载一次（绝对定位覆盖 frame）。
  - `src/components/launcher/parts/LauncherSearchPanel.vue`：移除 `LauncherFlowPanel` 的直接渲染（避免 Search/Command 两处挂载导致行为分裂）。
- 点击命中：
  - `src/composables/launcher/useLauncherHitZones.ts`：规则不变，重点是统一在 LauncherFrame 标记 `interactive`。
- 窗口尺寸：
  - `src/composables/launcher/useLauncherLayoutMetrics.ts`：定义 `designCap` 的唯一计算口径（或导出常量），并暴露给窗口 sizing 使用。
  - `src/composables/launcher/useWindowSizing/calculation.ts`：加入 `designCap` 参与 `frameMaxHeight`；进入 CommandPanel 时只增不减 + 超出滚动策略；退出时清理 floor。

---

## 8. 测试与验收标准

### 8.1 自动化测试（新增/调整）

- 命中测试：CommandPanel 内任意点击不会触发隐藏（`data-hit-zone` 覆盖面验证）。
- sizing 测试：
  - 进入 CommandPanel 不会导致窗口缩小；
  - 当参数面板需要更高时才增高；
  - 增高上限不超过 Search 页可达最大高度；
  - 超出上限时 CommandPanel 内容区滚动生效。
  - 退出 CommandPanel 返回 Search 后允许回落（且仍受 designCap 上限约束）。

建议优先落在现有测试入口，减少定位成本：

- 命中规则单测：`src/composables/__tests__/launcher/useLauncherHitZones.test.ts`
- sizing 计算单测：`src/composables/__tests__/launcher/useWindowSizing.calculation.test.ts`
- FlowPanel 结构/overlay 语义单测（需同步调整容器）：`src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

### 8.2 手动验收（开发环境）

在 `http://127.0.0.1:5173/`：

1. 搜索结果很多（达到最大行数）→ 进入参数面板：窗口不应变得更高；参数区超长时内部滚动。
2. 搜索结果很少（窗口较矮）→ 进入参数面板：仅在不够高时增高，且最高不超过“搜索最大高度”。
3. 参数面板内点击任意区域不隐藏；点击真正的窗口空白区域才隐藏。
4. Search/CommandPanel 外框圆角、边框、背景一致；FlowPanel/SafetyOverlay 在 Frame 内裁剪一致。
