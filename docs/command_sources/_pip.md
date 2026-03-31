# _pip

> 分类：Pip
> 运行时分类：package
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `pip-install` | Pip 安装包 | all | `pip install {{package}}` | package(text) | - | false | pip | 包管理 package pip install 安装 |
| 2 | `pip-uninstall` | Pip 卸载包 | all | `pip uninstall {{package}}` | package(text) | - | false | pip | 包管理 package pip 卸载 uninstall |
| 3 | `pip-list` | Pip 查看已安装 | all | `pip list` | - | - | false | pip | 包管理 package pip 列表 list 查看 show 安装 install |
| 4 | `pip-freeze` | Pip 导出依赖 | all | `pip freeze > requirements.txt` | - | - | false | pip | 包管理 package pip freeze 依赖 dependency |
