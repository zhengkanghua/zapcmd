# _service

> 此文件为自动生成，禁止手动修改。
> Source: _service.yaml

## Service 服务管理

## Commands

### service-status-win

- 名称：查看 Windows 服务状态
- 平台：win
- 分类：service
- 执行：script
- 预览：`powershell: Get-Service -Name "{{name}}"`
- Tags：service, 服务, windows, win, status, 状态, 查看, show

### service-list-running-win

- 名称：列出运行中的 Windows 服务
- 平台：win
- 分类：service
- 执行：script
- 预览：`powershell: Get-Service | Where-Object {$_.Status -eq 'Running'} | Sort-Object DisplayName`
- Tags：service, 服务, windows, win, list, running, 运行, 列表

### service-status-linux

- 名称：查看 Linux 服务状态
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`systemctl status {{name}} --no-pager`
- Tags：service, 服务, linux, status, 状态, 查看, show

### service-list-running-linux

- 名称：列出运行中的 Linux 服务
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`systemctl list-units --type=service --state=running --no-pager`
- Tags：service, 服务, linux, list, running, 运行, 列表

### service-logs-linux

- 名称：查看 Linux 服务日志
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`journalctl -u {{name}} -n {{lines}} --no-pager`
- Tags：service, 服务, linux, logs, 日志, journalctl, 查看, show

### service-list-all-linux

- 名称：列出全部 Linux 服务
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`systemctl list-units --type=service --all --no-pager`
- Tags：service, 服务, linux, list, all, 全部, 列表, 查看, show

### service-list-failed-linux

- 名称：列出失败的 Linux 服务
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`systemctl list-units --type=service --state=failed --no-pager`
- Tags：service, 服务, linux, list, failed, 失败, 列表, 查看, show

### service-enabled-linux

- 名称：查看 Linux 服务开机启用状态
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`systemctl is-enabled {{name}}`
- Tags：service, 服务, linux, enabled, 开机, 启用, 查看, show

### service-cat-linux

- 名称：查看 Linux 服务定义
- 平台：linux
- 分类：service
- 执行：exec
- 预览：`systemctl cat {{name}}`
- Tags：service, 服务, linux, cat, definition, 定义, 查看, show

### service-list-mac

- 名称：列出 macOS 服务
- 平台：mac
- 分类：service
- 执行：exec
- 预览：`launchctl list`
- Tags：service, 服务, mac, launchctl, list, 列表, 查看, show

### service-status-mac

- 名称：查看 macOS 服务状态
- 平台：mac
- 分类：service
- 执行：script
- 预览：`bash: launchctl list | grep "{{name}}"`
- Tags：service, 服务, mac, launchctl, status, 状态, 查看, show
