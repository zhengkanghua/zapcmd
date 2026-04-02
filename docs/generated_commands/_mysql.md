# _mysql

> 此文件为自动生成，禁止手动修改。
> Source: _mysql.yaml

## MySQL

## Commands

### mysql-shell

- 名称：MySQL Shell
- 平台：all
- 分类：mysql
- 执行：exec
- 预览：`mysql -h {{host}} -P {{port}} -u {{user}} -p`
- Tags：mysql, shell, cli, 入口, 控制台

### mysql-ping

- 名称：MySQL PING
- 平台：all
- 分类：mysql
- 执行：exec
- 预览：`mysqladmin -h {{host}} -P {{port}} -u {{user}} ping -p`
- Tags：mysql, ping, 健康检查, health

### mysql-show-databases

- 名称：MySQL 显示数据库
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -e "SHOW DATABASES;"`
- Tags：mysql, show, databases, 列表

### mysql-show-tables

- 名称：MySQL 显示数据表
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "SHOW TABLES;"`
- Tags：mysql, show, tables, 列表, database

### mysql-describe-table

- 名称：MySQL 查看表结构
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "DESCRIBE {{table}};"`
- Tags：mysql, describe, table, schema, database

### mysql-query

- 名称：MySQL 执行 SQL
- 平台：all
- 分类：mysql
- 执行：exec
- 预览：`mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e`
- Tags：mysql, query, sql, database

### mysql-dump

- 名称：MySQL 导出数据库
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysqldump -h {{host}} -P {{port}} -u {{user}} -p {{database}} > "{{output}}"`
- Tags：mysql, dump, export, database, backup

### mysql-import

- 名称：MySQL 导入 SQL 文件
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p {{database}} < "{{file}}"`
- Tags：mysql, import, restore, database, sql

### mysql-create-database

- 名称：MySQL 创建数据库
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -e "CREATE DATABASE {{database}};"`
- Tags：mysql, create, database

### mysql-drop-database

- 名称：MySQL 删除数据库
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -e "DROP DATABASE {{database}};"`
- Tags：mysql, drop, database, 删除, delete, 高危

### mysql-version

- 名称：MySQL 版本
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "SELECT VERSION();"`
- Tags：mysql, version, observability, 版本, 查看, show

### mysql-processlist

- 名称：MySQL 进程列表
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "SHOW FULL PROCESSLIST;"`
- Tags：mysql, processlist, observability, 连接, 进程, 列表, 查看, show

### mysql-show-status

- 名称：MySQL 状态变量
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "SHOW STATUS;"`
- Tags：mysql, status, observability, 状态, 变量, 查看, show

### mysql-show-variables

- 名称：MySQL 配置变量
- 平台：all
- 分类：mysql
- 执行：script
- 预览：`bash: mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "SHOW VARIABLES;"`
- Tags：mysql, variables, observability, 配置, 变量, 查看, show
