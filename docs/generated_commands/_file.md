# _file

> 此文件为自动生成，禁止手动修改。
> Source: _file.yaml

## 文件操作

## Commands

### find-file

- 名称：按名称查找文件
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`find {{path}} -name {{pattern}}`
- Tags：文件, file, 查找, find

### find-file-win

- 名称：按名称查找文件
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Get-ChildItem -Recurse -Filter "{{pattern}}" {{path}}`
- Tags：文件, file, 查找, find

### find-content

- 名称：按内容搜索文件
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`grep -rn {{pattern}} {{path}}`
- Tags：文件, file, 查找, find, 内容, content

### find-content-win

- 名称：按内容搜索文件
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Select-String -Recurse -Pattern "{{pattern}}" -Path "{{path}}"`
- Tags：文件, file, 查找, find, 内容, content

### list-files

- 名称：列出目录内容
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`ls -la {{path}}`
- Tags：文件, file, 列表, list, files, 目录, directory

### list-files-win

- 名称：列出目录内容
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Get-ChildItem -Force {{path}}`
- Tags：文件, file, 列表, list, files, 目录, directory

### tree

- 名称：目录树结构
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`tree -L {{depth}} {{path}}`
- Tags：文件, file, 树, tree, 目录, directory

### tree-win

- 名称：目录树结构
- 平台：win
- 分类：file
- 执行：exec
- 预览：`tree /F {{path}}`
- Tags：文件, file, 树, tree, 目录, directory

### file-size

- 名称：查看文件大小
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`ls -lh {{file}}`
- Tags：文件, file, 大小, size, 查看, show

### file-count

- 名称：统计文件数量
- 平台：mac/linux
- 分类：file
- 执行：script
- 预览：`bash: find {{path}} -type f | wc -l`
- Tags：文件, file, count

### file-permissions

- 名称：修改文件权限
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`chmod {{mode}} {{file}}`
- Tags：文件, file, 权限, permissions

### file-owner

- 名称：修改文件所有者
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`chown {{owner}} {{file}}`
- Tags：文件, file, 所有者, owner

### compress-tar

- 名称：打包压缩 (tar.gz)
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`tar -czf {{output}}.tar.gz {{input}}`
- Tags：文件, file, 压缩, compress, tar

### extract-tar

- 名称：解压 (tar.gz)
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`tar -xzf {{file}}`
- Tags：文件, file, 解压, extract, tar

### compress-zip

- 名称：ZIP 压缩
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`zip -r {{output}}.zip {{input}}`
- Tags：文件, file, 压缩, compress, zip

### extract-zip

- 名称：ZIP 解压
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`unzip {{file}} -d {{dest}}`
- Tags：文件, file, 解压, extract, zip

### compress-zip-win

- 名称：ZIP 压缩
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Compress-Archive -Path "{{input}}" -DestinationPath "{{output}}.zip" -Force`
- Tags：文件, file, 压缩, compress, zip

### extract-zip-win

- 名称：ZIP 解压
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Expand-Archive -Path "{{file}}" -DestinationPath "{{dest}}" -Force`
- Tags：文件, file, 解压, extract, zip

### watch-file

- 名称：监听文件变化
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`fswatch {{path}}`
- Tags：文件, file, 监听, watch

### tail-log

- 名称：实时查看日志
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`tail -f {{file}}`
- Tags：文件, file, tail, 日志, log, 查看, show

### tail-log-win

- 名称：实时查看日志
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Get-Content -Path "{{file}}" -Tail {{lines}} -Wait`
- Tags：文件, file, tail, 日志, log, 查看, show

### head-file

- 名称：查看文件前 N 行
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`head -n {{lines}} {{file}}`
- Tags：文件, file, head, 查看, show

### head-file-win

- 名称：查看文件前 N 行
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: Get-Content -Path "{{file}}" -TotalCount {{lines}}`
- Tags：文件, file, head, 查看, show

### wc-lines

- 名称：统计文件行数
- 平台：mac/linux
- 分类：file
- 执行：exec
- 预览：`wc -l {{file}}`
- Tags：文件, file, 行数, wc, 行, lines

### wc-lines-win

- 名称：统计文件行数
- 平台：win
- 分类：file
- 执行：script
- 预览：`powershell: (Get-Content -Path "{{file}}" | Measure-Object -Line).Lines`
- Tags：文件, file, 行数, wc, 行, lines
