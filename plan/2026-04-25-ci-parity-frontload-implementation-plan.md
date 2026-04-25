# CI Parity 前移实现计划

## 目标

把当前经常只在 CI Gate 暴露的问题尽量前移到开发期，优先覆盖 4 类缺口：workflow 变更、内置命令生成产物未同步、Rust Windows/高风险目录变更、以及本地缺少可直接运行的 CI parity 检查入口。

## 范围

1. 新增可复用的本地 CI parity 检查脚本。
2. 调整 pre-commit 规则，避免 `.github/workflows/**` 被误判为 docs-only。
3. 将 builtin command 生成产物同步检查前移到本地。
4. 扩大 Rust 高风险匹配范围，覆盖 `src-tauri/src/terminal/**` 等目录。
5. 补合同/行为测试与简明文档。

## 验收

1. workflow-only 改动不会再直接跳过 pre-commit。
2. builtin source 改动未同步生成产物时，本地即可失败。
3. `src-tauri/src/terminal/**` 改动会在 pre-commit 追加 `cargo test`。
4. `npm run check:all` 或等价本地入口能覆盖新增的 CI parity 静态检查。
