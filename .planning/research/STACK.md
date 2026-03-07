# Stack Research

**Domain:** Desktop launcher UI 重构（Tauri 2 + Vue 3，B4 Overlay Review）
**Researched:** 2026-03-07
**Confidence:** MEDIUM

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vue | 3.5.22 | 主窗口 UI 渲染与交互 | 现有项目已稳定采用；B4 更偏“壳层/状态机/焦点管理”，Vue 足够表达且已有测试体系。 |
| TypeScript | 5.9.2 | 交互状态与契约类型化 | 复杂热键/焦点/状态优先级需要强类型边界，避免回归漂移。 |
| Pinia | 3.0.3 | settings 与全局状态 | 已有成熟接入；本里程碑不应引入新状态管理。 |
| Vite | 7.1.5 | 构建与开发体验 | 现有链路与 `check:all` 已固化，避免动构建底座。 |
| Tauri API / CLI | ^2.8.x | 桌面窗口/插件能力 | 窗口 resize / shell 能力在现有实现已存在（`useWindowSizing/*`），B4 主要复用并增强其计算模型。 |
| Tailwind CSS | 3.4.17 | 基础样式能力（与自定义 CSS 并存） | 项目已采用 Tailwind + `src/styles.css` 令牌化变量；B4 更适合把设计系统落为 CSS tokens。 |
| Vitest | 3.2.4 | 回归测试 | 热键/焦点/尺寸估算与 overlay 行为需要回归锁定；Vitest 已在 v1.0 形成门禁。 |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| （不新增依赖，优先复用现有） | — | — | B4 重构属于结构与契约迁移，优先控制影响面与回归成本。 |
| `tabbable` 或 `focus-trap`（可选） | TBD | 更稳的 focus trap / Tab 循环 | 仅当 Review Overlay 的“内部焦点循环 + 多阻断层优先级”逻辑在手写实现中变复杂且难测时再引入；否则保持零新增依赖。 |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| ESLint | 代码质量门禁 | 现有 `npm run lint` 已作为 `check:all` 入口。 |
| vue-tsc | 类型门禁 | `npm run typecheck` + `typecheck:test` 已固化。 |
| `scripts/coverage/run-test-coverage.mjs` | 覆盖率门禁 | B4 变更会牵动多个关键测试文件，需保持输出可定位。 |

## Installation

```bash
# B4 UI 重构不建议新增依赖；默认无需安装额外包。
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Tailwind + CSS tokens（现状） | 引入重型组件库（如全量 UI kit） | 仅当团队明确要长期维护一套通用组件库且接受大范围替换成本；v2.0 不建议。 |
| CSS transition + Vue `<Transition>` | 动画/动效库（如 motion） | 仅当动效需求显著复杂且难以测试/复用时考虑；B4 优先保证交互契约正确。 |
| 手写 focus trap（现有 overlay 经验） | `focus-trap` 等第三方 | 当 Review 内部焦点循环与阻断层叠加导致 bug 难定位时再引入。 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| “伪造结果项/假 DOM”凑 `322px` 高度 | 会污染键盘导航、可达性语义与测试断言，属于明确的不通过条件 | 使用 filler/spacer 层，仅影响容器高度，不改变数据与可聚焦元素。 |
| 整窗蒙层/遮罩 | 会暴露原生窗口边界与破坏圆角/透明外观 | 只在内部圆角 shell 内做 dim/blur 层。 |
| 立即全量 staging→review 命名迁移 | 影响面巨大、回归成本高，易把结构改造与命名改造绑死 | 先行为迁移，后命名收口（第二阶段再评估）。 |

## Stack Patterns by Variant

**如果 Windows 下实时 resize 抖动明显：**
- 采用“一次性 resize 到目标高度 + 内部内容动画”的降级策略
- 因为 Tauri/Windows 窗口边缘 resize + 透明/圆角组合更容易产生闪烁与抖动

**如果 Review Overlay 的焦点循环变复杂：**
- 考虑引入小型 focus trap 依赖（`tabbable`/`focus-trap`）
- 因为“Safety/Param/Review/Search”多层优先级需要更强的可验证焦点边界

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@tauri-apps/api@^2.8.0` | `@tauri-apps/cli@^2.8.2` | 版本已在项目中配套使用；B4 主要动前端 sizing 逻辑，不建议升级主版本。 |

## Sources

- `docs/ui-redesign/*` — B4 结构/交互/验收基线（本里程碑 SSOT）
- `src/styles.css` — 现有 CSS tokens（包含当前绿色 accent 与透明度策略）
- `src/components/launcher/LauncherWindow.vue` — 当前主窗口壳层（Search + Staging 并列）
- `src/composables/launcher/useWindowSizing/*` — 当前窗口尺寸计算与控制入口

---
*Stack research for: Desktop launcher B4 UI redesign*
*Researched: 2026-03-07*
