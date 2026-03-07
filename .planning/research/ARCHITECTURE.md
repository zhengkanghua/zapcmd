# Architecture Research

**Domain:** Tauri 桌面应用主窗口（launcher）UI 壳层重构（B4 Overlay Review）
**Researched:** 2026-03-07
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                         App Composition Root                          │
│  (context/runtime/viewModel: src/composables/app/useAppCompositionRoot)│
└───────────────┬───────────────────────────────────────────────┬──────┘
                │                                               │
                ▼                                               ▼
┌──────────────────────────────┐                 ┌──────────────────────────────┐
│ Launcher Window UI           │                 │ Settings Window UI           │
│ src/components/launcher/*    │                 │ src/components/settings/*    │
└───────────────┬──────────────┘                 └──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Launcher Composables (search/staging/layout/sizing/shell)             │
│ src/composables/launcher/*                                            │
└───────────────┬──────────────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────────────┐
│ Desktop Bridge / Services                                             │
│ src/services/tauriBridge.ts, commandExecutor.ts, updateService.ts      │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities (B4 视角)

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `LauncherWindow.vue` | 顶层层级编排：Search 背景层 + Review Overlay + Param/Safety 阻断层 | 只做编排与 props/event 转发，不堆业务规则。 |
| `LauncherSearchPanel.vue` | 搜索输入、结果列表、结果交互（背景层） | 保留现有逻辑；新增“背景锁定态”与 filler 挂点。 |
| `LauncherReviewOverlay.vue`（新增） | Review 的唯一交互层：队列卡片、滚动、操作、关闭 | 由 staging 迁移而来，第一阶段允许复用 staging 数据结构。 |
| `useWindowSizing/*` | 窗口宽高计算与 resize 控制 | 在现有 `resolveWindowSize()` 基础上引入 Review/Floor 概念。 |
| `windowKeydownHandlers/*` | 热键语义分发（分层优先级） | 搜索态/Review 态分表；`Esc` 分层后退。 |

## Recommended Project Structure

在不破坏现有 `parts/` 结构前提下，建议按“新增 overlay + 新增 review composable”落地：

```
src/
├── components/
│   └── launcher/
│       ├── LauncherWindow.vue
│       ├── types.ts
│       └── parts/
│           ├── LauncherSearchPanel.vue
│           ├── LauncherParamOverlay.vue
│           ├── LauncherSafetyOverlay.vue
│           ├── LauncherStagingPanel.vue          # 第一阶段保留（对照/回滚）
│           ├── LauncherReviewOverlay.vue         # 新增（从 staging 迁移）
│           ├── LauncherQueueSummaryPill.vue      # 新增
│           └── LauncherSearchDrawerFiller.vue    # 新增
├── composables/
│   └── launcher/
│       ├── useLauncherLayoutMetrics.ts
│       ├── useMainWindowShell.ts
│       ├── useWindowSizing/
│       │   ├── calculation.ts
│       │   ├── controller.ts
│       │   └── model.ts
│       ├── useStagingQueue/                      # 第一阶段复用（行为迁移）
│       └── useLauncherReviewMode.ts              # 新增（B4 局部状态/状态机）
└── features/
    └── hotkeys/
        └── windowKeydownHandlers/
            ├── index.ts
            ├── main.ts
            └── types.ts
```

### Structure Rationale

- **components/launcher/parts/**：现有主窗口已经以 `parts` 组织；新增 Review 相关组件可以做到最小侵入。
- **composables/launcher/**：B4 需要新增“Review overlay 状态/背景锁定/floor height/focus 恢复”等局部状态，适合单独 composable 承载，避免继续膨胀旧 staging 语义。

## Architectural Patterns

### Pattern 1: 正交状态建模（Search / Review / Param / Safety）

**What:** 用“正交维度”而不是单一 page state 表达 UI 状态（见 `docs/ui-redesign/08-*`）。  
**When to use:** Review overlay 引入后，输入优先级与焦点恢复变复杂时。  
**Trade-offs:** 初期状态更多，但更不容易在边界条件下错。

### Pattern 2: “先换壳，再迁移命名”

**What:** 第一阶段只迁移行为语义，不做全量 staging→review 重命名。  
**When to use:** 影响面大且测试依赖 staging 名称/结构时。  
**Trade-offs:** 短期有命名不一致，但回归成本更低、可回滚。

### Pattern 3: Sizing 逻辑拆两层（估算 vs 测量）

**What:** `useWindowSizing/calculation.ts` 既支持 DOM 实测，也支持纯估算 fallback。  
**When to use:** Review 打开时需要“先补足 floor height，再做 overlay”，避免抖动。  
**Trade-offs:** 需要明确“content height 不包含 drag strip”，并让测量口径一致。

## Data Flow

### Interaction Flow (B4 Open Review)

```
[User presses toggleQueue / clicks queued pill]
    ↓
[Hotkey handler routes to OPEN_REVIEW_REQUEST]
    ↓
[useLauncherReviewMode: set preparing, compute target height]
    ↓
[useWindowSizing: resize window if needed]
    ↓
[Search drawer filler height applied]
    ↓
[Review overlay opens + focus locked inside]
```

### Key Data Flows

1. **Sizing:** `useLauncherLayoutMetrics.ts`（抽屉/宽度基线）→ `useWindowSizing/*`（窗口最终 size）→ `searchShellStyle` 应用到 `LauncherWindow.vue`。
2. **Hotkeys:** `windowKeydownHandlers/main.ts`（分发）→ composable actions（open/close Review, focus, execute, clear）。

## Anti-Patterns

### Anti-Pattern 1: 用数据伪造 floor height

**What people do:** 在 `filteredResults` 中插入假项或渲染假 `.result-item`。  
**Why it's wrong:** 键盘导航/可达性/测试语义都会被污染；且属于明确的不通过条件。  
**Do this instead:** 用独立 filler 层补高度，并确保不进入焦点链。

### Anti-Pattern 2: 把遮罩做在整窗层

**What people do:** 直接对整个 window 做蒙层/blur。  
**Why it's wrong:** 透明+圆角的桌面窗口会“露壳”，观感崩坏。  
**Do this instead:** 在内部圆角 shell 内做 dim 层，保持外壳轮廓不变。

### Anti-Pattern 3: 同时做结构重构 + 命名迁移 + 热键默认值大改

**What people do:** 一波把所有词都改了，还改默认键位。  
**Why it's wrong:** 学习成本与回归成本叠加，定位失败原因困难。  
**Do this instead:** 第一阶段只迁移行为与结构；第二阶段再收口文案/命名/默认值。

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `LauncherWindow.vue` ↔ `useAppCompositionRoot` | props + emits | 保持现有“composition root 提供 viewModel、UI 只编排”的模式。 |
| `windowKeydownHandlers/*` ↔ launcher viewModel | handler 调用 viewModel actions | B4 需要引入 “open review / close review / focus review list” 等明确动作。 |
| `useWindowSizing/*` ↔ DOM refs | refs + measurement | Review floor height 需要一致的测量口径（不含 drag strip）。 |

## Sources

- `.planning/codebase/ARCHITECTURE.md` — 组合根与 UI 结构基线
- `docs/ui-redesign/10-b4-component-architecture.md` — 目标组件拆分建议
- `docs/ui-redesign/05-code-impact-map.md` — 影响面与高风险模块
- `src/components/launcher/LauncherWindow.vue` — 当前壳层（Search + Staging 并列）
- `src/features/hotkeys/windowKeydownHandlers/main.ts` — 当前热键分发（staging 语义）
- `src/composables/launcher/useWindowSizing/calculation.ts` — 当前窗口高度估算/测量逻辑

---
*Architecture research for: Desktop launcher B4 UI redesign*
*Researched: 2026-03-07*
