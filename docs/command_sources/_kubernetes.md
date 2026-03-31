# _kubernetes

> 分类：Kubernetes
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `kubectl-current-context` | kubectl 当前上下文 | all | `kubectl config current-context` | - | - | false | kubectl | kubernetes kubectl context current |
| 2 | `kubectl-get-contexts` | kubectl 列出上下文 | all | `kubectl config get-contexts` | - | - | false | kubectl | kubernetes kubectl context list |
| 3 | `kubectl-get-namespaces` | kubectl 列出命名空间 | all | `kubectl get namespaces` | - | - | false | kubectl | kubernetes kubectl namespaces list |
| 4 | `kubectl-get-pods` | kubectl 查看 Pods | all | `kubectl get pods -n {{namespace}}` | namespace(text, default:default) | - | false | kubectl | kubernetes kubectl pods namespace |
| 5 | `kubectl-get-services` | kubectl 查看 Services | all | `kubectl get services -n {{namespace}}` | namespace(text, default:default) | - | false | kubectl | kubernetes kubectl services namespace |
| 6 | `kubectl-describe-pod` | kubectl 查看 Pod 详情 | all | `kubectl describe pod {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | - | false | kubectl | kubernetes kubectl describe pod namespace |
| 7 | `kubectl-logs` | kubectl 查看 Pod 日志 | all | `kubectl logs {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | - | false | kubectl | kubernetes kubectl logs pod namespace |
| 8 | `kubectl-logs-follow` | kubectl 持续跟随日志 | all | `kubectl logs -f {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | - | false | kubectl | kubernetes kubectl logs follow pod namespace |
| 9 | `kubectl-exec-sh` | kubectl 进入 Pod Shell | all | `kubectl exec -it {{pod}} -n {{namespace}} -- sh` | pod(text), namespace(text, default:default) | - | false | kubectl | kubernetes kubectl exec shell pod namespace |
| 10 | `kubectl-port-forward` | kubectl 端口转发 | all | `kubectl port-forward {{resource}} {{localPort}}:{{remotePort}} -n {{namespace}}` | resource(text, default:deployment/my-app), localPort(number, default:8080, min:1, max:65535), remotePort(number, default:80, min:1, max:65535), namespace(text, default:default) | - | false | kubectl | kubernetes kubectl port-forward resource namespace |
| 11 | `kubectl-rollout-restart` | kubectl 重启 Rollout | all | `kubectl rollout restart {{resource}} -n {{namespace}}` | resource(text, default:deployment/my-app), namespace(text, default:default) | ⚠️ | false | kubectl | kubernetes kubectl rollout restart resource namespace 高危 |
| 12 | `kubectl-rollout-status` | kubectl 查看 Rollout 状态 | all | `kubectl rollout status {{resource}} -n {{namespace}}` | resource(text, default:deployment/my-app), namespace(text, default:default) | - | false | kubectl | kubernetes kubectl rollout status resource namespace |
| 13 | `kubectl-apply-file` | kubectl 应用配置文件 | all | `kubectl apply -f "{{file}}"` | file(path) | ⚠️ | false | kubectl | kubernetes kubectl apply file 配置 高危 |
| 14 | `kubectl-delete-file` | kubectl 删除配置文件资源 | all | `kubectl delete -f "{{file}}"` | file(path) | ⚠️ | false | kubectl | kubernetes kubectl delete file 资源 高危 |
| 15 | `kubectl-delete-pod` | kubectl 删除 Pod | all | `kubectl delete pod {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | ⚠️ | false | kubectl | kubernetes kubectl delete pod namespace 高危 |
