# _pnpm

> 分类：PNPM
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `pnpm-add` | PNPM 添加依赖 | package | all | `pnpm add {{package}}` | package(text) | - | false | binary:pnpm | 包管理 package pnpm add 安装 依赖 dependency |
| 2 | `pnpm-run` | PNPM 运行脚本 | package | all | `pnpm run {{script}}` | script(text) | - | false | binary:pnpm | 包管理 package pnpm run 运行 script 脚本 |
| 3 | `pnpm-up` | PNPM 升级依赖 | package | all | `pnpm up` | - | - | false | binary:pnpm | 包管理 package pnpm up update upgrade 升级 依赖 |
| 4 | `pnpm-remove` | PNPM 移除依赖 | package | all | `pnpm remove {{package}}` | package(text) | - | false | binary:pnpm | 包管理 package pnpm remove 删除 移除 依赖 dependency |
| 5 | `pnpm-list` | PNPM 查看已安装 | package | all | `pnpm list --depth 0` | - | - | false | binary:pnpm | 包管理 package pnpm list 列表 查看 show 安装 install |
| 6 | `pnpm-install-project` | PNPM 安装项目依赖 | package | all | `pnpm install` | - | - | false | binary:pnpm | 包管理 package pnpm install 项目 project 依赖 dependency |
| 7 | `pnpm-add-dev` | PNPM 安装开发依赖 | package | all | `pnpm add -D {{package}}` | package(text) | - | false | binary:pnpm | 包管理 package pnpm add dev 安装 依赖 dependency |
| 8 | `pnpm-dlx` | PNPM 运行临时包命令 | package | all | `pnpm dlx {{package}}` | package(text) | - | false | binary:pnpm | 包管理 package pnpm dlx exec 临时 执行 run |
