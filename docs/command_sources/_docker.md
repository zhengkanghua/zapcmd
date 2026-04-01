# _docker

> 分类：Docker 容器管理
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `docker-ps` | 查看运行中容器 | docker | all | `docker ps` | - | - | false | docker, ps | docker 容器 进程 ps 查看 show container |
| 2 | `docker-ps-all` | 查看所有容器 | docker | all | `docker ps -a` | - | - | false | docker, ps | docker 容器 进程 ps 全部 all 查看 show container |
| 3 | `docker-images` | 查看本地镜像 | docker | all | `docker images` | - | - | false | docker | docker 容器 镜像 images 查看 show image |
| 4 | `docker-run` | 运行容器 | docker | all | `docker run -d --name {{name}} -p {{ports}} {{image}}` | image(text), name(text), ports(text) | - | false | docker | docker 容器 运行 run container |
| 5 | `docker-stop` | 停止容器 | docker | all | `docker stop {{container}}` | container(text) | - | false | docker | docker 容器 停止 stop container 容器管理 |
| 6 | `docker-start` | 启动已停止容器 | docker | all | `docker start {{container}}` | container(text) | - | false | docker | docker 容器 启动 start 停止 stop container 容器管理 |
| 7 | `docker-restart` | 重启容器 | docker | all | `docker restart {{container}}` | container(text) | - | false | docker | docker 容器 重启 restart container 容器管理 |
| 8 | `docker-rm` | 删除容器 | docker | all | `docker rm {{container}}` | container(text) | - | false | docker | docker 容器 删除 rm remove container |
| 9 | `docker-rmi` | 删除镜像 | docker | all | `docker rmi {{image}}` | image(text) | - | false | docker | docker 容器 删除镜像 rmi 删除 remove 镜像 image |
| 10 | `docker-logs` | 查看容器日志 | docker | all | `docker logs --tail {{lines}} {{container}}` | container(text), lines(number, default:100, min:1, max:10000) | - | false | docker | docker 容器 日志 logs 查看 show log container |
| 11 | `docker-logs-follow` | 实时查看容器日志 | docker | all | `docker logs -f {{container}}` | container(text) | - | false | docker | docker 容器 日志 logs 实时 follow 查看 show log container |
| 12 | `docker-exec` | 进入容器 Shell | docker | all | `docker exec -it {{container}} {{shell}}` | container(text), shell(select: /bin/sh, /bin/bash) | - | false | docker | docker 容器 执行 exec container |
| 13 | `docker-inspect` | 查看容器详情 | docker | all | `docker inspect {{container}}` | container(text) | - | false | docker | docker 容器 详情 inspect 查看 show container |
| 14 | `docker-stats` | 容器资源使用 | docker | all | `docker stats --no-stream` | - | - | false | docker | docker 容器 资源 stats container |
| 15 | `docker-pull` | 拉取镜像 | docker | all | `docker pull {{image}}` | image(text) | - | false | docker | docker 容器 拉取 pull 镜像 image |
| 16 | `docker-build` | 构建镜像 | docker | all | `docker build -t {{tag}} {{path}}` | tag(text), path(path, default:.) | - | false | docker | docker 容器 构建 build 镜像 image |
| 17 | `docker-compose-up` | 启动 Compose 服务 | docker | all | `docker compose up -d` | - | - | false | docker | docker 容器 compose 启动 up start |
| 18 | `docker-compose-down` | 停止 Compose 服务 | docker | all | `docker compose down` | - | - | false | docker | docker 容器 compose 停止 down stop |
| 19 | `docker-compose-logs` | Compose 日志 | docker | all | `docker compose logs -f {{service}}` | service(text) | - | false | docker | docker 容器 compose 日志 logs log |
| 20 | `docker-compose-ps` | Compose 服务状态 | docker | all | `docker compose ps` | - | - | false | docker | docker 容器 compose ps 状态 status 查看 show |
| 21 | `docker-compose-config` | Compose 配置预览 | docker | all | `docker compose config` | - | - | false | docker | docker 容器 compose config 配置 预览 查看 show |
| 22 | `docker-compose-pull` | Compose 拉取镜像 | docker | all | `docker compose pull` | - | - | false | docker | docker 容器 compose pull 拉取 镜像 image |
| 23 | `docker-system-df` | Docker 磁盘占用概览 | docker | all | `docker system df` | - | - | false | docker | docker 容器 system df 磁盘 disk 占用 usage 查看 show |
| 24 | `docker-prune` | 清理未使用资源 | docker | all | `docker system prune -f` | - | ⚠️ | false | docker | docker 容器 清理 prune |
| 25 | `docker-network-ls` | 查看网络列表 | docker | all | `docker network ls` | - | - | false | docker, ls | docker 容器 网络 network ls 查看 show |
| 26 | `docker-volume-ls` | 查看数据卷 | docker | all | `docker volume ls` | - | - | false | docker, ls | docker 容器 数据卷 volume ls 查看 show |
| 27 | `docker-cp` | 复制文件到容器 | docker | all | `docker cp {{src}} {{container}}:{{dest}}` | src(path), container(text), dest(text) | - | false | docker | docker 容器 复制 copy container 文件 file |
| 28 | `docker-export` | 导出容器 | docker | all | `docker export {{container}} > {{file}}` | container(text), file(text) | - | false | docker, export | docker 容器 导出 export container |
| 29 | `docker-info` | Docker 环境信息 | docker | all | `docker info` | - | - | false | docker | docker info environment observability 信息 查看 show |
| 30 | `docker-image-inspect` | 查看镜像详情 | docker | all | `docker image inspect {{image}}` | image(text) | - | false | docker | docker image inspect 镜像 详情 查看 show |
| 31 | `docker-volume-inspect` | 查看数据卷详情 | docker | all | `docker volume inspect {{volume}}` | volume(text) | - | false | docker | docker volume inspect 数据卷 详情 查看 show |
| 32 | `docker-network-inspect` | 查看网络详情 | docker | all | `docker network inspect {{network}}` | network(text) | - | false | docker | docker network inspect 网络 详情 查看 show |
| 33 | `docker-compose-images` | Compose 镜像列表 | docker | all | `docker compose images` | - | - | false | docker | docker compose images 镜像 列表 查看 show |
| 34 | `docker-compose-top` | Compose 进程列表 | docker | all | `docker compose top` | - | - | false | docker | docker compose top 进程 列表 查看 show |
| 35 | `docker-compose-exec-sh` | Compose 进入服务 Shell | docker | all | `docker compose exec {{service}} {{shell}}` | service(text), shell(select: /bin/sh, /bin/bash) | - | false | docker | docker compose exec shell 服务 进入 |
