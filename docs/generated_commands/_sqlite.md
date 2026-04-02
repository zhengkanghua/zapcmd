# _sqlite

> 此文件为自动生成，禁止手动修改。
> Source: _sqlite.yaml

## SQLite

## Commands

### sqlite-shell

- 名称：SQLite Shell
- 平台：all
- 分类：sqlite
- 执行：exec
- 预览：`sqlite3 "{{file}}"`
- Tags：sqlite, shell, cli, 入口, 控制台

### sqlite-tables

- 名称：SQLite 列出数据表
- 平台：all
- 分类：sqlite
- 执行：exec
- 预览：`sqlite3 "{{file}}" ".tables"`
- Tags：sqlite, tables, 列表

### sqlite-schema

- 名称：SQLite 查看 Schema
- 平台：all
- 分类：sqlite
- 执行：exec
- 预览：`sqlite3 "{{file}}" ".schema"`
- Tags：sqlite, schema, 结构

### sqlite-query

- 名称：SQLite 执行 SQL
- 平台：all
- 分类：sqlite
- 执行：exec
- 预览：`sqlite3 "{{file}}"`
- Tags：sqlite, query, sql

### sqlite-import

- 名称：SQLite 导入 CSV
- 平台：all
- 分类：sqlite
- 执行：exec
- 预览：`sqlite3 "{{file}}" ".mode csv" ".import {{csv}} {{table}}"`
- Tags：sqlite, import, csv, table

### sqlite-integrity-check

- 名称：SQLite 完整性检查
- 平台：all
- 分类：sqlite
- 执行：script
- 预览：`bash: sqlite3 "{{file}}" "PRAGMA integrity_check;"`
- Tags：sqlite, integrity, check, 健康检查

### sqlite-vacuum

- 名称：SQLite VACUUM
- 平台：all
- 分类：sqlite
- 执行：script
- 预览：`bash: sqlite3 "{{file}}" "VACUUM;"`
- Tags：sqlite, vacuum, optimize, 优化

### sqlite-table-info

- 名称：SQLite 表字段信息
- 平台：all
- 分类：sqlite
- 执行：script
- 预览：`bash: sqlite3 "{{file}}" "PRAGMA table_info('{{table}}');"`
- Tags：sqlite, pragma, table_info, schema, observability, 表结构, 查看, show

### sqlite-index-list

- 名称：SQLite 索引列表
- 平台：all
- 分类：sqlite
- 执行：script
- 预览：`bash: sqlite3 "{{file}}" "PRAGMA index_list('{{table}}');"`
- Tags：sqlite, pragma, index_list, observability, 索引, 列表, 查看, show

### sqlite-pragma-journal-mode

- 名称：SQLite Journal Mode
- 平台：all
- 分类：sqlite
- 执行：script
- 预览：`bash: sqlite3 "{{file}}" "PRAGMA journal_mode;"`
- Tags：sqlite, pragma, journal_mode, observability, journal, 模式, 查看, show

### sqlite-foreign-key-check

- 名称：SQLite 外键检查
- 平台：all
- 分类：sqlite
- 执行：script
- 预览：`bash: sqlite3 "{{file}}" "PRAGMA foreign_key_check;"`
- Tags：sqlite, pragma, foreign_key_check, observability, 外键, 检查, 查看, show
