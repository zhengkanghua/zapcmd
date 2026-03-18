# _database

> 分类：数据库
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `redis-ping` | Redis PING | all | `redis-cli ping` | - | - | false | redis-cli | 数据库 database redis ping |
| 2 | `redis-info` | Redis INFO | all | `redis-cli info` | - | - | false | redis-cli | 数据库 database redis info |
| 3 | `redis-get` | Redis GET | all | `redis-cli get "{{key}}"` | key(text) | - | false | redis-cli | 数据库 database redis get 查询 query key |
| 4 | `redis-set` | Redis SET | all | `redis-cli set "{{key}}" "{{value}}"` | key(text), value(text) | - | false | redis-cli | 数据库 database redis set 写入 write key value |
| 5 | `redis-del` | Redis DEL | all | `redis-cli del "{{key}}"` | key(text) | - | false | redis-cli | 数据库 database redis del 删除 delete key |
| 6 | `redis-ttl` | Redis TTL | all | `redis-cli ttl "{{key}}"` | key(text) | - | false | redis-cli | 数据库 database redis ttl key |
| 7 | `redis-scan` | Redis SCAN | all | `redis-cli --scan --pattern "{{pattern}}" --count {{count}}` | pattern(text, default:*), count(number, default:100) | - | false | redis-cli | 数据库 database redis scan 查询 query pattern |
| 8 | `redis-keys` | Redis KEYS（慎用） | all | `redis-cli keys "{{pattern}}"` | pattern(text, default:*) | ⚠️ | false | redis-cli | 数据库 database redis keys 查询 query pattern 慎用 |

