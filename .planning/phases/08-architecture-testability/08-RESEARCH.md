# Phase 8: 架构可测试性重构 - Research

**Researched:** 2026-03-06  
**Domain:** 前端组合根与设置存储链路的可测试性重构（解耦 IO 与业务计算）  
**Confidence:** HIGH（基于仓库代码与现有测试现状）

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|------------------------------------|------------------|
| ARC-01 | 识别并重构至少 1 个高耦合模块（`App.vue` 或组合根相关），使核心业务逻辑可在无 Tauri 环境下单测，并补齐关键分支用例 | 将 `useAppCompositionRoot/context.ts` + `runtime.ts` 作为主改造目标，定义 IO 端口与纯策略函数拆分，减少 `App.vue` 集成测试依赖。 |
| ARC-02 | 识别并重构至少 1 个难测/职责不清的 store/service（例如 `settingsStore.ts`），拆分 IO 与业务计算，使业务部分可被单测覆盖 | 将 `settingsStore.ts` 拆为“纯规范化/迁移逻辑 + 存储适配 + store 外壳”，保留现有存储协议并新增契约回归。 |
</phase_requirements>

## 用户约束（来自本次请求）

- 本次输出只服务于 Phase 8 规划前研究：明确实现决策点与风险点，不做空泛建议。
- 产出需可执行、可验证，并明确覆盖 `ARC-01`/`ARC-02`。
- 输出文件固定为：`.planning/phases/08-architecture-testability/08-RESEARCH.md`。

## 执行摘要

当前项目已把大量业务逻辑从 `App.vue` 下沉到 composables，但“组合根装配层”仍然承担多域依赖聚合（Tauri API、生命周期、更新检查、窗口行为、设置同步、执行反馈），导致很多回归只能通过 `mount(App)` 的大集成测试来覆盖。  

另一个明显重构目标是 `settingsStore.ts`：同一文件同时包含 schema 迁移、字段规范化、localStorage 读写、Pinia action，职责已超出单一边界。该模块虽然有单测，但改动成本和漏改风险都偏高。  

**Primary recommendation:** Phase 8 先做两条线并行规划：`ARC-01` 聚焦组合根 IO 边界与纯策略抽取；`ARC-02` 聚焦 `settingsStore` 分层拆分与协议契约锁定。先锁“边界与契约”，再拆文件与补测。

## 现状证据（规划依据）

### 1) 高耦合组合根仍是主风险点（ARC-01）

| 证据 | 说明 |
|------|------|
| `src/App.vue:6-111` | 单次解构 `useAppCompositionRoot()` 大量字段，`App.vue:123` 与 `App.vue:176` 分别向两个窗口传入巨量 props/handlers，改动面大。 |
| `src/composables/app/useAppCompositionRoot/context.ts:1-16` | 同时引入 Tauri、shell、settings store、command catalog、update manager、window resolver 等多域依赖。 |
| `src/composables/app/useAppCompositionRoot/context.ts:65/74/81` | 同一层承担 side-effects（语言切换、CSS 变量、设置窗口联动）。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts:173-195` | `onMainReady`/`onSettingsReady` 中直接触达 `window.localStorage`、`invoke("open_settings_window")`、更新反馈写入。 |
| `src/composables/app/useAppCompositionRoot/runtime.ts:155` | 生命周期桥接在 runtime 层一次性装配，导致测试难以只测“业务决策”。 |

### 2) store/service 中“业务 + IO”混合仍明显（ARC-02）

| 证据 | 说明 |
|------|------|
| `src/stores/settingsStore.ts`（551 行） | 超大文件，含 defaults/normalize/migrate/read/write/store actions 全部职责。 |
| `src/stores/settingsStore.ts:427-494` | `readSettingsFromStorage`/`writeSettingsToStorage` 与 schema 迁移逻辑强耦合。 |
| `src/stores/settingsStore.ts:509-599` | Pinia state/actions 与持久化耦合（`hydrateFromStorage`/`persist`）。 |
| `src/composables/settings/useSettingsWindow/persistence.ts` | 保存流程串行处理“后端写入 + store persist + broadcast”，重构时需防止错误归因回退。 |

### 3) 现有测试形态暴露“根层难测”问题

| 证据 | 说明 |
|------|------|
| `src/__tests__/app.failure-events.test.ts`（819 行） | 大量 `vi.mock`/`hoisted` 与环境桩，验证成本高。 |
| `src/__tests__/app.hotkeys.test.ts`（388 行） | 多场景依赖 `mount(App)` 才能覆盖交互。 |
| `src/__tests__/app.settings-hotkeys.test.ts`（282 行） | 设置路径也主要通过整应用挂载验证。 |
| `src/composables/app/useAppCompositionRoot/*` | 当前没有对应“组合根上下文/运行时”直接单测入口，主要依赖 App 级回归兜底。 |

## 规划前必须先明确的实现要点（重点）

### A. ARC-01 范围与完成定义（必须先拍板）

1. **重构目标文件固定为：**  
`src/composables/app/useAppCompositionRoot/context.ts` + `runtime.ts`（`App.vue` 保持壳层，不做行为改写）。

2. **先定义“纯逻辑”与“IO逻辑”边界：**  
- 纯逻辑候选：焦点阻断判定、更新提示文案决策、启动检查触发条件、提交提示文案选择。  
- IO 逻辑候选：`invoke`、`readLauncherHotkey`、`readAvailableTerminals`、`window.localStorage`、`window.open`。

3. **约束重构方式：**  
先抽“端口接口 + 纯函数”，再迁移调用点；禁止一次性重写全量 runtime，避免行为漂移。

4. **ARC-01 完成定义（可验证）：**  
- 至少 1 个组合根核心流程可在“无 Tauri mock”前提下通过纯函数单测。  
- `App` 级大集成用例数不增加（新增验证优先落到 composable/unit）。  
- 关键交互路径（搜索/入队/执行/设置切换）回归全绿。

### B. ARC-02 目标模块与拆分策略（必须先拍板）

1. **优先模块：** `src/stores/settingsStore.ts`。  
理由：体量最大、职责混合最明显、且已具备测试基础，适合“低行为风险”渐进拆分。

2. **推荐拆分边界（先设计后动手）：**  
- `settingsDefaults`（默认值与常量）  
- `settingsNormalization`（纯函数）  
- `settingsMigration`（纯函数）  
- `settingsStorage`（Storage 读写适配）  
- `settingsStore`（Pinia 壳层，仅状态与 action 编排）

3. **协议锁定（防回归红线）：**  
- key 不变：`zapcmd.settings` + legacy keys。  
- schema 版本与迁移行为不变。  
- windowOpacity、hotkeys、commandView 的归一化语义不变。

4. **ARC-02 完成定义（可验证）：**  
- 业务规范化/迁移可脱离 `window.localStorage` 单测。  
- store 仅保留薄 action，IO 由 storage adapter 注入。  
- 现有 `settingsStore.test.ts` 继续通过，并新增拆分后的契约断言。

## 关键风险与防回归策略

| Risk | Level | 触发点 | 防护策略 |
|------|-------|--------|----------|
| 交互行为漂移（快捷键/焦点/Esc） | HIGH | 组合根拆分后事件绑定顺序变化 | 保留现有 `app.hotkeys` 与 `app.failure-events` 回归；新增组合根契约测试，不替代现有回归。 |
| 设置持久化协议破坏 | HIGH | `settingsStore` 拆分改动了 key/version/normalize | 在拆分前写“协议快照测试”，锁 `read->write->read` 回环结果。 |
| Tauri/Web 双运行时分支失配 | MEDIUM | runtime 注入后分支遗漏 | 为 isTauri true/false 各保留最少 1 组契约测试。 |
| 组合根 ref/reactivity 失真 | MEDIUM | 大量返回字段重组导致引用断裂 | 分阶段迁移：先保持返回字段名不变，再考虑 facade 收口。 |
| 测试碎片化、覆盖率短期波动 | MEDIUM | 新增单测但未移除重复路径 | 明确测试层级：unit 负责决策，App 集成只保留关键链路。 |

## 建议计划切片（给 Planner）

### Plan 08-01（ARC-01）：组合根可测试边界重构

**目标：** 把组合根里的“决策逻辑”与“IO 执行”分离，新增无需 Tauri 的单测入口。  
**建议文件：**
- `src/composables/app/useAppCompositionRoot/context.ts`
- `src/composables/app/useAppCompositionRoot/runtime.ts`
- `src/composables/app/useAppCompositionRoot/viewModel.ts`（仅必要调整）
- `src/composables/__tests__/app/*`（新增组合根契约测试）
- `src/__tests__/app.failure-events.test.ts`（仅补回归，不做大重写）

**DoD：**
- 至少抽出 1 组纯策略函数并覆盖关键分支单测。
- 关键路径回归保持通过。
- 不引入新的 App 级巨型测试。

### Plan 08-02（ARC-02）：settingsStore 职责拆分

**目标：** 拆分 `settingsStore` 的 migration/normalize/storage/store 四层职责。  
**建议文件：**
- `src/stores/settingsStore.ts`
- `src/stores/settings/*.ts`（新建子模块）
- `src/stores/__tests__/settingsStore.test.ts`

**DoD：**
- read/write/migrate/normalize 都有独立可测入口。
- 旧存储快照迁移行为不变。
- `persist/hydrate` 行为与现状一致。

## 验证矩阵（Phase Requirements → Tests）

| Req ID | 验证行为 | Test Type | 建议命令 |
|--------|----------|-----------|----------|
| ARC-01 | 组合根核心逻辑可在无 Tauri 环境单测；关键交互不回归 | unit + integration | `npm run test:run -- src/composables/__tests__/app/useAppLifecycle.test.ts src/composables/__tests__/app/useAppLifecycleBridge.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/__tests__/app.failure-events.test.ts` |
| ARC-02 | settings 业务逻辑与 IO 分离后仍保持协议兼容 | unit | `npm run test:run -- src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/settings/useSettingsWindowPersistence.test.ts` |
| ARC-01 + ARC-02 | 重构后无功能回归、覆盖率门禁保持 | gate | `npm run check:all` |

## Open Questions（规划前待定）

1. `ARC-01` 是否允许顺带把 `viewModel` 从“平铺字段”收口为 `launcherVm/settingsVm` 两组对象？  
2. `ARC-02` 拆分后是否允许调整 `settingsStore.ts` 对外导出路径（建议先不改，避免连锁改动）？  
3. Phase 8 的优先目标是“减少 App 级测试复杂度”还是“先提高组合根单测覆盖”？建议先后者。  
4. 是否将 `useSettingsWindow/persistence.ts` 纳入本 phase 第二优先拆分（可选，不作为硬目标）？

## Sources

### Primary（HIGH）

- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `docs/architecture_plan.md`
- `src/App.vue`
- `src/composables/app/useAppCompositionRoot/context.ts`
- `src/composables/app/useAppCompositionRoot/runtime.ts`
- `src/composables/app/useAppCompositionRoot/viewModel.ts`
- `src/stores/settingsStore.ts`
- `src/composables/settings/useSettingsWindow/persistence.ts`
- `src/composables/execution/useCommandExecution/actions.ts`
- `src/composables/execution/useCommandExecution/helpers.ts`
- `src/__tests__/app.failure-events.test.ts`
- `src/__tests__/app.hotkeys.test.ts`
- `src/__tests__/app.settings-hotkeys.test.ts`
- `src/stores/__tests__/settingsStore.test.ts`

## RESEARCH COMPLETE
