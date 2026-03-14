# 黑曜石主题系统 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 ZapCmd 建立多主题 CSS 架构，首发交付"黑曜石沉浸风"主题，覆盖主窗口和设置窗口。

**Architecture:** 双层 CSS 变量（`--theme-*` 主题层 → `--ui-*` 语义层），通过 `data-theme` 属性切换主题。CSS 按功能拆分为 7 个模块文件。`useTheme` composable 管理主题状态，复用现有 `settingsSyncChannel` 实现跨窗口同步。

**Tech Stack:** Vue 3 + Pinia + TypeScript + Tauri + 原生 CSS 自定义属性（无预处理器）

**Spec:** `docs/superpowers/specs/2026-03-14-obsidian-theme-system-design.md`

---

## 文件结构 (File Map)

### 删除

| 文件 | 说明 |
|------|------|
| `tailwind.config.cjs` | Tailwind 配置 |
| `postcss.config.cjs` | PostCSS 配置 |
| `src/styles.css` | 旧单文件（Task 6 拆分完成后删除） |

### 新增

| 文件 | 职责 |
|------|------|
| `src/styles/index.css` | CSS 总入口（@import 各模块） |
| `src/styles/reset.css` | 轻量 CSS Reset（替代 Tailwind Preflight） |
| `src/styles/tokens.css` | 语义层 `--ui-*` 变量映射 + 布局/字体常量 |
| `src/styles/themes/_index.css` | 主题入口（@import 所有主题） |
| `src/styles/themes/obsidian.css` | 黑曜石主题 `--theme-*` 色值 |
| `src/styles/shared.css` | 跨窗口共享组件（btn-*、kbd、toast 等） |
| `src/styles/launcher.css` | 主窗口样式 |
| `src/styles/settings.css` | 设置窗口样式 |
| `src/styles/animations.css` | 所有 @keyframes + prefers-reduced-motion |
| `src/features/themes/themeRegistry.ts` | 主题注册表（元数据 + 预览色） |
| `src/composables/app/useTheme.ts` | 主题切换 composable |
| `src/features/themes/__tests__/themeRegistry.test.ts` | 注册表测试 |
| `src/composables/__tests__/app/useTheme.test.ts` | useTheme 测试 |

### 修改

| 文件 | 变更 |
|------|------|
| `src/main.ts` | 导入路径 `./styles.css` → `./styles/index.css` |
| `index.html` | 新增 `data-theme`/`data-blur` + 防闪烁脚本 |
| `package.json` | 移除 tailwindcss/autoprefixer/postcss 依赖 |
| `tsconfig.node.json` | 清理 include 中已删除配置文件的引用 |
| `src/stores/settings/defaults.ts` | 新增 theme/blurEnabled 字段 + 默认值 |
| `src/stores/settings/normalization.ts` | 新增 normalizeThemeId/normalizeBlurEnabled |
| `src/stores/settings/migration.ts` | 提取新字段 |
| `src/stores/settingsStore.ts` | 新增 theme/blurEnabled state + actions |
| `src/composables/app/useAppCompositionRoot/context.ts` | 集成 useTheme |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 暴露 theme/blurEnabled 到视图层 |
| `src/components/settings/types.ts` | 新增 theme/blurEnabled props 类型 |
| `src/components/settings/SettingsWindow.vue` | 传递新 props 到 AppearanceSection |
| `src/App.vue` | 绑定 theme/blurEnabled props 到 SettingsWindow |
| `src/components/settings/parts/SettingsAppearanceSection.vue` | 主题选择器 + 毛玻璃开关 |
| `src/i18n/messages.ts` | 新增外观设置 i18n 文本 |

---

## Chunk 1: Wave 1 — 架构准备（视觉零差异）

> **目标**：将 2615 行 `styles.css` 拆分为 7 个模块文件 + 双层变量架构，视觉效果与当前完全一致。

### Task 1: 移除 Tailwind CSS 依赖

**Files:**
- Delete: `tailwind.config.cjs`
- Delete: `postcss.config.cjs`
- Modify: `package.json` (移除 devDependencies)
- Modify: `tsconfig.node.json` (清理 include)
- Modify: `src/styles.css:1-3` (删除 @tailwind 指令)

**前置验证**：当前项目中无 Tailwind 工具类使用（已 grep 确认 `.vue`/`.ts` 文件中无 `flex `、`p-\d`、`m-\d` 等 Tailwind class）。`styles.css` 前 3 行的 `@tailwind base/components/utilities` 是唯一引用。

- [ ] **Step 1: 删除 styles.css 前 3 行 Tailwind 指令**

```css
/* 删除这 3 行 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 2: 删除 tailwind.config.cjs 和 postcss.config.cjs**

```bash
rm tailwind.config.cjs postcss.config.cjs
```

- [ ] **Step 3: 从 package.json 移除依赖**

从 `devDependencies` 中移除：
- `"tailwindcss": "^3.4.17"`
- `"autoprefixer": "^10.4.21"`
- `"postcss": "^8.5.6"`

- [ ] **Step 4: 清理 tsconfig.node.json**

```json
// before
"include": ["vite.config.js", "tailwind.config.cjs", "postcss.config.cjs"]

// after
"include": ["vite.config.js"]
```

- [ ] **Step 5: 确认 vite.config.js 无需修改**

验证 `vite.config.js` 中无 PostCSS 相关配置（已确认：当前文件不包含 `postcss` 或 `css.postcss` 配置项，无需修改）。

- [ ] **Step 6: 重装依赖并验证构建**

```bash
npm install && npm run build
```

Expected: 构建成功，无报错

- [ ] **Step 7: 提交**

```bash
git add package.json package-lock.json tsconfig.node.json src/styles.css
git rm tailwind.config.cjs postcss.config.cjs
git commit -m "$(cat <<'EOF'
refactor(styles): 彻底移除 Tailwind CSS 依赖

项目未实际使用 Tailwind 工具类，仅引入了三条 @tailwind 指令。
移除 tailwindcss/autoprefixer/postcss 依赖和配置文件。
EOF
)"
```

---

### Task 2: 创建 reset.css

**Files:**
- Create: `src/styles/reset.css`

- [ ] **Step 1: 创建 src/styles/ 目录**

```bash
mkdir -p src/styles/themes
```

- [ ] **Step 2: 编写 reset.css**

内容来源：`src/styles.css:30-47`（现有 reset）+ 补充 Tailwind Preflight 中项目可能依赖的规则。

```css
/* ── CSS Reset ── */
/* 替代 Tailwind Preflight，仅保留项目实际需要的重置规则 */

*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body,
#app {
  margin: 0;
  width: 100%;
  height: 100%;
  background: transparent;
}

body {
  overflow: hidden;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Tailwind Preflight 中项目依赖的补充规则 */
img,
video,
svg {
  display: block;
  max-width: 100%;
}

button,
input,
select,
textarea {
  font: inherit;
  color: inherit;
}

button {
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

h1, h2, h3, h4, h5, h6, p, dl, dd {
  margin: 0;
}

ul, ol {
  list-style: none;
  margin: 0;
  padding: 0;
}

a {
  color: inherit;
  text-decoration: none;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/styles/reset.css
git commit -m "refactor(styles): 创建 reset.css 替代 Tailwind Preflight"
```

---

### Task 3: 创建 themes/obsidian.css（当前色值迁移）

**Files:**
- Create: `src/styles/themes/obsidian.css`
- Create: `src/styles/themes/_index.css`

**说明**：Wave 1 使用**当前** `styles.css:5-28` 中的色值（非设计文档中的最终黑曜石配色），确保视觉零差异。Wave 3 再替换为正式黑曜石色值。

**Wave 1 色值对照表**（`styles.css :root` → `--theme-*`）：

| 现有 `--ui-*` 变量 | 当前值 | 目标 `--theme-*` 变量 |
|---------------------|--------|----------------------|
| `--ui-bg: rgba(24,25,28, var(--ui-opacity))` | RGB: 24,25,28 | `--theme-bg-rgb: 24, 25, 28` |
| `--ui-bg-soft` | `rgba(255,255,255,0.06)` | `--theme-surface-soft` |
| `--ui-border` | `rgba(255,255,255,0.1)` | `--theme-border` |
| `--ui-shadow` | `0 14px 32px rgba(0,0,0,0.3)` | `--theme-shadow` |
| `--ui-text` | `#f5f5f5` | `--theme-text` |
| `--ui-subtle` | `#a1a1aa` | `--theme-text-muted` |
| `--ui-brand` | `#c7ccd3` | `--theme-brand` |
| `--ui-brand-rgb` | `199, 204, 211` | `--theme-brand-rgb` |
| `--ui-brand-soft` | `rgba(199,204,211,0.16)` | `--theme-brand-soft` |
| `--ui-search-hl` | `#4cc9f0` | `--theme-search-hl` |
| `--ui-search-hl-rgb` | `76, 201, 240` | `--theme-search-hl-rgb` |
| `--ui-success` | `#2dd4bf` | `--theme-success` |
| `--ui-danger` | `#fb7185` | `--theme-danger` |
| `--ui-accent` | `#37cc8a` | `--theme-accent` |
| `--ui-shell-dim` | `rgba(11,14,20,0.32)` | `--theme-glass-bg` |

> **注意**：Wave 3 中 `--theme-bg-rgb` 将从 `24,25,28` 变为 `24,24,27`，`--theme-accent` 从绿色 `#37cc8a` 变为琥珀金 `#FBBF24`。这些是预期的视觉变更。

- [ ] **Step 1: 编写 themes/obsidian.css**

将当前 `:root` 中的色值提取为 `--theme-*` 主题层变量：

```css
/* ── 黑曜石主题 (Obsidian) ── */
/* Wave 1：使用当前色值，保证视觉零差异 */
/* Wave 3 将替换为正式黑曜石配色 */

:root[data-theme="obsidian"] {
  /* ── 材质 ── */
  --theme-bg-rgb:       24, 25, 28;
  --theme-surface-soft: rgba(255, 255, 255, 0.06);

  /* ── 边框与阴影 ── */
  --theme-border:       rgba(255, 255, 255, 0.1);
  --theme-shadow:       0 14px 32px rgba(0, 0, 0, 0.3);

  /* ── 文字 ── */
  --theme-text:         #f5f5f5;
  --theme-text-muted:   #a1a1aa;

  /* ── 品牌色 ── */
  --theme-brand:        #c7ccd3;
  --theme-brand-rgb:    199, 204, 211;
  --theme-brand-soft:   rgba(199, 204, 211, 0.16);

  /* ── 搜索高亮 ── */
  --theme-search-hl:     #4cc9f0;
  --theme-search-hl-rgb: 76, 201, 240;

  /* ── 状态色 ── */
  --theme-success:      #2dd4bf;
  --theme-danger:       #fb7185;

  /* ── 强调色（设置导航等） ── */
  --theme-accent:       #37cc8a;

  /* ── 毛玻璃/遮罩 ── */
  --theme-glass-bg:     rgba(11, 14, 20, 0.32);
}
```

- [ ] **Step 2: 编写 themes/_index.css**

```css
/* 主题入口 — 导入所有主题文件 */
@import './obsidian.css';
```

- [ ] **Step 3: 提交**

```bash
git add src/styles/themes/
git commit -m "refactor(styles): 创建黑曜石主题层变量（当前色值迁移）"
```

---

### Task 4: 创建 tokens.css（语义映射）

**Files:**
- Create: `src/styles/tokens.css`

- [ ] **Step 1: 编写 tokens.css**

将 `styles.css:5-28` 的 `:root` 变量改为引用 `--theme-*`：

```css
/* ── 语义层变量 ── */
/* 组件只引用 --ui-* 变量，不直接使用 --theme-* */

:root {
  /* ── 基础设定（不随主题变） ── */
  color-scheme: dark;
  font-family: "Segoe UI", "Helvetica Neue", "Noto Sans", sans-serif;

  /* ── 布局常量 ── */
  --ui-radius:           12px;
  --ui-top-align-offset: 18px;
  --ui-font-mono: "Fira Code", "JetBrains Mono", "SF Mono", Consolas, Monaco, monospace;

  /* ── 运行时动态变量（由 JS 控制，不属于主题） ── */
  --ui-opacity: 0.96;

  /* ── 颜色语义映射 ── */
  --ui-bg:          rgba(var(--theme-bg-rgb), var(--ui-opacity));
  --ui-bg-soft:     var(--theme-surface-soft);
  --ui-border:      var(--theme-border);
  --ui-shadow:      var(--theme-shadow);

  --ui-text:        var(--theme-text);
  --ui-subtle:      var(--theme-text-muted);

  --ui-brand:       var(--theme-brand);
  --ui-brand-rgb:   var(--theme-brand-rgb);
  --ui-brand-soft:  var(--theme-brand-soft);

  --ui-search-hl:     var(--theme-search-hl);
  --ui-search-hl-rgb: var(--theme-search-hl-rgb);

  --ui-success:     var(--theme-success);
  --ui-danger:      var(--theme-danger);
  --ui-accent:      var(--theme-accent);

  --ui-shell-dim:   var(--theme-glass-bg);
}
```

- [ ] **Step 2: 在 index.html 添加静态 data-theme 属性**

为保证 Wave 1 变量生效，需要 `data-theme="obsidian"` 存在于 `<html>` 上：

```html
<!-- before -->
<html lang="en">

<!-- after -->
<html lang="en" data-theme="obsidian" data-blur="on">
```

> Wave 2 将用防闪烁脚本动态替换此静态属性。

- [ ] **Step 3: 提交**

```bash
git add src/styles/tokens.css index.html
git commit -m "refactor(styles): 创建语义层变量映射 tokens.css"
```

---

### Task 5: 拆分样式文件

**Files:**
- Create: `src/styles/shared.css`
- Create: `src/styles/launcher.css`
- Create: `src/styles/settings.css`
- Create: `src/styles/animations.css`
- Source: `src/styles.css`（以下行号基于移除 Tailwind 指令后的文件）

**拆分映射表**（基于 styles.css 原始行号）：

| 目标文件 | 来源行（styles.css） | 内容描述 |
|----------|---------------------|----------|
| **shared.css** | 91-97 | `[data-tauri-drag-region]` 基础规则 |
| | 127-137 | `[data-tauri-drag-region]` 子元素 cursor 规则 |
| | 228-231 | `.execution-feedback` 基础 |
| | 233-248 | `.execution-toast`（不含 @keyframes） |
| | 262-272 | `.execution-feedback--neutral/success/error` |
| | 274-284 | `.visually-hidden` |
| | 310-355 | `.btn-*` hover 媒体查询 (`@media (hover: hover)`) |
| | 401-452 | `.keyboard-hint`, `kbd` 样式 |
| | 1411-1487 | `.btn-muted/primary/stage/success/danger` 实现, `.btn-small`, `.btn-icon`, `.launcher-icon` |
| **launcher.css** | 49-90 | `.launcher-root`, `.search-shell` 布局 |
| | 103-126 | drag 排除规则, `.shell-drag-strip` |
| | 139-308 | 面板共享样式, `.search-capsule/form/input` |
| | 357-398 | `.result-drawer` + 滚动条 |
| | 454-566 | `.result-item` + 子元素（不含 @keyframes） |
| | 579-818 | `.drawer-empty`, `.flow-overlay/panel`（不含 @keyframes） |
| | 896-977 | `.review-overlay/panel` 动画状态类（不含 @keyframes） |
| | 1066-1173 | `.review-panel__*` 子元素, `.staging-panel` 基础 |
| | 1200-1409 | `.staging-chip/card/list` |
| | 1489-1598 | `.param-overlay/dialog`（不含 @keyframes） |
| | 1600-1649 | `.safety-overlay/dialog` |
| | 2602-2615 | `@media (max-width: 900px)` 搜索框响应式 |
| **settings.css** | 1651-2553 | 所有 `.settings-*` 样式 |
| | 2555-2600 | `@media (max-width: 860px)` 设置窗口响应式 |
| **animations.css** | 250-260 | `@keyframes toast-slide-down` |
| | 567-577 | `@keyframes staged-feedback` |
| | 819-894 | 6 个 flow-drawer @keyframes |
| | 978-1033 | 4 个 review-overlay @keyframes |
| | 1035-1064 | `@media (prefers-reduced-motion)` |
| | 1174-1198 | `@keyframes staging-panel-enter/exit` |
| | 1503-1512 | `@keyframes fade-in` |
| | 1546-1556 | `@keyframes dialog-scale-in` |
| | 2282-2304 | `@keyframes filters-expand/collapse` |
| | 2538-2553 | `@keyframes toast-auto-dismiss` |

- [ ] **Step 1: 创建 shared.css**

从 `styles.css` 中提取上表 shared.css 对应的所有行。选择器和样式规则保持原样不变。

- [ ] **Step 2: 创建 launcher.css**

从 `styles.css` 中提取上表 launcher.css 对应的所有行。

**关键修改**：`styles.css:1220` 中的硬编码 `rgba(24, 25, 28, var(--ui-opacity))` 改为 `rgba(var(--theme-bg-rgb), var(--ui-opacity))`：

```css
/* before */
.staging-chip--active {
  border-color: rgba(var(--ui-brand-rgb), 0.48);
  background: linear-gradient(180deg, rgba(var(--ui-brand-rgb), 0.22), rgba(24, 25, 28, var(--ui-opacity)));
}

/* after */
.staging-chip--active {
  border-color: rgba(var(--ui-brand-rgb), 0.48);
  background: linear-gradient(180deg, rgba(var(--ui-brand-rgb), 0.22), rgba(var(--theme-bg-rgb), var(--ui-opacity)));
}
```

- [ ] **Step 3: 创建 settings.css**

从 `styles.css` 中提取上表 settings.css 对应的所有行。

- [ ] **Step 4: 创建 animations.css**

提取所有 19 个 `@keyframes` 块 + `@media (prefers-reduced-motion)` 块。

- [ ] **Step 5: 提交**

```bash
git add src/styles/shared.css src/styles/launcher.css src/styles/settings.css src/styles/animations.css
git commit -m "refactor(styles): 按功能模块拆分 CSS 为 shared/launcher/settings/animations"
```

---

### Task 6: 创建 index.css + 切换入口

**Files:**
- Create: `src/styles/index.css`
- Modify: `src/main.ts:7`
- Delete: `src/styles.css`

- [ ] **Step 1: 创建 index.css**

```css
/* ── ZapCmd 样式总入口 ── */
/* 层叠优先级从低到高 */

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

- [ ] **Step 2: 更新 main.ts 导入路径**

```typescript
// before
import "./styles.css";

// after
import "./styles/index.css";
```

- [ ] **Step 3: 删除旧 styles.css**

```bash
rm src/styles.css
```

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

Expected: 构建成功

- [ ] **Step 5: 运行完整检查**

```bash
npm run lint && npm run typecheck && npm run test:run
```

Expected: 全部通过

- [ ] **Step 6: 提交**

```bash
git add src/styles/index.css src/main.ts
git add src/styles.css  # 追踪删除
git commit -m "$(cat <<'EOF'
refactor(styles): 完成 CSS 模块化拆分

将 2615 行 styles.css 拆分为 7 个模块文件：
reset / tokens / themes / shared / launcher / settings / animations
视觉效果与拆分前完全一致。
EOF
)"
```

---

## Chunk 2: Wave 2 — 主题基础设施

> **目标**：创建主题注册表、useTheme composable、扩展 settingsStore，实现跨窗口主题切换基础设施。

### Task 7: 主题注册表 — 测试 + 实现

**Files:**
- Create: `src/features/themes/themeRegistry.ts`
- Create: `src/features/themes/__tests__/themeRegistry.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/features/themes/__tests__/themeRegistry.test.ts
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEME_REGISTRY } from "../themeRegistry";

describe("themeRegistry", () => {
  it("包含至少一个主题", () => {
    expect(THEME_REGISTRY.length).toBeGreaterThanOrEqual(1);
  });

  it("所有主题 id 唯一", () => {
    const ids = THEME_REGISTRY.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("所有主题 preview 字段完整", () => {
    for (const theme of THEME_REGISTRY) {
      expect(theme.preview.bg).toBeTruthy();
      expect(theme.preview.surface).toBeTruthy();
      expect(theme.preview.accent).toBeTruthy();
      expect(theme.preview.text).toBeTruthy();
    }
  });

  it("DEFAULT_THEME_ID 指向有效主题", () => {
    const found = THEME_REGISTRY.find((t) => t.id === DEFAULT_THEME_ID);
    expect(found).toBeTruthy();
  });

  it("主题 id 为合法 CSS 标识符（仅小写字母/数字/连字符）", () => {
    for (const theme of THEME_REGISTRY) {
      expect(theme.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/features/themes/__tests__/themeRegistry.test.ts
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 themeRegistry.ts**

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
    id: "obsidian",
    name: "黑曜石",
    description: "温暖深灰 + 琥珀金，长时间使用最舒适",
    preview: {
      bg: "#18181B",
      surface: "#27272A",
      accent: "#FBBF24",
      text: "#FAFAFA",
    },
  },
];

export const DEFAULT_THEME_ID = "obsidian";
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/features/themes/__tests__/themeRegistry.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/features/themes/
git commit -m "feat(themes): 创建主题注册表 themeRegistry"
```

---

### Task 8: 扩展 settingsStore（theme + blurEnabled）

**Files:**
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`

- [ ] **Step 1: 编写新字段的测试（追加到现有测试文件）**

在 `src/stores/__tests__/settingsStore.test.ts` 末尾追加：

```typescript
  it("为缺少 appearance.theme 的旧存储填充默认值 obsidian", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: 0.8,
      },
    });

    expect(migrated).toBeTruthy();
    expect(migrated?.appearance.theme).toBe("obsidian");
    expect(migrated?.appearance.blurEnabled).toBe(true);
  });

  it("保留有效的 theme 值", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: 0.96,
        theme: "obsidian",
        blurEnabled: false,
      },
    });

    expect(migrated?.appearance.theme).toBe("obsidian");
    expect(migrated?.appearance.blurEnabled).toBe(false);
  });

  it("无效 theme 值回退到默认", () => {
    const migrated = migrateSettingsPayload({
      version: 1,
      hotkeys: {},
      general: {},
      commands: {},
      appearance: {
        windowOpacity: 0.96,
        theme: 123,
        blurEnabled: "invalid",
      },
    });

    expect(migrated?.appearance.theme).toBe("obsidian");
    expect(migrated?.appearance.blurEnabled).toBe(true);
  });
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/stores/__tests__/settingsStore.test.ts
```

Expected: FAIL（theme/blurEnabled 属性不存在）

- [ ] **Step 3: 更新 defaults.ts**

```typescript
// 在 defaults.ts 中添加：

// 新增常量（紧接 DEFAULT_WINDOW_OPACITY 之后）
export const DEFAULT_THEME = "obsidian";
export const DEFAULT_BLUR_ENABLED = true;

// 更新 PersistedSettingsSnapshot.appearance 类型
export interface PersistedSettingsSnapshot {
  // ... 保持其他字段不变
  appearance: {
    windowOpacity: number;
    theme: string;        // 新增
    blurEnabled: boolean; // 新增
  };
}

// 更新 createDefaultSettingsSnapshot
export function createDefaultSettingsSnapshot(): PersistedSettingsSnapshot {
  return {
    // ... 保持其他字段不变
    appearance: {
      windowOpacity: DEFAULT_WINDOW_OPACITY,
      theme: DEFAULT_THEME,          // 新增
      blurEnabled: DEFAULT_BLUR_ENABLED, // 新增
    },
  };
}
```

- [ ] **Step 4: 更新 normalization.ts**

新增两个 normalize 函数：

```typescript
// 在 normalization.ts 中添加
import {
  // ... 现有导入
  DEFAULT_BLUR_ENABLED,
  DEFAULT_THEME,
} from "./defaults";

/** 仅做类型/格式校验。主题 ID 是否在注册表中有效由 useTheme.resolveThemeId 负责 */
export function normalizeThemeId(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_THEME;
  }
  const trimmed = value.trim();
  return trimmed || DEFAULT_THEME;
}

export function normalizeBlurEnabled(value: unknown): boolean {
  return normalizeBoolean(value, DEFAULT_BLUR_ENABLED);
}
```

更新 `normalizePersistedSettingsSnapshot` 中的 `appearance` 部分：

```typescript
appearance: {
  windowOpacity: normalizeWindowOpacity(snapshot.appearance.windowOpacity),
  theme: normalizeThemeId(snapshot.appearance.theme),           // 新增
  blurEnabled: normalizeBlurEnabled(snapshot.appearance.blurEnabled), // 新增
}
```

- [ ] **Step 5: 更新 migration.ts**

更新 `extractAppearance` 函数：

```typescript
function extractAppearance(payload: SettingsPayload): {
  windowOpacity: number;
  theme: string;
  blurEnabled: boolean;
} {
  if (!isRecord(payload.appearance)) {
    return {
      windowOpacity: createDefaultSettingsSnapshot().appearance.windowOpacity,
      theme: DEFAULT_THEME,
      blurEnabled: DEFAULT_BLUR_ENABLED,
    };
  }
  return {
    windowOpacity: normalizeWindowOpacity(payload.appearance.windowOpacity),
    theme: normalizeThemeId(payload.appearance.theme),
    blurEnabled: normalizeBlurEnabled(payload.appearance.blurEnabled),
  };
}
```

需要导入新增的函数和常量。

- [ ] **Step 6: 更新 settingsStore.ts**

在 `SettingsState` 接口中新增：

```typescript
interface SettingsState {
  // ... 现有字段
  windowOpacity: number;
  theme: string;        // 新增
  blurEnabled: boolean; // 新增
}
```

在 state 初始化中添加默认值，在 `applySnapshot` 中添加赋值，新增 actions：

```typescript
setTheme(value: string): void {
  this.theme = normalizeThemeId(value);
},
setBlurEnabled(value: boolean): void {
  this.blurEnabled = normalizeBlurEnabled(value);
},
```

更新 `snapshotFromState` 的 appearance 部分，更新 re-exports。

- [ ] **Step 7: 运行测试确认通过**

```bash
npx vitest run src/stores/__tests__/settingsStore.test.ts
```

Expected: PASS

- [ ] **Step 8: 运行全量类型检查**

```bash
npm run typecheck
```

Expected: 通过

- [ ] **Step 9: 提交**

```bash
git add src/stores/
git commit -m "feat(settings): 新增 theme 和 blurEnabled 设置字段"
```

---

### Task 9: useTheme composable — 测试 + 实现

**Files:**
- Create: `src/composables/app/useTheme.ts`
- Create: `src/composables/__tests__/app/useTheme.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
// src/composables/__tests__/app/useTheme.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useTheme } from "../../app/useTheme";

describe("useTheme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-blur");
  });

  it("立即将 data-theme 设置为当前 themeId", () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.theme).toBe("obsidian");
  });

  it("立即将 data-blur 设置为 on 或 off", () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(false);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.blur).toBe("off");
  });

  it("themeId 变更时更新 data-theme", async () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    themeId.value = "other-theme";
    await nextTick();

    expect(document.documentElement.dataset.theme).toBe("obsidian");
    // 无效主题回退到默认
  });

  it("无效 themeId 回退到 obsidian", () => {
    const themeId = ref("nonexistent");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.theme).toBe("obsidian");
  });

  it("blurEnabled 变更时更新 data-blur", async () => {
    const themeId = ref("obsidian");
    const blurEnabled = ref(true);
    useTheme({ themeId, blurEnabled });

    expect(document.documentElement.dataset.blur).toBe("on");

    blurEnabled.value = false;
    await nextTick();

    expect(document.documentElement.dataset.blur).toBe("off");
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/composables/__tests__/app/useTheme.test.ts
```

Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 useTheme.ts**

```typescript
// src/composables/app/useTheme.ts
import { watch, type Ref } from "vue";
import {
  DEFAULT_THEME_ID,
  THEME_REGISTRY,
} from "../../features/themes/themeRegistry";

export interface UseThemeOptions {
  themeId: Ref<string>;
  blurEnabled: Ref<boolean>;
}

function resolveThemeId(id: string): string {
  return THEME_REGISTRY.some((t) => t.id === id) ? id : DEFAULT_THEME_ID;
}

function applyTheme(id: string): void {
  document.documentElement.dataset.theme = resolveThemeId(id);
}

function applyBlur(enabled: boolean): void {
  document.documentElement.dataset.blur = enabled ? "on" : "off";
}

export function useTheme(options: UseThemeOptions) {
  watch(
    () => options.themeId.value,
    (id) => applyTheme(id),
    { immediate: true }
  );

  watch(
    () => options.blurEnabled.value,
    (enabled) => applyBlur(enabled),
    { immediate: true }
  );

  return {
    themes: THEME_REGISTRY,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/composables/__tests__/app/useTheme.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/composables/app/useTheme.ts src/composables/__tests__/app/useTheme.test.ts
git commit -m "feat(themes): 创建 useTheme composable 管理主题切换"
```

---

### Task 10: 防闪烁脚本 + 集成到组合根

**Files:**
- Modify: `index.html`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`

**跨窗口同步说明**：`useTheme` 不需要主动调用 `settingsSyncChannel.postMessage()`。原因：
1. 设置变更时 → `settingsStore.setTheme()` → `persist()` 写入 localStorage
2. `broadcastSettingsUpdated()` 通过现有 `settingsSyncChannel` 广播 `settings-updated` 消息
3. 另一个窗口收到消息 → `loadSettings()` 从 localStorage 重新读取 → `applySnapshot()` 更新 store
4. `useTheme` 的 `watch` 检测到 `themeId` 变化 → 自动应用 `data-theme` 属性

因此跨窗口同步完全由现有基础设施自动完成，无需额外代码。

> **注意**：设计文档 Section 4.6 中防闪烁脚本的伪代码使用了 `stored.theme`，但实际存储结构是 `stored.appearance.theme`（嵌套在 appearance 下）。计划中的路径是正确的。

- [ ] **Step 1: 替换 index.html 静态属性为防闪烁脚本**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ZapCmd</title>
    <script>
      (function () {
        try {
          var stored = JSON.parse(
            localStorage.getItem("zapcmd.settings") || "{}"
          );
          var theme =
            stored &&
            stored.appearance &&
            typeof stored.appearance.theme === "string"
              ? stored.appearance.theme
              : "obsidian";
          var blur =
            stored &&
            stored.appearance &&
            stored.appearance.blurEnabled !== false;
          document.documentElement.dataset.theme = theme;
          document.documentElement.dataset.blur = blur ? "on" : "off";
        } catch (e) {
          document.documentElement.dataset.theme = "obsidian";
          document.documentElement.dataset.blur = "on";
        }
      })();
    </script>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: 在 context.ts 中集成 useTheme**

在 `createAppCompositionContext` 中添加：

```typescript
// 新增导入
import { useTheme } from "../useTheme";

// 在 bindSettingsSideEffects 调用之后添加：
const themeId = computed(() => settingsStore.theme);
const blurEnabled = computed(() => settingsStore.blurEnabled);
const themeManager = useTheme({ themeId, blurEnabled });

// 在 return 对象中添加：
return {
  // ... 现有字段
  themeManager,
  setTheme: (value: string) => settingsStore.setTheme(value),
  setBlurEnabled: (value: boolean) => settingsStore.setBlurEnabled(value),
};
```

- [ ] **Step 3: 验证类型检查和构建**

```bash
npm run typecheck && npm run build
```

Expected: 通过

- [ ] **Step 4: 运行全量测试**

```bash
npm run test:run
```

Expected: 全部通过（包括现有测试无回归）

- [ ] **Step 5: 提交**

```bash
git add index.html src/composables/app/useAppCompositionRoot/context.ts src/composables/app/useTheme.ts
git commit -m "$(cat <<'EOF'
feat(themes): 防闪烁初始化 + useTheme 集成到组合根

- index.html 内联脚本在 Vue 挂载前预设 data-theme/data-blur
- useTheme 集成到 useAppCompositionRoot，自动跟随 settingsStore
- 跨窗口同步通过现有 settingsSyncChannel 自动完成
EOF
)"
```

---

## Chunk 3: Wave 3 — 视觉切换

> **目标**：应用正式黑曜石配色，审计迁移硬编码色值，添加毛玻璃降级。

### Task 11: 应用黑曜石正式配色

**Files:**
- Modify: `src/styles/themes/obsidian.css`
- Modify: `src/styles/tokens.css`

- [ ] **Step 1: 替换 obsidian.css 为正式黑曜石色值**

用设计文档 Section 3.1 的完整色值替换 Wave 1 临时值：

```css
:root[data-theme="obsidian"] {
  /* ── 材质 ── */
  --theme-bg:           #18181B;
  --theme-bg-rgb:       24, 24, 27;
  --theme-bg-deep:      #09090B;
  --theme-surface:      #27272A;
  --theme-surface-soft: rgba(255, 255, 255, 0.06);

  /* ── 边框与阴影 ── */
  --theme-border:       rgba(255, 255, 255, 0.10);
  --theme-border-light: rgba(255, 255, 255, 0.05);
  --theme-ring:         rgba(255, 255, 255, 0.05);
  --theme-shadow:       0 14px 32px rgba(0, 0, 0, 0.3);

  /* ── 文字 ── */
  --theme-text:         #FAFAFA;
  --theme-text-muted:   #A1A1AA;
  --theme-text-dim:     #71717A;

  /* ── 强调色（琥珀/暗金） ── */
  --theme-accent:       #FBBF24;
  --theme-accent-rgb:   251, 191, 36;
  --theme-accent-soft:  rgba(251, 191, 36, 0.16);
  --theme-accent-text:  #09090B;

  /* ── 状态色 ── */
  --theme-success:      #2DD4BF;
  --theme-danger:       #FB7185;
  --theme-danger-soft:  rgba(251, 113, 133, 0.10);

  /* ── 交互态 ── */
  --theme-hover:        rgba(39, 39, 42, 0.50);
  --theme-selected:     rgba(39, 39, 42, 0.60);
  --theme-kbd:          rgba(39, 39, 42, 0.80);

  /* ── 搜索高亮 ── */
  --theme-search-hl:     #FBBF24;
  --theme-search-hl-rgb: 251, 191, 36;

  /* ── 毛玻璃 ── */
  --theme-blur:         24px;
  --theme-glass-bg:     rgba(24, 24, 27, 0.85);

  /* ── 设置窗口 ── */
  --theme-sidebar-bg:   rgba(24, 24, 27, 0.40);
  --theme-input-bg:     #09090B;
  --theme-toggle-on:    #FBBF24;
  --theme-toggle-off:   #3F3F46;
}
```

- [ ] **Step 2: 更新 tokens.css 添加新语义映射**

在 tokens.css 的 `:root` 中补充新增的语义变量：

```css
:root {
  /* ... 保留现有映射 ... */

  /* ── 新增语义变量 ── */
  --ui-bg-deep:     var(--theme-bg-deep);
  --ui-surface:     var(--theme-surface);
  --ui-border-light:var(--theme-border-light);
  --ui-dim:         var(--theme-text-dim);

  /* 品牌色与强调色：黑曜石主题中指向同一源 */
  --ui-brand:       var(--theme-accent);
  --ui-brand-rgb:   var(--theme-accent-rgb);
  --ui-brand-soft:  var(--theme-accent-soft);
  --ui-accent:      var(--theme-accent);

  --ui-danger-soft: var(--theme-danger-soft);

  --ui-hover:       var(--theme-hover);
  --ui-selected:    var(--theme-selected);
  --ui-kbd:         var(--theme-kbd);

  --ui-blur:        var(--theme-blur);
  --ui-glass-bg:    var(--theme-glass-bg);

  --ui-sidebar-bg:  var(--theme-sidebar-bg);
  --ui-input-bg:    var(--theme-input-bg);
  --ui-toggle-on:   var(--theme-toggle-on);
  --ui-toggle-off:  var(--theme-toggle-off);
}
```

- [ ] **Step 3: 构建验证**

```bash
npm run build
```

Expected: 构建成功

- [ ] **Step 4: 提交**

```bash
git add src/styles/themes/obsidian.css src/styles/tokens.css
git commit -m "feat(themes): 应用黑曜石正式配色（琥珀金 + 深灰）"
```

---

### Task 12: 审计并迁移硬编码色值

**Files:**
- Modify: `src/styles/shared.css`
- Modify: `src/styles/launcher.css`
- Modify: `src/styles/settings.css`
- Modify: `src/styles/themes/obsidian.css`（按需补充变量）

**审计方法**：

```bash
# 搜索所有 CSS 文件中的硬编码色值
grep -rn "#[0-9a-fA-F]\{3,8\}\b" src/styles/ --include="*.css"
grep -rn "rgba\?(" src/styles/ --include="*.css" | grep -v "var("
# 搜索 Vue scoped 样式中的硬编码色值
grep -rn "#[0-9a-fA-F]\{3,8\}\b" src/components/ --include="*.vue"
grep -rn "rgba\?(" src/components/ --include="*.vue" | grep -v "var("
```

- [ ] **Step 1: 执行 grep 审计，列出所有硬编码色值**

分析每个硬编码色值是否应提升为 `--ui-*` 变量。

**已知需要迁移的高频硬编码色值**：

| 硬编码值 | 出现次数 | 目标变量 |
|----------|---------|----------|
| `rgba(255,255,255,0.xx)` | ~60 处 | 保留（白色透明度变体，与主题无关） |
| `rgba(0,0,0,0.xx)` | ~15 处 | 保留（黑色透明度变体，与主题无关） |
| `#061319` | 5 处 | `var(--theme-accent-text)` |
| `#c7ccd3` / `#d4d4db` | 多处 | `var(--ui-brand)` / `var(--ui-subtle)` |
| `#71717a` | 1 处 | `var(--ui-dim)` |
| `rgba(55,204,138,...)` | ~30 处 | `var(--ui-accent)` 相关 |
| `rgba(248,113,113,...)` | ~15 处 | `var(--ui-danger)` 相关 |
| `rgba(24,25,28,...)` | 2 处 | `rgba(var(--theme-bg-rgb), ...)` |
| `#ffb4b4` / `#ffc9c9` 等 | 多处 | 需新增 `--ui-danger-light` 或保留 |

- [ ] **Step 2: 逐个替换可提升的色值**

**原则**：
- 白色/黑色透明度变体（`rgba(255,255,255,0.xx)` 和 `rgba(0,0,0,0.xx)`）一般保留，因为它们是基于对比度的通用叠加
- 与品牌色/状态色相关的 rgba 应迁移到 `--ui-*` 变量
- settings 绿色 `rgba(55,204,138,...)` 改为 `rgba(var(--ui-accent-rgb), alpha)` 或 `--ui-accent` 相关变量
- 按需在 `obsidian.css` 中补充新的 `--theme-*` 变量

- [ ] **Step 3: 迁移 Vue scoped 样式中的硬编码色值**

重点文件：
- `src/components/settings/parts/SettingsAppearanceSection.vue`：`#37cc8a`、`#0a2016`、`#ebf7f1`、`rgba(24,25,28,...)`
- `src/components/settings/parts/SettingsAboutSection.vue`：`rgba(55,204,138,...)`、`rgba(248,113,113,...)`、`#37cc8a`

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

- [ ] **Step 5: 提交**

```bash
git add src/styles/ src/components/
git commit -m "refactor(styles): 审计并迁移硬编码色值到主题变量"
```

---

### Task 13: 毛玻璃降级样式

**Files:**
- Modify: `src/styles/launcher.css`
- Modify: `src/styles/settings.css`

在 `launcher.css` 末尾追加（选择器基于 `styles.css` 中实际使用 `backdrop-filter` 的 4 个元素）：

```css
/* ── 毛玻璃降级（关闭时用纯色替代） ── */
/* 以下选择器对应 styles.css 中实际使用 backdrop-filter 的元素 */
[data-blur="off"] .execution-toast {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background-color: var(--ui-surface);
}

[data-blur="off"] .drawer-scrim {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

[data-blur="off"] .param-dialog {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  background-color: var(--ui-surface);
}
```

在 `settings.css` 末尾追加：

```css
[data-blur="off"] .settings-close-confirm__scrim {
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
```

- [ ] **Step 2: 构建验证**

```bash
npm run build
```

- [ ] **Step 3: 提交**

```bash
git add src/styles/launcher.css src/styles/settings.css
git commit -m "feat(themes): 毛玻璃降级 — data-blur=off 时切换纯色背景"
```

---

## Chunk 4: Wave 4 — 设置 UI + 收尾

> **目标**：改造外观设置页面（主题选择器 + 毛玻璃开关），完成全量回归。

### Task 14: SettingsAppearanceSection 改造

**Files:**
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`

- [ ] **Step 1: 更新组件 props 和 emits**

```typescript
const props = defineProps<{
  windowOpacity: number;
  theme: string;           // 新增
  blurEnabled: boolean;    // 新增
  themes: ReadonlyArray<ThemeMeta>; // 新增
}>();

const emit = defineEmits<{
  (e: "update-opacity", value: number): void;
  (e: "update-theme", value: string): void;       // 新增
  (e: "update-blur-enabled", value: boolean): void; // 新增
}>();
```

- [ ] **Step 2: 添加主题选择器模板**

在 `<template>` 中，窗口透明度之前添加主题选择和毛玻璃开关：

```html
<section class="settings-group">
  <h2>{{ t("settings.appearance.title") }}</h2>

  <!-- 主题选择 -->
  <div class="settings-field">
    <label>{{ t("settings.appearance.themeLabel") }}</label>
    <div class="theme-selector">
      <button
        v-for="themeMeta in props.themes"
        :key="themeMeta.id"
        type="button"
        class="theme-card"
        :class="{ 'theme-card--active': themeMeta.id === props.theme }"
        @click="emit('update-theme', themeMeta.id)"
      >
        <div class="theme-card__swatches">
          <span class="theme-card__swatch" :style="{ background: themeMeta.preview.bg }" />
          <span class="theme-card__swatch" :style="{ background: themeMeta.preview.surface }" />
          <span class="theme-card__swatch" :style="{ background: themeMeta.preview.accent }" />
          <span class="theme-card__swatch" :style="{ background: themeMeta.preview.text }" />
        </div>
        <span class="theme-card__name">{{ themeMeta.name }}</span>
      </button>
    </div>
  </div>

  <!-- 毛玻璃开关 -->
  <div class="settings-field">
    <label>{{ t("settings.appearance.blurLabel") }}</label>
    <div class="appearance-toggle-row">
      <button
        type="button"
        class="appearance-toggle"
        :class="{ 'appearance-toggle--on': props.blurEnabled }"
        role="switch"
        :aria-checked="props.blurEnabled"
        @click="emit('update-blur-enabled', !props.blurEnabled)"
      >
        <span class="appearance-toggle__thumb" />
      </button>
      <span class="appearance-toggle-label">
        {{ props.blurEnabled
          ? t("settings.appearance.blurOn")
          : t("settings.appearance.blurOff") }}
      </span>
    </div>
    <p class="settings-hint">{{ t("settings.appearance.blurHint") }}</p>
  </div>

  <!-- 窗口透明度（保留现有） -->
  <!-- ... 现有 opacity slider 代码保持不变 ... -->
</section>
```

- [ ] **Step 3: 添加 scoped 样式**

在 `<style scoped>` 中追加主题卡片和 toggle 样式（使用 `--ui-*` 语义变量）：

```css
.theme-selector {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: transparent;
  cursor: pointer;
  transition: border-color 0.15s;
}

.theme-card:hover {
  border-color: var(--ui-subtle);
}

.theme-card--active {
  border-color: var(--ui-accent);
}

.theme-card__swatches {
  display: flex;
  gap: 4px;
}

.theme-card__swatch {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid var(--ui-border);
}

.theme-card__name {
  font-size: 12px;
  color: var(--ui-text);
}

.appearance-toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.appearance-toggle {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: var(--ui-toggle-off);
  border: none;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.2s;
}

.appearance-toggle--on {
  background: var(--ui-toggle-on);
}

.appearance-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--ui-text);
  transition: transform 0.2s;
}

.appearance-toggle--on .appearance-toggle__thumb {
  transform: translateX(18px);
}

.appearance-toggle-label {
  font-size: 13px;
  color: var(--ui-subtle);
}
```

- [ ] **Step 4: 迁移现有 scoped 样式中的硬编码色值**

将 slider thumb 的 `#37cc8a` 替换为 `var(--ui-accent)`，`#0a2016` 替换为 `var(--ui-bg-deep)`，`#ebf7f1` 替换为 `var(--ui-text)` 等。preview panel 的 `rgba(24, 25, 28, ...)` 替换为 `rgba(var(--theme-bg-rgb), ...)`.

- [ ] **Step 5: 连接上游 — 完整 props 传递链**

**传递链**：`settingsStore` → `context.ts` → `viewModel.ts` → `App.vue` → `SettingsWindow.vue` → `SettingsAppearanceSection.vue`

**5a. `src/components/settings/types.ts`** — 添加新 props 类型：

在 `SettingsAppearanceProps` 接口（或等效类型）中新增：
```typescript
theme: string;
blurEnabled: boolean;
themes: ReadonlyArray<ThemeMeta>;
```

**5b. `src/composables/app/useAppCompositionRoot/viewModel.ts`** — 暴露到视图层：

在 viewModel 返回值中添加 `theme`、`blurEnabled`、`themeManager.themes`、`setTheme`、`setBlurEnabled`。

**5c. `src/components/settings/SettingsWindow.vue`**（约第 167-171 行）：

```html
<!-- before -->
<SettingsAppearanceSection
  v-else
  :window-opacity="props.windowOpacity"
  @update-opacity="emit('update-opacity', $event)"
/>

<!-- after -->
<SettingsAppearanceSection
  v-else
  :window-opacity="props.windowOpacity"
  :theme="props.theme"
  :blur-enabled="props.blurEnabled"
  :themes="props.themes"
  @update-opacity="emit('update-opacity', $event)"
  @update-theme="emit('update-theme', $event)"
  @update-blur-enabled="emit('update-blur-enabled', $event)"
/>
```

同时更新 `SettingsWindow.vue` 的 `defineProps` 和 `defineEmits` 添加新字段。

**5d. `src/App.vue`**（约第 197-266 行 SettingsWindow 绑定处）：

```html
<SettingsWindow
  v-else
  ...
  :window-opacity="windowOpacity"
  :theme="theme"
  :blur-enabled="blurEnabled"
  :themes="themeManager.themes"
  ...
  @update-opacity="setWindowOpacity"
  @update-theme="setTheme"
  @update-blur-enabled="setBlurEnabled"
  ...
/>
```

- [ ] **Step 6: 添加 i18n 文本**

在 `src/i18n/messages.ts` 的 `settings.appearance` 命名空间下添加：

| Key | zh-CN | en-US |
|-----|-------|-------|
| `settings.appearance.themeLabel` | 主题 | Theme |
| `settings.appearance.blurLabel` | 毛玻璃效果 | Glassmorphism |
| `settings.appearance.blurOn` | 已开启 | On |
| `settings.appearance.blurOff` | 已关闭 | Off |
| `settings.appearance.blurHint` | 关闭可降低 GPU 占用 | Disable to reduce GPU usage |

- [ ] **Step 7: 构建 + 类型检查**

```bash
npm run typecheck && npm run build
```

- [ ] **Step 8: 提交**

```bash
git add src/components/settings/ src/i18n/
git commit -m "feat(settings): 外观页面新增主题选择器 + 毛玻璃开关"
```

---

### Task 15: 全量回归测试

**Files:** 无新增，仅验证

- [ ] **Step 1: 运行完整 check:all**

```bash
npm run check:all
```

Expected: lint → typecheck → test:coverage → build → check:rust 全绿

- [ ] **Step 2: 手动验证清单**

以下为手动 smoke test，需在 `tauri:dev` 中逐项确认：

```bash
npm run tauri:dev
```

- [ ] 主窗口：搜索框、结果抽屉、Review overlay、Flow 抽屉视觉正确
- [ ] 设置窗口：全部路由页面视觉正确
- [ ] 外观页：主题选择器、毛玻璃开关、透明度滑块交互正常
- [ ] 跨窗口：设置窗口切换主题 → 主窗口实时跟随
- [ ] 透明度：调节不影响主题色值
- [ ] 毛玻璃关闭：视觉降级正常，无布局错位
- [ ] `prefers-reduced-motion`：动画回退正常

- [ ] **Step 3: 最终提交（如有修复）**

```bash
git add <修复涉及的具体文件>
git commit -m "fix(themes): 回归测试修复"
```
