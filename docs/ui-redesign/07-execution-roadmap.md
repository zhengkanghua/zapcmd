# 07. Execution Roadmap

## 当前已锁定方向

本次重构的唯一结构方案为：

**B4 = Overlay Review Mode with Floor Height Protection**

后续不再回到 A / B / C 的横向比较，以避免讨论反复发散。

## 范围收窄说明

### 本轮只做
- launcher 主窗口
- Search / Review 结构
- 主窗口热键语义
- 主窗口尺寸与视觉系统

### 本轮不做
- `settings` 并入 launcher
- `settings` 独立窗口重构
- `settings` 视觉系统升级

`settings` 继续保持独立窗口，这个边界不动。

## 总原则

这次重构建议分两段：

1. **方向固化阶段**：基于 B4 出主窗口 Demo、校准主窗口视觉系统
2. **工程实施阶段**：按 B4 正式进入主窗口代码重构

当前处于第一段的后半段：
- 结构已锁定
- 文档已收敛
- 下一步是用 B4 Prompt 出 Demo 并做细节校准

## 当前唯一推荐路线

### Step 1：基于 B4 出外部 Demo

目标：
- 验证 B4 在真实视觉下是否足够自然
- 验证“1 条结果 -> 补足左侧抽屉高度 -> 拉出 Review”的体验是否顺滑
- 验证 Review 面板加宽后，长命令是否明显更可读

### Step 2：评审 Demo

只看下面 5 个问题：

1. 搜索态是否足够单焦点
2. Review 打开时是否保留了足够的搜索上下文
3. 1 条结果时，B4 的 floor height protection 是否自然
4. 长命令在 Review 中是否终于不挤
5. Review 遮罩是否只发生在内部 shell，而不是整窗

### Step 3：锁定 Demo 细节参数

在进入代码前，把下列参数也锁定：

- `drawerFloorHeight = 322px`
- Review panel 宽度范围
- Review 内部卡片密度
- 是否保留实时动态 resize
- 关闭 Review 后是否立即回收高度

## 正式执行建议波次

## Wave 1：B4 布局与尺寸底座

目标：先把窗口尺寸与 Review floor protection 做对。

包含内容：
- `drawerFloorHeight`
- `searchDrawerFiller`
- `reviewTargetContentHeight`
- Review Overlay 的挂载方式
- 不计入拖拽区的高度测量规则

## Wave 2：主窗口 Review Overlay 接入

目标：把当前常驻右栏改成 B4 Overlay。

包含内容：
- `LauncherWindow` 结构调整
- 搜索态与 Review 态的前景/背景层次
- Review 面板宽度调整
- 队列卡片滚动与操作区布局
- 背景不可交互

## Wave 3：键盘 / 焦点 / 关闭语义收口

目标：让 B4 的搜索态与 Review 态都能被稳定地键盘操作。

包含内容：
- `Ctrl+Tab` 打开 Review
- `Esc` 关闭 Review
- Review 内部焦点锁定
- 搜索态返回焦点恢复
- 相关回归测试更新

## Wave 4：动画与体验优化

目标：在结构和稳定性都正确后，再决定动画强度。

包含内容：
- 实时动态 resize 验证
- 若抖动明显，则退回单次 resize + 内部动画
- Review 进出动画的时序打磨
- dim / blur / overlay 微调

## 建议的决策闸门

### Gate 1：Demo 视觉确认
- B4 的开合是否自然
- 322px floor 是否合适
- Review 宽度是否足够支撑长命令阅读

### Gate 2：工程策略确认
- 是否先试实时动态 resize
- 若抖动是否接受退回单次 resize

### Gate 3：实施边界确认
- 本轮只做主窗口 B4，不同时引入额外新功能
- `settings` 继续保持独立窗口，不纳入本轮开发
- 旧 staging 数据与执行链先不大改

### Gate 4：进入正式代码阶段
- 当 1~3 都确认后，再进入正式 phase / 执行计划

## 手动验收清单

- [ ] 用户进入主窗口后，仍然只有一个主要工作区
- [ ] 打开 Review 后，搜索上下文仍可见但不可交互
- [ ] 1 条结果时，Review 打开不会显得过矮或割裂
- [ ] 左侧抽屉 floor protection 没有伪造结果数据
- [ ] Review 面板更宽，长命令明显更可读
- [ ] 拖拽区未被遮罩吞掉
- [ ] 遮罩只发生在内部 shell，不暴露整窗边界
- [ ] 本轮没有把 `settings` 并入 launcher

## 与当前仓库规划体系的关系

本目录是 **前置设计工作区**。

下一步建议：

1. 用 `docs/ui-redesign/06-demo-prompts.md` 生成 B4 主窗口 Demo
2. 基于 Demo 微调尺寸与视觉令牌
3. 然后把 B4 正式迁移到 `.planning/phases/` 的执行规划中
