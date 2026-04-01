# _redis

> 分类：Redis
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `redis-shell` | Redis Shell | redis | all | `redis-cli` | - | - | false | redis-cli | redis shell cli 入口 控制台 |
| 2 | `redis-ping` | Redis PING | redis | all | `redis-cli ping` | - | - | false | redis-cli | redis ping 健康检查 health |
| 3 | `redis-info` | Redis INFO | redis | all | `redis-cli info` | - | - | false | redis-cli | redis info 信息 |
| 4 | `redis-get` | Redis GET | redis | all | `redis-cli get "{{key}}"` | key(text) | - | false | redis-cli | redis get 查询 query key |
| 5 | `redis-set` | Redis SET | redis | all | `redis-cli set "{{key}}" "{{value}}"` | key(text), value(text) | - | false | redis-cli | redis set 写入 write key value |
| 6 | `redis-del` | Redis DEL | redis | all | `redis-cli del "{{key}}"` | key(text) | - | false | redis-cli | redis del 删除 delete key |
| 7 | `redis-exists` | Redis EXISTS | redis | all | `redis-cli exists "{{key}}"` | key(text) | - | false | redis-cli | redis exists key |
| 8 | `redis-expire` | Redis EXPIRE | redis | all | `redis-cli expire "{{key}}" {{seconds}}` | key(text), seconds(number, default:60, min:1, max:86400) | - | false | redis-cli | redis expire ttl seconds key |
| 9 | `redis-ttl` | Redis TTL | redis | all | `redis-cli ttl "{{key}}"` | key(text) | - | false | redis-cli | redis ttl key |
| 10 | `redis-scan` | Redis SCAN | redis | all | `redis-cli --scan --pattern "{{pattern}}" --count {{count}}` | pattern(text, default:*), count(number, default:100, min:1, max:1000) | - | false | redis-cli | redis scan 查询 query pattern |
| 11 | `redis-keys` | Redis KEYS（慎用） | redis | all | `redis-cli keys "{{pattern}}"` | pattern(text, default:*) | ⚠️ | false | redis-cli | redis keys 查询 query pattern 慎用 |
| 12 | `redis-hget` | Redis HGET | redis | all | `redis-cli hget "{{key}}" "{{field}}"` | key(text), field(text) | - | false | redis-cli | redis hget hash key field |
| 13 | `redis-hset` | Redis HSET | redis | all | `redis-cli hset "{{key}}" "{{field}}" "{{value}}"` | key(text), field(text), value(text) | - | false | redis-cli | redis hset hash key field value |
| 14 | `redis-hgetall` | Redis HGETALL | redis | all | `redis-cli hgetall "{{key}}"` | key(text) | - | false | redis-cli | redis hgetall hash key |
| 15 | `redis-lpush` | Redis LPUSH | redis | all | `redis-cli lpush "{{key}}" "{{value}}"` | key(text), value(text) | - | false | redis-cli | redis lpush list key value |
| 16 | `redis-lrange` | Redis LRANGE | redis | all | `redis-cli lrange "{{key}}" {{start}} {{stop}}` | key(text), start(number, default:0, min:0), stop(number, default:-1) | - | false | redis-cli | redis lrange list key start stop |
| 17 | `redis-sadd` | Redis SADD | redis | all | `redis-cli sadd "{{key}}" "{{member}}"` | key(text), member(text) | - | false | redis-cli | redis sadd set key member |
| 18 | `redis-smembers` | Redis SMEMBERS | redis | all | `redis-cli smembers "{{key}}"` | key(text) | - | false | redis-cli | redis smembers set key |
| 19 | `redis-zrange` | Redis ZRANGE | redis | all | `redis-cli zrange "{{key}}" {{start}} {{stop}}` | key(text), start(number, default:0, min:0), stop(number, default:-1) | - | false | redis-cli | redis zrange sorted-set key start stop |
| 20 | `redis-flushdb` | Redis FLUSHDB（清空当前库） | redis | all | `redis-cli flushdb` | - | ⚠️ | false | redis-cli | redis flushdb 清空 clear database 高危 |
