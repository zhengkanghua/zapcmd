# _bun

> 分类：Bun
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `bun-install` | Bun 安装依赖 | package | all | `bun install` | - | - | false | binary:bun | 包管理 package bun install 安装 依赖 |
| 2 | `bun-run` | Bun 运行脚本 | package | all | `bun run {{script}}` | script(text) | - | false | binary:bun | 包管理 package bun run 运行 script 脚本 |
| 3 | `bun-add` | Bun 添加依赖 | package | all | `bun add {{package}}` | package(text) | - | false | binary:bun | 包管理 package bun add 安装 依赖 dependency |
| 4 | `bun-remove` | Bun 移除依赖 | package | all | `bun remove {{package}}` | package(text) | - | false | binary:bun | 包管理 package bun remove 删除 移除 依赖 dependency |
