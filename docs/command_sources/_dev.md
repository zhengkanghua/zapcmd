# _dev

> 分类：开发工具
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `json-format` | 格式化 JSON | all | `echo '{{json}}' \| python3 -m json.tool` | json(text) | - | false | python3, echo | 开发 dev json 格式化 format |
| 2 | `base64-encode` | Base64 编码 | mac/linux | `echo -n "{{text}}" \| base64` | text(text) | - | false | echo, base64 | 开发 dev base64 编码 encode |
| 3 | `base64-decode` | Base64 解码 | mac/linux | `echo "{{text}}" \| base64 --decode` | text(text) | - | false | echo, base64 | 开发 dev base64 解码 decode |
| 4 | `md5-hash` | 计算 MD5 哈希 | mac | `md5 -s "{{text}}"` | text(text) | - | false | md5 | 开发 dev md5 hash 哈希 |
| 5 | `md5-hash-linux` | 计算 MD5 哈希 | linux | `echo -n "{{text}}" \| md5sum` | text(text) | - | false | echo, md5sum | 开发 dev md5 hash 哈希 |
| 6 | `sha256-hash-mac` | 计算 SHA256 哈希 | mac | `echo -n "{{text}}" \| shasum -a 256` | text(text) | - | false | echo, shasum | 开发 dev sha256 hash 哈希 |
| 7 | `sha256-hash-linux` | 计算 SHA256 哈希 | linux | `echo -n "{{text}}" \| sha256sum` | text(text) | - | false | echo, sha256sum | 开发 dev sha256 hash 哈希 |
| 8 | `timestamp-now` | 当前 Unix 时间戳 | mac/linux | `date +%s` | - | - | false | date | 开发 dev 时间戳 timestamp now |
| 9 | `timestamp-now-win` | 当前 Unix 时间戳 | win | `[DateTimeOffset]::Now.ToUnixTimeSeconds()` | - | - | false | powershell | 开发 dev 时间戳 timestamp now |
| 10 | `timestamp-convert` | 时间戳转日期 | mac | `date -r {{timestamp}}` | timestamp(number) | - | false | date | 开发 dev 时间戳 timestamp 转换 convert |
| 11 | `timestamp-convert-linux` | 时间戳转日期 | linux | `date -d @{{timestamp}}` | timestamp(number) | - | false | date | 开发 dev 时间戳 timestamp 转换 convert |
| 12 | `uuid-gen` | 生成 UUID | mac/linux | `uuidgen` | - | - | false | uuidgen | 开发 dev uuid gen |
| 13 | `random-string` | 生成随机字符串 | mac/linux | `openssl rand -hex {{length}}` | length(number, default:16) | - | false | openssl | 开发 dev 随机 random 字符串 string |
| 14 | `http-server` | 快速启动 HTTP 服务 | all | `python3 -m http.server {{port}}` | port(number, default:8000) | - | false | python3 | 开发 dev http 服务 server 启动 start |
| 15 | `regex-test-mac` | 正则表达式测试 | mac | `echo "{{text}}" \| grep -oE "{{pattern}}"` | text(text), pattern(text) | - | false | grep, echo | 开发 dev 正则 regex test 测试 |
| 16 | `regex-test-linux` | 正则表达式测试 | linux | `echo "{{text}}" \| grep -oP "{{pattern}}"` | text(text), pattern(text) | - | false | grep, echo | 开发 dev 正则 regex test 测试 |
| 17 | `url-encode` | URL 编码 | all | `python3 -c "import urllib.parse; print(urllib.parse.quote('{{text}}'))"` | text(text) | - | false | python3 | 开发 dev url 编码 encode |
| 18 | `url-decode` | URL 解码 | all | `python3 -c "import urllib.parse; print(urllib.parse.unquote('{{text}}'))"` | text(text) | - | false | python3 | 开发 dev url 解码 decode |
