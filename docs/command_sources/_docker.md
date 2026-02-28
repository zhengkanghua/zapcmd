# _docker

> 分类：Docker 容器管理
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `docker-ps` | 查看运行中容器 | all | `docker ps` | - | - | false | docker, ps | docker 容器 进程 ps 查看 show container |
| 2 | `docker-ps-all` | 查看所有容器 | all | `docker ps -a` | - | - | false | docker, ps | docker 容器 进程 ps 全部 all 查看 show container |
| 3 | `docker-images` | 查看本地镜像 | all | `docker images` | - | - | false | docker | docker 容器 镜像 images 查看 show image |
| 4 | `docker-run` | 运行容器 | all | `docker run -d --name {{name}} -p {{ports}} {{image}}` | image(text), name(text), ports(text) | - | false | docker | docker 容器 运行 run container |
| 5 | `docker-stop` | 停止容器 | all | `docker stop {{container}}` | container(text) | - | false | docker | docker 容器 停止 stop container 容器管理 |
| 6 | `docker-start` | 启动已停止容器 | all | `docker start {{container}}` | container(text) | - | false | docker | docker 容器 启动 start 停止 stop container 容器管理 |
| 7 | `docker-restart` | 重启容器 | all | `docker restart {{container}}` | container(text) | - | false | docker | docker 容器 重启 restart container 容器管理 |
| 8 | `docker-rm` | 删除容器 | all | `docker rm {{container}}` | container(text) | - | false | docker | docker 容器 删除 rm remove container |
| 9 | `docker-rmi` | 删除镜像 | all | `docker rmi {{image}}` | image(text) | - | false | docker | docker 容器 删除镜像 rmi 删除 remove 镜像 image |
| 10 | `docker-logs` | 查看容器日志 | all | `docker logs --tail {{lines}} {{container}}` | container(text), lines(number, default:100) | - | false | docker | docker 容器 日志 logs 查看 show log container |
| 11 | `docker-logs-follow` | 实时查看容器日志 | all | `docker logs -f {{container}}` | container(text) | - | false | docker | docker 容器 日志 logs 实时 follow 查看 show log container |
| 12 | `docker-exec` | 进入容器 Shell | all | `docker exec -it {{container}} {{shell}}` | container(text), shell(select: /bin/sh, /bin/bash) | - | false | docker | docker 容器 执行 exec container |
| 13 | `docker-inspect` | 查看容器详情 | all | `docker inspect {{container}}` | container(text) | - | false | docker | docker 容器 详情 inspect 查看 show container |
| 14 | `docker-stats` | 容器资源使用 | all | `docker stats --no-stream` | - | - | false | docker | docker 容器 资源 stats container |
| 15 | `docker-pull` | 拉取镜像 | all | `docker pull {{image}}` | image(text) | - | false | docker | docker 容器 拉取 pull 镜像 image |
| 16 | `docker-build` | 构建镜像 | all | `docker build -t {{tag}} {{path}}` | tag(text), path(path, default:.) | - | false | docker | docker 容器 构建 build 镜像 image |
| 17 | `docker-compose-up` | 启动 Compose 服务 | all | `docker compose up -d` | - | - | false | docker | docker 容器 compose 启动 up start |
| 18 | `docker-compose-down` | 停止 Compose 服务 | all | `docker compose down` | - | - | false | docker | docker 容器 compose 停止 down stop |
| 19 | `docker-compose-logs` | Compose 日志 | all | `docker compose logs -f {{service}}` | service(text) | - | false | docker | docker 容器 compose 日志 logs log |
| 20 | `docker-prune` | 清理未使用资源 | all | `docker system prune -f` | - | ⚠️ | false | docker | docker 容器 清理 prune |
| 21 | `docker-network-ls` | 查看网络列表 | all | `docker network ls` | - | - | false | docker, ls | docker 容器 网络 network ls 查看 show |
| 22 | `docker-volume-ls` | 查看数据卷 | all | `docker volume ls` | - | - | false | docker, ls | docker 容器 数据卷 volume ls 查看 show |
| 23 | `docker-cp` | 复制文件到容器 | all | `docker cp {{src}} {{container}}:{{dest}}` | src(path), container(text), dest(text) | - | false | docker | docker 容器 复制 copy container 文件 file |
| 24 | `docker-export` | 导出容器 | all | `docker export {{container}} > {{file}}` | container(text), file(text) | - | false | docker, export | docker 容器 导出 export container |
