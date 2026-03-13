# UI/UX 审查 v3：基于实际运行界面的精修计划

> 日期：2026-03-13
> 范围：基于 Playwright 截图 + 代码白盒审计 + Raycast/Alfred/Spotlight 对标

---

## 一、用户确认的待执行项

### 1. 搜索栏添加搜索图标 ✅ 确认执行

**现状**：搜索输入框左侧为空白，仅有 placeholder "输入命令关键词..."
**目标**：在搜索框最左侧添加一个放大镜图标（SVG），作为视觉锚点

**方案**：
- 在 `LauncherSearchPanel.vue` 的 `.search-form` 中，输入框前添加 `<LauncherIcon name="search" />`
- 图标尺寸 16×16，颜色 `var(--ui-subtle)`
- 当输入框有内容时，图标保持不变（不做隐藏/切换）
- 图标不可交互，仅为视觉装饰，添加 `aria-hidden="true"`

**涉及文件**：
- `src/components/launcher/parts/LauncherSearchPanel.vue`（模板）
- `src/components/launcher/parts/LauncherIcon.vue`（如需新增 search 图标）
- `src/styles.css`（微调 search-form 内 padding-left）

---

### 2. 结果列表命令图标支持 📋 记录，不急

**现状**：每个 result-item 仅展示文字（描述 + 命令预览 + folder + category 标签）
**目标**：支持在 JSON 命令配置中指定图标，渲染时在结果项左侧显示

**可行性分析**：
- 命令 JSON 文件中新增可选字段 `"icon": "git"` 或 `"icon": "docker"`
- 内置一套默认 icon 映射规则：
  - 按 category 自动匹配（`git` → git 图标，`docker` → docker 图标，`npm` → npm 图标）
  - 无匹配时使用通用 terminal 图标作为 fallback
- 图标来源：SVG sprite 或 inline SVG，与 LauncherIcon 复用同一体系
- 这是纯增量功能，不影响现有布局，可以后续独立迭代

**暂不执行，记入 Backlog。**

---

### 3. 入队热键：ArrowRight → CmdOrCtrl+Enter ✅ 确认执行

**现状**：`stageSelected: "ArrowRight"` — 右箭头在列表中语义为"展开/进入"，与"加入队列"不匹配
**目标**：改为 `Ctrl+Enter`（Windows/Linux）/ `Cmd+Enter`（macOS）

**跨平台方案**：
- 热键字符串统一使用 `CmdOrCtrl+Enter`
- `src/shared/hotkeys.ts` 中的 `formatHotkeyForHint()` 应已支持 `CmdOrCtrl` 前缀的解析
  - 在 macOS 上渲染为 `⌘ ⏎`
  - 在 Windows 上渲染为 `Ctrl ⏎`
- 如果 `formatHotkeyForHint` 尚不支持 `CmdOrCtrl`，需要补充该逻辑
- Tauri 侧全局热键如有关联也需同步

**涉及文件**：
- `src/stores/settings/defaults.ts` — `stageSelected` 默认值改为 `"CmdOrCtrl+Enter"`
- `src/shared/hotkeys.ts` — 确认 `CmdOrCtrl` 的 hint 格式化支持
- `src/composables/launcher/useLauncherKeymap.ts`（或类似）— 确认事件监听适配
- 右键鼠标入队的功能保留不变

**注意**：当前 `executeQueue: "Ctrl+Enter"` 与新的 `stageSelected: "CmdOrCtrl+Enter"` 存在潜在冲突。由于 `executeQueue` 仅在 Review 面板焦点区生效，而 `stageSelected` 仅在搜索结果区生效，两者的 focusZone 上下文互斥，不会产生实际冲突。但需在代码中确认焦点区域隔离逻辑已正确实现。

---

### 4. Tab 键释放方案 ✅ 确认执行

**现状分析**：

| 热键 | 当前功能 | 问题 |
|------|---------|------|
| `Tab` | 切换执行流面板 (toggleQueue) | 劫持了标准 Tab 键，在参数输入场景中可能与字段跳转冲突 |
| `Ctrl+Tab` | 切换焦点区域 (switchFocus) | Windows 下 Ctrl+Tab 通常是切换标签，但在桌面应用中尚可接受 |

**推荐方案：合并 toggleQueue 到 switchFocus**

核心思路：取消独立的 `toggleQueue` 热键，将"打开/关闭执行流面板"的职责合并到 `switchFocus` 中：

| 当前状态 | 按 Ctrl+Tab 效果 |
|---------|------------------|
| 焦点在搜索结果，执行流面板关闭 | 打开执行流面板 + 焦点跳到执行流 |
| 焦点在搜索结果，执行流面板已打开 | 焦点跳到执行流 |
| 焦点在执行流面板 | 焦点跳回搜索结果（面板保持打开） |
| 焦点在执行流面板，按 Esc | 关闭执行流面板 + 焦点回搜索框 |

**优势**：
- 释放 `Tab` 键回归标准行为（参数输入时字段跳转）
- 减少一个需要记忆的热键
- Esc 关闭面板 + Ctrl+Tab 切换焦点，语义清晰
- 执行流面板入口 pill 按钮仍可点击打开/关闭

**`toggleQueue` 字段处理**：
- `defaults.ts` 中 `toggleQueue` 默认值改为 `""` (空字符串) 或直接不配热键
- 设置页中该字段改为"仅点击"或标注为"可选自定义"
- 向后兼容：已有用户如果自定义了 toggleQueue，仍然生效

**涉及文件**：
- `src/stores/settings/defaults.ts` — `toggleQueue` 默认值清空
- `src/composables/launcher/useLauncherKeymap.ts` — switchFocus 逻辑增加"如果面板未打开则先打开"
- `src/composables/settings/useHotkeyBindings.ts` — keyboardHints 中移除 toggleQueue 条目（如果为空）
- `src/components/launcher/parts/LauncherSearchPanel.vue` — hints 区域适配

---

### 5. 恢复细滚动条 ✅ 确认执行

**现状**：所有可滚动区域使用 `scrollbar-width: none` + `::-webkit-scrollbar { width: 0 }` 完全隐藏滚动条
**目标**：显示极细的半透明滚动条，暗示内容可滚动

**方案**：

```css
/* 结果抽屉 */
.result-drawer {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
}

.result-drawer::-webkit-scrollbar {
  width: 4px;
}

.result-drawer::-webkit-scrollbar-track {
  background: transparent;
}

.result-drawer::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
}

.result-drawer::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.24);
}
```

- 同样逻辑应用到 `.staging-list--scrollable`（执行流列表）
- 宽度 4px，默认半透明，hover 略亮
- 不在滚动条不需要时占位（`scrollbar-gutter` 不设置，保持 overlay 模式）

**涉及文件**：
- `src/styles.css` — `.result-drawer` 滚动条、`.staging-list--scrollable` 滚动条

---

### 6. 颜色体系 ⏸️ 暂不处理

用户决定保留当前色系，不做调整。

---

### 7. 结果信息密度 ⏸️ 不处理

用户认为当前信息密度合理，不做调整。

---

### 8. 结果分组 ⏸️ 不处理

用户认为可通过搜索词精确匹配解决，无需分组。

---

### 9. 执行中进度反馈 ⏸️ 不处理

命令通过终端执行，用户在终端中可见进度。

---

### 10. 窗口阴影问题 — 回答

**用户问题**："你说的是原始窗口吗？我们的窗口做了透明背景，用样式来做处理的圆角等修饰的，所以你这个是什么意思？"

**回答**：

我说的不是 Tauri 原生窗口的阴影，而是 CSS 层面的。你的 Tauri 窗口确实是透明背景，UI 的圆角和边框都是通过 `.search-main` 的 CSS 实现的——这完全正确。

我的建议是：在 `.search-main` 上补一个 CSS `box-shadow`，让它在透明窗口的映衬下有"漂浮在桌面之上"的视觉效果。目前 `.search-main` 的 `box-shadow` 被设置为 `none`（`styles.css:147-149`），导致 launcher 的视觉边界只有一条细线 border，缺乏纵深感。

对比：
- **Raycast**：有很重的 drop-shadow，launcher 看起来像悬浮在桌面上方
- **当前 ZapCmd**：border-only，看起来贴在桌面上

**推荐方案**：
```css
.search-main {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35),
              0 2px 8px rgba(0, 0, 0, 0.2);
}
```

这需要确保 Tauri 窗口的透明区域足够显示阴影扩散（即窗口实际尺寸要比 `.search-main` 大出阴影的扩散半径）。如果目前窗口大小刚好 fit content，可能需要给 `.launcher-root` 加一圈 padding。

**已确认：保留方案记录，暂不执行。**

---

### 11. 空状态设计改进 ✅ 确认执行

**现状**：
- 搜索无结果时：`drawer-empty` 显示标题 + 提示文字 + Esc kbd
- 执行流为空时：单行 "执行流为空" + "使用 → 或右键加入" + Esc kbd

**改进方案**：

**搜索无结果空态**：
```
┌─────────────────────────────────────────────────┐
│  🔍 (SVG search icon, 20px, --ui-subtle)        │
│  未找到匹配的命令                                  │
│  试试更短的关键词，或 [Esc] 清空重新搜索            │
└─────────────────────────────────────────────────┘
```

- 添加一个搜索图标（`LauncherIcon name="search"`）居中显示
- 标题文字加粗（`font-weight: 600`），颜色 `#ececf1`
- 提示文字使用 `var(--ui-subtle)`，内含 `<kbd>Esc</kbd>` 标签
- 整体垂直居中，padding 适中（20px 上下）
- 不做过度设计（无需插图或动画）

**执行流为空空态**：
当前已经做了单行紧凑设计（Phase 16 迭代后），保持不变即可。只需确保搜索空态也达到同等质量。

**涉及文件**：
- `src/components/launcher/parts/LauncherSearchPanel.vue` — 空态模板
- `src/styles.css` — `.drawer-empty` 样式微调

---

### 12. 队列面板关闭按钮增大 ✅ 确认尝试

**现状**：`btn-icon.btn-small` = 26×26px
**目标**：增大到 32×32px，提升可点击区域

**方案**：
- 仅对 Review overlay header 中的关闭按钮移除 `.btn-small` class
- `.btn-icon` 本身已有 `min-width: 28px; min-height: 28px`，加上 padding 实际可达 ~32px
- 或在 `.review-panel__header .btn-icon` 中单独覆盖为 `min-width: 32px; min-height: 32px`

**涉及文件**：
- `src/components/launcher/parts/LauncherReviewOverlay.vue` — class 调整
- `src/styles.css`（可选，如需单独覆盖尺寸）

---

### 13. 最近使用/收藏 ⏸️ 暂不做，记入 Backlog

---

## 二、执行优先级

| 序号 | 项目 | 优先级 | 工作量 | 依赖 |
|------|------|--------|--------|------|
| 1 | 搜索栏搜索图标 | P0 | 小 | 无 |
| 2 | 恢复细滚动条 | P0 | 小 | 无 |
| 3 | 空状态改进 | P0 | 小 | 搜索图标（复用） |
| 4 | 入队热键改为 CmdOrCtrl+Enter | P1 | 中 | 无 |
| 5 | Tab 释放（合并 toggleQueue → switchFocus） | P1 | 中 | 无 |
| 6 | 关闭按钮增大 | P2 | 小 | 无 |

**并行分组**：
- **Wave 1（可并行）**：搜索图标 + 滚动条 + 关闭按钮 — 纯 CSS/模板改动，无逻辑依赖
- **Wave 2（可并行）**：入队热键 + Tab 释放 — 都是热键逻辑改动，但改不同字段
- **Wave 3**：空状态改进 — 等搜索图标合入后复用图标

---

## 三、Backlog（后续迭代）

- [ ] 结果列表命令图标（JSON 配置 + 自动匹配 fallback）
- [ ] 最近使用/收藏命令（持久化 + 空搜索时优先展示）
- [ ] 窗口 CSS 阴影（需评估 Tauri 窗口 padding 可行性）
- [ ] 品牌色体系升级（更有辨识度的色调）
- [ ] 结果分组（按 category 分 section headers）

---

## 四、热键全景表（当前 vs 建议）

| 功能 | 当前默认值 | 建议改为 | 说明 |
|------|-----------|---------|------|
| 全局唤醒 | `Alt+V` | 不变 | — |
| **切换执行流** | **`Tab`** | **`""` (空/仅点击)** | 释放 Tab，合并到 switchFocus |
| **切换焦点** | `Ctrl+Tab` | 不变 | 增加"如未打开则先打开执行流"逻辑 |
| 上移选择 | `ArrowUp` | 不变 | — |
| 下移选择 | `ArrowDown` | 不变 | — |
| 执行选中 | `Enter` | 不变 | — |
| **入队选中** | **`ArrowRight`** | **`CmdOrCtrl+Enter`** | macOS 显示 ⌘⏎，Windows 显示 Ctrl ⏎ |
| 退出/关闭 | `Escape` | 不变 | — |
| 执行队列 | `Ctrl+Enter` | 不变 | 仅在 Review 焦点区生效 |
| 清空队列 | `Ctrl+Backspace` | 不变 | — |
| 移除队列项 | `Delete` | 不变 | — |
| 队列上移 | `Alt+ArrowUp` | 不变 | — |
| 队列下移 | `Alt+ArrowDown` | 不变 | — |
