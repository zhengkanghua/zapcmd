# _cert

> 此文件为自动生成，禁止手动修改。
> Source: _cert.yaml

## 证书与 OpenSSL

## Commands

### openssl-x509-text

- 名称：OpenSSL 查看证书全文
- 平台：all
- 分类：cert
- 执行：exec
- 预览：`openssl x509 -in "{{file}}" -text -noout`
- Tags：openssl, cert, certificate, x509, text, 证书, 详情, 查看, show

### openssl-cert-dates

- 名称：OpenSSL 查看证书有效期
- 平台：all
- 分类：cert
- 执行：exec
- 预览：`openssl x509 -in "{{file}}" -dates -noout`
- Tags：openssl, cert, certificate, dates, 证书, 有效期, 查看, show

### openssl-cert-fingerprint

- 名称：OpenSSL 查看证书指纹
- 平台：all
- 分类：cert
- 执行：exec
- 预览：`openssl x509 -in "{{file}}" -fingerprint -sha256 -noout`
- Tags：openssl, cert, certificate, fingerprint, sha256, 指纹, 查看, show

### openssl-s-client

- 名称：OpenSSL 建立 TLS 连接
- 平台：all
- 分类：cert
- 执行：exec
- 预览：`openssl s_client -connect {{host}}:{{port}} -servername {{host}}`
- Tags：openssl, s_client, tls, ssl, 证书, 连接, 握手, handshake

### openssl-pkey-text

- 名称：OpenSSL 查看密钥详情
- 平台：all
- 分类：cert
- 执行：exec
- 预览：`openssl pkey -in "{{file}}" -text -noout`
- Tags：openssl, pkey, key, private, 公钥, 私钥, 详情, 查看, show
