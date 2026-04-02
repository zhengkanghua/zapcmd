# _network

> 此文件为自动生成，禁止手动修改。
> Source: _network.yaml

## 网络工具

## Commands

### query-port-lsof

- 名称：查询端口占用 (lsof)
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`lsof -i :{{port}}`
- Tags：网络, network, 查询, query, 端口, port, lsof, 占用, 冲突, 端口占用, 查端口

### query-port-netstat

- 名称：查询端口占用 (netstat)
- 平台：win
- 分类：network
- 执行：script
- 预览：`cmd: netstat -ano | findstr :{{port}}`
- Tags：网络, network, 查询, query, 端口, port, netstat, 占用, 冲突, 端口占用, 查端口

### kill-port-mac

- 名称：解除端口占用
- 平台：mac/linux
- 分类：network
- 执行：script
- 预览：`bash: lsof -t -i:{{port}} | xargs kill -9`
- Tags：网络, network, kill, 终止, 结束, 端口, port, 占用, 冲突, 端口占用, 释放端口

### kill-port-win

- 名称：解除端口占用
- 平台：win
- 分类：network
- 执行：script
- 预览：`powershell: Stop-Process -Id (Get-NetTCPConnection -LocalPort {{port}}).OwningProcess -Force`
- Tags：网络, network, kill, 终止, 结束, 端口, port, 占用, 冲突, 端口占用, 释放端口

### ping

- 名称：Ping 主机
- 平台：all
- 分类：network
- 执行：exec
- 预览：`ping {{host}}`
- Tags：网络, network, ping

### curl-get

- 名称：HTTP GET 请求
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -s {{url}}`
- Tags：网络, network, curl, http, 获取, get

### curl-post

- 名称：HTTP POST 请求
- 平台：all
- 分类：network
- 执行：script
- 预览：`powershell: curl -X POST -H "Content-Type: application/json" -d '{{body}}' {{url}}`
- Tags：网络, network, curl, http, post

### curl-headers

- 名称：查看 HTTP 响应头
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -I {{url}}`
- Tags：网络, network, curl, http, headers, 查看, show

### dns-lookup

- 名称：DNS 查询
- 平台：all
- 分类：network
- 执行：exec
- 预览：`nslookup {{domain}}`
- Tags：网络, network, dns, lookup, 查询, query

### dig-query

- 名称：DNS 详细查询 (dig)
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`dig {{domain}} {{type}}`
- Tags：网络, network, dig, 查询, query

### check-ip

- 名称：查看本机公网 IP
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -s ifconfig.me`
- Tags：网络, network, 检查, check, ip, 查看, show

### local-ip-mac

- 名称：查看本机局域网 IP
- 平台：mac
- 分类：network
- 执行：exec
- 预览：`ipconfig getifaddr en0`
- Tags：网络, network, 本地, local, ip, 查看, show

### local-ip-linux

- 名称：查看本机局域网 IP
- 平台：linux
- 分类：network
- 执行：exec
- 预览：`hostname -I`
- Tags：网络, network, 本地, local, ip, 查看, show

### local-ip-win

- 名称：查看本机局域网 IP
- 平台：win
- 分类：network
- 执行：exec
- 预览：`ipconfig`
- Tags：网络, network, 本地, local, ip, 查看, show

### traceroute

- 名称：路由追踪
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`traceroute {{host}}`
- Tags：网络, network, traceroute, 路由追踪

### tracert-win

- 名称：路由追踪
- 平台：win
- 分类：network
- 执行：exec
- 预览：`tracert {{host}}`
- Tags：网络, network, tracert, 路由追踪

### check-open-ports

- 名称：检查远程端口是否开放
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`nc -zv {{host}} {{port}}`
- Tags：网络, network, 检查, check, open, ports, 端口, port

### check-open-ports-win

- 名称：检查远程端口是否开放
- 平台：win
- 分类：network
- 执行：script
- 预览：`powershell: Test-NetConnection -ComputerName "{{host}}" -Port {{port}} | Select-Object ComputerName,RemotePort,TcpTestSucceeded`
- Tags：网络, network, 检查, check, open, ports, 端口, port

### wget-download

- 名称：下载文件
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`wget -O {{filename}} {{url}}`
- Tags：网络, network, wget, 下载, download, 文件, file

### curl-download

- 名称：下载文件
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -L -o {{filename}} {{url}}`
- Tags：网络, network, curl, http, 下载, download, 文件, file

### list-listening-ports

- 名称：查看所有监听端口
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`netstat -tlnp`
- Tags：网络, network, 列表, list, listening, ports, 端口, port, 查看, show

### list-listening-ports-win

- 名称：查看所有监听端口
- 平台：win
- 分类：network
- 执行：script
- 预览：`cmd: netstat -an | findstr LISTENING`
- Tags：网络, network, 列表, list, listening, ports, 端口, port, 查看, show

### flush-dns-mac

- 名称：刷新 DNS 缓存
- 平台：mac
- 分类：network
- 执行：script
- 预览：`bash: sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`
- Tags：网络, network, 刷新, flush, dns

### flush-dns-win

- 名称：刷新 DNS 缓存
- 平台：win
- 分类：network
- 执行：exec
- 预览：`ipconfig /flushdns`
- Tags：网络, network, 刷新, flush, dns

### flush-dns-linux

- 名称：刷新 DNS 缓存
- 平台：linux
- 分类：network
- 执行：exec
- 预览：`sudo systemd-resolve --flush-caches`
- Tags：网络, network, 刷新, flush, dns

### speed-test

- 名称：网络测速
- 平台：all
- 分类：network
- 执行：script
- 预览：`bash: curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -`
- Tags：网络, network, 测速, speed, test, 测试

### curl-json-get

- 名称：HTTP GET 请求 (JSON)
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -s -H "Accept: application/json" {{url}}`
- Tags：网络, network, curl, http, json, get, 获取

### http-status-only

- 名称：仅查看 HTTP 状态码
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`curl -s -o /dev/null -w "%{http_code}" {{url}}`
- Tags：网络, network, curl, http, status, 状态码, code

### http-status-only-win

- 名称：仅查看 HTTP 状态码
- 平台：win
- 分类：network
- 执行：exec
- 预览：`curl -s -o NUL -w "%{http_code}" {{url}}`
- Tags：网络, network, curl, http, status, 状态码, code

### whois

- 名称：WHOIS 查询
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`whois {{domain}}`
- Tags：网络, network, whois, 域名, domain, 查询, query

### curl-json-post

- 名称：HTTP POST 请求 (JSON)
- 平台：all
- 分类：network
- 执行：script
- 预览：`powershell: curl -s -X POST -H "Content-Type: application/json" -H "Accept: application/json" -d '{{body}}' {{url}}`
- Tags：网络, network, curl, http, json, post

### curl-json-put

- 名称：HTTP PUT 请求 (JSON)
- 平台：all
- 分类：network
- 执行：script
- 预览：`powershell: curl -s -X PUT -H "Content-Type: application/json" -H "Accept: application/json" -d '{{body}}' {{url}}`
- Tags：网络, network, curl, http, json, put

### curl-json-delete

- 名称：HTTP DELETE 请求 (JSON)
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -s -X DELETE -H "Accept: application/json" {{url}}`
- Tags：网络, network, curl, http, json, delete

### curl-form-post

- 名称：HTTP POST 请求 (Form)
- 平台：all
- 分类：network
- 执行：exec
- 预览：`curl -s -X POST -F "{{field}}={{value}}" {{url}}`
- Tags：网络, network, curl, http, form, post

### dig-short

- 名称：DNS 简洁查询 (dig +short)
- 平台：mac/linux
- 分类：network
- 执行：exec
- 预览：`dig +short {{domain}} {{type}}`
- Tags：网络, network, dig, short, dns, 查询, query
