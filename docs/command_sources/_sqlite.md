# _sqlite

> 分类：SQLite
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `sqlite-shell` | SQLite Shell | sqlite | all | `sqlite3 "{{file}}"` | file(path) | - | false | sqlite3 | sqlite shell cli 入口 控制台 |
| 2 | `sqlite-tables` | SQLite 列出数据表 | sqlite | all | `sqlite3 "{{file}}" ".tables"` | file(path) | - | false | sqlite3 | sqlite tables 列表 |
| 3 | `sqlite-schema` | SQLite 查看 Schema | sqlite | all | `sqlite3 "{{file}}" ".schema"` | file(path) | - | false | sqlite3 | sqlite schema 结构 |
| 4 | `sqlite-query` | SQLite 执行 SQL | sqlite | all | `sqlite3 "{{file}}" "{{sql}}"` | file(path), sql(text) | - | false | sqlite3 | sqlite query sql |
| 5 | `sqlite-import` | SQLite 导入 CSV | sqlite | all | `sqlite3 "{{file}}" ".mode csv" ".import {{csv}} {{table}}"` | file(path), csv(path), table(text) | - | false | sqlite3 | sqlite import csv table |
| 6 | `sqlite-integrity-check` | SQLite 完整性检查 | sqlite | all | `sqlite3 "{{file}}" "PRAGMA integrity_check;"` | file(path) | - | false | sqlite3 | sqlite integrity check 健康检查 |
| 7 | `sqlite-vacuum` | SQLite VACUUM | sqlite | all | `sqlite3 "{{file}}" "VACUUM;"` | file(path) | - | false | sqlite3 | sqlite vacuum optimize 优化 |
