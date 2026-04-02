# _dev

> 此文件为自动生成，禁止手动修改。
> Source: _dev.yaml

## 开发工具

## Commands

### json-format

- 名称：格式化 JSON
- 平台：all
- 分类：dev
- 执行：script
- 预览：`bash: echo '{{json}}' | python3 -m json.tool`
- Tags：开发, dev, json, 格式化, format

### base64-encode

- 名称：Base64 编码
- 平台：mac/linux
- 分类：dev
- 执行：script
- 预览：`bash: echo -n "{{text}}" | base64`
- Tags：开发, dev, base64, 编码, encode

### base64-decode

- 名称：Base64 解码
- 平台：mac/linux
- 分类：dev
- 执行：script
- 预览：`bash: echo "{{text}}" | base64 --decode`
- Tags：开发, dev, base64, 解码, decode

### md5-hash

- 名称：计算 MD5 哈希
- 平台：mac
- 分类：dev
- 执行：exec
- 预览：`md5 -s "{{text}}"`
- Tags：开发, dev, md5, hash, 哈希

### md5-hash-linux

- 名称：计算 MD5 哈希
- 平台：linux
- 分类：dev
- 执行：script
- 预览：`bash: echo -n "{{text}}" | md5sum`
- Tags：开发, dev, md5, hash, 哈希

### sha256-hash-mac

- 名称：计算 SHA256 哈希
- 平台：mac
- 分类：dev
- 执行：script
- 预览：`bash: echo -n "{{text}}" | shasum -a 256`
- Tags：开发, dev, sha256, hash, 哈希

### sha256-hash-linux

- 名称：计算 SHA256 哈希
- 平台：linux
- 分类：dev
- 执行：script
- 预览：`bash: echo -n "{{text}}" | sha256sum`
- Tags：开发, dev, sha256, hash, 哈希

### timestamp-now

- 名称：当前 Unix 时间戳
- 平台：mac/linux
- 分类：dev
- 执行：exec
- 预览：`date +%s`
- Tags：开发, dev, 时间戳, timestamp, now

### timestamp-now-win

- 名称：当前 Unix 时间戳
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [DateTimeOffset]::Now.ToUnixTimeSeconds()`
- Tags：开发, dev, 时间戳, timestamp, now

### timestamp-convert

- 名称：时间戳转日期
- 平台：mac
- 分类：dev
- 执行：exec
- 预览：`date -r {{timestamp}}`
- Tags：开发, dev, 时间戳, timestamp, 转换, convert

### timestamp-convert-linux

- 名称：时间戳转日期
- 平台：linux
- 分类：dev
- 执行：exec
- 预览：`date -d @{{timestamp}}`
- Tags：开发, dev, 时间戳, timestamp, 转换, convert

### uuid-gen

- 名称：生成 UUID
- 平台：mac/linux
- 分类：dev
- 执行：exec
- 预览：`uuidgen`
- Tags：开发, dev, uuid, gen

### random-string

- 名称：生成随机字符串
- 平台：mac/linux
- 分类：dev
- 执行：exec
- 预览：`openssl rand -hex {{length}}`
- Tags：开发, dev, 随机, random, 字符串, string

### http-server

- 名称：快速启动 HTTP 服务
- 平台：all
- 分类：dev
- 执行：exec
- 预览：`python3 -m http.server {{port}}`
- Tags：开发, dev, http, 服务, server, 启动, start

### regex-test-mac

- 名称：正则表达式测试
- 平台：mac
- 分类：dev
- 执行：script
- 预览：`bash: echo "{{text}}" | grep -oE "{{pattern}}"`
- Tags：开发, dev, 正则, regex, test, 测试

### regex-test-linux

- 名称：正则表达式测试
- 平台：linux
- 分类：dev
- 执行：script
- 预览：`bash: echo "{{text}}" | grep -oP "{{pattern}}"`
- Tags：开发, dev, 正则, regex, test, 测试

### url-encode

- 名称：URL 编码
- 平台：all
- 分类：dev
- 执行：script
- 预览：`bash: python3 -c "import urllib.parse; print(urllib.parse.quote('{{text}}'))"`
- Tags：开发, dev, url, 编码, encode

### url-decode

- 名称：URL 解码
- 平台：all
- 分类：dev
- 执行：script
- 预览：`bash: python3 -c "import urllib.parse; print(urllib.parse.unquote('{{text}}'))"`
- Tags：开发, dev, url, 解码, decode

### jq-format-json

- 名称：使用 jq 格式化 JSON 文件
- 平台：all
- 分类：dev
- 执行：exec
- 预览：`jq . {{file}}`
- Tags：开发, dev, jq, json, 格式化, format, 文件, file

### jwt-decode

- 名称：解码 JWT
- 平台：all
- 分类：dev
- 执行：script
- 预览：`bash: python3 -c "import base64, json, sys; parts=sys.argv[1].split('.'); dec=lambda s: json.loads(base64.urlsafe_b64decode(s + '=' * (-len(s) % 4)).decode()); print(json.dumps({'header': dec(parts[0]), 'payload': dec(parts[1])}, ensure_ascii=False, indent=2))" "{{token}}"`
- Tags：开发, dev, jwt, decode, 解码, token

### epoch-ms-now

- 名称：当前 Unix 毫秒时间戳
- 平台：mac/linux
- 分类：dev
- 执行：script
- 预览：`bash: python3 -c "import time; print(int(time.time() * 1000))"`
- Tags：开发, dev, epoch, 毫秒, milliseconds, timestamp, now

### epoch-ms-now-win

- 名称：当前 Unix 毫秒时间戳
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [DateTimeOffset]::Now.ToUnixTimeMilliseconds()`
- Tags：开发, dev, epoch, 毫秒, milliseconds, timestamp, now

### epoch-ms-convert

- 名称：毫秒时间戳转日期
- 平台：mac/linux
- 分类：dev
- 执行：script
- 预览：`bash: python3 -c "import datetime; print(datetime.datetime.fromtimestamp({{timestamp}} / 1000, datetime.timezone.utc).astimezone().isoformat())"`
- Tags：开发, dev, epoch, 毫秒, milliseconds, timestamp, convert, 转换, 日期

### epoch-ms-convert-win

- 名称：毫秒时间戳转日期
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [DateTimeOffset]::FromUnixTimeMilliseconds({{timestamp}}).ToString("o")`
- Tags：开发, dev, epoch, 毫秒, milliseconds, timestamp, convert, 转换, 日期

### uuid-gen-win

- 名称：生成 UUID
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [guid]::NewGuid().ToString()`
- Tags：开发, dev, uuid, gen

### base64-encode-win

- 名称：Base64 编码
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("{{text}}"))`
- Tags：开发, dev, base64, 编码, encode

### base64-decode-win

- 名称：Base64 解码
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String("{{text}}"))`
- Tags：开发, dev, base64, 解码, decode

### sha256-hash-win

- 名称：计算 SHA256 哈希
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: ([System.BitConverter]::ToString((New-Object System.Security.Cryptography.SHA256Managed).ComputeHash([Text.Encoding]::UTF8.GetBytes("{{text}}")))).Replace("-", "").ToLower()`
- Tags：开发, dev, sha256, hash, 哈希

### regex-test-win

- 名称：正则表达式测试
- 平台：win
- 分类：dev
- 执行：script
- 预览：`powershell: [regex]::Matches("{{text}}", "{{pattern}}") | ForEach-Object { $_.Value }`
- Tags：开发, dev, 正则, regex, test, 测试
