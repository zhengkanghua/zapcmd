# _network

> 分类：网络工具
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `query-port-lsof` | 查询端口占用 (lsof) | mac/linux | `lsof -i :{{port}}` | port(number, min:1, max:65535) | - | false | lsof | 网络 network 查询 query 端口 port lsof 占用 冲突 端口占用 查端口 |
| 2 | `query-port-netstat` | 查询端口占用 (netstat) | win | `netstat -ano \| findstr :{{port}}` | port(number, min:1, max:65535) | - | false | netstat, findstr | 网络 network 查询 query 端口 port netstat 占用 冲突 端口占用 查端口 |
| 3 | `kill-port-mac` | 解除端口占用 | mac/linux | `lsof -t -i:{{port}} \| xargs kill -9` | port(number, min:1, max:65535) | ⚠️ | false | lsof, kill | 网络 network kill 终止 结束 端口 port 占用 冲突 端口占用 释放端口 |
| 4 | `kill-port-win` | 解除端口占用 | win | `Stop-Process -Id (Get-NetTCPConnection -LocalPort {{port}}).OwningProcess -Force` | port(number, min:1, max:65535) | ⚠️ | false | powershell, stop-process, get-nettcpconnection | 网络 network kill 终止 结束 端口 port 占用 冲突 端口占用 释放端口 |
| 5 | `ping` | Ping 主机 | all | `ping {{host}}` | host(text) | - | false | ping | 网络 network ping |
| 6 | `curl-get` | HTTP GET 请求 | all | `curl -s {{url}}` | url(text) | - | false | curl | 网络 network curl http 获取 get |
| 7 | `curl-post` | HTTP POST 请求 | all | `curl -X POST -H "Content-Type: application/json" -d '{{body}}' {{url}}` | url(text), body(text) | - | false | curl | 网络 network curl http post |
| 8 | `curl-headers` | 查看 HTTP 响应头 | all | `curl -I {{url}}` | url(text) | - | false | curl | 网络 network curl http headers 查看 show |
| 9 | `dns-lookup` | DNS 查询 | all | `nslookup {{domain}}` | domain(text) | - | false | nslookup | 网络 network dns lookup 查询 query |
| 10 | `dig-query` | DNS 详细查询 (dig) | mac/linux | `dig {{domain}} {{type}}` | domain(text), type(select: A/AAAA/MX/CNAME/NS/TXT) | - | false | dig | 网络 network dig 查询 query |
| 11 | `check-ip` | 查看本机公网 IP | all | `curl -s ifconfig.me` | - | - | false | curl | 网络 network 检查 check ip 查看 show |
| 12 | `local-ip-mac` | 查看本机局域网 IP | mac | `ipconfig getifaddr en0` | - | - | false | ipconfig | 网络 network 本地 local ip 查看 show |
| 13 | `local-ip-linux` | 查看本机局域网 IP | linux | `hostname -I` | - | - | false | hostname | 网络 network 本地 local ip 查看 show |
| 14 | `local-ip-win` | 查看本机局域网 IP | win | `ipconfig` | - | - | false | ipconfig | 网络 network 本地 local ip 查看 show |
| 15 | `traceroute` | 路由追踪 | mac/linux | `traceroute {{host}}` | host(text) | - | false | traceroute | 网络 network traceroute 路由追踪 |
| 16 | `tracert-win` | 路由追踪 | win | `tracert {{host}}` | host(text) | - | false | tracert | 网络 network tracert 路由追踪 |
| 17 | `check-open-ports` | 检查远程端口是否开放 | mac/linux | `nc -zv {{host}} {{port}}` | host(text), port(number, min:1, max:65535) | - | false | nc | 网络 network 检查 check open ports 端口 port |
| 18 | `check-open-ports-win` | 检查远程端口是否开放 | win | `Test-NetConnection -ComputerName "{{host}}" -Port {{port}} \| Select-Object ComputerName,RemotePort,TcpTestSucceeded` | host(text), port(number, min:1, max:65535) | - | false | powershell, test-netconnection | 网络 network 检查 check open ports 端口 port |
| 19 | `wget-download` | 下载文件 | mac/linux | `wget -O {{filename}} {{url}}` | url(text), filename(text) | - | false | wget | 网络 network wget 下载 download 文件 file |
| 20 | `curl-download` | 下载文件 | all | `curl -L -o {{filename}} {{url}}` | url(text), filename(text) | - | false | curl | 网络 network curl http 下载 download 文件 file |
| 21 | `list-listening-ports` | 查看所有监听端口 | mac/linux | `netstat -tlnp` | - | - | false | netstat | 网络 network 列表 list listening ports 端口 port 查看 show |
| 22 | `list-listening-ports-win` | 查看所有监听端口 | win | `netstat -an \| findstr LISTENING` | - | - | false | netstat, findstr | 网络 network 列表 list listening ports 端口 port 查看 show |
| 23 | `flush-dns-mac` | 刷新 DNS 缓存 | mac | `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` | - | - | true | dscacheutil, killall | 网络 network 刷新 flush dns |
| 24 | `flush-dns-win` | 刷新 DNS 缓存 | win | `ipconfig /flushdns` | - | - | true | ipconfig | 网络 network 刷新 flush dns |
| 25 | `flush-dns-linux` | 刷新 DNS 缓存 | linux | `sudo systemd-resolve --flush-caches` | - | - | true | systemd-resolve | 网络 network 刷新 flush dns |
| 26 | `speed-test` | 网络测速 | all | `curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py \| python3 -` | - | ⚠️ | false | python3, curl | 网络 network 测速 speed test 测试 |
| 27 | `curl-json-get` | HTTP GET 请求 (JSON) | all | `curl -s -H "Accept: application/json" {{url}}` | url(text) | - | false | curl | 网络 network curl http json get 获取 |
| 28 | `http-status-only` | 仅查看 HTTP 状态码 | mac/linux | `curl -s -o /dev/null -w "%{http_code}" {{url}}` | url(text) | - | false | curl | 网络 network curl http status 状态码 code |
| 29 | `http-status-only-win` | 仅查看 HTTP 状态码 | win | `curl -s -o NUL -w "%{http_code}" {{url}}` | url(text) | - | false | curl | 网络 network curl http status 状态码 code |
| 30 | `whois` | WHOIS 查询 | mac/linux | `whois {{domain}}` | domain(text) | - | false | whois | 网络 network whois 域名 domain 查询 query |
