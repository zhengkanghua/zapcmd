# Tailwind Primitives Migration Phase 3 设计稿：原语 Tailwind 化 + Guardrails

> 日期：2026-03-23  
> 状态：Draft  
> 范围：开发分支内试验  

## 1. 目标

1) 将共享原语的内部实现逐步切换为 Tailwind utilities，并对齐旧视觉。  
2) 在确认无引用后清理旧 CSS（先 `rg` 再删除）。  
3) 引入样式 guardrails：阻止硬编码色值/任意色值回流，确保主题体系只通过 `--ui-*` 消费。  

## 2. Tailwind 与多主题的结合方式

- 多主题仍由 `data-theme` + `--theme-*`/`--ui-*` 驱动
- Tailwind theme `extend` 只映射到 `--ui-*`（避免第二套 palette）
- 页面禁止 arbitrary color（如 `text-[#fff]`）

## 3. 迁移原则

- 一次只 Tailwind 化一个原语
- 每次迁移都要：focused PASS → `check:all` PASS → `rg` 确认无引用 → 再删旧 CSS

## 4. 验收标准

- 目标原语已由 Tailwind 实现且视觉对齐
- 旧 `.btn-*` 在调用点侧无引用（可以被删除）
- `check:style-guard` + `npm run check:all` PASS

