# _service

> 分类：Service 服务管理
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `service-status-win` | 查看 Windows 服务状态 | service | win | `Get-Service -Name "{{name}}"` | name(text) | - | false | powershell | service 服务 windows win status 状态 查看 show |
| 2 | `service-list-running-win` | 列出运行中的 Windows 服务 | service | win | `Get-Service \| Where-Object {$_.Status -eq 'Running'} \| Sort-Object DisplayName` | - | - | false | powershell | service 服务 windows win list running 运行 列表 |
| 3 | `service-status-linux` | 查看 Linux 服务状态 | service | linux | `systemctl status {{name}} --no-pager` | name(text) | - | false | systemctl | service 服务 linux status 状态 查看 show |
| 4 | `service-list-running-linux` | 列出运行中的 Linux 服务 | service | linux | `systemctl list-units --type=service --state=running --no-pager` | - | - | false | systemctl | service 服务 linux list running 运行 列表 |
| 5 | `service-logs-linux` | 查看 Linux 服务日志 | service | linux | `journalctl -u {{name}} -n {{lines}} --no-pager` | name(text), lines(number, default:100, min:1, max:10000) | - | false | journalctl | service 服务 linux logs 日志 journalctl 查看 show |
| 6 | `service-list-all-linux` | 列出全部 Linux 服务 | service | linux | `systemctl list-units --type=service --all --no-pager` | - | - | false | systemctl | service 服务 linux list all 全部 列表 查看 show |
| 7 | `service-list-failed-linux` | 列出失败的 Linux 服务 | service | linux | `systemctl list-units --type=service --state=failed --no-pager` | - | - | false | systemctl | service 服务 linux list failed 失败 列表 查看 show |
| 8 | `service-enabled-linux` | 查看 Linux 服务开机启用状态 | service | linux | `systemctl is-enabled {{name}}` | name(text) | - | false | systemctl | service 服务 linux enabled 开机 启用 查看 show |
| 9 | `service-cat-linux` | 查看 Linux 服务定义 | service | linux | `systemctl cat {{name}}` | name(text) | - | false | systemctl | service 服务 linux cat definition 定义 查看 show |
| 10 | `service-list-mac` | 列出 macOS 服务 | service | mac | `launchctl list` | - | - | false | launchctl | service 服务 mac launchctl list 列表 查看 show |
| 11 | `service-status-mac` | 查看 macOS 服务状态 | service | mac | `launchctl list \| grep "{{name}}"` | name(text) | - | false | launchctl, grep | service 服务 mac launchctl status 状态 查看 show |
