# _docker

> 此文件为自动生成，禁止手动修改。
> Source: _docker.yaml

## Docker 容器管理

## Commands

### docker-ps

- 名称：查看运行中容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker ps`
- Tags：docker, 容器, 进程, ps, 查看, show, container

### docker-ps-all

- 名称：查看所有容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker ps -a`
- Tags：docker, 容器, 进程, ps, 全部, all, 查看, show, container

### docker-images

- 名称：查看本地镜像
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker images`
- Tags：docker, 容器, 镜像, images, 查看, show, image

### docker-run

- 名称：运行容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker run -d --name {{name}} -p {{ports}} {{image}}`
- Tags：docker, 容器, 运行, run, container

### docker-stop

- 名称：停止容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker stop {{container}}`
- Tags：docker, 容器, 停止, stop, container, 容器管理

### docker-start

- 名称：启动已停止容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker start {{container}}`
- Tags：docker, 容器, 启动, start, 停止, stop, container, 容器管理

### docker-restart

- 名称：重启容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker restart {{container}}`
- Tags：docker, 容器, 重启, restart, container, 容器管理

### docker-rm

- 名称：删除容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker rm {{container}}`
- Tags：docker, 容器, 删除, rm, remove, container

### docker-rmi

- 名称：删除镜像
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker rmi {{image}}`
- Tags：docker, 容器, 删除镜像, rmi, 删除, remove, 镜像, image

### docker-logs

- 名称：查看容器日志
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker logs --tail {{lines}} {{container}}`
- Tags：docker, 容器, 日志, logs, 查看, show, log, container

### docker-logs-follow

- 名称：实时查看容器日志
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker logs -f {{container}}`
- Tags：docker, 容器, 日志, logs, 实时, follow, 查看, show, log, container

### docker-exec

- 名称：进入容器 Shell
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker exec -it {{container}} {{shell}}`
- Tags：docker, 容器, 执行, exec, container

### docker-inspect

- 名称：查看容器详情
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker inspect {{container}}`
- Tags：docker, 容器, 详情, inspect, 查看, show, container

### docker-stats

- 名称：容器资源使用
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker stats --no-stream`
- Tags：docker, 容器, 资源, stats, container

### docker-pull

- 名称：拉取镜像
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker pull {{image}}`
- Tags：docker, 容器, 拉取, pull, 镜像, image

### docker-build

- 名称：构建镜像
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker build -t {{tag}} {{path}}`
- Tags：docker, 容器, 构建, build, 镜像, image

### docker-compose-up

- 名称：启动 Compose 服务
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose up -d`
- Tags：docker, 容器, compose, 启动, up, start

### docker-compose-down

- 名称：停止 Compose 服务
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose down`
- Tags：docker, 容器, compose, 停止, down, stop

### docker-compose-logs

- 名称：Compose 日志
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose logs -f {{service}}`
- Tags：docker, 容器, compose, 日志, logs, log

### docker-compose-ps

- 名称：Compose 服务状态
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose ps`
- Tags：docker, 容器, compose, ps, 状态, status, 查看, show

### docker-compose-config

- 名称：Compose 配置预览
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose config`
- Tags：docker, 容器, compose, config, 配置, 预览, 查看, show

### docker-compose-pull

- 名称：Compose 拉取镜像
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose pull`
- Tags：docker, 容器, compose, pull, 拉取, 镜像, image

### docker-system-df

- 名称：Docker 磁盘占用概览
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker system df`
- Tags：docker, 容器, system, df, 磁盘, disk, 占用, usage, 查看, show

### docker-prune

- 名称：清理未使用资源
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker system prune -f`
- Tags：docker, 容器, 清理, prune

### docker-network-ls

- 名称：查看网络列表
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker network ls`
- Tags：docker, 容器, 网络, network, ls, 查看, show

### docker-volume-ls

- 名称：查看数据卷
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker volume ls`
- Tags：docker, 容器, 数据卷, volume, ls, 查看, show

### docker-cp

- 名称：复制文件到容器
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker cp {{src}} {{container}}:{{dest}}`
- Tags：docker, 容器, 复制, copy, container, 文件, file

### docker-export

- 名称：导出容器
- 平台：all
- 分类：docker
- 执行：script
- 预览：`bash: docker export {{container}} > {{file}}`
- Tags：docker, 容器, 导出, export, container

### docker-info

- 名称：Docker 环境信息
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker info`
- Tags：docker, info, environment, observability, 信息, 查看, show

### docker-image-inspect

- 名称：查看镜像详情
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker image inspect {{image}}`
- Tags：docker, image, inspect, 镜像, 详情, 查看, show

### docker-volume-inspect

- 名称：查看数据卷详情
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker volume inspect {{volume}}`
- Tags：docker, volume, inspect, 数据卷, 详情, 查看, show

### docker-network-inspect

- 名称：查看网络详情
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker network inspect {{network}}`
- Tags：docker, network, inspect, 网络, 详情, 查看, show

### docker-compose-images

- 名称：Compose 镜像列表
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose images`
- Tags：docker, compose, images, 镜像, 列表, 查看, show

### docker-compose-top

- 名称：Compose 进程列表
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose top`
- Tags：docker, compose, top, 进程, 列表, 查看, show

### docker-compose-exec-sh

- 名称：Compose 进入服务 Shell
- 平台：all
- 分类：docker
- 执行：exec
- 预览：`docker compose exec {{service}} {{shell}}`
- Tags：docker, compose, exec, shell, 服务, 进入
