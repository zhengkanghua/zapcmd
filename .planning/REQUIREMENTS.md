# Requirements: ZapCmd

**Defined:** 2026-03-07
**Core Value:** 用最少的操作，快速且安全地找到并执行命令工作流，并且每次迭代都能通过自动化回归验证保持稳定。

## v2.0 Requirements（主窗口 B4 UI 重构）

### Shell / Layers

- [x] **SHELL-01**: 用户打开 launcher 主窗口时只看到单焦点搜索态（不再存在常驻并列的右侧 staging 工作区）
- [x] **SHELL-02**: 用户打开 Review overlay 后仍能看到搜索上下文，但背景不可交互（不可点击、不可滚动、不可获得焦点）
- [x] **SHELL-03**: 顶部拖拽区在 Search/Review 状态都可用，且不会被遮罩/overlay 吞掉

### Floor Height / Window Sizing

- [x] **SIZE-01**: 当搜索结果不足 4 条高度时，用户打开 Review 前左侧抽屉会被补足到 floor height（= “4 条结果高度 + 搜索框高度”的计算值；其中搜索框高度以 `.search-form` 容器渲染高度为准，含 padding，非 input 高度；仅 filler/spacer；无假结果数据/DOM）
- [x] **SIZE-02**: Review overlay 的最小可视高度与 floor height 对齐，且 Review 列表在面板内部滚动（不随队列项持续拉高窗口）
- [x] **SIZE-03**: Review 打开/关闭涉及窗口 resize 时在 Windows 下稳定可用（允许采用“先稳定尺寸再动画”的策略，并保留降级路径）
- [x] **SIZE-04**: sizing/floor height 的比较与补齐不把顶部拖拽区计入内容高度

### Review Overlay（Queue/Review）

- [x] **REV-01**: 用户可以通过 queue summary pill（如 `3 queued`）或等价入口进入 Review overlay
- [x] **REV-02**: 用户在 Review 中可以浏览队列项，且长命令以“可读摘要”呈现（不在主列表铺完整长命令）
- [x] **REV-03**: 用户在 Review 中可以删除队列项、调整顺序，并能触发队列执行/清空（复用现有队列能力）

### Hotkeys / Focus

- [ ] **KEY-01**: 在搜索态按 `toggleQueue` 会打开 Review overlay
- [ ] **KEY-02**: 在搜索态按 `switchFocus` 会打开 Review overlay，且焦点落入 Review 列表
- [ ] **KEY-03**: Review 打开时 `Tab/Shift+Tab` 只在 Review 内循环焦点，不回到背景 Search
- [ ] **KEY-04**: Review 打开时按 `Esc` 会先关闭 Review（而不是直接隐藏主窗），并保持 Safety > Param > Review > Search/Hide 的分层后退优先级
- [ ] **KEY-05**: 参数弹层与安全确认层的优先级高于 Review/Search，且其 focus trap 与按键分发不被 B4 改造破坏

### Visual System

- [x] **VIS-01**: 主窗口采用新的颜色令牌：品牌色与成功色彻底分离，且绿色不再作为品牌主色
- [x] **VIS-02**: 主窗口透明度与背景噪音降低，整体观感符合“专业桌面工具面板”气质（符合 `docs/ui-redesign/04`/`11` 基线）
- [x] **VIS-03**: Review overlay 宽度提升到可读范围（约 `420px ~ 480px`），长命令在 Review 中不再明显拥挤

### Regression / Verification

- [ ] **TST-01**: 自动化回归覆盖 B4 P0：`toggleQueue` / `switchFocus` / `Esc` / Review 内 `Tab` / floor height（含“无假结果”约束）
- [x] **TST-02**: sizing/布局相关逻辑具备可定位的单测断言（至少覆盖关键分支与边界场景）

## Future Requirements（v2.1+ / Backlog）

### Naming / Copy

- **DOC-01**: staging/queue 历史措辞在 UI 文案与帮助文本中收口为 Review 语义（在 B4 稳定后执行）

### Settings

- **SET-01**: settings IA/视觉系统升级（页头/卡片化层级/footer bar 等），保持独立窗口（独立专题）

### Platform / E2E

- **E2E-02**: Windows/macOS/Linux full-matrix desktop E2E 覆盖（独立规划）

### Cloud / Policy

- **SYNC-01**: 命令与设置云同步（多设备一致）
- **SEC-02**: 团队/组织级安全策略（白名单、策略下发、审计等）

## Out of Scope（本里程碑明确不做）

| Feature | Reason |
|---------|--------|
| `settings` 并入 launcher | 范围失控，且违背本轮边界；settings 保持独立窗口 |
| `settings` 视觉/IA 重构 | 与 B4 主窗口改造解耦；后续单开专题 |
| 引入重型 UI 组件库 | 影响面大、回归成本高；v2.0 优先结构/契约稳定 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SHELL-01 | Phase 14 | Complete |
| SHELL-02 | Phase 14 | Complete |
| SHELL-03 | Phase 14 | Complete |
| SIZE-01 | Phase 13 | Complete |
| SIZE-02 | Phase 14 | Complete |
| SIZE-03 | Phase 16 | Complete |
| SIZE-04 | Phase 13 | Complete |
| REV-01 | Phase 14 | Complete |
| REV-02 | Phase 14 | Complete |
| REV-03 | Phase 14 | Complete |
| KEY-01 | Phase 15 | Pending |
| KEY-02 | Phase 15 | Pending |
| KEY-03 | Phase 15 | Pending |
| KEY-04 | Phase 15 | Pending |
| KEY-05 | Phase 15 | Pending |
| VIS-01 | Phase 16 | Complete |
| VIS-02 | Phase 16 | Complete |
| VIS-03 | Phase 14 | Complete |
| TST-01 | Phase 15 | Pending |
| TST-02 | Phase 13 | Complete |

**Coverage:**
- v2.0 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-07*
*Last updated: 2026-03-07 after v2.0 roadmap creation*
