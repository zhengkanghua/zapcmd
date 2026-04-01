# _kubernetes

> 分类：Kubernetes
> 说明：此文件为 JSON 生成源（人维护）。

| # | ID | 名称 | 运行时分类 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `kubectl-current-context` | kubectl 当前上下文 | kubernetes | all | `kubectl config current-context` | - | - | false | binary:kubectl | kubernetes kubectl context current |
| 2 | `kubectl-get-contexts` | kubectl 列出上下文 | kubernetes | all | `kubectl config get-contexts` | - | - | false | binary:kubectl | kubernetes kubectl context list |
| 3 | `kubectl-get-namespaces` | kubectl 列出命名空间 | kubernetes | all | `kubectl get namespaces` | - | - | false | binary:kubectl | kubernetes kubectl namespaces list |
| 4 | `kubectl-get-pods` | kubectl 查看 Pods | kubernetes | all | `kubectl get pods -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl pods namespace |
| 5 | `kubectl-get-services` | kubectl 查看 Services | kubernetes | all | `kubectl get services -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl services namespace |
| 6 | `kubectl-get-deployments` | kubectl 查看 Deployments | kubernetes | all | `kubectl get deployments -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl deployments namespace 查看 show |
| 7 | `kubectl-get-nodes` | kubectl 查看 Nodes | kubernetes | all | `kubectl get nodes` | - | - | false | binary:kubectl | kubernetes kubectl nodes 查看 show |
| 8 | `kubectl-get-ingress` | kubectl 查看 Ingress | kubernetes | all | `kubectl get ingress -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl ingress namespace 查看 show |
| 9 | `kubectl-describe-deployment` | kubectl 查看 Deployment 详情 | kubernetes | all | `kubectl describe deployment {{deployment}} -n {{namespace}}` | deployment(text), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl describe deployment namespace 查看 show |
| 10 | `kubectl-describe-pod` | kubectl 查看 Pod 详情 | kubernetes | all | `kubectl describe pod {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl describe pod namespace |
| 11 | `kubectl-get-configmaps` | kubectl 查看 ConfigMaps | kubernetes | all | `kubectl get configmaps -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl configmaps namespace 查看 show |
| 12 | `kubectl-logs` | kubectl 查看 Pod 日志 | kubernetes | all | `kubectl logs {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl logs pod namespace |
| 13 | `kubectl-logs-follow` | kubectl 持续跟随日志 | kubernetes | all | `kubectl logs -f {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl logs follow pod namespace |
| 14 | `kubectl-get-events` | kubectl 查看 Events | kubernetes | all | `kubectl get events -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl events namespace 查看 show |
| 15 | `kubectl-exec-sh` | kubectl 进入 Pod Shell | kubernetes | all | `kubectl exec -it {{pod}} -n {{namespace}} -- sh` | pod(text), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl exec shell pod namespace |
| 16 | `kubectl-port-forward` | kubectl 端口转发 | kubernetes | all | `kubectl port-forward {{resource}} {{localPort}}:{{remotePort}} -n {{namespace}}` | resource(text, default:deployment/my-app), localPort(number, default:8080, min:1, max:65535), remotePort(number, default:80, min:1, max:65535), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl port-forward resource namespace |
| 17 | `kubectl-rollout-restart` | kubectl 重启 Rollout | kubernetes | all | `kubectl rollout restart {{resource}} -n {{namespace}}` | resource(text, default:deployment/my-app), namespace(text, default:default) | ⚠️ | false | binary:kubectl | kubernetes kubectl rollout restart resource namespace 高危 |
| 18 | `kubectl-rollout-status` | kubectl 查看 Rollout 状态 | kubernetes | all | `kubectl rollout status {{resource}} -n {{namespace}}` | resource(text, default:deployment/my-app), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl rollout status resource namespace |
| 19 | `kubectl-apply-file` | kubectl 应用配置文件 | kubernetes | all | `kubectl apply -f "{{file}}"` | file(path) | ⚠️ | false | binary:kubectl | kubernetes kubectl apply file 配置 高危 |
| 20 | `kubectl-delete-file` | kubectl 删除配置文件资源 | kubernetes | all | `kubectl delete -f "{{file}}"` | file(path) | ⚠️ | false | binary:kubectl | kubernetes kubectl delete file 资源 高危 |
| 21 | `kubectl-delete-pod` | kubectl 删除 Pod | kubernetes | all | `kubectl delete pod {{pod}} -n {{namespace}}` | pod(text), namespace(text, default:default) | ⚠️ | false | binary:kubectl | kubernetes kubectl delete pod namespace 高危 |
| 22 | `kubectl-get-all` | kubectl 查看全部资源 | kubernetes | all | `kubectl get all -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl get all namespace 查看 show |
| 23 | `kubectl-top-pods` | kubectl 查看 Pods 资源占用 | kubernetes | all | `kubectl top pods -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl top pods namespace 资源 使用 查看 show |
| 24 | `kubectl-top-nodes` | kubectl 查看 Nodes 资源占用 | kubernetes | all | `kubectl top nodes` | - | - | false | binary:kubectl | kubernetes kubectl top nodes 资源 使用 查看 show |
| 25 | `kubectl-describe-service` | kubectl 查看 Service 详情 | kubernetes | all | `kubectl describe service {{service}} -n {{namespace}}` | service(text), namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl describe service namespace 查看 show |
| 26 | `kubectl-get-pvc` | kubectl 查看 PVC | kubernetes | all | `kubectl get pvc -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl pvc namespace 查看 show |
| 27 | `kubectl-get-statefulsets` | kubectl 查看 StatefulSets | kubernetes | all | `kubectl get statefulsets -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl statefulsets namespace 查看 show |
| 28 | `kubectl-get-jobs` | kubectl 查看 Jobs | kubernetes | all | `kubectl get jobs -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl jobs namespace 查看 show |
| 29 | `kubectl-get-cronjobs` | kubectl 查看 CronJobs | kubernetes | all | `kubectl get cronjobs -n {{namespace}}` | namespace(text, default:default) | - | false | binary:kubectl | kubernetes kubectl cronjobs namespace 查看 show |
