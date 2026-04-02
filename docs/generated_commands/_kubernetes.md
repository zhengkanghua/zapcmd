# _kubernetes

> 此文件为自动生成，禁止手动修改。
> Source: _kubernetes.yaml

## Kubernetes

## Commands

### kubectl-current-context

- 名称：kubectl 当前上下文
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl config current-context`
- Tags：kubernetes, kubectl, context, current

### kubectl-get-contexts

- 名称：kubectl 列出上下文
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl config get-contexts`
- Tags：kubernetes, kubectl, context, list

### kubectl-get-namespaces

- 名称：kubectl 列出命名空间
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get namespaces`
- Tags：kubernetes, kubectl, namespaces, list

### kubectl-get-pods

- 名称：kubectl 查看 Pods
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get pods -n {{namespace}}`
- Tags：kubernetes, kubectl, pods, namespace

### kubectl-get-services

- 名称：kubectl 查看 Services
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get services -n {{namespace}}`
- Tags：kubernetes, kubectl, services, namespace

### kubectl-get-deployments

- 名称：kubectl 查看 Deployments
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get deployments -n {{namespace}}`
- Tags：kubernetes, kubectl, deployments, namespace, 查看, show

### kubectl-get-nodes

- 名称：kubectl 查看 Nodes
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get nodes`
- Tags：kubernetes, kubectl, nodes, 查看, show

### kubectl-get-ingress

- 名称：kubectl 查看 Ingress
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get ingress -n {{namespace}}`
- Tags：kubernetes, kubectl, ingress, namespace, 查看, show

### kubectl-describe-deployment

- 名称：kubectl 查看 Deployment 详情
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl describe deployment {{deployment}} -n {{namespace}}`
- Tags：kubernetes, kubectl, describe, deployment, namespace, 查看, show

### kubectl-describe-pod

- 名称：kubectl 查看 Pod 详情
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl describe pod {{pod}} -n {{namespace}}`
- Tags：kubernetes, kubectl, describe, pod, namespace

### kubectl-get-configmaps

- 名称：kubectl 查看 ConfigMaps
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get configmaps -n {{namespace}}`
- Tags：kubernetes, kubectl, configmaps, namespace, 查看, show

### kubectl-logs

- 名称：kubectl 查看 Pod 日志
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl logs {{pod}} -n {{namespace}}`
- Tags：kubernetes, kubectl, logs, pod, namespace

### kubectl-logs-follow

- 名称：kubectl 持续跟随日志
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl logs -f {{pod}} -n {{namespace}}`
- Tags：kubernetes, kubectl, logs, follow, pod, namespace

### kubectl-get-events

- 名称：kubectl 查看 Events
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get events -n {{namespace}}`
- Tags：kubernetes, kubectl, events, namespace, 查看, show

### kubectl-exec-sh

- 名称：kubectl 进入 Pod Shell
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl exec -it {{pod}} -n {{namespace}} -- sh`
- Tags：kubernetes, kubectl, exec, shell, pod, namespace

### kubectl-port-forward

- 名称：kubectl 端口转发
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl port-forward {{resource}} {{localPort}}:{{remotePort}} -n {{namespace}}`
- Tags：kubernetes, kubectl, port-forward, resource, namespace

### kubectl-rollout-restart

- 名称：kubectl 重启 Rollout
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl rollout restart {{resource}} -n {{namespace}}`
- Tags：kubernetes, kubectl, rollout, restart, resource, namespace, 高危

### kubectl-rollout-status

- 名称：kubectl 查看 Rollout 状态
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl rollout status {{resource}} -n {{namespace}}`
- Tags：kubernetes, kubectl, rollout, status, resource, namespace

### kubectl-apply-file

- 名称：kubectl 应用配置文件
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl apply -f "{{file}}"`
- Tags：kubernetes, kubectl, apply, file, 配置, 高危

### kubectl-delete-file

- 名称：kubectl 删除配置文件资源
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl delete -f "{{file}}"`
- Tags：kubernetes, kubectl, delete, file, 资源, 高危

### kubectl-delete-pod

- 名称：kubectl 删除 Pod
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl delete pod {{pod}} -n {{namespace}}`
- Tags：kubernetes, kubectl, delete, pod, namespace, 高危

### kubectl-get-all

- 名称：kubectl 查看全部资源
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get all -n {{namespace}}`
- Tags：kubernetes, kubectl, get, all, namespace, 查看, show

### kubectl-top-pods

- 名称：kubectl 查看 Pods 资源占用
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl top pods -n {{namespace}}`
- Tags：kubernetes, kubectl, top, pods, namespace, 资源, 使用, 查看, show

### kubectl-top-nodes

- 名称：kubectl 查看 Nodes 资源占用
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl top nodes`
- Tags：kubernetes, kubectl, top, nodes, 资源, 使用, 查看, show

### kubectl-describe-service

- 名称：kubectl 查看 Service 详情
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl describe service {{service}} -n {{namespace}}`
- Tags：kubernetes, kubectl, describe, service, namespace, 查看, show

### kubectl-get-pvc

- 名称：kubectl 查看 PVC
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get pvc -n {{namespace}}`
- Tags：kubernetes, kubectl, pvc, namespace, 查看, show

### kubectl-get-statefulsets

- 名称：kubectl 查看 StatefulSets
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get statefulsets -n {{namespace}}`
- Tags：kubernetes, kubectl, statefulsets, namespace, 查看, show

### kubectl-get-jobs

- 名称：kubectl 查看 Jobs
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get jobs -n {{namespace}}`
- Tags：kubernetes, kubectl, jobs, namespace, 查看, show

### kubectl-get-cronjobs

- 名称：kubectl 查看 CronJobs
- 平台：all
- 分类：kubernetes
- 执行：exec
- 预览：`kubectl get cronjobs -n {{namespace}}`
- Tags：kubernetes, kubectl, cronjobs, namespace, 查看, show
