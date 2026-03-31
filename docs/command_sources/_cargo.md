# _cargo

> 分类：Cargo
> 运行时分类：package
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `cargo-build` | Cargo 构建 | all | `cargo build --release` | - | - | false | cargo | 包管理 package cargo 构建 build |
| 2 | `cargo-run` | Cargo 运行 | all | `cargo run` | - | - | false | cargo | 包管理 package cargo 运行 run |
| 3 | `cargo-test` | Cargo 测试 | all | `cargo test` | - | - | false | cargo | 包管理 package cargo test 测试 |
| 4 | `cargo-add` | Cargo 添加依赖 | all | `cargo add {{package}}` | package(text) | - | false | cargo | 包管理 package cargo 添加 add 依赖 dependency |
