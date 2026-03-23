# Tailwind Primitives Migration（C：页面消费原语）设计稿（总览）

> **日期**：2026-03-23  
> **状态**：Draft（讨论通过后执行）  
> **范围**：仅在开发分支试验（不直接合并到 `main`）  

## 0. 背景（Why）

仓库当前已有一套相对工程化的 CSS 架构：

- 样式入口：`src/styles/index.css`（按 reset/themes/tokens/shared/launcher/settings/animations 分层）
- 多主题：`data-theme` + CSS Variables 双层变量（`--theme-*` → `--ui-*`）
- 快速回归：存在样式契约测试 `src/styles/__tests__/launcher-style-contract.test.ts`

引入 Tailwind 的动机不在于“性能更快”，而在于：

1) **开发效率与一致性**：减少写 CSS 时的命名/层叠/定位成本，把常见布局/间距/排版表达变成更可组合的原子接口。  
2) **可维护性**：让“控件样式”集中到可复用原语（Primitives），提升可删性与可演进性，避免 CSS 继续膨胀。  

---

## 1. 核心结论（必须先对齐）

1) **即使“全量 Tailwind”，仍需要 CSS**：运行时多主题切换的最佳实践是 CSS Variables + `data-theme`，这部分不会被 Tailwind 取代。  
2) 本次选择 **C：页面主要消费原语**：Tailwind utilities 主要写在原语内部；页面只保留少量布局类（grid/flex/gap），避免退化为“页面到处堆 class 串”。  
3) 迁移目标是 **视觉零差异（阶段性验收）**：先不改视觉 → 先改消费方式 → 再改实现方式 → 最后清理旧 CSS。  

---

## 2. 文档拆分（减少上下文污染）

### Phase Specs（按顺序阅读/执行）

1) Phase 1：工具链 + 快速验证  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-1-toolchain-and-fast-validation-design.md`

2) Phase 2：共享原语 + 迁移消费方式（视觉零差异）  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-2-primitives-consumption-design.md`

3) Phase 3：原语 Tailwind 化 + 清理旧 CSS + Guardrails  
`docs/superpowers/specs/2026-03-23-tailwind-primitives-migration-phase-3-tailwindize-and-guardrails-design.md`

### Phase Plans（按顺序执行）

1) Phase 1 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-1-toolchain-and-fast-validation.md`

2) Phase 2 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-2-primitives-consumption.md`

3) Phase 3 Plan  
`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-3-tailwindize-and-guardrails.md`

---

## 3. 决策与约束（Decisions）

### 3.1 禁用 Tailwind Preflight（为了零差异与避免 reset 冲突）

- `tailwind.config.cjs`：`corePlugins.preflight = false`
- reset 继续由 `src/styles/reset.css` 负责（不引入第二套 reset）

### 3.2 Token 映射策略（避免第二套设计语言）

- Tailwind theme 的 `extend` 优先映射到 `--ui-*`（如 `radius/shadow/font` 等）
- 禁止在模板里硬编码色值（含 arbitrary color），避免绕开主题系统

---

## 4. 验收策略（Testing）

你提到的“开发时一条命令验证某个流程”，优先走 **Vitest focused**：

- watch：`npm test -- <test-file>`
- run：`npm run test:run -- <test-file>`
- related：`npm run test:related`

桌面 E2E（`tauri-driver + WebDriver`）保留为“补充验证”，不作为每次 UI 调整的默认路径。

---

## 5. 风险与对策（Risks）

1) **测试选择器被样式改动拖死**  
   对策：逐步从 `.btn-*` 等样式类迁到 role/label 或 `data-testid`。  
2) **Tailwind 与现有 CSS 层叠冲突**  
   对策：禁用 preflight；严格控制 `src/styles/index.css` 引入顺序；迁移期不急删旧 CSS。  
3) **多主题被绕开（出现第二套色值系统）**  
   对策：Tailwind theme 映射到 `--ui-*`；引入 guardrails 脚本，阻止硬编码色值回流。  

