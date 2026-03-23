# Tailwind Primitives Migration（C：页面消费原语）设计稿

> **日期**：2026-03-23  
> **状态**：Draft（讨论通过后执行）  
> **范围**：仅在开发分支试验（不直接合并到 `main`）  

## 0. 背景（Why）

当前仓库的样式体系已经完成过一次“工程化收敛”：

- 样式入口：`src/styles/index.css`（按 reset/themes/tokens/shared/launcher/settings/animations 分层）
- 多主题：`data-theme` + CSS Variables 双层变量（`--theme-*` → `--ui-*`）
- 质量门禁：存在 `src/styles/__tests__/launcher-style-contract.test.ts` 这类样式契约测试；并有桌面端最小 E2E 冒烟 `scripts/e2e/desktop-smoke.cjs`

但在持续迭代中，仍存在两个现实痛点：

1. **开发速度与一致性治理**：纯手写 CSS（即使模块化）仍存在“命名/定位/层叠/回归风险”的时间成本；多人协作时也容易出现 spacing/字体/交互态不一致的碎片。
2. **长期可维护性**：当样式规模继续增长（尤其是 UI 控件/交互态），全局 CSS 的“可删性/可演进性”会越来越差，最终容易回到“改一处担心影响全局”的状态。

因此我们希望重新引入 Tailwind，但 **不推翻现有主题与 token 架构**，并以“视觉零差异”作为迁移目标，降低重构风险。

---

## 1. 目标（Goals）

1. **架构目标（C 方案）**：页面/业务组件主要消费 UI 原语（Primitives），Tailwind utilities 主要写在原语内部；页面只保留少量布局类（grid/flex/gap 等）。
2. **视觉目标**：迁移过程“可阶段验收”，在关键阶段保持 **视觉零差异**（至少做到肉眼不可辨、交互不回退）。
3. **主题目标**：运行时多主题切换仍基于现有 `data-theme` + `--theme-*`/`--ui-*`，Tailwind 只“消费 token”，不引入第二套设计语言。
4. **工程目标**：把桌面 UI 自动化（现有 tauri-driver + WebDriver）纳入迁移验收链路，并补齐“调试友好”的入口，提升 UI 开发反馈速度。

---

## 2. 非目标（Non-goals）

- 不承诺在一次迭代内把 `launcher.css` / `settings.css` 全量迁移为 utility-first（允许分阶段、以原语优先）。
- 不改变主题切换机制（继续 `data-theme`），不把主题逻辑搬进 Tailwind（避免静态编译与运行时主题冲突）。
- 不在本次试验中直接合并到 `main`（仅开发分支探索，最终是否合并需单独评审决策）。

---

## 3. 推荐方案概述（What）

选择 **C：页面消费原语（Primitives-First）**，并结合“视觉零差异”迁移策略：

1. **先接入 Tailwind 工具链，但不改 UI**（零视觉风险）。
2. **先把页面消费方式迁移为原语**：原语内部第一版仍复用现有语义类（如 `.btn-*`）或现有组件（如 `src/components/settings/ui/*`），保持视觉零差异。
3. **再逐个原语将实现替换为 Tailwind utilities**：通过 Tailwind theme 配置把关键设计 token 映射到 `--ui-*`，逐步删除不再被消费的旧 CSS。
4. **在关键阶段补齐桌面端 UI 自动化与调试入口**：让“样式栈切换”与“UI 行为不回退”可验证、可回归。

---

## 4. 关键技术决策（Decisions）

### 4.1 Tailwind 仍需要 CSS（结论）

即使走 “全量 Tailwind”，在桌面应用 + 运行时多主题切换 的场景下，仍必须保留少量 CSS：

- 主题变量定义层：`src/styles/themes/*.css`（`--theme-*`）
- 语义 token 映射层：`src/styles/tokens.css`（`--ui-*`）
- reset 与 Tauri 专用全局规则：`src/styles/reset.css`、`src/styles/shared.css` 中与 `-webkit-app-region`/滚动条/极少量全局工具类相关部分
- 少量动画与无障碍兜底：`src/styles/animations.css`

Tailwind 的职责是：**把“控件/布局/交互态”从大块全局 CSS 迁移到更局部、更可组合、更可删的表达方式**。

### 4.2 禁用 Tailwind Preflight（建议）

为保证“视觉零差异”与减少 reset 冲突，建议：

- `tailwind.config.cjs` 中关闭 preflight（`corePlugins.preflight = false`）
- 继续沿用 `src/styles/reset.css` 作为唯一 reset 来源

### 4.3 Token 映射策略（避免第二套设计语言）

Tailwind 配置中应优先把常用值映射到 CSS Variables，例如：

- `borderRadius.ui = var(--ui-radius)`
- `boxShadow.ui = var(--ui-shadow)`
- `fontFamily.mono = var(--ui-font-mono)`
- 颜色/背景等尽量指向 `var(--ui-*)`（或 `rgba(var(--ui-*-rgb), <alpha-value>)` 的形式）

页面/原语层禁止硬编码色值（含 arbitrary color），避免主题体系被绕开。

### 4.4 原语边界与目录建议

新增跨窗口共享原语目录：

```
src/components/shared/ui/
  UiButton.vue
  UiIconButton.vue
  UiCard.vue
  UiKbd.vue
  ...
```

并尽量让 launcher/settings 两个窗口都消费这些原语，减少重复实现与风格漂移。

---

## 5. 桌面 UI 自动化与“调试入口”（Testing & Debug）

仓库当前已具备桌面端最小 UI 自动化链路（Windows 默认 blocking）：

- 冒烟用例：`scripts/e2e/desktop-smoke.cjs`（`selenium-webdriver` + `tauri-driver`）
- 本地验证编排：`scripts/verify-local-gate.mjs`（脚本入口：`npm run verify:local`）

本设计建议在迁移计划中补齐两类能力：

1. **更贴近 UI 迁移的覆盖点**：在 `desktop-smoke` 增加少量稳定断言（不做像素级强绑定，优先 DOM/可达性信号），覆盖：
   - Launcher 基本交互未回退（输入/抽屉开合）
   - Settings 能打开并定位到关键 UI 元素（避免 CSS/原语迁移导致页面空白）
   -（可选）主题切换后关键 token 生效（非像素比对）
2. **调试友好入口**：新增一个 debug 模式（例如 keep-open / step pause），用于 UI 开发时快速观察 WebDriver 现场与日志产物。

产物与定位建议沿用现有约定：`.tmp/e2e/desktop-smoke/*`（日志、截图）。

---

## 6. 迁移阶段（Phases）

> 详细可执行步骤见实现计划：`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration.md`

1. **Phase 1：接入 Tailwind 工具链（零视觉风险）**
2. **Phase 2：引入共享原语（内部先复用旧语义类/旧实现，零视觉风险）**
3. **Phase 3：页面迁移为“消费原语”（零视觉风险，重点是消费方式变更）**
4. **Phase 4：原语实现切换为 Tailwind utilities（逐个原语替换并验收）**
5. **Phase 5：收口与清理（删除废弃 CSS、建立 guardrails、补回归）**
6. **Phase 6：桌面 UI 自动化增强 + debug 入口固化（可选升级为 CI gate）**

---

## 7. 风险与对策（Risks）

1. **测试选择器被样式改动拖死**  
   对策：逐步把测试从 `.btn-*` 等样式类迁到更稳定的可达性选择器（role/label）或显式 `data-testid`。
2. **Tailwind 与现有 CSS 层叠冲突**  
   对策：禁用 preflight；严格约束引入顺序；迁移期保留旧 CSS 直到确认无引用后删除。
3. **多主题被绕开（出现第二套色值系统）**  
   对策：Tailwind theme 映射到 `--ui-*`；禁止 arbitrary color；必要时加简单的 repo-level grep gate（计划内）。

