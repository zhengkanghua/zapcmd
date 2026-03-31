# _mysql

> 分类：MySQL
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `mysql-shell` | MySQL Shell | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root) | - | false | mysql | mysql shell cli 入口 控制台 |
| 2 | `mysql-ping` | MySQL PING | all | `mysqladmin -h {{host}} -P {{port}} -u {{user}} ping -p` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root) | - | false | mysqladmin | mysql ping 健康检查 health |
| 3 | `mysql-show-databases` | MySQL 显示数据库 | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p -e "SHOW DATABASES;"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root) | - | false | mysql | mysql show databases 列表 |
| 4 | `mysql-show-tables` | MySQL 显示数据表 | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "SHOW TABLES;"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text, default:mysql) | - | false | mysql | mysql show tables 列表 database |
| 5 | `mysql-describe-table` | MySQL 查看表结构 | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "DESCRIBE {{table}};"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text, default:mysql), table(text) | - | false | mysql | mysql describe table schema database |
| 6 | `mysql-query` | MySQL 执行 SQL | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p -D {{database}} -e "{{sql}}"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text, default:mysql), sql(text) | - | false | mysql | mysql query sql database |
| 7 | `mysql-dump` | MySQL 导出数据库 | all | `mysqldump -h {{host}} -P {{port}} -u {{user}} -p {{database}} > "{{output}}"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text, default:mysql), output(path) | - | false | mysqldump | mysql dump export database backup |
| 8 | `mysql-import` | MySQL 导入 SQL 文件 | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p {{database}} < "{{file}}"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text, default:mysql), file(path) | - | false | mysql | mysql import restore database sql |
| 9 | `mysql-create-database` | MySQL 创建数据库 | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p -e "CREATE DATABASE {{database}};"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text) | - | false | mysql | mysql create database |
| 10 | `mysql-drop-database` | MySQL 删除数据库 | all | `mysql -h {{host}} -P {{port}} -u {{user}} -p -e "DROP DATABASE {{database}};"` | host(text, default:127.0.0.1), port(number, default:3306, min:1, max:65535), user(text, default:root), database(text) | ⚠️ | false | mysql | mysql drop database 删除 delete 高危 |
