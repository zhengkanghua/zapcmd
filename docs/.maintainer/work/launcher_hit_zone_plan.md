# Launcher 命中分区与隐藏策略方案

更新时间：2026-02-24  
适用范围：主窗口（`main`）交互命中、拖拽、空白点击隐藏、焦点隐藏行为。

## 1. 背景与目标

当前主窗口是透明无边框窗口，后续会持续增加可点击区域与拖拽区内容。  
需要一个稳定、可扩展、跨平台一致的命中策略，避免：

- 透明空白区无法隐藏窗口
- 拖拽区与点击区冲突
- 新增交互模块后出现误隐藏

目标：

1. 保留 Tauri 原生拖拽机制。
2. 点击空白区可隐藏窗口。
3. 右键等非主交互不触发隐藏。
4. 支持后续大量新增可点击模块，维护成本可控。

## 2. 对本轮建议的评估结论

### 2.1 drag 区判断兜底（采纳）

建议内容：除 `data-hit-zone="drag"` 外，兜底判断 `data-tauri-drag-region`。  
结论：采纳，且应使用 `closest("[data-tauri-drag-region]")`，不要只判断 `target` 本身。

原因：

- drag 容器内会放子元素，事件 target 常是子节点。
- 仅 `hasAttribute` 容易漏判。

### 2.2 Vue 自定义指令封装 hit-zone（暂不采纳，作为后续可选）

建议内容：用自定义指令替代到处写 `data-hit-zone`。  
结论：当前阶段暂不采纳，保留 `data-hit-zone` 显式标注；当命中标记超过维护阈值后再升级。

原因：

- 当前结构中显式属性更直观，调试成本低。
- 指令会增加抽象层，短期收益不大。

升级阈值（满足任一即可考虑）：

1. 命中标记散落超过 12 处。
2. 同一命中逻辑重复超过 3 组件。
3. 新成员维护出现理解成本问题。

### 2.3 Edge Cases（采纳）

采纳项：

1. 仅左键触发空白隐藏（`event.button === 0`）。
2. 坚持 `pointerdown`，不使用 `click`（避免拖拽/选中文本后误判）。
3. 继续使用 `closest()` 进行层级命中判断。
4. 监听阶段建议使用 capture，确保尽早处理。

### 2.4 失焦隐藏（已实现，保留）

建议内容：点击窗口外部时自动隐藏。  
结论：已实现，保持现状。

现状说明：

- Rust 侧 `WindowEvent::Focused(false)` 已在延迟后自动隐藏主窗口。
- 位置：`src-tauri/src/bounds.rs`。

## 3. 统一命中模型（正式口径）

主窗口命中分为 4 类：

1. `drag`：拖拽区域
2. `interactive`：所有业务交互区域
3. `overlay`：参数/安全弹层区域
4. `blank`：未命中上述区域的空白区域（触发隐藏）

判定优先级（从高到低）：

1. `overlay` 命中 -> 不隐藏
2. `interactive` 命中 -> 不隐藏
3. `drag` 命中 -> 不隐藏（交由系统拖拽）
4. 其余 -> 隐藏主窗口

## 4. 事件处理规范

统一监听入口：主窗口根容器 `pointerdown`（capture）。

硬规则：

1. 非左键直接返回。
2. 若命中 `closest("[data-hit-zone='overlay']")`，返回。
3. 若命中 `closest("[data-hit-zone='interactive']")`，返回。
4. 若命中 `closest("[data-hit-zone='drag']")` 或 `closest("[data-tauri-drag-region]")`，返回。
5. 否则执行 `hideMainWindow()`。

## 5. 标注规范（开发时必须遵守）

### 5.1 drag 区

要求同时满足：

1. 带 `data-tauri-drag-region`
2. 带 `data-hit-zone="drag"`

### 5.2 interactive 区

所有可交互元素或其父容器需要标注：

- `data-hit-zone="interactive"`

典型对象：

1. 输入框
2. 按钮
3. 列表项
4. 暂存区 chip、卡片
5. 设置入口/快捷按钮

### 5.3 overlay 区

参数弹层、安全弹层容器：

- `data-hit-zone="overlay"`

## 6. 与透明窗口的边界说明

本方案不依赖“局部点击穿透桌面”能力。  
透明窗口下点击空白区隐藏由应用层命中逻辑完成，跨平台一致，复杂度低。

## 7. 测试与验收

自动化测试（必须）：

1. 左键点击空白区 -> 隐藏窗口
2. 左键点击输入框/结果项/chip -> 不隐藏
3. 左键点击 drag 区 -> 不隐藏
4. 右键点击空白区 -> 不隐藏
5. overlay 打开时，点击 overlay 内外（按设计）不触发主窗口误隐藏

手工回归（必须）：

1. 拖拽窗口是否稳定
2. 透明边缘区域点击是否符合预期
3. 焦点切换到外部应用后是否自动隐藏
4. 拖拽越界测试：在 `interactive` 区域按下鼠标左键后拖到 `blank` 区域再松开，窗口不应被隐藏（基于 `pointerdown` 判定）。

## 8. 实施顺序建议

1. 先落命中分区与统一监听。
2. 再补自动化测试。
3. 最后做手工回归确认。

## 9. 非目标（当前不做）

1. 不引入平台特定局部穿透（Windows/macOS 分别实现命中测试）。
2. 不在当前阶段引入 Vue 自定义指令封装 hit-zone。

## 10. 本轮落地状态（2026-02-24）

已完成：

1. 新增 `useLauncherHitZones`，统一主窗口根节点 `pointerdown capture` 命中判断。
2. 主窗口接入 `blank-pointerdown` 事件并调用 `hideMainWindow()`。
3. 命中标注已补齐：
   - `interactive`：搜索区、暂存区
   - `drag`：顶部拖拽条、暂存区头部拖拽区
   - `overlay`：参数弹层、安全弹层
4. 自动化测试补齐：
   - `src/composables/__tests__/launcher/useLauncherHitZones.test.ts`
   - 覆盖左键空白隐藏、右键不隐藏、overlay/interactive/drag 命中不隐藏、`data-tauri-drag-region` 兜底

验证：

1. `npx vitest run src/composables/__tests__/launcher/useLauncherHitZones.test.ts`
2. `npm run check:all`
