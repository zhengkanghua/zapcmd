# 2026-04-07 大文件小步拆分路线图

## 目标

本轮先不直接大重构，只把后续拆分顺序、边界和回归点固定下来，避免下次一上来就“边拆边猜”。

## 拆分顺序

### 第 1 步：`useCommandExecution/actions.ts`

- 原因
  - 这里最容易继续长胖，而且直接承担执行、参数提交、队列操作、反馈提示等多类职责。
  - 它最贴近前端交互，拆开后能最快降低后续改需求时的理解成本。
- 建议拆法
  - 拆出“参数提交 / 队列变更 / 执行动作 / 反馈消息”四个小模块。
  - 先只抽纯函数和局部 helper，不先改事件入口签名。
- 每次迭代的验收
  - 对外暴露 API 不变。
  - 现有 launcher 交互测试全绿。

### 第 2 步：`useAppCompositionRoot/runtime.ts`

- 原因
  - 这是窗口装配和运行时行为的主汇聚点，继续叠需求会让 Launcher / Settings / Windowing 副作用纠缠。
  - 第 1 步先把执行动作收口后，这里再拆会更稳。
- 建议拆法
  - 拆成“命令页运行时 / 队列运行时 / 窗口行为 / 用户反馈策略”四块。
  - 先抽 orchestration helper，再考虑独立 composable。
- 每次迭代的验收
  - `createAppCompositionRuntime` 对外 contract 不变。
  - app composition 与快捷键回归全绿。

### 第 3 步：`src-tauri/src/terminal.rs`

- 原因
  - Rust 侧终端发现、命令拼装、平台分支、Windows 复用策略都堆在一起，风险最高。
  - 但它牵涉平台差异，必须放在前两步之后，等前端行为稳定再拆。
- 建议拆法
  - 先分 `discovery / launch / payload-build / error-mapping`。
  - 每一步只移动一类逻辑，禁止同时改 payload contract。
- 每次迭代的验收
  - `cargo test --manifest-path src-tauri/Cargo.toml terminal`
  - Windows 相关逻辑至少保留 discovery / routing 单测覆盖。

## 执行原则

- 一次只拆一个文件域，不跨前后端同时动。
- 每次先补定向测试，再做最小搬移，不顺手“顺便优化”。
- 只要对外 contract 要变，先补 plan，再开下一轮。
