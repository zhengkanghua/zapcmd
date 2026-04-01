# _ssh

> 分类：SSH 与远程连接
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ssh-connect` | SSH 连接 | ssh | all | `ssh {{user}}@{{host}}` | user(text), host(text) | - | false | ssh | ssh 远程 连接 connect |
| 2 | `ssh-connect-port` | SSH 连接 (指定端口) | ssh | all | `ssh -p {{port}} {{user}}@{{host}}` | user(text), host(text), port(number, min:1, max:65535) | - | false | ssh | ssh 远程 连接 connect 端口 port |
| 3 | `ssh-connect-key` | SSH 连接 (密钥) | ssh | all | `ssh -i {{key}} {{user}}@{{host}}` | key(path), user(text), host(text) | - | false | ssh | ssh 远程 连接 connect 密钥 key |
| 4 | `scp-upload` | SCP 上传文件 | ssh | all | `scp {{local}} {{user}}@{{host}}:{{remote}}` | local(path), user(text), host(text), remote(text) | - | false | scp | ssh 远程 scp upload 上传 文件 file |
| 5 | `scp-download` | SCP 下载文件 | ssh | all | `scp {{user}}@{{host}}:{{remote}} {{local}}` | user(text), host(text), remote(text), local(path) | - | false | scp | ssh 远程 scp 下载 download 文件 file |
| 6 | `ssh-keygen` | 生成 SSH 密钥 | ssh | all | `ssh-keygen -t ed25519 -C "{{email}}"` | email(text) | - | false | ssh-keygen | ssh 远程 生成密钥 keygen 密钥 key |
| 7 | `ssh-copy-id` | 复制公钥到服务器 | ssh | mac/linux | `ssh-copy-id {{user}}@{{host}}` | user(text), host(text) | - | false | ssh-copy-id | ssh 远程 copy id |
| 8 | `ssh-tunnel` | SSH 隧道 (端口转发) | ssh | all | `ssh -L {{local_port}}:{{target_host}}:{{target_port}} {{user}}@{{host}}` | local_port(number, min:1, max:65535), target_host(text), target_port(number, min:1, max:65535), user(text), host(text) | - | false | ssh | ssh 远程 隧道 tunnel 端口 port |
| 9 | `ssh-config-list` | 查看 SSH 配置 | ssh | all | `cat ~/.ssh/config` | - | - | false | ssh, cat | ssh 远程 配置 config 列表 list 查看 show |
| 10 | `ssh-agent-add` | 添加密钥到 Agent | ssh | all | `ssh-add {{key}}` | key(path, default:~/.ssh/id_ed25519) | - | false | ssh-add | ssh 远程 agent 添加 add 密钥 key |
