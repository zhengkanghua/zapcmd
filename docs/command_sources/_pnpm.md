# _pnpm

> 分类：PNPM
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `pnpm-install` | PNPM 安装依赖 | package | all | `pnpm add {{package}}` | package(text) | - | false | binary:pnpm | 包管理 package pnpm install 安装 依赖 dependency |
| 2 | `pnpm-run` | PNPM 运行脚本 | package | all | `pnpm run {{script}}` | script(text) | - | false | binary:pnpm | 包管理 package pnpm run 运行 script 脚本 |
| 3 | `pnpm-up` | PNPM 升级依赖 | package | all | `pnpm up` | - | - | false | binary:pnpm | 包管理 package pnpm up update upgrade 升级 依赖 |
| 4 | `pnpm-remove` | PNPM 移除依赖 | package | all | `pnpm remove {{package}}` | package(text) | - | false | binary:pnpm | 包管理 package pnpm remove 删除 移除 依赖 dependency |
| 5 | `pnpm-list` | PNPM 查看已安装 | package | all | `pnpm list --depth 0` | - | - | false | binary:pnpm | 包管理 package pnpm list 列表 查看 show 安装 install |
