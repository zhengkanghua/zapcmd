# Phase 15: 键盘 / 焦点 / 关闭语义收口 - Research

**Researched:** 2026-03-09  
**Domain:** Launcher（Vue + Tauri）B4 键盘契约与焦点层级（Review/Param/Safety）  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Hotkey 语义（B4 第一阶段）

- **搜索态：**
  - `toggleQueue`：打开 Review overlay（默认键位仍可能是 `Tab`）。
  - `switchFocus`：打开 Review overlay，并把焦点落入 Review 列表（或等价的“当前队列项”）。
- **Review 态：**
  - `Tab/Shift+Tab`：仅在 Review 内循环焦点（不再承担“开关队列”的语义）。
  - `Esc`：关闭 Review，回到搜索态（不直接隐藏主窗）。
  - `toggleQueue`：允许作为“关闭 Review”的兼容入口，但**当其键位为 `Tab` 时，必须让位给标准 Tab 遍历**（即：Review 态下 `Tab` 不触发关闭）。

#### Esc 分层后退优先级

- 优先级固定：`Safety Dialog > Param Dialog > Review Overlay > Search/Hide`。
- 关键约束：Review 打开时按 `Esc` 必须优先关闭 Review（即使当前 query 非空），而不是先清空 query 或隐藏主窗。

#### 焦点进入 / 恢复

- Review 打开后：焦点必须进入 Review（至少落在 Review 的可交互元素上），以保证 `Tab/Shift+Tab` 的可达性语义成立。
- `switchFocus` 触发打开时：焦点应落到“当前队列项”或其等价焦点锚点，保证键盘用户立即可用 `↑/↓/Delete/...`。
- Review 关闭后：焦点恢复到 `#zapcmd-search-input`（第一阶段先简化为始终回到搜索框；后续如需再扩展为“恢复 active result”，另开范围）。

#### Focus Trap 策略

- Review 的 `Tab/Shift+Tab` trap 复用 Param/Safety overlay 已验证的实现模式：
  - 在 Review 面板容器上监听 `keydown`；
  - 仅拦截 `Tab`，计算面板内 focusable 元素并循环；
  - 必要时对 `Tab` 使用 `stopPropagation()`，避免被 window hotkey 层误判为 `toggleQueue`。

### Claude's Discretion

- Review 打开时的默认初始焦点落点（关闭按钮 vs 列表项），但必须满足“Tab 可遍历且不泄漏到背景”的硬约束。
- Review 列表项的可聚焦锚点实现方式（`tabindex=0`/按钮化/aria 语义），但需保证与现有“队列项 active 高亮 + 键盘导航”一致。

### Deferred Ideas (OUT OF SCOPE)

- 动画与视觉系统整体打磨（Phase 16）
- “恢复到上次 active result”的精细焦点恢复（后续如确有必要再做）
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| KEY-01 | 在搜索态按 `toggleQueue` 会打开 Review overlay | `src/features/hotkeys/windowKeydownHandlers/main.ts` 目前 `toggleQueue` 走 `toggleStaging()`；需要在“搜索态”明确映射为“打开 Review”，并保证打开后焦点进入 Review（避免 Tab 漂移到背景）。 |
| KEY-02 | 在搜索态按 `switchFocus` 会打开 Review overlay，且焦点落入 Review 列表 | `src/features/hotkeys/windowKeydownHandlers/main.ts` 目前 `switchFocus` 走 `openStagingDrawer() + switchFocusZone()`；需要把“切换到 search”语义移除（Review 打开后不应再回背景），并补齐“焦点落入列表锚点”的 DOM 侧实现（可依赖 `stagingListRef`/`stagingPanelRef`）。 |
| KEY-03 | Review 打开时 `Tab/Shift+Tab` 只在 Review 内循环焦点，不回到背景 Search | Param/Safety overlay 已有可复用的 Tab trap（`src/components/launcher/parts/LauncherParamOverlay.vue`、`LauncherSafetyOverlay.vue`）；Review 需要同构实现并确保不会触发 window hotkey 的 `toggleQueue`（必要时 `stopPropagation()` 或在 handler 层显式忽略）。 |
| KEY-04 | Review 打开时按 `Esc` 会先关闭 Review（而不是直接隐藏主窗），并保持 Safety > Param > Review > Search/Hide 的分层后退优先级 | `src/features/hotkeys/windowKeydownHandlers/index.ts` 最终把 `Escape` 路由到 `handleMainEscape()`；但 `src/composables/launcher/useMainWindowShell.ts` 当前顺序是“清空 query → 关闭 Review → hide”，会导致 Review open 且 query 非空时 Esc 先清空 query。需要把“Review close”提到“清空 query”之前（仅在 Review open 时）。 |
| KEY-05 | 参数弹层与安全确认层的优先级高于 Review/Search，且其 focus trap 与按键分发不被 B4 改造破坏 | `src/features/hotkeys/windowKeydownHandlers/index.ts` 已在 `safetyDialogOpen/paramDialogOpen` 分支中做阻断与 stopPropagation；Phase 15 的 Review 改动必须保持这两条分支为最高优先级，并避免 Review 的 keydown trap 抢占 Safety/Param 的事件链路。 |
| TST-01 | 自动化回归覆盖 B4 P0：`toggleQueue` / `switchFocus` / `Esc` / Review 内 `Tab` / floor height（含“无假结果”约束） | 现有回归已覆盖 Review 结构（Phase 14），Phase 15 需要新增/调整热键与焦点断言：`src/__tests__/app.hotkeys.test.ts`、`src/features/hotkeys/__tests__/windowKeydownHandlers.test.ts`、`src/composables/__tests__/launcher/useMainWindowShell.test.ts`。floor height “无假结果”已在 Phase 13 单测锁定，Phase 15 主要补“Tab trap 不泄漏”。 |
</phase_requirements>

## Standard Stack (HIGH)

- Vue 3 + TypeScript（组件层 focus trap + props/emit 约束）
- Pinia（状态存储不动；Phase 15 只改交互语义）
- Vitest + Vue Test Utils（P0 回归断言）

## Architecture Patterns (HIGH)

1. **按键优先级分发在 windowKeydownHandlers 层完成**  
   - Safety/Param 已在 `src/features/hotkeys/windowKeydownHandlers/index.ts` 统一阻断。  
   - Review 相关行为优先在同一层/同一条链路收口，避免组件到处散落 hotkey guard。

2. **Review 的 Tab focus trap 复用 overlay 既有实现模式**  
   - 参照 `LauncherParamOverlay.vue` / `LauncherSafetyOverlay.vue` 的 `onDialogKeydown()`：只拦截 Tab、循环 focusable、`preventDefault()`。  
   - Review 额外需要考虑：`toggleQueue` 默认键位可能仍是 Tab，因此 Tab trap 建议加 `stopPropagation()`，确保不会触发全局热键分支。

3. **焦点恢复统一走 useSearchFocus 的 scheduleSearchInputFocus**  
   - `src/composables/launcher/useSearchFocus.ts` 提供 `scheduleSearchInputFocus()`；  
   - 关闭 Review 后的焦点恢复应尽量通过这一统一入口，保持与 Param/Safety 关闭后的行为一致。

## Don't Hand-Roll（优先复用/扩展现有能力）

- 不要自写新的 focus trap 算法：复用 Param/Safety overlay 的实现即可（只需替换容器与焦点锚点）。
- 不要绕过 `windowKeydownHandlers/index.ts` 的优先级分发去“组件里处理全局按键”，会破坏 Safety/Param 的最高优先级。
- 不要把 `Tab` 的“焦点遍历”与 “toggleQueue hotkey”混在同一层无条件处理：必须按“搜索态 vs Review 态”分层。

## Common Pitfalls (MEDIUM)

1. **Review open + query 非空时 Esc 清空 query**：需要在 `handleMainEscape()` 中把 Review 关闭优先级提到 query 清空之前（仅在 Review open 时）。  
2. **Tab 被当作 toggleQueue 导致 Review 一开就被 Tab 关掉**：Review trap 必须阻断 Tab 冒泡到 window hotkey。  
3. **只做视觉层 dim，未做焦点锁定**：Review 打开后若焦点仍在搜索框，Tab 会走到背景 Search 控件，用户感知为“失控”。  
4. **Review 列表项不可聚焦**：即使有 active index，高频键盘用户仍需要稳定的焦点锚点（至少一个 `tabindex=0` 的“当前队列项”）。  

## Code Examples (repo-local)

### 1) Param/Safety 的 Tab trap（可直接复用）

`src/components/launcher/parts/LauncherParamOverlay.vue`、`LauncherSafetyOverlay.vue`：
- `onDialogKeydown(event)`：只处理 `event.key === "Tab"`，循环 focusable 并 `event.preventDefault()`。

### 2) 热键优先级阻断（Safety/Param 已在 window handler 层收口）

`src/features/hotkeys/windowKeydownHandlers/index.ts`：
- Safety open：吞掉全部按键并 `stopPropagation()`；
- Param open：仅处理 Esc，其余按键不进入 main/search/staging handler。

### 3) 现有 Esc 分层后退（需要调整 Review 与 query 的优先级）

`src/composables/launcher/useMainWindowShell.ts`：
- 当前顺序：Safety → Param → 清空 query → 关闭 Review → hide  
- Phase 15 目标顺序：Safety → Param → 关闭 Review →（若无 Review）清空 query → hide

## Sources (repo-local)

### Primary (HIGH confidence)
- `docs/ui-redesign/08-b4-interaction-state-machine.md`（明确：Review 态 Tab 仅做内部焦点循环）
- `docs/ui-redesign/09-b4-hotkey-migration-map.md`（明确：toggleQueue/switchFocus 的 B4 第一阶段语义）
- `src/features/hotkeys/windowKeydownHandlers/index.ts` / `main.ts`
- `src/composables/launcher/useMainWindowShell.ts`
- `src/components/launcher/parts/LauncherReviewOverlay.vue`
- `src/components/launcher/parts/LauncherParamOverlay.vue` / `LauncherSafetyOverlay.vue`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH（现有脚本/测试/构建链路清晰稳定）
- Architecture: HIGH（按键分发优先级与 focus trap 模式已在 Param/Safety 中验证）
- Pitfalls: MEDIUM（重点风险在“Tab 与 toggleQueue 冲突”与“Esc 优先级顺序”两处，需要靠 P0 回归锁定）

**Research date:** 2026-03-09  
**Valid until:** 2026-03-23（B4 结构快速演进，超过两周建议复查 hotkey 与焦点断言）

