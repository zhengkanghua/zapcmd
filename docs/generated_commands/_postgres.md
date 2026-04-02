# _postgres

> 此文件为自动生成，禁止手动修改。
> Source: _postgres.yaml

## Postgres

## Commands

### psql-shell

- 名称：Postgres Shell
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`psql -h {{host}} -p {{port}} -U {{user}} -d {{database}}`
- Tags：postgres, psql, shell, cli, 入口, 控制台

### postgres-is-ready

- 名称：Postgres 就绪检查
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`pg_isready -h {{host}} -p {{port}}`
- Tags：postgres, ready, health, 检查

### postgres-list-databases

- 名称：Postgres 列出数据库
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`psql -h {{host}} -p {{port}} -U {{user}} -d postgres -c "\l"`
- Tags：postgres, list, databases, 数据库, 列表

### postgres-list-tables

- 名称：Postgres 列出数据表
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "\dt"`
- Tags：postgres, list, tables, 数据表, 列表

### postgres-describe-table

- 名称：Postgres 查看表结构
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "\d {{table}}"`
- Tags：postgres, describe, table, schema

### postgres-query

- 名称：Postgres 执行 SQL
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c`
- Tags：postgres, query, sql, database

### postgres-dump

- 名称：Postgres 导出数据库
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`pg_dump -h {{host}} -p {{port}} -U {{user}} -d {{database}} -f "{{output}}"`
- Tags：postgres, dump, export, backup, database

### postgres-restore

- 名称：Postgres 导入 SQL 文件
- 平台：all
- 分类：postgres
- 执行：exec
- 预览：`psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -f "{{file}}"`
- Tags：postgres, restore, import, sql, database

### postgres-create-database

- 名称：Postgres 创建数据库
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d postgres -c "CREATE DATABASE {{database}};"`
- Tags：postgres, create, database

### postgres-drop-database

- 名称：Postgres 删除数据库
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d postgres -c "DROP DATABASE {{database}};"`
- Tags：postgres, drop, database, 删除, delete, 高危

### postgres-version

- 名称：Postgres 版本
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "SELECT version();"`
- Tags：postgres, version, observability, 版本, 查看, show

### postgres-current-db

- 名称：Postgres 当前数据库
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "SELECT current_database();"`
- Tags：postgres, current, database, observability, 当前库, 查看, show

### postgres-current-user

- 名称：Postgres 当前用户
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "SELECT current_user;"`
- Tags：postgres, current, user, observability, 当前用户, 查看, show

### postgres-list-extensions

- 名称：Postgres 扩展列表
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"`
- Tags：postgres, extensions, list, observability, 扩展, 列表, 查看, show

### postgres-db-size

- 名称：Postgres 当前库大小
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "SELECT pg_size_pretty(pg_database_size(current_database()));"`
- Tags：postgres, database, size, observability, 当前库, 大小, 查看, show

### postgres-active-queries

- 名称：Postgres 活跃查询
- 平台：all
- 分类：postgres
- 执行：script
- 预览：`bash: psql -h {{host}} -p {{port}} -U {{user}} -d {{database}} -c "SELECT pid, usename, state, wait_event_type, wait_event, query FROM pg_stat_activity WHERE state <> 'idle' ORDER BY query_start DESC;"`
- Tags：postgres, active, queries, observability, query, activity, 查看, show
