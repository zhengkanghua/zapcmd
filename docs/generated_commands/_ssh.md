# _ssh

> 此文件为自动生成，禁止手动修改。
> Source: _ssh.yaml

## SSH 与远程连接

## Commands

### ssh-connect

- 名称：SSH 连接
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`ssh {{user}}@{{host}}`
- Tags：ssh, 远程, 连接, connect

### ssh-connect-port

- 名称：SSH 连接 (指定端口)
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`ssh -p {{port}} {{user}}@{{host}}`
- Tags：ssh, 远程, 连接, connect, 端口, port

### ssh-connect-key

- 名称：SSH 连接 (密钥)
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`ssh -i {{key}} {{user}}@{{host}}`
- Tags：ssh, 远程, 连接, connect, 密钥, key

### scp-upload

- 名称：SCP 上传文件
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`scp {{local}} {{user}}@{{host}}:{{remote}}`
- Tags：ssh, 远程, scp, upload, 上传, 文件, file

### scp-download

- 名称：SCP 下载文件
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`scp {{user}}@{{host}}:{{remote}} {{local}}`
- Tags：ssh, 远程, scp, 下载, download, 文件, file

### ssh-keygen

- 名称：生成 SSH 密钥
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`ssh-keygen -t ed25519 -C "{{email}}"`
- Tags：ssh, 远程, 生成密钥, keygen, 密钥, key

### ssh-copy-id

- 名称：复制公钥到服务器
- 平台：mac/linux
- 分类：ssh
- 执行：exec
- 预览：`ssh-copy-id {{user}}@{{host}}`
- Tags：ssh, 远程, copy, id

### ssh-tunnel

- 名称：SSH 隧道 (端口转发)
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`ssh -L {{local_port}}:{{target_host}}:{{target_port}} {{user}}@{{host}}`
- Tags：ssh, 远程, 隧道, tunnel, 端口, port

### ssh-config-list

- 名称：查看 SSH 配置
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`cat ~/.ssh/config`
- Tags：ssh, 远程, 配置, config, 列表, list, 查看, show

### ssh-agent-add

- 名称：添加密钥到 Agent
- 平台：all
- 分类：ssh
- 执行：exec
- 预览：`ssh-add {{key}}`
- Tags：ssh, 远程, agent, 添加, add, 密钥, key
