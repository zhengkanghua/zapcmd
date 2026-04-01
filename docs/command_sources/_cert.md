# _cert

> 分类：证书与 OpenSSL
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `openssl-x509-text` | OpenSSL 查看证书全文 | cert | all | `openssl x509 -in "{{file}}" -text -noout` | file(path) | - | false | openssl | openssl cert certificate x509 text 证书 详情 查看 show |
| 2 | `openssl-cert-dates` | OpenSSL 查看证书有效期 | cert | all | `openssl x509 -in "{{file}}" -dates -noout` | file(path) | - | false | openssl | openssl cert certificate dates 证书 有效期 查看 show |
| 3 | `openssl-cert-fingerprint` | OpenSSL 查看证书指纹 | cert | all | `openssl x509 -in "{{file}}" -fingerprint -sha256 -noout` | file(path) | - | false | openssl | openssl cert certificate fingerprint sha256 指纹 查看 show |
| 4 | `openssl-s-client` | OpenSSL 建立 TLS 连接 | cert | all | `openssl s_client -connect {{host}}:{{port}} -servername {{host}}` | host(text), port(number, default:443, min:1, max:65535) | - | false | openssl | openssl s_client tls ssl 证书 连接 握手 handshake |
| 5 | `openssl-pkey-text` | OpenSSL 查看密钥详情 | cert | all | `openssl pkey -in "{{file}}" -text -noout` | file(path) | - | false | openssl | openssl pkey key private 公钥 私钥 详情 查看 show |
