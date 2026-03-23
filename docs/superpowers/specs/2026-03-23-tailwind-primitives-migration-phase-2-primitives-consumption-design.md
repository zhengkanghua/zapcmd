# Tailwind Primitives Migration Phase 2 设计稿：共享原语 + 迁移消费方式

> 日期：2026-03-23  
> 状态：Draft  
> 范围：开发分支内试验  

## 1. 目标

1) 建立跨窗口共享原语（先从 Button 系列开始）。  
2) 页面/业务组件主要消费原语，减少直接依赖全局语义类（如 `.btn-*`）的调用点。  
3) **视觉零差异**：本 Phase 只改消费方式，不改视觉实现；原语内部第一版复用旧 `.btn-*` 或现有组件。  

## 2. 原语边界（Primitives-First 的含义）

- 原语负责：视觉规范、交互态（hover/focus/disabled）、a11y（aria-label/focus-visible）、多主题 token 的消费方式。
- 页面负责：业务状态与组合编排；允许少量布局 utilities（grid/flex/gap），但禁止堆长 class 串实现控件外观。

## 3. 测试策略

- 为原语新增 characterization tests：锁 API 与关键状态，不锁内部实现细节。
- 迁移调用点时，每改一个组件就跑该组件的 focused tests（避免积累大 diff）。

## 4. 验收标准

- 调用点迁移后 UI 视觉不变
- `test:flow:launcher` / `test:flow:settings` PASS
- `npm run check:all` PASS

