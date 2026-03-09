# Phase 15: 键盘 / 焦点 / 关闭语义收口 - Context

**Gathered:** 2026-03-09  
**Status:** Ready for planning

<domain>
## Phase Boundary

本 Phase 交付：

- 收口 B4 的 **键盘契约**：搜索态 `toggleQueue/switchFocus` 进入 Review；Review 态 `Tab/Shift+Tab` 仅做内部焦点循环；`Esc` 分层后退遵循 `Safety > Param > Review > Search/Hide`。
- 收口 Review 的 **焦点管理**：打开时焦点进入 Review；关闭时焦点回到搜索框；并避免焦点泄漏到背景 Search。
- 保证 **阻断层优先级**：参数弹层与安全确认层打开时，Review/Search 不再处理热键与焦点逻辑（保持现有 focus trap 与按键分发不被破坏）。
- 补齐 P0 **自动化回归**：`toggleQueue/switchFocus/Esc/Tab`（Review 内）等关键路径具备可定位断言。

本 Phase 不交付：

- 动画与视觉系统整体打磨（Phase 16）
- sizing/resize 稳定性与降级策略收口（Phase 16）
- staging → review 的全量命名迁移（仅允许在不扩大影响面的前提下做最小必要调整）

</domain>

<decisions>
## Implementation Decisions

### Hotkey 语义（B4 第一阶段）

- **搜索态：**
  - `toggleQueue`：打开 Review overlay（默认键位仍可能是 `Tab`）。
  - `switchFocus`：打开 Review overlay，并把焦点落入 Review 列表（或等价的“当前队列项”）。
- **Review 态：**
  - `Tab/Shift+Tab`：仅在 Review 内循环焦点（不再承担“开关队列”的语义）。
  - `Esc`：关闭 Review，回到搜索态（不直接隐藏主窗）。
  - `toggleQueue`：允许作为“关闭 Review”的兼容入口，但**当其键位为 `Tab` 时，必须让位给标准 Tab 遍历**（即：Review 态下 `Tab` 不触发关闭）。

### Esc 分层后退优先级

- 优先级固定：`Safety Dialog > Param Dialog > Review Overlay > Search/Hide`。
- 关键约束：Review 打开时按 `Esc` 必须优先关闭 Review（即使当前 query 非空），而不是先清空 query 或隐藏主窗。

### 焦点进入 / 恢复

- Review 打开后：焦点必须进入 Review（至少落在 Review 的可交互元素上），以保证 `Tab/Shift+Tab` 的可达性语义成立。
- `switchFocus` 触发打开时：焦点应落到“当前队列项”或其等价焦点锚点，保证键盘用户立即可用 `↑/↓/Delete/...`。
- Review 关闭后：焦点恢复到 `#zapcmd-search-input`（第一阶段先简化为始终回到搜索框；后续如需再扩展为“恢复 active result”，另开范围）。

### Focus Trap 策略

- Review 的 `Tab/Shift+Tab` trap 复用 Param/Safety overlay 已验证的实现模式：
  - 在 Review 面板容器上监听 `keydown`；
  - 仅拦截 `Tab`，计算面板内 focusable 元素并循环；
  - 必要时对 `Tab` 使用 `stopPropagation()`，避免被 window hotkey 层误判为 `toggleQueue`。

### Claude's Discretion

- Review 打开时的默认初始焦点落点（关闭按钮 vs 列表项），但必须满足“Tab 可遍历且不泄漏到背景”的硬约束。
- Review 列表项的可聚焦锚点实现方式（`tabindex=0`/按钮化/aria 语义），但需保证与现有“队列项 active 高亮 + 键盘导航”一致。

</decisions>

<specifics>
## Specific Ideas

- 依据 `docs/ui-redesign/08-b4-interaction-state-machine.md` 与 `09-b4-hotkey-migration-map.md`：
  - 搜索态允许 `Tab` 作为 `toggleQueue` 默认键位；
  - Review 态必须把 `Tab` 还给标准焦点遍历（可达性改进的关键点）。

</specifics>

<code_context>
## Existing Code Insights

### Primary Entry Points

- 热键分发与优先级：`src/features/hotkeys/windowKeydownHandlers/index.ts`
- 主窗口热键语义：`src/features/hotkeys/windowKeydownHandlers/main.ts`
- Esc 分层后退：`src/composables/launcher/useMainWindowShell.ts`
- Review/队列状态机（兼容期 staging）：`src/composables/launcher/useStagingQueue/*`
- Review 组件：`src/components/launcher/parts/LauncherReviewOverlay.vue`
- Search/Review 的 DOM 桥接 refs：`src/composables/launcher/useLauncherDomBridge.ts`

### Regression Targets (P0)

- App 热键回归：`src/__tests__/app.hotkeys.test.ts`
- Hotkey handler 单测：`src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`
- 组合根 keydown 行为：`src/composables/__tests__/app/useAppWindowKeydown.test.ts`
- Esc 分层后退回归：`src/composables/__tests__/launcher/useMainWindowShell.test.ts`

</code_context>

<deferred>
## Deferred Ideas

- 视觉系统/动画与 resize 稳定性（Phase 16）
- “恢复到上次 active result”的精细焦点恢复（后续如确有必要再做）

</deferred>

---

*Phase: 15-keyboard-focus-close-semantics*  
*Context gathered: 2026-03-09*

