# Settings UI 精修设计文档

  日期: 2026-03-18
  方案: A — Refined Current（在现有结构上精修）
  状态: 设计已确认，待实现计划

  ---
  背景与目标

  当前 Settings 界面已完成重构，但视觉粗糙，具体问题：
  - 当前 titlebar、标题文字、nav 三层关系处理得过于散，视觉上不像一个统一的窗口头部
  - 窗口控制按钮硬编码为 macOS 圆形交通灯，跨平台不自然且可能失效
  - 卡片背景与整体背景对比弱，信息密度感不精致
  - 5 个子页面排版不统一，部分行缺少 hint 描述
  - 颜色硬编码，未绑定主题变量

  目标：在不破坏现有架构的前提下精修视觉，使界面达到 Raycast Settings 级别的精致感。

  ---
  核心设计决策

  1. 窗口控制按钮 — 方案 A（OS 原生）

  将 windowing.rs 中 settings 窗口的 .decorations(false) 改为 .decorations(true)。
  OS 自动渲染控制按钮：macOS 得到左侧圆形交通灯，Windows 得到右侧矩形按钮。
  删除 SettingsWindow.vue 中所有自定义窗口按钮代码（minimizeWindow、toggleMaximize、closeWindow、isMaximized）。

  2. 顶栏布局 — 物理三层、视觉两层（稳定版）

  保留 OS 原生标题栏与原生控制按钮，不再要求 Tab 导航与系统控件处于同一物理行。
  应用层保留一条 52px 的 settings topbar，仅承载居中的 Tab 导航。
  视觉处理目标：
  - 原生标题栏 + 应用 topbar 在颜色、边界、节奏上做成同一个“窗口头部块”
  - content 与窗口头部块之间只保留一条明确分界
  - 不再单独放置 “ZapCmd Settings” 文字标题，避免多余层次
  结果：物理结构仍是 titlebar / topbar / content，但视觉上收敛为 “窗口头部 / 内容区” 两大层。
  用户已确认：优先原生体验，接受 Windows 与 macOS 控件位置不同，不追求伪统一。

  3. 主题变量扩展

  在 obsidian.css 新增 settings 专属变量（其他主题跟进时只需覆盖这些变量）：

  /* Settings 专属 */
  --theme-settings-titlebar-bg:       #0f0f11;                   /* 原生标题栏视觉融合参考色 */
  --theme-settings-topbar-bg:         #0f0f11;                   /* 顶栏背景，比内容深一档 */
  --theme-settings-topbar-border:     rgba(255,255,255,0.06);    /* 顶栏底边 */
  --theme-settings-tab-active-bg:     rgba(255,255,255,0.13);    /* Tab 激活背景 */
  --theme-settings-tab-active-border: rgba(255,255,255,0.10);    /* Tab 激活边框 */
  --theme-settings-card-bg:           rgba(255,255,255,0.035);   /* 卡片背景 */
  --theme-settings-card-border:       rgba(255,255,255,0.09);    /* 卡片边框 */
  --theme-settings-card-title-color:  rgba(255,255,255,0.38);    /* section title 颜色 */
  --theme-settings-row-border:        rgba(255,255,255,0.06);    /* 行分隔线 */
  --theme-settings-row-hover:         rgba(255,255,255,0.03);    /* 行 hover 背景 */
  --theme-settings-hint-color:        rgba(255,255,255,0.32);    /* 提示文字颜色 */

  在 tokens.css 中新增对应的 --ui-settings-* 语义映射。

  4. 内容区排版规范

  通用规范（适用于所有 5 个子页面）：
  - 内容区 padding: 24px 32px 32px
  - 卡片间距: gap: 20px
  - 行 padding: 13px 16px
  - 每行必须有 .settings-card__label，重要行添加 .settings-card__hint（副标题）
  - section h2 字号: 15px，font-weight: 700，letter-spacing: -0.3px
  - card title 字号: 11px，font-weight: 600，text-transform: uppercase，letter-spacing: 0.8px
  - 品牌 accent 仅用于选中态、状态强调、关键反馈；不用于大面积背景，整体保持中性深色基调

  5. 五个子页面精修要点

  General

  - 启动 section：两行均补全 hint（开机自启 / 自动检查更新）
  - 终端 section：当前路径行改为 code 单行显示，hint 移到卡片末尾
  - 语言 section：单独成一个小卡片

  Appearance

  - 主题选择卡片：横向展示 theme cards，激活态边框颜色改用 --ui-accent
  - 毛玻璃/透明度合并为一张卡片，滑块行改为全宽布局（label 上方，滑块下方）
  - 预览卡片：保留但缩小高度为 96px，移到透明度卡片右侧（响应式两列）

  Hotkeys

  - 每个 section 用 .settings-card 包裹
  - 快捷键行 label + recorder 改为水平排列，label 占 minmax(0,1fr)
  - 冲突错误显示为行内红色 badge，而非全局消息

  Commands

  - 顶部 toolbar：search input 独占一行，badge summary 右侧对齐
  - 表格列宽: 1fr 100px 70px 52px
  - 表格行高: padding: 10px 14px
  - 禁用行 opacity 从 0.4 改为 0.5

  About

  - 品牌区：logo 尺寸 60×60，name 字号 16px，version 用 --ui-accent 色标注
  - info / actions 卡片改为单列布局
  - 更新状态区：用左侧 3px 竖线色块区分状态（成功/错误/loading）

  6. 响应式边界（有上限的自适应，而非无限拉伸）

  设计原则：
  - Settings 是桌面设置窗口，不是可无限铺开的 dashboard
  - 自适应目标是“在合理区间内稳定重排”，不是“窗口越大内容越散”

  约束：
  - 普通页面内容区使用居中阅读宽度，max-width: 720px
  - Commands 页面因表格需要放宽，但仍封顶，max-width: 1120px
  - Appearance 的 theme cards 在窄宽度下自动换行
  - Appearance 的 preview 卡在中等宽度下可下移到 effects 卡下方，不强行并排
  - Hotkeys 行在窄宽度下允许退化为两行布局，但字段顺序与视觉顺序保持一致
  - 顶栏中的 Tab 容器本身也应有宽度上限，避免窗口放大后导航簇被拉散

  7. SSegmentNav 适配顶栏

  - tab padding: 6px 14px（现在 8px 18px）
  - 整体 border-radius: 10px
  - 激活颜色改用主题变量 var(--ui-settings-tab-active-bg)
  - 导航簇本身有宽度上限，不拉伸填满整条 topbar

  ---
  文件改动清单

  ┌─────────────────────────────────────────────────────────────┬──────────┬──────────────────────────────────────────┐
  │                            文件                             │ 改动类型 │                   说明                   │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src-tauri/src/windowing.rs                                  │ 修改     │ .decorations(false) → .decorations(true) │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/SettingsWindow.vue                  │ 修改     │ 删除窗口按钮逻辑，改为原生标题栏下方独立 topbar │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/ui/SSegmentNav.vue                  │ 修改     │ Tab 尺寸适配顶栏，颜色改用主题变量       │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/styles/settings.css                                     │ 修改     │ 顶栏重写，颜色改用变量，排版调优，补响应式上限 │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/styles/tokens.css                                       │ 修改     │ 新增 --ui-settings-* 语义变量            │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/styles/themes/obsidian.css                              │ 修改     │ 新增 --theme-settings-* 颜色变量         │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/parts/SettingsGeneralSection.vue    │ 修改     │ 补全 hint，结构统一                      │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/parts/SettingsAppearanceSection.vue │ 修改     │ 卡片布局调整，滑块全宽                   │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/parts/SettingsHotkeysSection.vue    │ 修改     │ 包裹 settings-card，行布局水平化         │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/parts/SettingsCommandsSection.vue   │ 修改     │ 列宽调整，toolbar 优化                   │
  ├─────────────────────────────────────────────────────────────┼──────────┼──────────────────────────────────────────┤
  │ src/components/settings/parts/SettingsAboutSection.vue      │ 修改     │ 品牌区精修，状态区竖线风格               │
  └─────────────────────────────────────────────────────────────┴──────────┴──────────────────────────────────────────┘

  ---
  不改动的内容

  - AppSettings.vue：逻辑层无变化
  - 所有 composables / stores：不涉及
  - 测试文件：无需修改
  - launcher 窗口：完全不涉及

  ---
  验收标准

  1. Settings 窗口打开后，OS 原生控制按钮正常显示且功能正常
  2. 原生标题栏与应用 topbar 物理分层，但视觉上属于同一个窗口头部块
  3. 所有 5 个子页面卡片结构统一，颜色通过主题变量控制
  4. 普通页面在宽窗口下保持居中且不无限拉伸；Commands 页面更宽但仍有上限
  5. npm run check:all 全绿
  6. Windows 上控制按钮为矩形样式（decorations=true 效果）
