# Project Research Summary

**Project:** ZapCmd
**Domain:** Desktop launcher 主窗口 UI 重构（B4 Overlay Review）
**Researched:** 2026-03-07
**Confidence:** HIGH

## Executive Summary

本里程碑（v2.0）属于“主窗口壳层与交互契约迁移”，而不是新增业务能力或后端重写：核心工作是把 launcher 从“左搜索 + 右常驻 staging 并列”升级为 **B4（Overlay Review Mode with Floor Height Protection）**，并同步收敛窗口 sizing、热键/焦点优先级、以及回归测试。

研究结论是：**不需要引入新技术栈或重型依赖**。B4 的难点在于“层级与口径”：floor height 必须通过 filler/spacer 实现（禁止假结果），遮罩只能在内部圆角 shell 内做（禁止整窗蒙层），并且 Safety/Param/Review/Search 的输入优先级必须被稳定编码并回归锁定。

主要风险集中在 Windows 下窗口 resize 的抖动与测量口径漂移；建议在路线图里显式写入“先稳定尺寸再动画”的基线，并保留“一次性 resize + 内部动画”的降级策略，避免实现阶段反复试错。

## Key Findings

### Recommended Stack

结论：继续使用现有栈（Vue 3 + TS + Pinia + Vite + Tailwind + Tauri 2 + Vitest），把设计系统落为 **CSS tokens**（而不是引入新组件库）。除非 Review 内焦点循环逻辑因多层阻断变得难测，否则不建议新增 focus trap 依赖。

**Core technologies:**
- Vue 3 + TypeScript — 表达 B4 状态机、热键语义与 focus 恢复
- Tauri 2 window APIs — 支撑 sizing/resize；重点是减少次数与稳定口径
- Vitest — 把 toggleQueue/switchFocus/Esc/Tab/floor height 等关键契约锁进回归

### Expected Features

**Must have (table stakes):**
- Review Overlay（背景可见但不可交互；唯一可交互层为 Review）
- floor height protection（`drawerFloorHeight=322px`，filler/spacer，无假结果）
- 热键语义迁移 + 焦点锁定/恢复 + `Esc` 分层后退

**Should have (competitive):**
- 新视觉系统（品牌色与 success 色分离、降低透明度噪音、长命令可读性显著提升）
- 顺滑的开合时序（先稳定尺寸再动画；必要时降级）

**Defer (v2+):**
- settings 的 IA/视觉升级（独立专题）
- `E2E-02` full-matrix、`SYNC-01`、`SEC-02` 等非本轮核心

### Architecture Approach

保持现有 “composition root → LauncherWindow 编排 → launcher composables” 的架构不变；新增 Review overlay 组件与 `useLauncherReviewMode`（B4 局部状态/状态机），并在 `useWindowSizing/*` 中引入 Review/Floor 的计算概念。第一阶段允许继续复用 staging 数据结构与 hotkey ID，避免范围爆炸。

**Major components:**
1. `LauncherWindow.vue` — 顶层层级编排（Search 背景层 + Review overlay + Param/Safety）
2. `useWindowSizing/*` + `useLauncherLayoutMetrics.ts` — sizing 口径与 floor height 支撑
3. `windowKeydownHandlers/*` + `useMainWindowShell.ts` — 热键分发与 Esc 分层后退

### Critical Pitfalls

1. **假结果补高** — 必须用 filler/spacer，且不进入焦点链
2. **背景可交互/焦点泄漏** — Review Open 必须 pointer/keyboard 双路径锁定
3. **拖拽区计入内容高度** — 统一测量口径，不把 drag strip 算进 floor
4. **Windows resize 抖动** — 写入降级策略：一次性 resize + 内部动画
5. **Esc/Tab 语义漂移** — Review 态 Esc 先关 overlay；Tab 只做 Review 内循环

## Implications for Roadmap

基于依赖关系，建议以“先底座、再结构、再键盘、最后动效”拆 phase（从 Phase 13 开始编号）：

### Phase 13: B4 布局与尺寸底座
**Rationale:** floor height、测量口径与 sizing 是后续一切行为的地基。  
**Delivers:** `drawerFloorHeight=322px`、filler 层、Review 目标高度计算、drag strip 不计入口径。  
**Addresses:** floor protection / sizing pitfalls  
**Avoids:** 假结果补高、口径漂移

### Phase 14: Review Overlay 结构接入
**Rationale:** 先把“常驻右栏”改成“按需 overlay”，并建立背景锁定。  
**Delivers:** Review overlay + queue summary pill + 背景不可交互。  
**Uses:** 现有 staging 数据结构（第一阶段）

### Phase 15: 键盘 / 焦点 / 关闭语义收口
**Rationale:** B4 成败主要取决于可预测的键盘体验与层级优先级。  
**Delivers:** toggleQueue/switchFocus 语义迁移、Review 内 Tab 循环、Esc 分层后退、P0 自动化回归更新。  
**Avoids:** Esc 直接隐藏、Tab 漂移到背景

### Phase 16: 动画与体验优化（含降级策略验证）
**Rationale:** 在结构与契约正确后再打磨动效，并验证 Windows 稳定性。  
**Delivers:** 开合时序打磨、动态 resize 尝试/降级策略落地、视觉 tokens 收口与可读性提升。

### Phase Ordering Rationale

- floor protection 与 sizing 先行，否则 overlay 的高度/动画会在边界条件下反复抖动。
- overlay 结构先稳定，再把热键/焦点收口成可测试的行为。
- 动画放最后，避免“好看但不稳”的错觉。

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 16:** Windows resize 抖动与闪烁的具体验证策略（以实测为准）

Phases with standard patterns (skip research-phase):
- **Phase 13-15:** 主要是本仓库内的结构迁移与回归更新，可直接进入 planning/execute

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | 现有栈已足够，且 v1.0 门禁要求不鼓励引入重型依赖。 |
| Features | HIGH | `docs/ui-redesign/*` 已给出完整结构/交互/验收矩阵。 |
| Architecture | HIGH | 与现有 composition root / launcher composables 架构一致，变更集中在 UI shell/sizing/hotkeys。 |
| Pitfalls | HIGH | 文档已明确不通过条件；风险点可直接写入 success criteria 与测试。 |

**Overall confidence:** HIGH

### Gaps to Address

- Windows 动态 resize 的稳定性需要在实现阶段实测，并准备降级路径（写入路线图 success criteria）。

## Sources

### Primary (HIGH confidence)
- `docs/ui-redesign/05-code-impact-map.md` — 影响面与模块定位
- `docs/ui-redesign/08-b4-interaction-state-machine.md` — 交互契约与状态机
- `docs/ui-redesign/12-b4-acceptance-matrix.md` — 验收矩阵与不通过条件

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md` / `STRUCTURE.md` — 代码结构映射（2026-03-03）

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
