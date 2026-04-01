# _npm

> 分类：NPM
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `npm-install` | NPM 安装依赖 | package | all | `npm install {{package}}` | package(text) | - | false | npm | 包管理 package npm install 安装 依赖 dependency |
| 2 | `npm-install-dev` | NPM 安装开发依赖 | package | all | `npm install -D {{package}}` | package(text) | - | false | npm | 包管理 package npm install dev 安装 依赖 dependency |
| 3 | `npm-uninstall` | NPM 卸载依赖 | package | all | `npm uninstall {{package}}` | package(text) | - | false | npm | 包管理 package npm 卸载 uninstall 依赖 dependency |
| 4 | `npm-run` | NPM 运行脚本 | package | all | `npm run {{script}}` | script(text) | - | false | npm | 包管理 package npm 运行 run |
| 5 | `npm-list` | NPM 查看已安装 | package | all | `npm list --depth=0` | - | - | false | npm | 包管理 package npm 列表 list 查看 show 安装 install |
| 6 | `npm-outdated` | NPM 检查过期依赖 | package | all | `npm outdated` | - | - | false | npm | 包管理 package npm 过期 outdated 依赖 dependency |
| 7 | `npm-update` | NPM 更新依赖 | package | all | `npm update` | - | - | false | npm | 包管理 package npm 更新 update 依赖 dependency |
| 8 | `npm-cache-clean` | NPM 清理缓存 | package | all | `npm cache clean --force` | - | - | false | npm | 包管理 package npm 缓存 cache 清理 clean |
