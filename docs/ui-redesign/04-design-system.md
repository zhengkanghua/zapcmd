# 04. Design System

## 目标气质

本次重构希望把 ZapCmd 从“工程师工具感”提升为“专业开发者产品感”。

关键词：

- 克制
- 冷静
- 专业
- 高级深色
- 强层级
- 低噪音
- 键盘优先

不追求：

- 赛博朋克霓虹
- 高透明磨砂炫技
- 夸张渐变
- 绿色满屏
- 过度装饰性图标

## 品牌与状态分离

### 新规则
- **品牌色**：只负责产品识别、主按钮、激活态、选中态
- **成功色**：只负责成功/启用/通过
- **危险色**：只负责风险/删除/错误
- **警告色**：只负责提醒/需确认

### 不再允许
- 用绿色同时表示“品牌”和“成功”
- 用同一种绿色既做按钮又做列表高亮又做成功反馈

## 推荐配色方案

### 方案 Alpha（推荐）— Slate Indigo

这是最适合 ZapCmd 的主配色。

| Token | Value | 用途 |
|------|-------|------|
| `bg.app` | `#0B0E14` | 全局背景 |
| `bg.surface` | `#131824` | 主表面 |
| `bg.surface-elevated` | `#1A2130` | 浮层/Review/卡片 |
| `bg.surface-soft` | `#20283A` | hover / 次级面 |
| `border.default` | `#252C3B` | 默认边框 |
| `border.strong` | `#313A4E` | 强边框 |
| `text.primary` | `#F3F6FF` | 主文本 |
| `text.secondary` | `#A6AEC7` | 次文本 |
| `text.tertiary` | `#7F89A5` | 弱文本 |
| `brand.primary` | `#7C8CFF` | 主品牌/主按钮/激活态 |
| `brand.hover` | `#93A0FF` | 品牌 hover |
| `brand.soft` | `rgba(124, 140, 255, 0.16)` | 选中背景 |
| `info` | `#57C7FF` | 信息/链接 |
| `success` | `#31C48D` | 成功/启用 |
| `warning` | `#F2B94B` | 警告 |
| `danger` | `#FF6B7A` | 错误/删除 |

### 方案 Beta — Graphite Cyan

适合更冷、更“工具型”的版本。

| Token | Value |
|------|-------|
| `bg.app` | `#0A1015` |
| `bg.surface` | `#111922` |
| `brand.primary` | `#4CC9F0` |
| `brand.soft` | `rgba(76, 201, 240, 0.16)` |
| `success` | `#2DD4BF` |
| `danger` | `#FB7185` |

### 方案 Gamma — Ink Amber

适合更稳重、偏“高级工具箱”的版本。

| Token | Value |
|------|-------|
| `bg.app` | `#0D0F12` |
| `bg.surface` | `#161A20` |
| `brand.primary` | `#D6A94B` |
| `brand.soft` | `rgba(214, 169, 75, 0.16)` |
| `success` | `#3DBB78` |
| `danger` | `#F87171` |

## 推荐字体

### 首选
- UI：`IBM Plex Sans`
- Code / Command：`JetBrains Mono`

原因：

- `IBM Plex Sans` 在开发者工具里非常稳定，易读且有技术感
- `JetBrains Mono` 用在命令预览和参数文本上自然且专业

### 备选
- UI：`Inter`
- Code：`JetBrains Mono`

## 尺寸系统

### 圆角
- `radius.sm = 8px`
- `radius.md = 12px`
- `radius.lg = 16px`
- `radius.xl = 20px`

建议：
- 主窗口外壳：`16px`
- 卡片 / 结果项 / 输入框：`12px`
- 小 badge / pill：`999px`

### 间距
- `space.2 = 8px`
- `space.3 = 12px`
- `space.4 = 16px`
- `space.5 = 20px`
- `space.6 = 24px`

建议：
- 主窗口内边距至少 `16px`
- Settings 卡片间距 `16px~20px`
- 大区块之间不要低于 `24px`

## 表面与透明度

### 透明度策略
- 不再让壁纸成为主视觉
- 主表面建议实度更高：`0.94 ~ 0.98`
- 只有高层浮面允许轻微透明

### 阴影策略
- 不要大而糊的黑影
- 用短距离、低透明、层次分明的影子

建议：
- `shadow.surface = 0 12px 28px rgba(0, 0, 0, 0.28)`
- `shadow.overlay = 0 18px 42px rgba(0, 0, 0, 0.36)`

## 组件视觉规则

### 启动器搜索框
- 高度建议 `48px ~ 52px`
- 主搜索输入要明显大于次级文本
- 搜索框不使用过亮描边，聚焦时用品牌色柔和高亮

### 结果项
- 单条高度建议 `76px ~ 84px`
- 左对齐强层级：标题 > 预览 > 元信息
- 选中态使用品牌色软底 + 左侧高亮线即可
- 不要继续用大量绿色作为选中底色

### 队列 / Review 项
- 用宽卡片，不要窄栏堆代码
- 默认展示：标题、摘要、参数 badge、执行摘要
- 完整命令放在展开区或详情区

### Settings
- 左侧导航统一 SVG 图标
- 右侧内容改成卡片分组，不再整页铺开
- 顶部增加页头区：标题 + 一句说明
- 底部操作条 sticky，明确显示“是否有未保存改动”

## 动效规则

- 总体动效时长：`160ms ~ 220ms`
- 不做大位移，不做弹跳，不做 scale 抖动
- 模式切换要稳，像“切到另一个工作态”，不是“弹出玩具层”

## 禁忌清单

- 不要再使用 Unicode 符号充当主要导航图标
- 不要让彩色壁纸透出成为主视觉
- 不要继续用绿色做品牌主色
- 不要在主界面长期并列两个大滚动区
- 不要在主列表里直接显示太多完整长命令

## CSS Token 草案

```css
:root {
  --bg-app: #0b0e14;
  --bg-surface: #131824;
  --bg-surface-elevated: #1a2130;
  --bg-surface-soft: #20283a;

  --border-default: #252c3b;
  --border-strong: #313a4e;

  --text-primary: #f3f6ff;
  --text-secondary: #a6aec7;
  --text-tertiary: #7f89a5;

  --brand-primary: #7c8cff;
  --brand-hover: #93a0ff;
  --brand-soft: rgba(124, 140, 255, 0.16);

  --state-info: #57c7ff;
  --state-success: #31c48d;
  --state-warning: #f2b94b;
  --state-danger: #ff6b7a;

  --radius-md: 12px;
  --radius-lg: 16px;
  --shadow-surface: 0 12px 28px rgba(0, 0, 0, 0.28);
  --shadow-overlay: 0 18px 42px rgba(0, 0, 0, 0.36);
}
```

## B4 布局与遮罩规则

### 内部 shell 遮罩
- Review 的 dim / blur / 遮罩只允许出现在内部圆角 shell 中。
- 不允许对整个原生窗口做整窗遮罩。
- 原因：当前产品存在圆角与半透明背景，整窗遮罩会暴露原生窗口边界和承载层，观感很差。

### 拖拽区独立
- 搜索框上方拖拽区不属于内容区。
- B4 的 floor height 计算不应把拖拽区计入。
- Review Overlay 也不应吞掉顶部拖拽语义。

### 搜索抽屉补高方式
- 仅允许使用 filler / spacer / visual floor layer 补足搜索抽屉高度。
- 不允许伪造额外搜索结果项。
- 不允许为了凑高而向结果数组塞入假数据。

### Review 高度策略
- 采用最小可视高度 + 内部滚动。
- 不追求随着队列项数量持续拉高窗口。
- 优先保持窗口形态稳定。
