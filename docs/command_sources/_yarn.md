# _yarn

> 分类：Yarn
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `yarn-add` | Yarn 添加依赖 | package | all | `yarn add {{package}}` | package(text) | - | false | binary:yarn | 包管理 package yarn add 安装 依赖 dependency |
| 2 | `yarn-run` | Yarn 运行脚本 | package | all | `yarn run {{script}}` | script(text) | - | false | binary:yarn | 包管理 package yarn run 运行 script 脚本 |
| 3 | `yarn-remove` | Yarn 移除依赖 | package | all | `yarn remove {{package}}` | package(text) | - | false | binary:yarn | 包管理 package yarn remove 删除 移除 依赖 dependency |
| 4 | `yarn-upgrade` | Yarn 升级依赖 | package | all | `yarn upgrade` | - | - | false | binary:yarn | 包管理 package yarn upgrade update 升级 依赖 |
| 5 | `yarn-install-project` | Yarn 安装项目依赖 | package | all | `yarn install` | - | - | false | binary:yarn | 包管理 package yarn install 项目 project 依赖 dependency |
| 6 | `yarn-add-dev` | Yarn 安装开发依赖 | package | all | `yarn add -D {{package}}` | package(text) | - | false | binary:yarn | 包管理 package yarn add dev 安装 依赖 dependency |
| 7 | `yarn-dlx` | Yarn 运行临时包命令 | package | all | `yarn dlx {{package}}` | package(text) | - | false | binary:yarn | 包管理 package yarn dlx exec 临时 执行 run |
