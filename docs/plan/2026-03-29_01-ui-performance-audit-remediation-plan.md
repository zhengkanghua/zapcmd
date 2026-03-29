# 2026-03-29 UI 性能审查与定向优化计划

## 目标

只处理本轮 `audit` 中的 `P0/P1/P2` 性能问题，不改视觉方向，不处理非性能审查项。

## 审查结论摘要

1. `P1` 搜索抽屉存在过量首屏渲染：`LauncherSearchPanel` 当前会把全部 `filteredResults` 一次性挂到 DOM，视口最多显示 10 行，但渲染上限可到 500 条。
2. `P1` 搜索高亮存在重复计算：每条结果的标题、命令、目录、分类都通过 `LauncherHighlightText` 即时调用 `splitHighlight()`。
3. `P2` 搜索过滤链路重复做字符串归一化和全量排序：`useLauncherSearch` 每次输入都会重新构造比较文本并对匹配集完整排序。
4. `P2` Settings 命令管理链路存在重复全量遍历：`useCommandManagement` 的 summary/options/filter 派生链路复用了同一批数据，但尚未共享归一化结果。

## 当前基线

- `npm run build`
  - `dist/assets/index-xWhuSHJq.js` = `166065 B`
  - `dist/assets/useMainWindowShell-cFHlzoOO.js` = `157168 B`
  - `dist/assets/main-CEE3z4LU.js` = `98338 B`
  - `dist/assets/settings-CCOaq7Gv.js` = `49202 B`
  - `dist/assets/index-DG4QwTD3.css` = `77729 B`
- 搜索抽屉当前行为：`.result-item` 数量严格等于 `filteredResults.length`
- Settings 命令管理当前行为：首屏 120 行，后续按 chunk 补齐

## 实施范围

### Task 1

- 目标：为搜索抽屉补“首屏分批渲染 + 渐进补齐”测试
- 文件：
  - `src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
- 验收：
  - 先写失败测试
  - 覆盖“长结果集初始只渲染首批”和“activeIndex 超出首批时自动扩容”

### Task 2

- 目标：实现搜索抽屉分批渲染，降低首屏 DOM 和高亮成本
- 文件：
  - `src/components/launcher/parts/LauncherSearchPanel.vue`
  - `src/components/launcher/types.ts`
  - `src/composables/app/useAppCompositionRoot/launcherVm.ts`
  - 必要时补相关 glue code
- 验收：
  - 不破坏键盘导航、drawer inert、焦点与现有回归
  - 长结果集首屏只挂载受控前缀

### Task 3

- 目标：收紧搜索链路内部计算
- 文件：
  - `src/composables/launcher/useLauncherSearch.ts`
  - `src/components/launcher/parts/LauncherHighlightText.vue`
  - `src/features/launcher/highlight.ts`
- 验收：
  - 保持现有搜索排序与高亮行为不变
  - 复用归一化搜索文本和高亮拆分结果，避免重复计算

### Task 4

- 目标：收紧 Settings 命令管理派生链路
- 文件：
  - `src/composables/settings/useCommandManagement.ts`
  - `src/composables/__tests__/settings/useCommandManagement.test.ts`
- 验收：
  - 现有筛选/排序/summary 行为保持一致
  - 共享行级归一化结果，减少重复遍历

## 验证计划

1. focused tests
   - `npm test -- src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts`
   - `npm test -- src/composables/__tests__/launcher/useLauncherSearch.test.ts`
   - `npm test -- src/composables/__tests__/settings/useCommandManagement.test.ts`
   - 必要时补相关组件 focused tests
2. 全量门禁
   - `npm run check:all`
3. 复审输出
   - before/after 首屏渲染数量
   - before/after 关键构建产物
   - 非性能问题继续记录，不在本轮处理
