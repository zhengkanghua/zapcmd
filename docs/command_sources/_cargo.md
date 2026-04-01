# _cargo

> 分类：Cargo
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `cargo-build` | Cargo 构建 | package | all | `cargo build --release` | - | - | false | binary:cargo | 包管理 package cargo 构建 build |
| 2 | `cargo-run` | Cargo 运行 | package | all | `cargo run` | - | - | false | binary:cargo | 包管理 package cargo 运行 run |
| 3 | `cargo-test` | Cargo 测试 | package | all | `cargo test` | - | - | false | binary:cargo | 包管理 package cargo test 测试 |
| 4 | `cargo-add` | Cargo 添加依赖 | package | all | `cargo add {{package}}` | package(text) | - | false | binary:cargo | 包管理 package cargo 添加 add 依赖 dependency |
