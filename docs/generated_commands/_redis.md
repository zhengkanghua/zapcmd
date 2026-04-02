# _redis

> 此文件为自动生成，禁止手动修改。
> Source: _redis.yaml

## Redis

## Commands

### redis-shell

- 名称：Redis Shell
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli`
- Tags：redis, shell, cli, 入口, 控制台

### redis-ping

- 名称：Redis PING
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli ping`
- Tags：redis, ping, 健康检查, health

### redis-info

- 名称：Redis INFO
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli info`
- Tags：redis, info, 信息

### redis-get

- 名称：Redis GET
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli get "{{key}}"`
- Tags：redis, get, 查询, query, key

### redis-set

- 名称：Redis SET
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli set "{{key}}" "{{value}}"`
- Tags：redis, set, 写入, write, key, value

### redis-del

- 名称：Redis DEL
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli del "{{key}}"`
- Tags：redis, del, 删除, delete, key

### redis-exists

- 名称：Redis EXISTS
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli exists "{{key}}"`
- Tags：redis, exists, key

### redis-expire

- 名称：Redis EXPIRE
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli expire "{{key}}" {{seconds}}`
- Tags：redis, expire, ttl, seconds, key

### redis-ttl

- 名称：Redis TTL
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli ttl "{{key}}"`
- Tags：redis, ttl, key

### redis-scan

- 名称：Redis SCAN
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli --scan --pattern --count {{count}}`
- Tags：redis, scan, 查询, query, pattern

### redis-keys

- 名称：Redis KEYS（慎用）
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli keys`
- Tags：redis, keys, 查询, query, pattern, 慎用

### redis-hget

- 名称：Redis HGET
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli hget "{{key}}" "{{field}}"`
- Tags：redis, hget, hash, key, field

### redis-hset

- 名称：Redis HSET
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli hset "{{key}}" "{{field}}" "{{value}}"`
- Tags：redis, hset, hash, key, field, value

### redis-hgetall

- 名称：Redis HGETALL
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli hgetall "{{key}}"`
- Tags：redis, hgetall, hash, key

### redis-lpush

- 名称：Redis LPUSH
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli lpush "{{key}}" "{{value}}"`
- Tags：redis, lpush, list, key, value

### redis-lrange

- 名称：Redis LRANGE
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli lrange "{{key}}" {{start}} {{stop}}`
- Tags：redis, lrange, list, key, start, stop

### redis-sadd

- 名称：Redis SADD
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli sadd "{{key}}" "{{member}}"`
- Tags：redis, sadd, set, key, member

### redis-smembers

- 名称：Redis SMEMBERS
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli smembers "{{key}}"`
- Tags：redis, smembers, set, key

### redis-zrange

- 名称：Redis ZRANGE
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli zrange "{{key}}" {{start}} {{stop}}`
- Tags：redis, zrange, sorted-set, key, start, stop

### redis-flushdb

- 名称：Redis FLUSHDB（清空当前库）
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli flushdb`
- Tags：redis, flushdb, 清空, clear, database, 高危

### redis-dbsize

- 名称：Redis DBSIZE
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli dbsize`
- Tags：redis, dbsize, observability, 数据量, 查看, show

### redis-memory

- 名称：Redis 内存信息
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli info memory`
- Tags：redis, memory, info, observability, 内存, 查看, show

### redis-client-list

- 名称：Redis 客户端列表
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli client list`
- Tags：redis, client, list, observability, 客户端, 列表, 查看, show

### redis-slowlog-get

- 名称：Redis 慢日志
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli slowlog get {{count}}`
- Tags：redis, slowlog, observability, 慢日志, 查看, show

### redis-config-get

- 名称：Redis 配置查询
- 平台：all
- 分类：redis
- 执行：exec
- 预览：`redis-cli config get`
- Tags：redis, config, get, observability, 配置, 查询, 查看, show
