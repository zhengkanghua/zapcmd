# 参与贡献（Contributing）

感谢你参与 ZapCmd。

## 0. 前置条件

ZapCmd 是一个 Tauri 桌面应用（Rust + Web）。

大多数代码类贡献需要：

1. Node.js（npm）
2. Rust 工具链（见 `rust-toolchain.toml`）
3. 你当前系统对应的 Tauri 前置依赖（系统包 / 构建工具链）

如果你只改文档（docs-only），可以不安装 Rust/Tauri。

## 1. 快速开始

1. 安装依赖：`npm install`
2. 启动开发：`npm run tauri:dev`
3. 执行门禁：`npm run check:all`
4. 如需更早贴近 CI，可先执行：`npm run check:ci-parity`

说明：

1. `npm run check:all` 会通过 `npm run check:rust` 执行 `cargo check`，因此需要 Rust。
2. 如果你本地只在迭代前端改动，可以先跑子集命令：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:run`
   - `npm run build`
   但 CI 仍会跑完整门禁，提 PR 前请确保 `npm run check:all` 能通过。
3. `npm run check:ci-parity` 会额外覆盖本地可执行的 CI 专属静态检查：
   - 内置命令生成产物同步检查
   - workflow/gate 合同测试

## 2. 规则

1. 小步改动、可验证交付。
2. 禁止使用 `any`。
3. 代码、测试、文档要同步。
4. 若改动影响用户行为，必须同步更新：
   - `README.md`
   - `README.zh-CN.md`

## 3. 测试要求

1. 最低要求：
   - `npm run test:run`
   - `npm run test:coverage`
2. 提 PR 前必须通过：
   - `npm run check:ci-parity`
   - `npm run check:all`
3. 若影响终端/窗口/热键：
   - 请在 PR 描述里把“行为变化”讲清楚
   - 补充你的手动验证步骤与结果（你自己怎么试的）

## 4. PR 要求

0. 目标分支：
   - 请将 PR 提到 `main`。
   - 发版通过推送 `vX.Y.Z` tag；`main` 可能领先于最新 Release。

1. 使用 `.github/` 下的 issue/PR 模板。
2. 说明改动内容与原因。
3. 提供测试证据（命令 + 结果）。
4. 保持改动小而可审查。

## 5. Commit Message 建议

1. `feat: ...`
2. `fix: ...`
3. `docs: ...`
4. `refactor: ...`
5. `test: ...`
6. `chore: ...`
