# _system

> 分类：系统管理
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `ps-find` | 按名称查找进程 | system | mac/linux | `ps aux \| grep {{name}}` | name(text) | - | false | - | 系统 system 进程 ps 查找 find process |
| 2 | `ps-find-win` | 按名称查找进程 | system | win | `tasklist \| findstr /i {{name}}` | name(text) | - | false | - | 系统 system 进程 ps 查找 find process |
| 3 | `kill-pid` | 按 PID 杀进程 | system | mac/linux | `kill -9 {{pid}}` | pid(number, min:1, max:2147483647) | ⚠️ | false | - | 系统 system kill 终止 结束 pid 进程 process |
| 4 | `kill-pid-win` | 按 PID 杀进程 | system | win | `taskkill /F /PID {{pid}}` | pid(number, min:1, max:2147483647) | ⚠️ | false | - | 系统 system kill 终止 结束 pid 进程 process |
| 5 | `kill-name` | 按名称杀进程 | system | mac/linux | `pkill -f {{name}}` | name(text) | ⚠️ | false | - | 系统 system kill 终止 结束 名称 name 进程 process |
| 6 | `kill-name-win` | 按名称杀进程 | system | win | `taskkill /F /IM {{name}}` | name(text) | ⚠️ | false | - | 系统 system kill 终止 结束 名称 name 进程 process |
| 7 | `disk-usage` | 查看磁盘空间 | system | mac/linux | `df -h` | - | - | false | - | 系统 system 磁盘 disk 使用率 usage 查看 show |
| 8 | `disk-usage-win` | 查看磁盘空间 | system | win | `Get-PSDrive -PSProvider FileSystem` | - | - | false | shell:powershell | 系统 system 磁盘 disk 使用率 usage 查看 show |
| 9 | `dir-size` | 查看目录大小 | system | mac/linux | `du -sh {{path}}` | path(path) | - | false | - | 系统 system 目录 directory 大小 size 查看 show |
| 10 | `dir-size-win` | 查看目录大小 | system | win | `(Get-ChildItem -Recurse {{path}} \| Measure-Object -Property Length -Sum).Sum / 1MB` | path(path) | - | false | shell:powershell | 系统 system 目录 directory 大小 size 查看 show |
| 11 | `memory-usage` | 查看内存使用 | system | mac | `top -l 1 \| head -n 10` | - | - | false | - | 系统 system 内存 memory 使用率 usage 查看 show |
| 12 | `memory-usage-linux` | 查看内存使用 | system | linux | `free -h` | - | - | false | - | 系统 system 内存 memory 使用率 usage 查看 show |
| 13 | `memory-usage-win` | 查看内存使用 | system | win | `Get-Process \| Sort-Object WorkingSet -Descending \| Select-Object -First 10 Name, @{N='Mem(MB)';E={[math]::round($_.WorkingSet/1MB,1)}}` | - | - | false | shell:powershell | 系统 system 内存 memory 使用率 usage 查看 show |
| 14 | `system-info` | 查看系统信息 | system | mac/linux | `uname -a` | - | - | false | - | 系统 system info 查看 show |
| 15 | `system-info-win` | 查看系统信息 | system | win | `systeminfo` | - | - | false | - | 系统 system info 查看 show |
| 16 | `env-var-set` | 设置环境变量 | system | mac/linux | `export {{key}}={{value}}` | key(text), value(text) | - | false | - | 系统 system 环境变量 env 变量 var 设置 set |
| 17 | `env-var-set-win` | 设置环境变量 | system | win | `$env:{{key}} = "{{value}}"` | key(text), value(text) | - | false | shell:powershell | 系统 system 环境变量 env 变量 var 设置 set |
| 18 | `env-var-get` | 查看环境变量 | system | mac/linux | `echo ${{key}}` | key(text) | - | false | - | 系统 system 环境变量 env 变量 var 获取 get 查看 show |
| 19 | `env-var-get-win` | 查看环境变量 | system | win | `echo $env:{{key}}` | key(text) | - | false | shell:powershell | 系统 system 环境变量 env 变量 var 获取 get 查看 show |
| 20 | `uptime` | 系统运行时间 | system | mac/linux | `uptime` | - | - | false | - | 系统 system 运行时间 uptime |
| 21 | `cpu-top` | CPU 占用排行 | system | mac/linux | `top -o cpu -n 10 -l 1` | - | - | false | - | 系统 system cpu top 占用 冲突 |
| 22 | `cpu-top-win` | CPU 占用排行 | system | win | `Get-Process \| Sort-Object CPU -Descending \| Select-Object -First 10` | - | - | false | shell:powershell | 系统 system cpu top 占用 冲突 |
| 23 | `cron-list` | 查看定时任务 | system | mac/linux | `crontab -l` | - | - | false | binary:crontab | 系统 system 定时任务 cron 列表 list 查看 show |
| 24 | `hosts-edit` | 编辑 hosts 文件 | system | mac/linux | `sudo nano /etc/hosts` | - | - | true | - | 系统 system hosts 编辑 edit 文件 file |
| 25 | `hosts-edit-win` | 编辑 hosts 文件 | system | win | `notepad C:\\Windows\\System32\\drivers\\etc\\hosts` | - | - | true | - | 系统 system hosts 编辑 edit 文件 file |
