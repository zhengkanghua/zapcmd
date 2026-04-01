# 2026-04-01 prerequisite check 前缀误判修复计划

## 目标

修复内置命令 prerequisite 的 `check` 使用 `binary:xxx` / `env:xxx` 前缀时，被 Rust preflight 当作裸命令名直接探测，导致像 `ipconfig` 这类本应可执行的命令被误判为“缺少环境”。

## 范围

1. 先补 Rust 单测，锁定带前缀的 `check` 应被正确归一化。
2. 只修改 `src-tauri/src/command_catalog/prerequisites.rs`，对 `binary:` / `env:` 做最小兼容处理。
3. 跑定向 Rust 测试验证，不扩散到无关重构。

## 验收

1. `binary:ipconfig`、`binary:git` 这类值不会再被误判为缺失二进制。
2. 原有裸值 `ipconfig` / `git` 行为不变。
3. `cargo test --manifest-path src-tauri/Cargo.toml prerequisites` 全绿。
