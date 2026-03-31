# _package

> 分类：包管理
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `npm-install` | NPM 安装依赖 | all | `npm install {{package}}` | package(text) | - | false | npm | 包管理 package npm install 安装 依赖 dependency |
| 2 | `npm-install-dev` | NPM 安装开发依赖 | all | `npm install -D {{package}}` | package(text) | - | false | npm | 包管理 package npm install dev 安装 依赖 dependency |
| 3 | `npm-uninstall` | NPM 卸载依赖 | all | `npm uninstall {{package}}` | package(text) | - | false | npm | 包管理 package npm 卸载 uninstall 依赖 dependency |
| 4 | `npm-run` | NPM 运行脚本 | all | `npm run {{script}}` | script(text) | - | false | npm | 包管理 package npm 运行 run |
| 5 | `npm-list` | NPM 查看已安装 | all | `npm list --depth=0` | - | - | false | npm | 包管理 package npm 列表 list 查看 show 安装 install |
| 6 | `npm-outdated` | NPM 检查过期依赖 | all | `npm outdated` | - | - | false | npm | 包管理 package npm 过期 outdated 依赖 dependency |
| 7 | `npm-update` | NPM 更新依赖 | all | `npm update` | - | - | false | npm | 包管理 package npm 更新 update 依赖 dependency |
| 8 | `npm-cache-clean` | NPM 清理缓存 | all | `npm cache clean --force` | - | - | false | npm | 包管理 package npm 缓存 cache 清理 clean |
| 9 | `pnpm-install` | PNPM 安装依赖 | all | `pnpm add {{package}}` | package(text) | - | false | pnpm | 包管理 package pnpm install 安装 依赖 dependency |
| 10 | `yarn-install` | Yarn 安装依赖 | all | `yarn add {{package}}` | package(text) | - | false | yarn | 包管理 package yarn install 安装 依赖 dependency |
| 11 | `pip-install` | Pip 安装包 | all | `pip install {{package}}` | package(text) | - | false | pip | 包管理 package pip install 安装 |
| 12 | `pip-uninstall` | Pip 卸载包 | all | `pip uninstall {{package}}` | package(text) | - | false | pip | 包管理 package pip 卸载 uninstall |
| 13 | `pip-list` | Pip 查看已安装 | all | `pip list` | - | - | false | pip | 包管理 package pip 列表 list 查看 show 安装 install |
| 14 | `pip-freeze` | Pip 导出依赖 | all | `pip freeze > requirements.txt` | - | - | false | pip | 包管理 package pip freeze 依赖 dependency |
| 15 | `brew-install` | Homebrew 安装 | mac | `brew install {{package}}` | package(text) | - | false | brew | 包管理 package brew install 安装 |
| 16 | `brew-uninstall` | Homebrew 卸载 | mac | `brew uninstall {{package}}` | package(text) | - | false | brew | 包管理 package brew 卸载 uninstall |
| 17 | `brew-update` | Homebrew 更新索引 | mac | `brew update` | - | - | false | brew | 包管理 package brew 更新 update |
| 18 | `brew-upgrade` | Homebrew 升级所有 | mac | `brew upgrade` | - | - | false | brew | 包管理 package brew upgrade |
| 19 | `brew-list` | Homebrew 已安装列表 | mac | `brew list` | - | - | false | brew | 包管理 package brew 列表 list 安装 install |
| 20 | `cargo-build` | Cargo 构建 | all | `cargo build --release` | - | - | false | cargo | 包管理 package cargo 构建 build |
| 21 | `cargo-run` | Cargo 运行 | all | `cargo run` | - | - | false | cargo | 包管理 package cargo 运行 run |
| 22 | `cargo-test` | Cargo 测试 | all | `cargo test` | - | - | false | cargo | 包管理 package cargo test 测试 |
| 23 | `cargo-add` | Cargo 添加依赖 | all | `cargo add {{package}}` | package(text) | - | false | cargo | 包管理 package cargo 添加 add 依赖 dependency |
| 24 | `pnpm-run` | PNPM 运行脚本 | all | `pnpm run {{script}}` | script(text) | - | false | pnpm | 包管理 package pnpm run 运行 script 脚本 |
| 25 | `pnpm-up` | PNPM 升级依赖 | all | `pnpm up` | - | - | false | pnpm | 包管理 package pnpm up update upgrade 升级 依赖 |
| 26 | `bun-install` | Bun 安装依赖 | all | `bun install` | - | - | false | bun | 包管理 package bun install 安装 依赖 |
| 27 | `bun-run` | Bun 运行脚本 | all | `bun run {{script}}` | script(text) | - | false | bun | 包管理 package bun run 运行 script 脚本 |
