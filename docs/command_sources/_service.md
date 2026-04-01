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
