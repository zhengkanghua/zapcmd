# 黑曜石主题系统设计文档

> **日期**: 2026-03-14
> **范围**: UI 大重构 — 多主题架构 + 黑曜石沉浸风首发主题
> **状态**: 待审查

---

## 1. 概述

### 1.1 目标

为 ZapCmd 桌面应用建立多主题支持架构，首发交付"黑曜石沉浸风"(Obsidian/Anthracite) 主题。改造覆盖主窗口（Launcher）和设置窗口（Settings）两个窗口。

### 1.2 设计原则

- **语义化 CSS**：组件只引用语义层变量（`--ui-*`），不直接使用主题原始色或硬编码色值
- **双层变量**：主题层（`--theme-*`）定义原始色值，语义层（`--ui-*`）映射到具体用途
- **`data-theme` 属性切换**：通过 `document.documentElement.dataset.theme` 切换主题，CSS 选择器 `:root[data-theme="xxx"]` 激活对应变量集
- **渐进式迁移**：先完成架构迁移（视觉零差异），再切换色值

### 1.3 关键决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| Tailwind CSS | 彻底移除 | 项目未使用 Tailwind 工具类，仅用了 `@tailwind base` 做 Reset |
| CSS 文件结构 | 按功能模块拆分 | 2615 行单文件不可维护，拆分后职责清晰 |
| 主题切换机制 | `data-theme` 属性 | 标准、简单、无闪烁，CSS 原生支持 |
| CSS 变量分层 | 双层（主题 + 语义） | 最灵活，组件与主题解耦 |
| 初始主题范围 | 仅黑曜石 + 多主题架构 | 架构就绪，后续加主题成本极低 |
| 毛玻璃效果 | 可选开关 | Windows 10 性能问题，提供禁用选项 |
| 窗口透明度 | 保留独立控制 | 与主题系统正交，用户可自行调节 |

---

## 2. CSS 文件架构

### 2.1 目录结构

```
src/styles/
├── index.css                 ← 总入口（@import 各模块）
├── reset.css                 ← 替代 @tailwind base 的轻量 CSS Reset
├── tokens.css                ← 语义层变量 --ui-*（引用 --theme-*）+ 布局/字体常量
├── themes/
│   ├── obsidian.css          ← :root[data-theme="obsidian"] { --theme-*: ... }
│   └── _index.css            ← @import 所有主题文件
├── shared.css                ← 按钮(.btn-*)、表单控件、kbd、toast 等跨窗口共享组件
├── launcher.css              ← 主窗口: .launcher-root, .search-*, .result-*, .flow-*, .review-*
├── settings.css              ← 设置窗口: .settings-*, 导航、表单、节区等
└── animations.css            ← 所有 @keyframes + prefers-reduced-motion 回退
```

### 2.2 index.css 导入顺序

层叠优先级从低到高：

```css
/* 1. 基础重置 */
@import './reset.css';
/* 2. 主题原始色值 */
@import './themes/_index.css';
/* 3. 语义变量映射 */
@import './tokens.css';
/* 4. 共享组件 */
@import './shared.css';
/* 5. 窗口样式 */
@import './launcher.css';
@import './settings.css';
/* 6. 动画 */
@import './animations.css';
```

### 2.3 入口改动

`src/main.ts`：`import "./styles.css"` → `import "./styles/index.css"`

### 2.4 reset.css

保留当前 `styles.css` 第 30-47 行的全局 reset（`box-sizing`、`html/body` 透明背景、`margin: 0` 等），不再依赖 Tailwind Preflight。需补充 Tailwind Preflight 中项目实际依赖的重置规则（如 `img { max-width: 100% }`、`button { font: inherit }` 等）。

---

## 3. 主题令牌系统

### 3.1 主题层（Theme Layer）

每个主题文件定义一套完整的 `--theme-*` 原始色值。组件**不得**直接引用此层变量。

**黑曜石主题** (`src/styles/themes/obsidian.css`)：

```css
:root[data-theme="obsidian"] {
  /* ── 材质 ── */
  --theme-bg:           #18181B;
  --theme-bg-deep:      #09090B;
  --theme-surface:      #27272A;
  --theme-surface-soft: rgba(255,255,255, 0.06);

  /* ── 边框与阴影 ── */
  --theme-border:       rgba(255,255,255, 0.10);
  --theme-border-light: rgba(255,255,255, 0.05);
  --theme-ring:         rgba(255,255,255, 0.05);
  --theme-shadow:       0 14px 32px rgba(0,0,0, 0.3);

  /* ── 文字 ── */
  --theme-text:         #FAFAFA;
  --theme-text-muted:   #A1A1AA;
  --theme-text-dim:     #71717A;

  /* ── 强调色（琥珀/暗金） ── */
  --theme-accent:       #FBBF24;
  --theme-accent-soft:  rgba(251,191,36, 0.16);
  --theme-accent-text:  #09090B;

  /* ── 状态色 ── */
  --theme-success:      #2DD4BF;
  --theme-danger:       #FB7185;
  --theme-danger-soft:  rgba(251,113,133, 0.10);

  /* ── 交互态 ── */
  --theme-hover:        rgba(39,39,42, 0.50);
  --theme-selected:     rgba(39,39,42, 0.60);
  --theme-kbd:          rgba(39,39,42, 0.80);

  /* ── 搜索高亮 ── */
  --theme-search-hl:    #FBBF24;

  /* ── 毛玻璃 ── */
  --theme-blur:         24px;
  --theme-glass-bg:     rgba(24,24,27, 0.85);

  /* ── 设置窗口专属 ── */
  --theme-sidebar-bg:   rgba(24,24,27, 0.40);
  --theme-input-bg:     #09090B;
  --theme-toggle-on:    #FBBF24;
  --theme-toggle-off:   #3F3F46;
}
```

> **注意**：以上变量列表会在实现阶段根据 `styles.css` 中实际使用的色值进行审计精简，仅保留有消费者的 token。

### 3.2 语义层（Semantic Layer）

`src/styles/tokens.css` 将主题色映射为用途明确的语义变量：

```css
:root {
  /* ── 布局常量（不随主题变） ── */
  --ui-radius:           12px;
  --ui-top-align-offset: 18px;
  --ui-font-mono: "Fira Code","JetBrains Mono","SF Mono",Consolas,Monaco,monospace;

  /* ── 颜色语义映射 ── */
  --ui-bg:          var(--theme-bg);
  --ui-bg-deep:     var(--theme-bg-deep);
  --ui-bg-soft:     var(--theme-surface-soft);
  --ui-surface:     var(--theme-surface);
  --ui-shell-dim:   var(--theme-glass-bg);

  --ui-border:      var(--theme-border);
  --ui-border-light:var(--theme-border-light);
  --ui-shadow:      var(--theme-shadow);

  --ui-text:        var(--theme-text);
  --ui-subtle:      var(--theme-text-muted);
  --ui-dim:         var(--theme-text-dim);

  --ui-brand:       var(--theme-accent);
  --ui-brand-soft:  var(--theme-accent-soft);
  --ui-accent:      var(--theme-accent);

  --ui-success:     var(--theme-success);
  --ui-danger:      var(--theme-danger);
  --ui-danger-soft: var(--theme-danger-soft);

  --ui-search-hl:   var(--theme-search-hl);
  --ui-hover:       var(--theme-hover);
  --ui-selected:    var(--theme-selected);
  --ui-kbd:         var(--theme-kbd);

  --ui-blur:        var(--theme-blur);
  --ui-glass-bg:    var(--theme-glass-bg);

  /* ── 设置窗口语义 ── */
  --ui-sidebar-bg:  var(--theme-sidebar-bg);
  --ui-input-bg:    var(--theme-input-bg);
  --ui-toggle-on:   var(--theme-toggle-on);
  --ui-toggle-off:  var(--theme-toggle-off);
}
```

### 3.3 分层优势

- **新增主题**：新建 `themes/xxx.css`，定义 `--theme-*` 变量，所有组件自动适配
- **语义灵活**：不同主题可让「品牌色」和「搜索高亮」使用不同颜色
- **组件隔离**：组件只用 `var(--ui-text)` 等语义变量，完全不关心当前主题
- **`--ui-opacity`**：保留现有的运行时动态 opacity 机制，作为独立的非主题变量

---

## 4. 主题管理器

### 4.1 主题注册表

轻量 TypeScript 对象，供设置窗口渲染选择器：

```typescript
// src/features/themes/themeRegistry.ts
export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  preview: {
    bg: string;
    surface: string;
    accent: string;
    text: string;
  };
}

export const THEME_REGISTRY: ReadonlyArray<ThemeMeta> = [
  {
    id: 'obsidian',
    name: '黑曜石',
    description: '温暖深灰 + 琥珀金，长时间使用最舒适',
    preview: { bg: '#18181B', surface: '#27272A', accent: '#FBBF24', text: '#FAFAFA' },
  },
];

export const DEFAULT_THEME_ID = 'obsidian';
```

### 4.2 主题切换 Composable

```typescript
// src/composables/app/useTheme.ts
export function useTheme(settingsStore: SettingsStore) {
  const themeId = computed(() => settingsStore.theme ?? DEFAULT_THEME_ID);

  function applyTheme(id: string) {
    document.documentElement.dataset.theme = id;
  }

  // 监听 + 广播
  watch(themeId, (id) => {
    applyTheme(id);
    broadcastChannel.postMessage({ type: 'theme-changed', themeId: id });
  }, { immediate: true });

  // 接收其他窗口
  onBroadcastMessage('theme-changed', (msg) => {
    applyTheme(msg.themeId);
  });

  return { themeId, applyTheme, themes: THEME_REGISTRY };
}
```

### 4.3 settingsStore 集成

- 新增字段：`theme: string`（默认 `'obsidian'`）、`blurEnabled: boolean`（默认 `true`）
- `defaults.ts` 添加默认值
- `migration.ts` 处理旧版存储兼容（缺失字段时补充默认值）
- 随其他设置一起持久化到 localStorage

### 4.4 跨窗口同步流程

```
设置窗口切换主题
  → settingsStore.theme = 'newTheme'
  → useTheme watcher 触发
  → document.documentElement.dataset.theme = 'newTheme'
  → 复用现有 settingsSyncChannel 广播
  → 主窗口收到消息 → applyTheme('newTheme')
```

### 4.5 毛玻璃开关

- `settingsStore.blurEnabled` 控制
- `useTheme` 在 `html` 上设置 `data-blur="on|off"`
- CSS 中 `[data-blur="off"]` 覆盖毛玻璃为纯色背景：

```css
[data-blur="off"] .search-shell,
[data-blur="off"] .flow-panel,
[data-blur="off"] .review-panel {
  backdrop-filter: none;
  background-color: var(--ui-surface);
}
```

### 4.6 防闪烁初始化

在 Vue 挂载前设置 `data-theme`，确保第一帧就有正确的主题色值：

```html
<!-- index.html -->
<script>
  (function() {
    try {
      var stored = JSON.parse(localStorage.getItem('zapcmd-settings') || '{}');
      var theme = (stored && stored.theme) || 'obsidian';
      var blur = stored && stored.blurEnabled !== false;
      document.documentElement.dataset.theme = theme;
      document.documentElement.dataset.blur = blur ? 'on' : 'off';
    } catch(e) {
      document.documentElement.dataset.theme = 'obsidian';
      document.documentElement.dataset.blur = 'on';
    }
  })();
</script>
```

> **注意**：localStorage key 需与 settingsStore 的实际持久化 key 保持一致。实现时需确认具体 key 名称。

---

## 5. 设置窗口 - 外观页面改造

### 5.1 新布局

```
外观设置
├── 主题 (Theme)
│   └── 色板预览卡片列表（从 THEME_REGISTRY 渲染）
├── 毛玻璃效果 (Glassmorphism)
│   └── Toggle 开关（默认开，附说明"关闭可降低 GPU 占用"）
└── 窗口透明度 (Window Opacity)
    └── 滑块（保留现有功能，范围 0.2~1.0）
```

### 5.2 主题选择器

- 每个主题显示为色板预览卡片：背景色 + 表面色 + 强调色色块 + 主题名称
- 当前选中主题有 accent 边框高亮
- 点击即切换，实时预览，遵循"取消 = 丢弃未保存修改"语义

### 5.3 毛玻璃开关

- Toggle 控件，附"关闭可降低 GPU 占用"提示文字
- 切换即时生效

---

## 6. 迁移策略

### 6.1 原则

- 渐进式：每一步独立可测、可回滚
- 视觉零差异：架构迁移阶段不改变任何视觉
- 双窗口同步测试：每次迁移后两个窗口都验证

### 6.2 执行步骤

#### Wave 1：架构准备（视觉零差异）

| # | 任务 | 说明 |
|---|------|------|
| 1 | 移除 Tailwind | 删除 `tailwindcss`/`autoprefixer`/`postcss` 依赖和配置文件，`@tailwind base` 替换为 `reset.css` |
| 2 | 拆分 styles.css | 按功能模块拆到 `src/styles/` 各文件，`index.css` 作为总入口 |
| 3 | 提取色值为主题 | 现有 `--ui-*` 色值原样复制到 `themes/obsidian.css` 作为 `--theme-*`，`tokens.css` 中 `--ui-*` 改为引用 `--theme-*` |

#### Wave 2：主题基础设施

| # | 任务 | 说明 |
|---|------|------|
| 4 | 主题注册表 + useTheme | 新增 `themeRegistry.ts`、`useTheme.ts`，集成到 `useAppCompositionRoot` |
| 5 | settingsStore 扩展 | 新增 `theme`、`blurEnabled` 字段 + migration |
| 6 | 防闪烁初始化 | `index.html` 新增内联 `<script>` 预设 `data-theme` |
| 7 | 跨窗口同步 | 复用 `settingsSyncChannel` 广播主题变更 |

#### Wave 3：视觉切换

| # | 任务 | 说明 |
|---|------|------|
| 8 | 应用黑曜石色值 | 将 `themes/obsidian.css` 中 `--theme-*` 替换为正式黑曜石配色 |
| 9 | 审计硬编码色值 | 搜索所有 `rgba()`/`#xxx` 硬编码色值，提升为 `--ui-*`/`--theme-*` 变量 |
| 10 | 毛玻璃降级 | 加入 `[data-blur="off"]` 回退样式 |

#### Wave 4：设置 UI + 收尾

| # | 任务 | 说明 |
|---|------|------|
| 11 | 外观页面改造 | `SettingsAppearanceSection.vue` 新增主题选择器 + 毛玻璃开关 |
| 12 | 测试回归 | 全量 `npm run check:all` + 手动双窗口 smoke test |

### 6.3 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| CSS 拆分后层叠顺序变化 | `index.css` 的 @import 顺序严格对应原 styles.css 节区顺序 |
| 硬编码色值遗漏 | Grep 全局搜索 `#[0-9a-fA-F]`、`rgba(`、`rgb(` 审计 |
| scoped CSS 遗漏 | `SettingsAppearanceSection.vue` 和 `SettingsAboutSection.vue` 的 scoped 样式同步迁移 |
| 窗口透明度 + 主题色冲突 | `--ui-opacity` 独立运作，主题 glass-bg alpha 基于 opacity=1 设计 |
| Windows 毛玻璃性能 | 提供 `blurEnabled` 开关，`[data-blur="off"]` 回退纯色 |

---

## 7. 测试策略

### 7.1 自动化测试

- **主题注册表**：所有注册主题 ID 唯一、preview 字段完整
- **useTheme composable**：`applyTheme` 正确设置 `data-theme`、BroadcastChannel 消息发送
- **settingsStore migration**：旧版存储迁移后正确填充默认值
- **CSS 变量完整性**：`:root[data-theme="obsidian"]` 定义了 `tokens.css` 引用的所有 `--theme-*` 变量
- **现有测试回归**：`npm run check:all` 全绿

### 7.2 手动验证清单

- [ ] 主窗口：搜索框、结果抽屉、Review overlay、Flow 抽屉在黑曜石主题下视觉正确
- [ ] 设置窗口：全部 5 个路由页面视觉正确
- [ ] 外观页：主题选择器、毛玻璃开关、透明度滑块交互正常
- [ ] 跨窗口：设置窗口切换主题，主窗口实时跟随
- [ ] 透明度：调节不影响主题色值
- [ ] 毛玻璃关闭：视觉降级正常，无布局错位
- [ ] `prefers-reduced-motion`：动画回退工作正常

---

## 8. 文件影响清单

### 8.1 删除

- `tailwind.config.cjs`
- `postcss.config.cjs`

### 8.2 新增

- `src/styles/index.css`
- `src/styles/reset.css`
- `src/styles/tokens.css`
- `src/styles/themes/_index.css`
- `src/styles/themes/obsidian.css`
- `src/styles/shared.css`
- `src/styles/launcher.css`
- `src/styles/settings.css`
- `src/styles/animations.css`
- `src/features/themes/themeRegistry.ts`
- `src/composables/app/useTheme.ts`

### 8.3 修改

- `src/main.ts` — 导入路径
- `src/styles.css` — 删除（内容迁移到新文件）
- `src/composables/app/useAppCompositionRoot/` — 集成 useTheme
- `src/stores/settingsStore.ts` — 新增 theme/blurEnabled 字段
- `src/stores/settings/defaults.ts` — 新增默认值
- `src/stores/settings/migration.ts` — 新增迁移逻辑
- `src/components/settings/parts/SettingsAppearanceSection.vue` — 外观页改造
- `index.html` — 新增防闪烁脚本
- `package.json` — 移除 tailwindcss/autoprefixer/postcss 依赖
- `vite.config.js` — 移除 PostCSS 相关配置（如有）
