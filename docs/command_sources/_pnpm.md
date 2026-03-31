# _pnpm

> 分类：PNPM
> 运行时分类：package
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `pnpm-install` | PNPM 安装依赖 | all | `pnpm add {{package}}` | package(text) | - | false | pnpm | 包管理 package pnpm install 安装 依赖 dependency |
| 2 | `pnpm-run` | PNPM 运行脚本 | all | `pnpm run {{script}}` | script(text) | - | false | pnpm | 包管理 package pnpm run 运行 script 脚本 |
| 3 | `pnpm-up` | PNPM 升级依赖 | all | `pnpm up` | - | - | false | pnpm | 包管理 package pnpm up update upgrade 升级 依赖 |
