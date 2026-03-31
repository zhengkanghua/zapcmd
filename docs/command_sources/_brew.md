# _brew

> 分类：Homebrew
> 运行时分类：package
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `brew-install` | Homebrew 安装 | mac | `brew install {{package}}` | package(text) | - | false | brew | 包管理 package brew install 安装 |
| 2 | `brew-uninstall` | Homebrew 卸载 | mac | `brew uninstall {{package}}` | package(text) | - | false | brew | 包管理 package brew 卸载 uninstall |
| 3 | `brew-update` | Homebrew 更新索引 | mac | `brew update` | - | - | false | brew | 包管理 package brew 更新 update |
| 4 | `brew-upgrade` | Homebrew 升级所有 | mac | `brew upgrade` | - | - | false | brew | 包管理 package brew upgrade |
| 5 | `brew-list` | Homebrew 已安装列表 | mac | `brew list` | - | - | false | brew | 包管理 package brew 列表 list 安装 install |
