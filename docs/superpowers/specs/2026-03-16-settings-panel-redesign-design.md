# Settings 面板重构设计文档

> **状态**: approved
> **日期**: 2026-03-16
> **分支**: feature-settings
> **参考**: Raycast Settings、Alfred Preferences

---

## 1. 背景与目标

当前 Settings 窗口存在以下问题：

1. **导航形式过时** — 左侧栏导航占用横向空间，不够现代
2. **启动性能差** — 与 Launcher 共用同一个 Vue App 入口，初始化了所有 Launcher composable（搜索引擎、命令执行、窗口尺寸管理等），完全无必要
3. **颜色硬编码** — settings.css 中存在未绑定主题系统的色值
4. **表单组件质量低** — SettingsSelectControl 和内联终端下拉性能/样式均差
5. **命令管理页查询效率** — 116+ 条命令的过滤/排序逻辑未优化
6. **缺乏统一设计系统** — 所有 UI 纯手写，控件风格不一致

**目标**: 重构为 Raycast 级别的现代化设置面板——顶部导航、卡片分组、即时保存、独立入口、主题绑定、统一组件。

---

## 2. 核心设计决策

| 决策项 | 选定方案 | 备选 |
|--------|---------|------|
| 导航形式 | 紧凑 Segment 顶部导航（胶囊分段控件，图标+文字横排） | Raycast 纵向图标、极简 Underline Tab |
| 内容布局 | 卡片分组式（功能域分卡片，Raycast/iOS 风格） | 平铺分隔式、双列网格 |
| 保存模式 | 即时生效（修改即保存，无底部操作栏） | 手动保存、混合模式 |
| 性能优化 | 独立入口（独立 HTML + main-settings.ts + AppSettings.vue） | 条件跳过初始化 |
| 表单组件 | 全部重写（无外部依赖，统一设计语言） | 引入 Headless UI 库 |
| 色值体系 | 全部绑定 `--ui-*` 语义变量，跟随主题 | — |

---

## 3. 架构设计

### 3.1 独立入口拆分

```
settings.html          ← 新 HTML 入口
├── main-settings.ts   ← 新 TS 入口（只创建 settings 所需依赖）
└── AppSettings.vue    ← 新根组件
```

**AppSettings.vue 初始化范围**（仅以下）：
- `settingsStore`（Pinia）
- `useTheme`（主题切换）
- `useSettingsWindow`（路由、各 section 逻辑）
- `useCommandManagement`（命令管理）
- `useHotkeyBindings`（快捷键格式化）

**不再初始化**（与 Launcher 脱钩）：
- `useLauncherSearch`
- `useCommandExecution`
- `useWindowSizing`
- `useStagingQueue`
- `useLauncherNavStack`
- `useLauncherSessionState`
- `useLauncherLayoutMetrics`
- `useLauncherVisibility`
- `useAppLifecycleBridge`（settings 不需要）

**Tauri 侧改动**：
- `windowing.rs` 中 `open_or_focus_settings_window` 的 URL 从 `index.html` 改为 `settings.html`
- `windowing.rs` 中 settings 窗口改为 `.decorations(false)`（移除原生标题栏，使用自定义拖拽区）
- `tauri.conf.json` 无需改动（settings 窗口本身不在静态配置中）

**Vite 多入口配置**：
- `vite.config.ts` 新增 `build.rollupOptions.input`：`{ main: 'index.html', settings: 'settings.html' }`
- 开发模式下 Vite dev server 自动支持多 HTML 入口，Tauri 通过 `WebviewUrl::App("settings.html".into())` 访问

**`main-settings.ts` 初始化内容**：
- 独立调用 `createPinia()` 实例化 Pinia
- 独立调用 `createI18n()` 实例化 vue-i18n（复用 `messages.ts` 消息定义）
- 从 localStorage 读取初始设置（`readSettingsFromStorage()`），设置初始 locale
- CSS 引入策略：`settings.html` 引入 `styles/index.css`（全量样式包含 tokens + themes + settings），但不引入 launcher-only 组件的 scoped 样式
- `useTheme` 在 `AppSettings.vue` setup 中 `{ immediate: true }` watch，确保 `data-theme` 在首帧应用

### 3.2 即时保存架构

- 移除 `createPersistenceActions` 中的 snapshot diff、取消、确定逻辑
- 移除 `settingsBaselineSnapshot`、`restoreSettingsBaseline`、`hasUnsavedSettingsChanges` 等函数
- 每个设置项变更：组件 emit → composable action → `store.setXxx()` → `store.persist()` → localStorage
- 快捷键录制交互保留：点击进入录制 → 按键捕获 → 失焦时校验冲突 → 无冲突则保存
- 移除 SettingsWindow 底部操作栏（取消/应用/确定）
- 移除关闭时的未保存修改确认弹窗

**Tauri 侧副作用处理**（即时保存模式下）：
- **全局快捷键注册**：快捷键录制完成并通过冲突校验后，立即调用 `writeLauncherHotkey` 向 OS 注册。若注册失败，回滚到原值并显示错误提示（红色边框 + "注册失败"文本）。不做防抖——录制完成到失焦是原子操作，不会连续快速触发。
- **开机自启**：Toggle 切换后立即调用 `writeAutoStartEnabled`。若系统注册表写入失败，回滚 Toggle 状态并 toast 提示用户。
- **跨窗口广播**：每次 `store.persist()` 后调用 `broadcastSettingsUpdated`。由于即时保存是单项触发，广播频率等同于用户操作频率，不需要额外节流。
- **终端选择验证**：SSelect 切换终端时，立即调用 `validateTerminalSelection`，无效则不更新 store。

### 3.3 路由结构不变

```ts
type SettingsRoute = "hotkeys" | "general" | "commands" | "appearance" | "about";
```

Hash-based 自实现路由逻辑复用，默认路由保持 `"hotkeys"`。

---

## 4. 页面骨架

### 4.1 窗口结构

```
┌──────────────────────────────────────────┐
│           拖拽区（32px）标题居中           │
├──────────────────────────────────────────┤
│     [ ⌨ 快捷键 | ⚙ 通用 | ☰ 命令 |     │
│       ✦ 外观 | ℹ 关于 ]                  │
├──────────────────────────────────────────┤
│                                          │
│          内容区（overflow-y scroll）       │
│          居中约束 max-width: 640px        │
│          （命令页不限宽，自适应）           │
│                                          │
│       ┌──────────────────────────┐       │
│       │  卡片组 1（标题 + 行列表）│       │
│       └──────────────────────────┘       │
│       ┌──────────────────────────┐       │
│       │  卡片组 2                 │       │
│       └──────────────────────────┘       │
│                                          │
│          无底部操作栏                      │
└──────────────────────────────────────────┘
```

### 4.2 Segment 导航

- 居中胶囊背景容器（`background: var(--ui-bg-soft)`，`border-radius: 10px`）
- 每个 tab：图标 + 文字横排，`padding: 7px 16px`，`border-radius: 8px`
- 选中项：`background: var(--ui-brand-soft)`，`border: 1px solid var(--ui-brand-dim)`，文字 `var(--ui-brand)` 色
- 未选中：opacity 0.55，文字 `var(--ui-text-muted)` 色

### 4.3 卡片组

- `background: rgba(var(--theme-surface-rgb, 39 39 42), 0.035)`（需新增 `--theme-surface-rgb`）
- `border: 1px solid var(--ui-border-light)`
- `border-radius: 12px`
- `padding: 16px 20px`
- 组标题：11px 大写字母，letter-spacing 0.8px，muted 色
- 行间分隔：`border-bottom: 1px solid --ui-border-light`（最后一行无）
- 卡片间距：12px

---

## 5. 各页面设计

### 5.1 快捷键页（hotkeys）

**卡片分组**：全局 / 搜索区 / 执行流

**快捷键行结构**：
```
┌─────────────────────────────────────────┐
│  标签文字              [ Alt ] + [ V ]  │
└─────────────────────────────────────────┘
```

**交互流程**：
1. **默认态** — kbd 徽标显示当前值，整个右侧区域可点击，hover 时边框微亮
2. **点击** → 进入录制态：accent 发光边框 + 呼吸点 + "等待输入..."
3. **按键** → 实时显示捕获的组合键（accent 色 kbd 徽标）
4. **失焦** → 校验冲突 → 无冲突：保存 + 绿色对勾闪现（300ms fade）；有冲突：红色边框 + 冲突来源提示
5. **Esc** → 取消录制，恢复原值

**未设置状态**：虚线边框 + 灰色斜体「点击录制」

**kbd 徽标样式**：
- `background: rgba(var(--theme-text-rgb, 250 250 250), 0.08)`（需新增 `--theme-text-rgb`）
- `border: 1px solid rgba(var(--theme-text-rgb, 250 250 250), 0.12)`
- `border-radius: 4px`
- `padding: 2px 7px`
- `font-family: monospace`
- `font-size: 11px`

### 5.2 通用页（general）

**卡片分组**：启动 / 终端 / 界面

**启动卡片**：
- 自动检查更新：标签 + 描述 + SToggle
- 开机自启：标签 + 描述 + SToggle

**终端卡片**：
- 默认终端：标签 + SSelect（右对齐）
- 当前终端路径：只读文本（monospace 灰色背景）

**界面卡片**：
- 界面语言：标签 + SSelect

### 5.3 命令管理页（commands）

**此页不限 max-width**，自适应窗口宽度。

**工具栏（Row 1）**：搜索输入框（flex: 1） + 统计信息（筛选数 / 总数 + 已启用数）

**筛选栏（Row 2）**：SFilterChip × 6（来源 / 状态 / 分类 / 文件 / 冲突 / 问题） + 排序 chip（右对齐） + 重置链接

**筛选 Chip 行为**：
- 默认显示「全部XX」，灰色边框
- 激活（非默认值）时 accent 高亮 + × 清除按钮
- 点击展开下拉菜单
- `flex-wrap: wrap`，窗口收窄时自动换行

**表格列定义**：
```
命令（1fr） | 分类（80px） | 来源（56px） | 启用（44px）
```

**命令行**：
- 命令名（13px 主色） + ID（10px monospace 灰色，跟在名称后面同行）
- 分类文本（11px muted）
- 来源：小圆点指示（内置灰色 / 用户 accent） + 文字
- 启用：SToggle（30×17 紧凑版），切换即时保存
- 禁用命令：整行 opacity 0.5
- Hover：行背景微亮
- Hover Tooltip：纯文本气泡，仅显示来源 JSON 相对路径（如 `builtin/_system.json`），无卡片包装

**性能优化**：
- 116 条命令量级先不引入虚拟滚动，使用普通 DOM 渲染 + computed 链过滤；若后续命令量暴增再考虑
- 搜索防抖（200ms）
- 筛选使用 computed 链
- 移除现有的分组展示模式（groupedByFile），统一为平铺表格 + 文件筛选 chip

**Hover Tooltip 实现**：使用 `title` 属性或轻量自定义 tooltip 组件，不使用第三方库。

### 5.4 外观页（appearance）

**卡片分组**：主题 / 视觉效果 / 实时预览

**主题卡片**：
- 每个主题：120px 宽卡片，4 色块预览（bg / surface / accent / text 各占 1/4）
- 选中项：accent 色 2px 边框 + 右上角圆形对勾
- 预留「即将推出」占位卡片（虚线边框 + 加号图标）
- `flex-wrap: wrap`，多主题时自动换行

**视觉效果卡片**：
- 毛玻璃效果：标签 + 描述 + SToggle
- 窗口透明度：标签 + SSlider（20%~100%）+ 右侧实时数值

**实时预览卡片**：
- 棋盘格背景 + 半透明窗口模拟
- 随 Slider 实时变化

### 5.5 关于页（about）

**品牌头部**（居中）：
- 项目 Logo（56×56，圆角 14px）— 使用项目自己的 logo
- 产品名（20px 粗体）
- 版本 + 平台（13px muted）

**信息卡片**（key-value 行）：
- 版本（monospace）
- 运行平台
- 开源许可
- 项目主页（accent 色链接 + ↗ 图标）

**操作卡片**（可点击行）：
- 检查更新（+ 描述 + 右箭头）
- 问题反馈（+ 描述 + 外链图标）
- 打开项目主页（+ 描述 + 外链图标）

**底部签名**：`Made with ⚡ by ZapCmd Team`

---

## 6. 通用组件设计系统

所有组件严格使用 `--ui-*` 语义变量，确保多主题兼容。

### 6.1 SToggle

- 尺寸：36×20（标准）/ 30×17（紧凑，用于命令列表）
- ON：`--ui-brand` 背景 + 白色滑块右移
- OFF：`--ui-surface` 背景 + muted 色滑块左移
- 滑块过渡：150ms ease-out
- 键盘：Space 切换，Enter 确认
- API：`v-model: boolean`，`emit('update:modelValue')`

### 6.2 SSelect

- 触发器：右对齐，`var(--ui-input-bg)` 背景 + `var(--ui-border)` 边框，`border-radius: 8px`
- 下拉面板：使用 Vue `<Teleport to="body">` 挂载到 body，`position: fixed` + 动态计算位置（避免被 `overflow: scroll` 的内容区裁剪）
- 面板样式：`var(--ui-surface)` 背景，`border-radius: 8px`，`box-shadow: var(--ui-shadow)`，max-height 240px overflow-y
- 选项：hover 高亮，选中项 accent 色 + 左侧对勾
- 键盘：Arrow Up/Down 导航，Enter 选中，Esc 关闭
- API：`v-model: string`，`options: Array<{ value, label, description? }>`

### 6.3 SSlider

- 轨道：6px 高，`--ui-border` 背景，`--ui-brand` 填充
- 拇指：16px 圆形，`--ui-brand` 色，border 2px `--ui-bg`，外发光 `box-shadow`
- 拖拽时拇指 scale(1.1) 微放大
- API：`v-model: number`，`min`，`max`，`step`

### 6.4 SHotkeyRecorder

- 默认态：kbd 徽标容器，`var(--ui-bg-soft)` 背景 + `var(--ui-border)` 边框
- 录制态：`--ui-brand` 发光边框 + `box-shadow` 发光环 + 呼吸点
- 冲突态：`--ui-danger` 红色边框 + 冲突提示文本
- 保存成功：`--ui-success` 绿色对勾闪现（300ms fade out）
- API：`v-model: HotkeyValue`，`emit('conflict', conflictInfo)`

### 6.5 SFilterChip

- 默认：pill 形，`var(--ui-bg-soft)` 背景 + `var(--ui-border)` 边框
- 激活：`var(--ui-brand-soft)` 背景 + `var(--ui-brand)` 边框/文字 + × 清除按钮
- 点击展开下拉（复用 SSelect 的 Teleport 浮层逻辑）
- API：`v-model: string`，`options: Array<{ value, label }>`，`defaultValue: string`

### 6.6 通用设计令牌

| 令牌 | 用途 | 值 |
|------|------|-----|
| 圆角-按钮 | 按钮、chip | 6px |
| 圆角-输入框 | input、select 触发器 | 8px |
| 圆角-卡片 | 设置卡片 | 12px |
| 圆角-导航 | segment 导航 tab | 8px |
| 圆角-导航容器 | segment 外层胶囊 | 10px |
| 过渡时长 | 通用状态变化 | 150ms |
| 过渡曲线 | ease-out | `cubic-bezier(0.33, 1, 0.68, 1)` |
| 焦点环 | 键盘焦点指示 | `box-shadow: 0 0 0 2px var(--ui-brand-soft)` |

---

## 7. 主题绑定规范

- **绝对禁止**在组件/页面中使用硬编码色值（如 `#fbbf24`、`rgba(255,255,255,0.08)` 等）
- 所有色值必须引用 `--ui-*` 语义变量
- 若语义层缺少所需变量，先在 `tokens.css` 中定义映射 `--ui-xxx: var(--theme-xxx)`，再在 `obsidian.css` 中添加 `--theme-xxx` 值
- Settings 窗口专用变量已存在于主题中：`--theme-sidebar-bg`、`--theme-input-bg`、`--theme-toggle-on`、`--theme-toggle-off`，重构后继续使用

### 7.1 需新增的 CSS 变量

以下变量在现有 `tokens.css` / `obsidian.css` 中不存在，需在实现时补充：

| 变量 | 层级 | 用途 | obsidian 默认值 |
|------|------|------|----------------|
| `--theme-surface-rgb` | theme | 卡片半透明背景的 RGB 分量 | `39, 39, 42` |
| `--theme-text-rgb` | theme | kbd 徽标半透明背景的 RGB 分量 | `250, 250, 250` |
| `--ui-brand-soft` | token | 选中态/焦点环半透明品牌色背景 | `rgba(var(--theme-accent-rgb), 0.12)`（已存在） |
| `--ui-brand-dim` | token | 选中态边框弱品牌色 | `rgba(var(--theme-accent-rgb), 0.25)` |

---

## 8. 受影响文件清单

### 新增

| 文件 | 用途 |
|------|------|
| `settings.html` | Settings 独立 HTML 入口 |
| `src/main-settings.ts` | Settings 独立 TS 入口 |
| `src/AppSettings.vue` | Settings 根组件 |
| `src/components/settings/ui/SToggle.vue` | 通用 Toggle 组件 |
| `src/components/settings/ui/SSelect.vue` | 通用 Select 组件 |
| `src/components/settings/ui/SSlider.vue` | 通用 Slider 组件 |
| `src/components/settings/ui/SHotkeyRecorder.vue` | 快捷键录制器组件 |
| `src/components/settings/ui/SFilterChip.vue` | 筛选芯片组件 |
| `src/components/settings/ui/SSegmentNav.vue` | Segment 导航组件 |

### 重大修改

| 文件 | 变更 |
|------|------|
| `src/components/settings/SettingsWindow.vue` | 移除底部操作栏，布局改为顶部导航+卡片内容 |
| `src/components/settings/parts/SettingsNav.vue` | 删除或改为 SSegmentNav |
| `src/components/settings/parts/SettingsHotkeysSection.vue` | 卡片分组 + SHotkeyRecorder |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 卡片分组 + SToggle/SSelect |
| `src/components/settings/parts/SettingsCommandsSection.vue` | 表格化 + SFilterChip，移除分组模式 |
| `src/components/settings/parts/SettingsAppearanceSection.vue` | 卡片分组 + SSlider/SToggle |
| `src/components/settings/parts/SettingsAboutSection.vue` | 品牌头部 + 信息/操作卡片 |
| `src/components/settings/types.ts` | Props 类型更新 |
| `src/composables/settings/useSettingsWindow/persistence.ts` | 简化为即时保存 |
| `src/composables/settings/useSettingsWindow/model.ts` | 移除 snapshot diff 相关逻辑 |
| `src/styles/settings.css` | 全部重写，绑定 `--ui-*` 变量 |
| `src/styles/tokens.css` | 补充 settings 专用语义变量（如需） |
| `src-tauri/src/windowing.rs` | settings 窗口 URL 改为 `settings.html`，`decorations(false)` |
| `vite.config.ts` | 新增 `settings.html` 多入口（`build.rollupOptions.input`） |

### 删除

| 文件 | 原因 |
|------|------|
| `src/components/settings/parts/SettingsSelectControl.vue` | 被 SSelect 替代 |

---

## 9. 不变项

- 路由类型和路由逻辑（hash-based 自实现）不变
- settingsStore 的 state 结构和持久化机制不变（localStorage + JSON）
- 命令管理的核心过滤/排序逻辑不变（`useCommandManagement`）
- 主题系统架构不变（`data-theme` + 双层变量 + themeRegistry）
- 快捷键冲突检测逻辑不变
- Tauri 侧创建窗口的逻辑基本不变（URL 改为 `settings.html`，`decorations` 改为 `false`）
- 国际化框架不变（vue-i18n）
