# Pitfalls Research

**Domain:** Tauri 桌面启动器主窗口 UI（B4 Overlay Review）改造
**Researched:** 2026-03-07
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: 用“假结果项/假 DOM”补 floor height

**What goes wrong:**  
为实现 `drawerFloorHeight=322px`，在 `filteredResults` 中插入假数据或渲染额外 `.result-item`，导致键盘导航、a11y 语义、测试断言全部被污染；后续几乎无法“局部修补”。

**Why it happens:**  
看起来实现最省事；同时容易把“视觉高度概念”误解为“数据行数”。

**How to avoid:**  
- 必须把 floor height 视为“容器高度保护”，用独立 filler/spacer 层实现。  
- filler 层：不可聚焦、不参与 roving index、不出现在屏幕阅读器语义里。  
- 需求/验收层面把“无假结果”写成硬性不通过条件（已在 `docs/ui-redesign/12-*` 明确）。

**Warning signs:**  
- 测试里为了通过断言开始放宽导航/索引规则。  
- UI 里出现“看起来像结果项但不可点击”的卡片样式。  

**Phase to address:**  
Phase 13（布局与尺寸底座 / floor protection）。

---

### Pitfall 2: Review 打开后背景仍可点击/可滚动/可获得焦点

**What goes wrong:**  
Review Overlay 已出现，但背景 Search Shell 仍能响应 pointer/scroll 或 focus，变相回到“并列双焦点竞争”，且 Tab 会跑到背景，用户感知为“失控/不专业”。

**Why it happens:**  
只做了视觉层（dim + overlay），没做交互层（pointer-events/focus trap/aria 语义）。

**How to avoid:**  
- Review Open 时：背景层必须不可交互（pointer-events: none 或显式拦截）。  
- 键盘：Review 内部 focus trap；Tab/Shift+Tab 只在 Review 内循环。  
- 层级优先级：Safety > Param > Review > Search，任何时候只允许最高层处理输入。

**Warning signs:**  
- Review 打开后鼠标还能点到搜索结果。  
- Review 打开后按 Tab 焦点跑回搜索输入。  

**Phase to address:**  
Phase 14（Review overlay 接入）+ Phase 15（键盘/焦点收口）。

---

### Pitfall 3: 把拖拽区算进“内容高度”导致测量口径漂移

**What goes wrong:**  
Review floor height 或 sizing 计算把 `shell-drag-strip`（顶部拖拽区）错误计入内容高度，表现为：高度补齐不稳定、不同机器/缩放下高度抖动，甚至出现“补不齐/补过头”。

**Why it happens:**  
DOM 测量时取了错误的基准 rect（把 top strip 当内容），或估算常量与测量口径不一致。

**How to avoid:**  
- 明确“拖拽区不是内容区”，floor height 比较与补齐不包含它。  
- 测量逻辑与估算逻辑统一口径：用 content 区域的 top/bottom 计算，不混入 drag strip。  
- 在测试里加入“drag strip 不影响 floor 逻辑”的断言（至少 P1）。

**Warning signs:**  
- 只在某些屏幕缩放/分辨率下出现高度错位。  
- 打开 Review 时窗口高度跳两次或来回抖。  

**Phase to address:**  
Phase 13（布局与尺寸底座）。

---

### Pitfall 4: Windows 下 resize 抖动/边缘闪烁，动效时序反复试错

**What goes wrong:**  
实时动态 resize 在 Windows 透明/圆角窗口下可能抖动或闪烁；如果没有明确降级策略，会陷入反复调参，影响交付节奏。

**Why it happens:**  
窗口边缘 resize + WebView 重排 + 背景透明叠加；再加 debounce/measurement 不稳定，会产生连跳。

**How to avoid:**  
- 先实现“稳定尺寸→再动画”的基线。  
- 动态 resize 作为可选增强：若抖动，立刻降级为“一次性 resize 到目标 + 内部动画”。  
- 将降级策略写入 roadmap success criteria，避免团队在实现阶段反复争论。

**Warning signs:**  
- `WINDOW_RESIZE_DEBOUNCE_MS` 不断改数值仍不稳。  
- 同一操作触发多次 `setSize`/resize。  

**Phase to address:**  
Phase 13（底座）+ Phase 16（动效体验优化）。

---

### Pitfall 5: `Esc` 语义没收口，Review 态直接隐藏主窗

**What goes wrong:**  
用户在 Review 中按 `Esc` 期望“关闭 Review”，但实际直接隐藏主窗或清空查询；造成“无法预测”的退回链路。

**Why it happens:**  
`Esc` 的优先级链路没变更/没覆盖到新状态；或者只在某些状态下短路。

**How to avoid:**  
- 把 `Esc` 明确写成分层后退：Safety > Param > Review > Search/Hide。  
- 为 Review 态添加 P0 测试断言：`Esc` 必须先关闭 Review。  

**Warning signs:**  
- 用户反馈“Review 关不掉/一按就没了”。  
- 测试只验证“窗口隐藏”，没验证“先关闭 overlay”。  

**Phase to address:**  
Phase 15（键盘/焦点/关闭语义收口）。

---

### Pitfall 6: Review 内 `Tab` 仍承担“开关队列”，导致可达性倒退

**What goes wrong:**  
为了兼容旧 staging 行为，Review 内 Tab 继续触发 toggleQueue 或把焦点送回背景，导致键盘用户无法顺畅遍历 Review 内控件。

**Why it happens:**  
把“toggleQueue 的默认值是 Tab”与“Tab 的语义应该是焦点遍历”混在一起处理。

**How to avoid:**  
- Review 打开后：Tab/Shift+Tab 只做 Review 内部遍历与循环。  
- 兼容期如需保留“同键开关”：仅在 Search 态让 toggleQueue 使用 Tab，不在 Review 态复用该语义。  

**Warning signs:**  
- Review 里 Tab 一按就跳走/关闭。  
- a11y 测试/手测出现“无法到达 footer 按钮”。  

**Phase to address:**  
Phase 15（键盘/焦点/关闭语义收口）。

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| 把 Review 逻辑硬塞进 `LauncherStagingPanel.vue` 不拆新组件 | 改动少 | 语义混乱、难测试、后续收口困难 | 仅作为极短期过渡（建议直接新增 `LauncherReviewOverlay.vue`）。 |
| 只改样式不改交互锁定 | 视觉上“像 B4” | 行为仍双焦点，回归风险高 | 不可接受（验收矩阵明确要求背景锁定）。 |
| “先关测试再做” | 开发更快 | 失去回归护栏，后续成本爆炸 | 不可接受（v1.0 质量门禁已固化）。 |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Tauri window sizing | 频繁测量+频繁 setSize 导致连跳 | 采用 preparing 状态：先算 target，再最少次数 resize；必要时 debounce 并设 epsilon。 |
| drag region | overlay/遮罩覆盖拖拽区导致不可拖动 | 拖拽区保留在 shell 顶部，不被 overlay 吞掉；Review 遮罩只在内容区。 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| 打开 Review 时反复 layout thrash（读写交替） | 动画卡顿、窗口闪烁 | 合并测量点；把读写分离；减少 DOM 强制回流 | 低端机器/高 DPI 下更明显 |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| 在 Review 重构中绕开现有 Safety/Param 阻断层优先级 | 可能让高风险命令在错误层级触发 | 任何状态机改动都必须保留 Safety > Param 的最高优先级，并补齐回归断言。 |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| 透明度过高、壁纸抢视觉 | “像半透明网页卡片”，不专业 | 提升表面实度、强化层级与边框/阴影，壁纸只做氛围。 |
| 品牌色继续用绿 | 语义冲突（成功/激活混用） | 采用蓝紫品牌色，success 绿只用于成功/启用。 |

## "Looks Done But Isn't" Checklist

- [ ] **Floor protection:** 看起来高度够了，但其实是靠假结果实现 —— 必须检查 DOM/焦点链是否被污染
- [ ] **Background lock:** 看起来 dim 了，但背景仍可点击/滚动 —— 必须做 pointer/keyboard 双路径验证
- [ ] **Esc/Tab:** 手测几次通过，但边界状态（Param/Safety 打开时）会穿透 —— 必须补 P0 自动化断言

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| 假结果补高已合入 | HIGH | 回退该实现；引入 filler 层；重写相关测试断言与可达性检查。 |
| Review 背景交互未锁定 | MEDIUM | 增加背景锁定层；补齐 focus trap；更新热键分发优先级。 |
| resize 抖动严重 | MEDIUM | 启用“一次性 resize + 内部动画”降级策略；减少 resize 次数与测量频率。 |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 假结果补高 | Phase 13 | 检查 DOM 无假结果；P0 自动化断言覆盖 |
| 背景可交互/焦点泄漏 | Phase 14/15 | pointer/keyboard 双验收 + P0 测试 |
| drag strip 计入高度 | Phase 13 | 不同结果数量下打开 Review，高度稳定 |
| Windows resize 抖动 | Phase 16 | Windows 手测 + E2E/冒烟观测，必要时启用降级 |
| Esc 优先级错误 | Phase 15 | Review 态 Esc 关闭 overlay 的自动化断言 |
| Tab 语义漂移 | Phase 15 | Review 内 Tab 循环的自动化断言 |

## Sources

- `docs/ui-redesign/03-solution-options.md`
- `docs/ui-redesign/08-b4-interaction-state-machine.md`
- `docs/ui-redesign/12-b4-acceptance-matrix.md`
- `src/composables/launcher/useWindowSizing/calculation.ts`
- `src/features/hotkeys/windowKeydownHandlers/main.ts`

---
*Pitfalls research for: Desktop launcher B4 UI redesign*
*Researched: 2026-03-07*
