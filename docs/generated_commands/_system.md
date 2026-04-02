# _system

> 此文件为自动生成，禁止手动修改。
> Source: _system.yaml

## 系统管理

## Commands

### ps-find

- 名称：按名称查找进程
- 平台：mac/linux
- 分类：system
- 执行：script
- 预览：`bash: ps aux | grep {{name}}`
- Tags：系统, system, 进程, ps, 查找, find, process

### ps-find-win

- 名称：按名称查找进程
- 平台：win
- 分类：system
- 执行：script
- 预览：`cmd: tasklist | findstr /i {{name}}`
- Tags：系统, system, 进程, ps, 查找, find, process

### kill-pid

- 名称：按 PID 杀进程
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`kill -9 {{pid}}`
- Tags：系统, system, kill, 终止, 结束, pid, 进程, process

### kill-pid-win

- 名称：按 PID 杀进程
- 平台：win
- 分类：system
- 执行：exec
- 预览：`taskkill /F /PID {{pid}}`
- Tags：系统, system, kill, 终止, 结束, pid, 进程, process

### kill-name

- 名称：按名称杀进程
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`pkill -f {{name}}`
- Tags：系统, system, kill, 终止, 结束, 名称, name, 进程, process

### kill-name-win

- 名称：按名称杀进程
- 平台：win
- 分类：system
- 执行：exec
- 预览：`taskkill /F /IM {{name}}`
- Tags：系统, system, kill, 终止, 结束, 名称, name, 进程, process

### disk-usage

- 名称：查看磁盘空间
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`df -h`
- Tags：系统, system, 磁盘, disk, 使用率, usage, 查看, show

### disk-usage-win

- 名称：查看磁盘空间
- 平台：win
- 分类：system
- 执行：script
- 预览：`powershell: Get-PSDrive -PSProvider FileSystem`
- Tags：系统, system, 磁盘, disk, 使用率, usage, 查看, show

### dir-size

- 名称：查看目录大小
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`du -sh {{path}}`
- Tags：系统, system, 目录, directory, 大小, size, 查看, show

### dir-size-win

- 名称：查看目录大小
- 平台：win
- 分类：system
- 执行：script
- 预览：`powershell: (Get-ChildItem -Recurse {{path}} | Measure-Object -Property Length -Sum).Sum / 1MB`
- Tags：系统, system, 目录, directory, 大小, size, 查看, show

### memory-usage

- 名称：查看内存使用
- 平台：mac
- 分类：system
- 执行：script
- 预览：`bash: top -l 1 | head -n 10`
- Tags：系统, system, 内存, memory, 使用率, usage, 查看, show

### memory-usage-linux

- 名称：查看内存使用
- 平台：linux
- 分类：system
- 执行：exec
- 预览：`free -h`
- Tags：系统, system, 内存, memory, 使用率, usage, 查看, show

### memory-usage-win

- 名称：查看内存使用
- 平台：win
- 分类：system
- 执行：script
- 预览：`powershell: Get-Process | Sort-Object WorkingSet -Descending | Select-Object -First 10 Name, @{N='Mem(MB)';E={[math]::round($_.WorkingSet/1MB,1)}}`
- Tags：系统, system, 内存, memory, 使用率, usage, 查看, show

### system-info

- 名称：查看系统信息
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`uname -a`
- Tags：系统, system, info, 查看, show

### system-info-win

- 名称：查看系统信息
- 平台：win
- 分类：system
- 执行：exec
- 预览：`systeminfo`
- Tags：系统, system, info, 查看, show

### env-var-set

- 名称：设置环境变量
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`export {{key}}={{value}}`
- Tags：系统, system, 环境变量, env, 变量, var, 设置, set

### env-var-set-win

- 名称：设置环境变量
- 平台：win
- 分类：system
- 执行：script
- 预览：`powershell: $env:{{key}} = "{{value}}"`
- Tags：系统, system, 环境变量, env, 变量, var, 设置, set

### env-var-get

- 名称：查看环境变量
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`echo ${{key}}`
- Tags：系统, system, 环境变量, env, 变量, var, 获取, get, 查看, show

### env-var-get-win

- 名称：查看环境变量
- 平台：win
- 分类：system
- 执行：script
- 预览：`powershell: echo $env:{{key}}`
- Tags：系统, system, 环境变量, env, 变量, var, 获取, get, 查看, show

### uptime

- 名称：系统运行时间
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`uptime`
- Tags：系统, system, 运行时间, uptime

### cpu-top

- 名称：CPU 占用排行
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`top -o cpu -n 10 -l 1`
- Tags：系统, system, cpu, top, 占用, 冲突

### cpu-top-win

- 名称：CPU 占用排行
- 平台：win
- 分类：system
- 执行：script
- 预览：`powershell: Get-Process | Sort-Object CPU -Descending | Select-Object -First 10`
- Tags：系统, system, cpu, top, 占用, 冲突

### cron-list

- 名称：查看定时任务
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`crontab -l`
- Tags：系统, system, 定时任务, cron, 列表, list, 查看, show

### hosts-edit

- 名称：编辑 hosts 文件
- 平台：mac/linux
- 分类：system
- 执行：exec
- 预览：`sudo nano /etc/hosts`
- Tags：系统, system, hosts, 编辑, edit, 文件, file

### hosts-edit-win

- 名称：编辑 hosts 文件
- 平台：win
- 分类：system
- 执行：exec
- 预览：`notepad C:\\Windows\\System32\\drivers\\etc\\hosts`
- Tags：系统, system, hosts, 编辑, edit, 文件, file
