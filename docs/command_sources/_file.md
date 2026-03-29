# _file

> 分类：文件操作
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `find-file` | 按名称查找文件 | mac/linux | `find {{path}} -name "{{pattern}}"` | path(path, default:.), pattern(text) | - | false | find | 文件 file 查找 find |
| 2 | `find-file-win` | 按名称查找文件 | win | `Get-ChildItem -Recurse -Filter "{{pattern}}" {{path}}` | path(path, default:.), pattern(text) | - | false | powershell, get-childitem | 文件 file 查找 find |
| 3 | `find-content` | 按内容搜索文件 | mac/linux | `grep -rn "{{pattern}}" {{path}}` | pattern(text), path(path, default:.) | - | false | grep | 文件 file 查找 find 内容 content |
| 4 | `find-content-win` | 按内容搜索文件 | win | `Select-String -Recurse -Pattern "{{pattern}}" -Path "{{path}}"` | pattern(text), path(path, default:.) | - | false | select-string | 文件 file 查找 find 内容 content |
| 5 | `list-files` | 列出目录内容 | mac/linux | `ls -la {{path}}` | path(path, default:.) | - | false | ls | 文件 file 列表 list files 目录 directory |
| 6 | `list-files-win` | 列出目录内容 | win | `Get-ChildItem -Force {{path}}` | path(path, default:.) | - | false | powershell, get-childitem | 文件 file 列表 list files 目录 directory |
| 7 | `tree` | 目录树结构 | mac/linux | `tree -L {{depth}} {{path}}` | path(path, default:.), depth(number, default:3, min:1, max:10) | - | false | tree | 文件 file 树 tree 目录 directory |
| 8 | `tree-win` | 目录树结构 | win | `tree /F {{path}}` | path(path, default:.) | - | false | tree | 文件 file 树 tree 目录 directory |
| 9 | `file-size` | 查看文件大小 | mac/linux | `ls -lh {{file}}` | file(path) | - | false | ls | 文件 file 大小 size 查看 show |
| 10 | `file-count` | 统计文件数量 | mac/linux | `find {{path}} -type f \| wc -l` | path(path, default:.) | - | false | find, wc | 文件 file count |
| 11 | `file-permissions` | 修改文件权限 | mac/linux | `chmod {{mode}} {{file}}` | mode(text), file(path) | - | false | chmod | 文件 file 权限 permissions |
| 12 | `file-owner` | 修改文件所有者 | mac/linux | `chown {{owner}} {{file}}` | owner(text), file(path) | - | false | chown | 文件 file 所有者 owner |
| 13 | `compress-tar` | 打包压缩 (tar.gz) | mac/linux | `tar -czf {{output}}.tar.gz {{input}}` | input(path), output(text) | - | false | tar | 文件 file 压缩 compress tar |
| 14 | `extract-tar` | 解压 (tar.gz) | mac/linux | `tar -xzf {{file}}` | file(path) | - | false | tar | 文件 file 解压 extract tar |
| 15 | `compress-zip` | ZIP 压缩 | mac/linux | `zip -r {{output}}.zip {{input}}` | input(path), output(text) | - | false | zip | 文件 file 压缩 compress zip |
| 16 | `extract-zip` | ZIP 解压 | mac/linux | `unzip {{file}} -d {{dest}}` | file(path), dest(path, default:.) | - | false | unzip | 文件 file 解压 extract zip |
| 17 | `compress-zip-win` | ZIP 压缩 | win | `Compress-Archive -Path "{{input}}" -DestinationPath "{{output}}.zip" -Force` | input(path), output(text) | - | false | powershell, compress-archive | 文件 file 压缩 compress zip |
| 18 | `extract-zip-win` | ZIP 解压 | win | `Expand-Archive -Path "{{file}}" -DestinationPath "{{dest}}" -Force` | file(path), dest(path, default:.) | - | false | powershell, expand-archive | 文件 file 解压 extract zip |
| 19 | `watch-file` | 监听文件变化 | mac/linux | `fswatch {{path}}` | path(path) | - | false | fswatch | 文件 file 监听 watch |
| 20 | `tail-log` | 实时查看日志 | mac/linux | `tail -f {{file}}` | file(path) | - | false | tail | 文件 file tail 日志 log 查看 show |
| 21 | `tail-log-win` | 实时查看日志 | win | `Get-Content -Path "{{file}}" -Tail {{lines}} -Wait` | file(path), lines(number, default:100, min:1, max:10000) | - | false | powershell, get-content | 文件 file tail 日志 log 查看 show |
| 22 | `head-file` | 查看文件前 N 行 | mac/linux | `head -n {{lines}} {{file}}` | file(path), lines(number, default:20, min:1, max:10000) | - | false | head | 文件 file head 查看 show |
| 23 | `head-file-win` | 查看文件前 N 行 | win | `Get-Content -Path "{{file}}" -TotalCount {{lines}}` | file(path), lines(number, default:20, min:1, max:10000) | - | false | powershell, get-content | 文件 file head 查看 show |
| 24 | `wc-lines` | 统计文件行数 | mac/linux | `wc -l {{file}}` | file(path) | - | false | wc | 文件 file 行数 wc 行 lines |
| 25 | `wc-lines-win` | 统计文件行数 | win | `(Get-Content -Path "{{file}}" \| Measure-Object -Line).Lines` | file(path) | - | false | powershell, get-content, measure-object | 文件 file 行数 wc 行 lines |
