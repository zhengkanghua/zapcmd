# _brew

> 分类：Homebrew
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `brew-install` | Homebrew 安装 | package | mac | `brew install {{package}}` | package(text) | - | false | binary:brew | 包管理 package brew install 安装 |
| 2 | `brew-uninstall` | Homebrew 卸载 | package | mac | `brew uninstall {{package}}` | package(text) | - | false | binary:brew | 包管理 package brew 卸载 uninstall |
| 3 | `brew-update` | Homebrew 更新索引 | package | mac | `brew update` | - | - | false | binary:brew | 包管理 package brew 更新 update |
| 4 | `brew-upgrade` | Homebrew 升级所有 | package | mac | `brew upgrade` | - | - | false | binary:brew | 包管理 package brew upgrade |
| 5 | `brew-list` | Homebrew 已安装列表 | package | mac | `brew list` | - | - | false | binary:brew | 包管理 package brew 列表 list 安装 install |
