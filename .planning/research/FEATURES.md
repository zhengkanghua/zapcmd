# Feature Research

**Domain:** Desktop 命令启动器主窗口 UI 重构（B4 Overlay Review）
**Researched:** 2026-03-07
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 搜索态单焦点（只以搜索+结果为主舞台） | 启动器的核心效率来自“输入→选择→执行” | MEDIUM | 必须移除“右侧常驻并列工作区”的同级竞争感。 |
| Review Overlay（按需出现的队列审阅层） | 队列/暂存是高级能力，但不能抢主舞台 | MEDIUM | Review 打开后背景可见但不可交互；唯一可交互层为 Review。 |
| floor height protection（`drawerFloorHeight=322px`） | 1 条结果时不应塌陷/割裂 | MEDIUM | 只允许 filler/spacer；禁止伪造假结果/假 DOM。 |
| 拖拽区保留且不计入内容高度 | 桌面窗口必须可拖拽移动 | LOW | `shell-drag-strip` 必须在 Review 打开时仍保留且不被遮罩吞掉。 |
| 热键语义迁移（toggleQueue/switchFocus→进入 Review） | 键盘优先用户依赖既有肌肉记忆 | MEDIUM | 第一阶段保持 hotkey ID 与大多数键值不变，只迁移行为语义。 |
| 焦点锁定与恢复（Safety > Param > Review > Search） | 多层阻断是桌面工具常态 | HIGH | 必须避免焦点泄漏到背景；Review 内 `Tab` 回归焦点遍历与循环。 |
| `Esc` 分层后退稳定 | 用户预期 Esc 是“退出/返回” | MEDIUM | Review 打开时 Esc 优先关闭 Review，而不是直接隐藏主窗。 |
| 长命令可读性显著提升 | 队列区展示长命令/参数是关键体验痛点 | MEDIUM | 通过更宽 Review 面板 + 摘要/截断策略解决，不在首页铺完整命令。 |
| 遮罩只在内部 shell | 圆角/透明窗口下整窗遮罩会“露壳” | MEDIUM | 明确不通过条件：整窗蒙层或暴露原生窗口边界。 |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 更“产品化”的深色视觉系统（品牌色与状态色分离） | 直接提升成熟度与信任感 | MEDIUM | 以 Slate Indigo 等方案替换旧绿色品牌语义；success 绿只用于成功/启用。 |
| Review 打开/关闭的顺滑时序（先稳定尺寸再动画） | 感知质量提升明显 | MEDIUM | 可先试实时动态 resize；若抖动则降级为一次性 resize + 内部动画。 |
| 关闭 Review 后焦点恢复到“打开前的位置” | 键盘流不中断 | HIGH | 第一阶段可先简化为回到搜索输入；后续再精细恢复到 active result。 |
| Review 卡片信息层级（标题/摘要/参数/badges/操作） | 让复杂命令在队列中可管理 | MEDIUM | 视觉规范见 `docs/ui-redesign/11-b4-visual-spec.md`。 |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| 用“假结果项”补高度 | 实现看起来简单 | 会污染键盘导航、可达性与测试语义；属于明确不通过条件 | 使用 filler/spacer，只改变容器高度，不改变结果数据与可聚焦元素。 |
| 立刻把 staging 全量重命名为 review | 语义更一致 | 影响面大、测试大量改动、回滚困难 | 第一阶段行为迁移，第二阶段再做命名收口（可选）。 |
| 把 settings 并入主窗口 | 觉得“一体化” | 范围失控、信息架构复杂化、破坏既有分工 | 保持 settings 独立窗口；后续单开专题重构 IA/视觉。 |
| 先追“酷炫动效/毛玻璃” | 直观好看 | 容易牺牲可读性与稳定性，且会放大 Windows resize 问题 | 先把层级/可读性/交互契约做正确，再做克制动效。 |

## Feature Dependencies

```
Review Overlay
    └──requires──> 背景锁定（不可交互）+ 焦点锁定
                        └──requires──> 热键语义迁移 + Esc 分层后退

floor height protection
    └──requires──> window sizing 计算模型可表达“最小可视高度 + filler”
```

### Dependency Notes

- **Review Overlay requires 背景/焦点锁定：** 否则会回到“并列双焦点”的旧问题。
- **floor height protection requires sizing 模型：** 不能通过数据伪造解决，只能通过布局层与 sizing 逻辑实现。

## MVP Definition

### Launch With (v2.0)

- [ ] Search State 仍动态高度 + queue summary pill 入口
- [ ] Review Overlay（宽面板 + 内部滚动）+ 背景不可交互
- [ ] `drawerFloorHeight=322px` 的 filler 方案（无假结果）
- [ ] 热键与 `Esc` 分层语义迁移（含 Safety/Param 优先级）
- [ ] 回归测试更新（P0 用例：toggleQueue/switchFocus/Esc/Tab/floor height）

### Add After Validation (v2.0.x)

- [ ] 关闭 Review 后精细恢复焦点（回到 active result / 原位置）
- [ ] 更细的动画打磨（依据 Windows 稳定性选择策略）
- [ ] staging→review 的命名与文案收口（第二阶段）

### Future Consideration (v2.1+)

- [ ] settings 的 IA/视觉升级（独立专题）
- [ ] `E2E-02` full-matrix desktop E2E
- [ ] `SYNC-01` 云同步、`SEC-02` 团队安全策略

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Review Overlay + 背景锁定 | HIGH | MEDIUM | P1 |
| floor height protection（322px） | HIGH | MEDIUM | P1 |
| 热键/焦点/ Esc 分层契约 | HIGH | HIGH | P1 |
| 视觉系统（品牌色分离、降低透明） | HIGH | MEDIUM | P1 |
| 动画打磨（动态 resize） | MEDIUM | MEDIUM | P2 |
| staging→review 命名收口 | MEDIUM | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Raycast | Alfred | Our Approach |
|---------|---------|--------|--------------|
| 单焦点主搜索 | 主舞台强单焦点 | 强单焦点 | Search State 强单焦点，不常驻并列队列区。 |
| 次级动作/批处理呈现 | Action Panel / 子层 | 多为次级层 | 用 Review Overlay 承载队列审阅与批执行。 |
| 详情/上下文保留 | Peek / 面板式层级 | 结果为主 | Review 打开时保留搜索上下文，但背景锁定。 |

## Sources

- `docs/ui-redesign/03-solution-options.md`
- `docs/ui-redesign/08-b4-interaction-state-machine.md`
- `docs/ui-redesign/09-b4-hotkey-migration-map.md`
- `docs/ui-redesign/12-b4-acceptance-matrix.md`

---
*Feature research for: Desktop launcher B4 UI redesign*
*Researched: 2026-03-07*
