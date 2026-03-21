# ZapCmd UI Redesign Workspace

> 本目录用于承载 2026-03 **主窗口（launcher）** 的大重构前置文档。
> 当前阶段只做文档收敛、方案确认、外部 Demo 提示词整理，不直接进入代码实现。
>
> **范围收窄说明：**
> - 本轮只做主窗口。
> - `settings` 保持 **独立窗口**，不并入 launcher。
> - `settings` 不在本轮重构范围内，后续如需升级，另开独立专题。

## 当前已锁定结论

- **唯一主方案：B4 = Overlay Review Mode with Floor Height Protection**
- **技术栈不是问题**：`Vue 3 + TypeScript + Pinia + Vite + Tauri 2 + Rust` 足够支撑高质量桌面启动器。
- **当前核心问题在主窗口 UI shell**：双焦点竞争、透明度过高、旧绿色语义冲突、长命令在窄右栏中展示不佳。
- **不再继续讨论的方向**：纯两态隔离式 A、底部常驻暂存区、常驻并列右栏、Inspector-only 首页。
- **本轮不讨论的方向**：将 `settings` 并入主窗口。

## 为什么锁定 B4

B4 同时满足 4 个关键条件：

1. 搜索态依然动态，不破坏当前“输入即弹出、结果多少决定高度”的产品特征。
2. 进入 Review 时仍保留搜索上下文，不像纯 A 那样切进另一个完全隔离的工作态。
3. Review 只作为当前唯一可交互层出现，避免主搜索区与暂存区继续双焦点竞争。
4. 通过“高度下限保护 + 内部 overlay + 宽面板滚动”解决长命令在窄右栏难看的问题。

## 文档索引

1. `01-background-and-goals.md`
   - 重构背景、目标、边界与设计原则

2. `02-current-audit-and-benchmark.md`
   - 当前截图审计
   - 竞品形态观察
   - 栈对比与结论

3. `03-solution-options.md`
   - 已锁定的 B4 方案定义
   - 高度算法、过渡时序、交互边界

4. `04-design-system.md`
   - 颜色、字体、间距、圆角、阴影、动效
   - 主窗口组件视觉规则与禁忌

5. `05-code-impact-map.md`
   - 结合当前代码结构的影响面分析
   - 哪些模块高风险、哪些模块可复用

6. `06-demo-prompts.md`
   - 给 Gemini Canvas / 其他前端 Agent 的 Prompt
   - 仅保留 B4 方案 Prompt 与配色专项 Prompt

7. `07-execution-roadmap.md`
   - 从文档到代码的执行路线
   - B4 的实施波次与验收口径

8. `08-b4-interaction-state-machine.md`
   - B4 的交互契约、键盘规则、层级优先级与状态机

9. `09-b4-hotkey-migration-map.md`
   - B4 的热键迁移表、兼容期语义与后续收口建议

10. `10-b4-component-architecture.md`
    - B4 的组件拆分、状态归属、迁移建议与新增抽象

11. `11-b4-visual-spec.md`
    - B4 的主窗口 / Review 视觉规格与尺寸基线

12. `12-b4-acceptance-matrix.md`
    - Demo 评审、手动验收、自动化测试优先级与不通过条件

## 当前建议使用顺序

1. 先看 `03-solution-options.md`
2. 再看 `08-b4-interaction-state-machine.md`
3. 再看 `09-b4-hotkey-migration-map.md`
4. 再看 `10-b4-component-architecture.md`
5. 再看 `11-b4-visual-spec.md`
6. 再看 `05-code-impact-map.md`
7. 用 `06-demo-prompts.md` 出 B4 外部 Demo
8. 用 `12-b4-acceptance-matrix.md` 评审 Demo
9. 方向锁定后，按 `07-execution-roadmap.md` 进入正式 phase

## 当前建议的唯一外部 Demo 路线

- 外部 Demo 只出 **B4 主窗口**
- 不再并行出 A / B / C 对照稿，避免讨论发散
- 本轮不要求产出 `settings` Demo
- 如果 B4 首轮 Demo 不理想，只在 B4 约束内微调，不重新发散到其他结构方案

## 参考输入

- 当前截图：`docs/temporary_img/主窗口.png`
- 当前样式入口：`src/styles/index.css`
- 历史路径说明：`src/styles.css` 为旧入口，现已迁移
- 当前主窗口入口：`src/components/launcher/LauncherWindow.vue`
- 当前设置页入口（仅作架构边界参考，不在本轮范围内）：`src/components/settings/SettingsWindow.vue`
