# 全局 Motion Preset 设计文档

> **日期**：2026-03-28  
> **状态**：设计已确认，待进入 implementation plan  
> **范围**：仅在开发分支试验（不直接合并到 `main`）  
> **分支**：`feat/review-remediation`

## 0. 背景（Why）

当前项目的动画已经有一条真实且可用的主线，但它仍是“单套基线”，还不具备可切换的架构：

1. 现有动画语义已经集中在 [tailwind.config.cjs](/home/work/projects/zapcmd/tailwind.config.cjs) 中，例如：
   - `animate-launcher-toast-slide-down`
   - `animate-launcher-review-overlay-panel-in`
   - `animate-launcher-staging-panel-enter`
   - `animate-launcher-dialog-scale-in`
   - `ease-nav-slide`
   - `ease-launcher-emphasized`
2. 现有主题链路已经很清晰：  
   [src/features/themes/themeRegistry.ts](/home/work/projects/zapcmd/src/features/themes/themeRegistry.ts)  
   [src/composables/app/useTheme.ts](/home/work/projects/zapcmd/src/composables/app/useTheme.ts)
3. 现有设置持久化也已经有完整的 `defaults -> normalization -> migration -> store -> UI` 链路：  
   [src/stores/settings/defaults.ts](/home/work/projects/zapcmd/src/stores/settings/defaults.ts)  
   [src/stores/settings/normalization.ts](/home/work/projects/zapcmd/src/stores/settings/normalization.ts)  
   [src/stores/settings/migration.ts](/home/work/projects/zapcmd/src/stores/settings/migration.ts)  
   [src/stores/settingsStore.ts](/home/work/projects/zapcmd/src/stores/settingsStore.ts)  
   [src/components/settings/parts/SettingsAppearanceSection.vue](/home/work/projects/zapcmd/src/components/settings/parts/SettingsAppearanceSection.vue)
4. 这说明“多套动画”不需要另起一套平行系统，最合理的方向是复用当前 theme/settings 的架构经验，做一层全局 motion preset，而不是让组件各自分叉。

本次设计的目标不是“发明更多动画”，而是把当前偏弹性、偏氛围化的基线保留下来，同时增加第二套更像桌面工具的稳态 preset，并确保后续继续扩展第三套时不会失控。

---

## 1. 已确认约束（来自本轮讨论）

用户已明确确认以下设计边界：

1. 做 **全局多套动画 preset**，不是让每个组件各自切动画风格。
2. 当前动画保留为默认 preset，不做替换。
3. 第二套 preset 方向已确认：
   - 从现在偏弹性、偏氛围化的感觉，收成更像桌面工具的“稳、准、停得干净”
   - 抽屉、面板、 toast 仍然滑入 / 淡入
   - 减少 overshoot 和回弹
   - 按钮、卡片保留颜色 / 阴影 / 透明度 / 少量位移反馈
4. 作用范围是 **全局**：
   - Launcher
   - Settings
5. 当前默认值继续保留为现有基线；第二套为用户可选项。
6. 当前已经通过 visual companion 对比收敛到：
   - 默认基线：`expressive`
   - 第二套预设：`steady-tool`
   - 收紧幅度：中度收紧
7. 本轮只落实文档，不直接实现代码。

---

## 2. 方案对比（Approaches）

### 方案 1：组件内双份 class / `if else` 分叉

每个动画组件自己判断当前 preset，然后切换不同 class、不同 easing、不同 keyframes。

优点：

- 直觉上容易开工
- 局部试验快

缺点：

- 组件模板会迅速被 `preset === "steady-tool" ? ... : ...` 污染
- 很难保证 Launcher 和 Settings 的动效语言持续一致
- 后续新增第三套 preset 时复杂度指数上升
- 视觉回归和行为测试都会变得脆弱

### 方案 2：全局 preset + registry + root dataset + CSS motion token（采用）

让组件继续使用现有语义动画 class，但这些 class 不再写死具体数值，而是改为消费根节点上的 `--motion-*` token；切换 preset 时，只切换根节点 `data-motion-preset` 与对应 token 集。

优点：

- 组件不需要双份模板分支
- Launcher 与 Settings 可以共享同一套运动语言
- 后续新增第三套 preset 时，只需要新增 registry 元数据和 token 集
- 与现有 theme 系统非常相似，认知成本低

缺点：

- 需要先把现有“硬编码 duration/easing/位移”的动效热点收口到 token
- 第一轮实现要做一次运动面清点（inventory）

### 方案 3：按组件/模块开放独立动画开关

例如 Launcher 一套、Settings 一套、Toast 一套、Dialog 一套，由用户分别选择。

优点：

- 自定义程度最高

缺点：

- 复杂度远超当前需求
- UI 配置负担重
- 最终产品会失去一致的动效语法

**结论：采用方案 2。**  
我们不做“组件各自动画开关”，而是做“全局 motion preset”。默认保留当前动画；第二套 `steady-tool` 作为可选项。组件继续使用语义 class，preset 切换只改变根节点 dataset 和一组 `--motion-*` token。

---

## 3. 目标与非目标（Goals / Non-goals）

### 3.1 目标

1. 让动画像主题一样成为一等公民设置项，而不是散落在组件里的隐式实现细节。
2. 保持默认 `expressive` 与当前基线 **零差异或近零差异**。
3. 增加第二套 `steady-tool`，覆盖 Launcher + Settings 的核心交互面。
4. 让后续继续扩第三套 preset 时，只在 registry / token / UI 入口上做增量，不需要重写组件。
5. 将“多套动画”控制在可测试、可回滚、可视觉回归的工程边界内。

### 3.2 非目标

1. 本轮不实现第三套 preset。
2. 本轮不做“每个组件单独选择动画风格”。
3. 本轮不新增用户级“自定义 duration/easing 面板”。
4. 本轮不把所有 `duration-*` / `ease-*` 一次性全仓抽象化；只覆盖真正影响 preset 体验的运动面。
5. 本轮不改变系统级 `prefers-reduced-motion` 的优先级，OS reduced motion 仍然高于 preset。

---

## 4. 命名与信息架构

### 4.1 preset 命名

当前设计稿采用以下两个 preset：

1. `expressive`
   - 默认值
   - 对应当前项目已经上线的偏弹性、偏氛围化动效基线
2. `steady-tool`
   - 新增可选项
   - 对应更稳、更准、停得更干净的桌面工具风格

命名要求：

- `id` 只使用小写短横线，保持与主题 registry 一致
- `name` / `description` 供 Settings UI 展示
- `id` 一旦落存储，不再轻易改名，避免迁移噪音

### 4.2 设置归属

新增设置项：

- `appearance.motionPreset`

原因：

1. 它和 `theme`、`windowOpacity`、`blurEnabled` 一样，属于用户对整体观感的偏好。
2. 当前 [SettingsAppearanceSection.vue](/home/work/projects/zapcmd/src/components/settings/parts/SettingsAppearanceSection.vue) 已是主题 / 模糊 / 透明度的真实入口，把 motion preset 放在同一区域最自然。
3. 这能直接复用现有 settings store / migration / normalization / bootstrap 机制。

---

## 5. 总体架构（Architecture）

### 5.1 新增模块

建议新增以下结构：

1. `src/features/motion/motionRegistry.ts`
   - 只负责 preset 元数据注册与解析
2. `src/composables/app/useMotionPreset.ts`
   - 负责将当前 preset 应用到 `document.documentElement`
3. `src/styles/motion.css`
   - 定义各 preset 的 `--motion-*` token
4. [src/styles/index.css](/home/work/projects/zapcmd/src/styles/index.css)
   - 引入 `motion.css`

### 5.2 设计原则

与现有 theme 系统对齐，但不完全复制：

1. **registry 是元数据源**
   - 用于 UI 列表、fallback、测试
2. **CSS 是 motion token 的数值源**
   - duration / easing / distance / scale 等值写在 CSS preset scope 中
3. **hook 只负责应用 preset**
   - 即切换 `data-motion-preset`
   - 不在 JS 中逐个 `style.setProperty("--motion-*")`

这样做的原因：

1. 动画参数本质上是样式系统的一部分，更适合留在 CSS 层表达。
2. 运行时只切 dataset，复杂度比逐项写 style 更低。
3. 样式契约测试、视觉回归和未来多主题共存都会更简单。

### 5.3 根节点 contract

根节点统一挂在 `document.documentElement`：

- `data-theme`
- `data-blur`
- `data-motion-preset`

最终 contract 形态：

```html
<html
  data-theme="obsidian"
  data-blur="on"
  data-motion-preset="expressive"
>
```

这样 Launcher 与 Settings 两个窗口都沿用同一套根 contract，不再额外引入窗口级 preset 状态。

---

## 6. 数据模型与持久化

### 6.1 registry 结构

`motionRegistry.ts` 采用与 theme registry 对齐的最小结构：

```ts
export interface MotionPresetMeta {
  id: string
  name: string
  description: string
}
```

初始 registry：

1. `expressive`
2. `steady-tool`

并提供：

- `MOTION_PRESET_REGISTRY`
- `DEFAULT_MOTION_PRESET_ID`
- `resolveMotionPresetMeta(id)`

### 6.2 settings store 变更

以下文件都要纳入后续实现范围：

1. [src/stores/settings/defaults.ts](/home/work/projects/zapcmd/src/stores/settings/defaults.ts)
2. [src/stores/settings/normalization.ts](/home/work/projects/zapcmd/src/stores/settings/normalization.ts)
3. [src/stores/settings/migration.ts](/home/work/projects/zapcmd/src/stores/settings/migration.ts)
4. [src/stores/settingsStore.ts](/home/work/projects/zapcmd/src/stores/settingsStore.ts)

需要新增：

1. `DEFAULT_MOTION_PRESET = "expressive"`
2. `PersistedSettingsSnapshot.appearance.motionPreset`
3. `normalizeMotionPresetId()`
4. `setMotionPreset()`

### 6.3 migration 策略

迁移策略保持保守：

1. 老用户若没有 `appearance.motionPreset`，自动补默认值 `expressive`
2. 已存在但非法的值，回退到 `expressive`
3. 不做“根据老用户行为推测更适合哪套动画”的智能迁移

理由：

- 当前项目已有真实动效基线，老用户默认不应感知变化
- `expressive` 对应当前行为，最安全

---

## 7. runtime 应用链路

### 7.1 `useMotionPreset`

`useMotionPreset.ts` 的职责应与 [useTheme.ts](/home/work/projects/zapcmd/src/composables/app/useTheme.ts) 保持同级抽象：

1. 监听 `motionPresetId`
2. 调用 `resolveMotionPresetMeta()`
3. 设置 `document.documentElement.dataset.motionPreset`
4. 返回 `presets: MOTION_PRESET_REGISTRY`

它不负责：

1. 直接维护 CSS token
2. 监听具体组件动画
3. 处理用户交互事件

### 7.2 接线位置

后续实现建议在两个真实入口都接上：

1. [src/composables/app/useAppCompositionRoot/context.ts](/home/work/projects/zapcmd/src/composables/app/useAppCompositionRoot/context.ts)
   - 主窗口链路
2. [src/AppSettings.vue](/home/work/projects/zapcmd/src/AppSettings.vue)
   - Settings 独立入口链路

原因：

1. 目前主题也是主窗口和 Settings 都独立应用，motion preset 应保持同样的确定性。
2. Settings 并不是通过 [src/App.vue](/home/work/projects/zapcmd/src/App.vue) 进入，而是独立走 [src/main-settings.ts](/home/work/projects/zapcmd/src/main-settings.ts) -> [src/AppSettings.vue](/home/work/projects/zapcmd/src/AppSettings.vue)。

### 7.3 bootstrap

建议在 [index.html](/home/work/projects/zapcmd/index.html) 与 [settings.html](/home/work/projects/zapcmd/settings.html) 的同步 bootstrap 中一起读取 `appearance.motionPreset`，并尽早设置：

- `document.documentElement.dataset.motionPreset`

这里不需要像主题那样额外注入背景色，只需要确保早期 DOM 已有正确 preset dataset。

这样做的收益：

1. 避免首轮交互时出现“先用默认 preset，挂载后再切换”的瞬态不一致
2. 让 Launcher / Settings 的初始动画语义更稳定
3. 能复用现有 bootstrap contract test 习惯

---

## 8. Motion Token Contract

### 8.1 token 分层

本设计不建议一开始就做过度抽象，而是按“足够共享、易于落地”的粒度划分：

1. **时长**
   - `--motion-duration-nav-enter`
   - `--motion-duration-nav-exit`
   - `--motion-duration-toast`
   - `--motion-duration-panel-enter`
   - `--motion-duration-panel-exit`
   - `--motion-duration-dialog-enter`
   - `--motion-duration-feedback`
   - `--motion-duration-press`
2. **easing**
   - `--motion-ease-emphasized`
   - `--motion-ease-standard`
   - `--motion-ease-exit`
3. **位移 / 幅度**
   - `--motion-distance-toast-y`
   - `--motion-distance-panel-y`
   - `--motion-distance-dialog-y`
   - `--motion-distance-card-hover-y`
4. **scale / 弹性相关**
   - `--motion-scale-dialog-enter`
   - `--motion-scale-press-active`

### 8.2 当前默认 preset：`expressive`

`expressive` 的原则是“与当前线上基线尽量零差异”：

1. `--motion-ease-emphasized` 继续对齐当前 `cubic-bezier(0.175,0.885,0.32,1.15)`
2. toast / panel / dialog 的位移与时长，继续对齐当前 [tailwind.config.cjs](/home/work/projects/zapcmd/tailwind.config.cjs) 的语义动画
3. press / hover 反馈保留当前轻微弹性感

换句话说，`expressive` 不是“新设计”，而是“把当前真实实现正式化”。

### 8.3 第二套 preset：`steady-tool`

`steady-tool` 的目标不是做成“完全无动画”，而是让动效更像桌面工具：

1. 进入类动画仍保留滑入 / 淡入
2. 收紧 overshoot
3. 减少回弹感
4. 缩短停留前的拖尾感
5. 按钮 / 卡片仍保留极轻的位移或缩放反馈

建议的初始收紧方向：

1. `--motion-ease-emphasized`
   - 从当前 overshoot 曲线换成更干净的 deceleration 曲线
   - 例如：`cubic-bezier(0.22,1,0.36,1)` 一类“快收、停得干净”的曲线
2. `--motion-distance-toast-y`
   - 相比当前减少约 20%~30%
3. `--motion-distance-panel-y`
   - 相比当前减少约 15%~25%
4. `--motion-distance-dialog-y`
   - 相比当前减少约 30% 左右
5. `--motion-scale-dialog-enter`
   - 从当前约 `0.95` 收紧到约 `0.975`
6. `--motion-scale-press-active`
   - 从当前约 `0.985` 收紧到约 `0.992`

这些值不要求在设计阶段锁死到最终小数点，但必须保证方向明确：

- 不是“更炫”
- 不是“更快但更硬”
- 而是“少一点弹，多一点稳”

### 8.4 Launcher / Settings 的共享边界

共享 token 应优先覆盖：

1. nav slide
2. drawer / panel enter-exit
3. dialog enter
4. toast feedback
5. 通用 press / hover lift

只有在真实需要时，才允许增加少量窗口专属 token，例如：

- `--motion-launcher-panel-enter-y`
- `--motion-settings-card-hover-y`

但默认策略是：

1. 先用共享 token
2. 只有当共享 token 无法同时满足两个窗口时，再新增专属 token
3. 禁止为单个组件创建孤立 token

---

## 9. 动画面接入策略（Surface Inventory）

本功能不应该一上来全仓替换所有 transition class，而应优先覆盖“真正定义 preset 气质”的运动面。

### 9.1 第一优先级

1. Launcher 导航切页
   - [src/components/launcher/LauncherWindow.vue](/home/work/projects/zapcmd/src/components/launcher/LauncherWindow.vue)
2. Toast / staged feedback
   - [src/components/launcher/parts/LauncherCommandPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherCommandPanel.vue)
   - [src/components/launcher/parts/LauncherSearchPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherSearchPanel.vue)
   - [src/components/launcher/parts/LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue)
3. Flow review overlay / panel
   - [src/components/launcher/parts/LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue)
4. Staging panel enter-exit
   - [src/components/launcher/parts/LauncherStagingPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherStagingPanel.vue)
5. Safety dialog
   - [src/components/launcher/parts/LauncherSafetyOverlay.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherSafetyOverlay.vue)

### 9.2 第二优先级

1. Search result / staging card pressable feedback
2. Settings Appearance 中的 theme / motion card hover / active state
3. Settings 内部通用交互项（按钮、segment、toggle 的 motion 语义）

### 9.3 实现原则

1. 不做“全局搜 `duration-150` 然后一把替换”
2. 只把影响 preset 差异的交互表面收口到 motion token
3. 静态布局、纯色 hover、无动画的普通状态不纳入 motion preset 责任

---

## 10. 对现有 Tailwind 语义类的改造方式

### 10.1 动画 class 保持语义名不变，内部改为 token 驱动

例如当前：

- `animate-launcher-toast-slide-down`
- `animate-launcher-review-overlay-panel-in`
- `animate-launcher-staging-panel-enter`

后续仍保留这些 class 名，但其定义不再写死为固定常量，而是改成消费 `var(--motion-*)`。

这样做的好处：

1. 组件模板改动最小
2. preset 切换时不需要替换 class 名
3. 当前测试与视觉场景更容易延续

### 10.2 现有固定 easing / duration utility 的处理

当前很多组件仍直接写：

- `duration-150`
- `duration-200`
- `duration-250`
- `ease-launcher-emphasized`

设计上不建议在第一版把所有固定 utility 全改为变量版本。更稳妥的方式是：

1. 对最关键的 motion hotspot 增加或替换成 motion 语义 utility
2. 只有这些 hotspot 才接入 preset 差异
3. 非关键的固定过渡暂时保留原值

这能避免“为了多套 preset 把整个 Tailwind 体系翻掉”。

### 10.3 建议新增的 motion utility 方向

后续实现可按需在 [tailwind.config.cjs](/home/work/projects/zapcmd/tailwind.config.cjs) 中增加少量语义 utility，例如：

1. `ease-motion-emphasized`
2. `ease-motion-exit`
3. `duration-motion-nav-enter`
4. `duration-motion-nav-exit`
5. `duration-motion-press`

原则仍然是：

- 先少量、先关键
- 不把 config 变成“所有毫秒值的字典”

---

## 11. Settings UI 设计

### 11.1 放置位置

在 [SettingsAppearanceSection.vue](/home/work/projects/zapcmd/src/components/settings/parts/SettingsAppearanceSection.vue) 中新增 motion preset 区块，和主题区块并列，仍属于 Appearance。

建议结构：

1. 主题（theme）
2. 动画风格（motion preset）
3. 模糊 / 透明度（effects）
4. 预览（preview）

### 11.2 交互要求

1. motion preset 使用和主题相同的“卡片式单选”交互，而不是 dropdown。
2. 每个 preset 卡片提供：
   - 名称
   - 一句描述
   - 简短标签，例如“当前默认” / “更稳”
3. 默认值应明显标记为当前使用中。

### 11.3 为什么不用组件级动画开关 UI

原因很明确：

1. 会让 Appearance 页迅速膨胀
2. 用户难以理解“面板是稳的，toast 是弹的，按钮又是另一套”这种混搭
3. 与本设计的全局语言目标冲突

---

## 12. Reduced Motion 优先级

`prefers-reduced-motion: reduce` 仍然高于 motion preset。

实现原则：

1. preset 是“风格选择”
2. reduced motion 是“可达性约束”

因此优先级为：

1. OS reduced motion
2. 用户选择的 motion preset
3. 组件局部动效

建议落地方式：

1. 保留现有组件上的 `motion-reduce:animate-none` / `motion-reduce:transition-none`
2. 必要时在 `src/styles/motion.css` 中对 `--motion-duration-*` 做 reduced-motion 覆盖

但要注意：

- reduced motion 不是第三套用户 preset
- 不把它持久化到 `appearance.motionPreset`

---

## 13. 测试与回归策略

### 13.1 单元 / contract tests

至少补以下测试：

1. `motionRegistry`
   - registry 包含 `expressive` / `steady-tool`
   - fallback 正确
2. settings defaults / normalization / migration / store
   - 缺失 `appearance.motionPreset` 时补默认值
   - 非法值回退默认值
   - 合法值可保留
3. `useMotionPreset`
   - 立即写入 `data-motion-preset`
   - 变更时更新 dataset
   - 非法值 fallback
4. bootstrap contract
   - [index.html](/home/work/projects/zapcmd/index.html) / [settings.html](/home/work/projects/zapcmd/settings.html) 能同步设置 `data-motion-preset`
5. `SettingsAppearanceSection`
   - 渲染两个 motion preset 卡片
   - 标记当前 preset
   - 点击后发出更新事件

### 13.2 样式契约测试

建议增加或扩展 style contract，确保：

1. `animate-launcher-*` 等关键语义动画改为消费 `var(--motion-*)`
2. motion token CSS 中存在：
   - `data-motion-preset="expressive"`
   - `data-motion-preset="steady-tool"`
3. 当前默认 preset 的关键 easing 仍保留既有基线值

### 13.3 视觉回归

视觉回归要分两层：

1. **静态视觉**
   - Appearance 页面新增 motion preset 卡片后的布局与主题兼容性
   - Launcher / Settings 在两个 preset 下的静态 end-state
2. **动态 contract**
   - 动画是否走正确 token，不宜只依赖最终截图证明
   - 更适合用 contract test + 受控 harness 验证

结论：

- `npm run test:visual:ui` 仍然需要
- 但它主要负责“新增 UI 不回归”和“end-state 不漂移”
- 真正的 motion 差异要靠 token / dataset / class contract 测试来锁

### 13.4 回归范围

后续实现每次涉及样式或动画时，至少应覆盖：

1. `npm run lint`
2. `npm run typecheck`
3. 相关 focused tests
4. `npm run test:visual:ui`
5. 最终 `npm run check:all`

---

## 14. 风险与规避

### 风险 1：实现时把 preset 变成“组件分叉”

如果在组件里到处写条件 class，最终会背离本设计初衷。

规避：

1. 规定组件模板不能大面积出现按 preset 分支的 class
2. 差异优先体现在 `data-motion-preset` 和 `--motion-*` token

### 风险 2：token 过多，导致维护复杂

如果每个组件都发明自己的 token，motion preset 会失去全局意义。

规避：

1. 先共享
2. 后专属
3. 专属 token 只在确有冲突时引入

### 风险 3：默认 preset 意外漂移

如果 `expressive` 与当前线上行为不一致，老用户会感知到“默认动画被改了”。

规避：

1. `expressive` 以当前 [tailwind.config.cjs](/home/work/projects/zapcmd/tailwind.config.cjs) 数值为基线
2. 通过 contract test 锁住关键 duration / easing

### 风险 4：视觉回归难以证明“动画手感”

静态截图无法充分证明 overshoot 是否减少。

规避：

1. 将“手感差异”拆成 token 级 contract
2. 保留必要的受控 motion harness
3. 只让视觉回归负责 UI 结构与 end-state

---

## 15. 结论

本功能的正确做法不是“给组件堆第二份动画”，而是：

1. 新增全局 `appearance.motionPreset`
2. 用 `motionRegistry.ts` 管理 preset 元数据
3. 用 `useMotionPreset.ts` 将 preset 应用到根节点
4. 用 `data-motion-preset` + `--motion-*` token 统一驱动 Launcher 与 Settings
5. 默认 `expressive` 保持当前动画基线
6. 新增 `steady-tool` 作为更稳、更干净的桌面工具 preset

这样切换不会失控，后续扩第三套也不会炸。

---

## 16. 下一步（Next）

1. 用户审阅本设计稿
2. 进入 `writing-plans`
3. 输出实现计划时，按以下顺序拆分：
   - motion preset 基础设施与 settings 持久化
   - bootstrap 与 runtime hook
   - Launcher 核心 motion surface 收口
   - Settings motion surface 收口
   - 测试与视觉回归补齐
