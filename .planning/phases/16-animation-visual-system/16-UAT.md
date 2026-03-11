---
status: complete
phase: 16-animation-visual-system
source:
  - 16-01-SUMMARY.md
  - 16-02-SUMMARY.md
  - 16-03-SUMMARY.md
started: 2026-03-11T09:48:40+08:00
updated: 2026-03-11T11:22:14+08:00
---

## Current Test

[testing complete]

## Tests

### 1. 品牌色与成功色语义分离（品牌=青色，成功=绿色系）
expected: 交互激活态统一用品牌青色；执行成功反馈用 success 绿色；两者不混用。
result: pass
reported: "这个颜色不怎么好看；选中不要做边框颜色（参考 docs/bug_img/c2b4fc84-0d54-48ba-bd05-06e8f2a7d6d6.png）；成功语义可继续用绿色。"
reported_followup: "最外边一层蓝色改为灰色；'#dev' 标签改普通颜色，背景改为鼠标悬浮同款灰色；竖线保留用于区分当前选中。"
severity: cosmetic
note: "已按反馈把列表区域的外圈蓝色改灰、#tag 改普通色并用 hover 灰背景、保留竖线区分当前选中；请复验。"

### 2. Review 开合动效时序与体感（约 200ms）
expected: opening：先 dim 再面板滑入；closing：先面板滑出再 dim 消失；整体克制不卡顿、不弹跳。
result: pass

### 3. Windows 下快速开合 Review 时 resize 稳定性
expected: 连续快速开合 Review 5-10 次，窗口尺寸不抖动/闪动；若有动画仅发生在内容区内部。
result: pass

### 4. 默认透明度为 0.96，且滑块范围仍为 0.2~1.0
expected: 主窗口默认观感更“实”（背景噪音更低）；设置页透明度滑块默认约 96%，可调到 0.2~1.0 且立即生效。
result: issue
reported: "透明度好像不生效，我拖到100，还是看得到下面的内容。"
severity: major
note: "已把窗口底色从 transparent 改为随 --ui-opacity 变化的背景色（src/styles.css）。请复验。"
result_after_fix: pass

### 5. 透明度修复后回归（拖到 100% 应不透）
expected: 设置页透明度拖到 100% 不透；拖到 20% 更通透。
result: pass

## Summary

total: 5
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "结果列表/队列列表的选中态不使用彩色边框（更接近 Edge 截图那种纯背景高亮），success 语义继续用绿色"
  status: fixed
  reason: "User reported: 颜色不好看，选中不要彩色边框；最外边一层蓝色改为灰色；'#dev' 标签改普通颜色且背景用 hover 灰色；竖线保留区分当前选中；成功语义继续用绿色；参考截图。"
  severity: cosmetic
  test: 1
  root_cause: "列表区域多处使用 brand（蓝色）表达选中/焦点/标签，导致与搜索高亮语义冲突。"
  artifacts:
    - path: "src/styles.css"
      issue: "result-item 的 focus/active/标签使用 ui-brand；staging-card--active 使用 ui-brand 边框"
  missing:
    - "列表区域选中/焦点/标签改灰系，保留竖线区分 active，避免与搜索高亮抢语义"
  debug_session: ""

- truth: "设置页透明度拖到 100% 时，窗口背景不应透出桌面/下层内容"
  status: fixed
  reason: "User reported: 拖到 100% 仍能看到下面的内容。"
  severity: major
  test: 4
  root_cause: "窗口根节点（html/body/#app）背景为 transparent，导致即使 --ui-opacity=1 也会透出桌面/下层内容。"
  artifacts:
    - path: "src/styles.css"
      issue: "html/body/#app 背景透明"
  missing:
    - "为窗口根节点增加随 --ui-opacity 变化的底色（window bg）"
  debug_session: ""
