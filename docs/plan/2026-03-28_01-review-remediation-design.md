# ZapCmd 审查整改设计文档（2026-03-28）

> 创建日期：2026-03-28  
> 状态：待执行  
> 优先级：P1  
> 关联分支：`feat/review-remediation`

---

## 1. 背景与目标

1. 背景：
   - 2026-03-27 的项目审查确认，当前项目门禁与测试基础较强，但在预检容错、A11y 细节、Settings 交互语义、Settings 入口遗留路径、多主题真实性和超长文件治理上仍未达到“优雅且稳健”的标准。
   - 用户已确认本轮优先处理问题 1 / 2 / 3 / 4 / 6，并将“第二套动画 / 动画可切换”记录为后续独立议题，本轮不实现。
2. 目标（用户价值）：
   - 在不影响当前主流程可用性的前提下，补齐 safety / a11y / Settings 架构 / 多主题能力的关键短板。
   - 保留当前轻微 overshoot 与回弹的动效语言，本轮不收紧动画风格。
   - 将本轮涉及的核心文件同步拉回仓库既定的体积阈值附近，避免“边修边继续长胖”。

## 2. 范围（In / Out）

### 2.1 In Scope

1. 执行前 prerequisite preflight 改为 fail-closed，并统一错误收口。
2. `LauncherCommandPanel` 参数区补齐真实表单语义与危险路径可访问性。
3. `SettingsCommandsSection` 的“更多筛选”改为真正 dialog 行为：初始焦点、焦点约束、`Esc` 关闭、关闭后焦点回退。
4. Settings 入口只保留当前实际在用的 `settings.html -> main-settings.ts -> AppSettings.vue` 路径，清理确认无运行时价值的 legacy wiring。
5. 增加第二主题，方向为“浅色专业主题”，工作名暂定 `linen`。
6. 对本轮改动波及的超长文件做职责拆分，使其与仓库体积规范对齐。
7. 补齐自动化测试；涉及主题与样式的改动补齐视觉回归与基线更新。

### 2.2 Out of Scope

1. 不实现“动画模式可切换”。
2. 不收紧当前轻微 overshoot / 回弹动效。
3. 不做与本轮目标无关的全局大重构。
4. 不变更默认主题 `obsidian` 的现有视觉语义。

## 3. 关键设计决策

### 3.1 Preflight 必须 fail-closed

1. prerequisite probe 返回非数组、结构异常、invoke 失败时，不再静默当作“无问题”继续执行。
2. required prerequisite 失败应阻断执行；optional prerequisite 失败可作为 warning，但必须是结构化、可测试的 warning。
3. 单条执行与队列执行都必须走同一收口口径，避免某一路径丢失错误边界。

### 3.2 参数面板 A11y 采用原生表单语义

1. 每个参数输入项必须有稳定 `id`。
2. `label for` 与 `input/select id` 绑定，必填、危险说明、错误/提示文本通过 `aria-describedby` 挂接。
3. 本轮不引入复杂自绘表单控件，优先把原生语义做正确。

### 3.3 “更多筛选”按真正 dialog 处理

1. 打开时焦点进入弹层内第一个可交互控件。
2. `Tab/Shift+Tab` 在弹层内循环。
3. `Esc` 关闭弹层。
4. 关闭后焦点回到触发按钮。
5. 仍保持当前视觉形态，不额外引入新的 overlay 视觉风格。

### 3.4 Settings 路径以当前真实入口为准

1. 保留实际在用路径：
   - `settings.html`
   - `src/main-settings.ts`
   - `src/AppSettings.vue`
2. `src/App.vue` 中仅保留主窗口所需职责；对 settings 旧分支做清理或下线。
3. 不强制把所有 settings 逻辑立即并回单根应用；本轮重点是去掉“重复入口导致的漂移风险”，而不是做全局架构翻修。

### 3.5 第二主题采用浅色专业方向

1. 第二主题工作名暂定 `linen`，定位为：
   - 浅色
   - 专业
   - 长时间使用不刺眼
   - 与 `obsidian` 形成明确切换价值
2. 主题风格不走营销页白底蓝紫渐变，不走高能炫光路线。
3. 危险、成功、主操作等语义 token 保持跨主题稳定。
4. `color-scheme` 不能继续全局写死为 dark，需要转为主题驱动。

### 3.6 文件体积治理按“随改随拆”处理

1. 本轮不发起全仓一次性拆分。
2. 只对本轮改动波及且已超线的文件做拆分。
3. 拆分优先级：
   - `SettingsCommandsSection.vue`
   - `LauncherFlowPanel.vue`
   - `useCommandManagement.ts`
   - 其他本轮改动后仍明显超线的文件

## 4. 交互与行为口径（Current vs Roadmap）

1. Current（本轮落地后立即生效）：
   - prerequisite preflight 从 fail-open 改为 fail-closed。
   - 参数输入的 label / input 绑定与危险信息可访问性补齐。
   - “更多筛选”拥有完整 dialog 焦点行为。
   - Settings 只保留现行入口链路。
   - Appearance 增加第二主题 `linen`。
2. Roadmap（明确延期）：
   - 动画双预设或动画模式切换。
   - 更大范围的根组合层 / settings 组装链重构。
   - 更系统的全仓超长文件治理。

## 5. 数据与配置

1. 新增 / 变更数据文件：
   - 新增 `src/styles/themes/linen.css`。
2. 设置项：
   - 本轮不新增 animation / motion 相关设置项。
   - `appearance.theme` 继续复用现有字段，新增可选值 `linen`。
3. 迁移策略：
   - 老用户保持 `obsidian` 不变。
   - 仅当用户主动切换时写入 `linen`。

## 6. 验收标准（可验证）

1. preflight invoke 异常、畸形返回、required prerequisite 失败都有自动化测试，且执行不会静默放行。
2. `LauncherCommandPanel` 中每个参数控件都能被对应文本标签正确关联。
3. “更多筛选”支持键盘打开、焦点进入、`Esc` 关闭、return focus。
4. `settings.html -> main-settings.ts -> AppSettings.vue` 仍是唯一 settings 入口，legacy 路径不再继续演化。
5. Appearance 中可以看到并切换第二主题 `linen`。
6. 视觉回归基线更新后，相关截图稳定通过。
7. 本轮改动后的相关文件满足或明显接近仓库体积阈值，不再继续扩大。
8. 最终通过：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - 涉及样式改动时 `npm run test:visual:ui`
   - 收口阶段 `npm run check:all`

## 7. 风险与回滚

1. 风险点：
   - 清理 settings legacy 路径时，可能误伤现有测试夹具。
   - 主题切换会影响启动期 bootstrap、视觉回归基线与个别硬编码 dark 逻辑。
   - dialog 焦点管理若实现不严谨，容易引入键盘陷阱。
2. 回滚策略：
   - 每个子阶段独立提交。
   - 若某阶段回归过大，按阶段提交回滚，不影响其他整改项。

## 8. 文档同步清单

1. `docs/active_context.md`
2. 如主题能力对外可见，再决定是否同步 `README.md` / `README.zh-CN.md`
3. 若涉及现行架构事实变化，再同步相关 plan / architecture 文档

