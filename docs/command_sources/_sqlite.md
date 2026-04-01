# _sqlite

> 分类：SQLite
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `sqlite-shell` | SQLite Shell | sqlite | all | `sqlite3 "{{file}}"` | file(path) | - | false | binary:sqlite3 | sqlite shell cli 入口 控制台 |
| 2 | `sqlite-tables` | SQLite 列出数据表 | sqlite | all | `sqlite3 "{{file}}" ".tables"` | file(path) | - | false | binary:sqlite3 | sqlite tables 列表 |
| 3 | `sqlite-schema` | SQLite 查看 Schema | sqlite | all | `sqlite3 "{{file}}" ".schema"` | file(path) | - | false | binary:sqlite3 | sqlite schema 结构 |
| 4 | `sqlite-query` | SQLite 执行 SQL | sqlite | all | `sqlite3 "{{file}}" "{{sql}}"` | file(path), sql(text) | - | false | binary:sqlite3 | sqlite query sql |
| 5 | `sqlite-import` | SQLite 导入 CSV | sqlite | all | `sqlite3 "{{file}}" ".mode csv" ".import {{csv}} {{table}}"` | file(path), csv(path), table(text) | - | false | binary:sqlite3 | sqlite import csv table |
| 6 | `sqlite-integrity-check` | SQLite 完整性检查 | sqlite | all | `sqlite3 "{{file}}" "PRAGMA integrity_check;"` | file(path) | - | false | binary:sqlite3 | sqlite integrity check 健康检查 |
| 7 | `sqlite-vacuum` | SQLite VACUUM | sqlite | all | `sqlite3 "{{file}}" "VACUUM;"` | file(path) | - | false | binary:sqlite3 | sqlite vacuum optimize 优化 |
| 8 | `sqlite-table-info` | SQLite 表字段信息 | sqlite | all | `sqlite3 "{{file}}" "PRAGMA table_info('{{table}}');"` | file(path), table(text) | - | false | binary:sqlite3 | sqlite pragma table_info schema observability 表结构 查看 show |
| 9 | `sqlite-index-list` | SQLite 索引列表 | sqlite | all | `sqlite3 "{{file}}" "PRAGMA index_list('{{table}}');"` | file(path), table(text) | - | false | binary:sqlite3 | sqlite pragma index_list observability 索引 列表 查看 show |
| 10 | `sqlite-pragma-journal-mode` | SQLite Journal Mode | sqlite | all | `sqlite3 "{{file}}" "PRAGMA journal_mode;"` | file(path) | - | false | binary:sqlite3 | sqlite pragma journal_mode observability journal 模式 查看 show |
| 11 | `sqlite-foreign-key-check` | SQLite 外键检查 | sqlite | all | `sqlite3 "{{file}}" "PRAGMA foreign_key_check;"` | file(path) | - | false | binary:sqlite3 | sqlite pragma foreign_key_check observability 外键 检查 查看 show |
