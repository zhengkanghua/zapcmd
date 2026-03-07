# Roadmap: ZapCmd

## Milestones

- ✅ **v1.0 质量门禁与回归基线** — Phases 1-12，35 plans，shipped 2026-03-06；详情见 `.planning/milestones/v1.0-ROADMAP.md`
- 📋 **v2.0 主窗口 B4 UI 重构** — Phases 13-16，roadmap defined 2026-03-07；设计基线见 `docs/ui-redesign/`

## Next

- ▶ **Phase 13：B4 布局与尺寸底座** — floor height + sizing 口径 + 回归底座

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 质量门禁与回归基线 | 1-12 | 35 | Complete | 2026-03-06 |
| v2.0 主窗口 B4 UI 重构 | 13-16 | 0 | Roadmap defined | - |

---

## Milestone v2.0：主窗口 B4 UI 重构

**Status:** 📋 Roadmap defined

本里程碑的唯一结构方案：**B4 = Overlay Review Mode with Floor Height Protection**  
范围：只做 launcher 主窗口；`settings` 继续保持独立窗口且不纳入本轮重构。

### Phase 13：B4 布局与尺寸底座

**Goal:** 为 B4 引入 floor height 与 sizing 口径底座（不计拖拽区），并把关键分支锁进可定位回归。

**Depends on:** —

**Requirements:** `SIZE-01` `SIZE-04` `TST-02`

**Success criteria:**
1. 结果不足时的 `322px` floor height 只通过 filler/spacer 实现（无假结果数据/DOM，可达性语义不被污染）。
2. sizing/floor height 的比较与补齐不把顶部拖拽区计入内容高度。
3. sizing 相关关键分支具备单测断言且失败输出可定位（不依赖手动肉眼判断）。

### Phase 14：Review Overlay 结构接入

**Goal:** 将“常驻并列 staging 右栏”改为 B4 Review overlay，并建立背景锁定与更宽的 Review 阅读面板。

**Depends on:** Phase 13

**Requirements:** `SHELL-01` `SHELL-02` `SHELL-03` `SIZE-02` `REV-01` `REV-02` `REV-03` `VIS-03`

**Success criteria:**
1. 搜索态为单焦点主舞台（不再存在常驻并列 staging 工作区），队列非空时以 queue summary pill 作为进入 Review 的主入口之一。
2. Review 打开后背景可见但不可交互（不可点击/滚动/聚焦），当前唯一可交互层为 Review。
3. Review 面板宽度提升到可读范围（约 `420px~480px`），长命令以摘要方式呈现（不在主结果列表铺完整长命令）。
4. Review 内部列表在面板内滚动（最小可视高度与 `322px` 对齐），不会随队列项持续拉高窗口。
5. 顶部拖拽区在 Review 打开时仍可用，且不被遮罩/overlay 吞掉。

### Phase 15：键盘 / 焦点 / 关闭语义收口

**Goal:** 将 B4 的键盘契约与层级优先级稳定落地，并补齐 P0 自动化回归。

**Depends on:** Phase 14

**Requirements:** `KEY-01` `KEY-02` `KEY-03` `KEY-04` `KEY-05` `TST-01`

**Success criteria:**
1. 搜索态：`toggleQueue` 打开 Review；`switchFocus` 打开 Review 并聚焦队列列表。
2. Review 态：`Tab/Shift+Tab` 仅在 Review 内循环焦点；不会把焦点送回背景 Search。
3. `Esc` 分层后退稳定：Safety > Param > Review > Search/Hide（Review 打开时 Esc 先关闭 Review，不直接隐藏主窗）。
4. 参数弹层与安全确认层的优先级与 focus trap 不被 B4 改造破坏。
5. 自动化回归覆盖 B4 P0：toggleQueue/switchFocus/Esc/Tab/floor height（含“无假结果”约束）。

### Phase 16：动画与视觉系统落地

**Goal:** 在结构与契约稳定后打磨动效与新视觉系统，并验证 Windows 下 resize 稳定性与降级策略。

**Depends on:** Phase 15

**Requirements:** `SIZE-03` `VIS-01` `VIS-02`

**Success criteria:**
1. 主窗口落地新颜色令牌：品牌色与 success 色彻底分离，且绿色不再作为品牌主色（仅用于成功/启用语义）。
2. 主窗口透明度与背景噪音降低，整体观感符合 “专业桌面工具面板” 基线（见 `docs/ui-redesign/04`/`11`）。
3. Review 开合时序克制：先稳定尺寸再动画；若 Windows 下动态 resize 抖动明显，启用“一次性 resize + 内部动画”的降级策略，保持体验稳定可用。
