# typed prerequisite source 语法设计

> 日期：2026-04-01
> 状态：已确认，进入实施
> 范围：builtin command source 的 prerequisite 显式类型声明、全量迁移、移除生成器猜测逻辑

---

## 1. 背景

当前 builtin command source 的 `prerequisites` 列存在两个结构问题：

1. source 里只写名字，例如 `git,docker,powershell`
2. 生成器再按名字猜类型：
   - `powershell/cmd/bash/zsh/shell` => `shell`
   - 其他全部 => `binary`

这种设计虽然能工作，但有明显问题：

1. prerequisite 类型不是作者显式声明，而是生成器推断。
2. `env/network/permission` 这类类型在 source 层几乎无法自然表达。
3. 容易把 shell builtin / cmdlet 当成外部依赖写进去，再被生成器误转成 `binary`。
4. 规则藏在生成器里，不够直观。

---

## 2. 目标

把 prerequisite 的 authoring 方式改成“source 显式声明”，不再依赖生成器猜测。

本轮要求：

1. md 里显式写 prerequisite 类型。
2. 支持多个 prerequisite，按 source 中的顺序写入 json。
3. 不兼容老写法，发现未带类型前缀的 token 直接报错。
4. 全量迁移现有 builtin command source。

---

## 3. 新语法

`prerequisites` 列改为逗号分隔的 typed token：

```text
binary:git
binary:docker
shell:powershell
env:GITHUB_TOKEN
network:corp-vpn
permission:admin
```

多个条件示例：

```text
binary:gh, binary:git
shell:powershell, binary:systeminfo
binary:docker, env:DOCKER_HOST
```

无 prerequisite 继续使用：

```text
-
```

---

## 4. 语义规则

### 4.1 顺序保留

source 中 prerequisite 的顺序必须保留到 json 中。  
执行前 probe 仍统一走同一套 preflight 总线，并按数组顺序返回结果。

### 4.2 不再兼容老写法

以下写法全部视为非法：

```text
git
docker
powershell
git, docker
```

原因：

1. 项目尚未上线，不需要保留历史兼容负担。
2. 继续兼容老写法只会让“显式声明”和“隐式猜测”长期并存。

### 4.3 类型合法集合

source 中允许的 prerequisite 类型与 schema 保持一致：

1. `binary`
2. `shell`
3. `env`
4. `network`
5. `permission`

未知类型直接报错。

### 4.4 target 不允许为空

以下写法非法：

```text
binary:
env:
shell:
```

---

## 5. 生成器职责

生成器只负责：

1. 解析 typed token
2. 校验语法
3. 原样输出为 json 中的：
   - `id`
   - `type`
   - `required: true`
   - `check`

生成器不再负责：

1. 根据名字猜 prerequisite 类型
2. 对未标类型的 token 做兜底修正

---

## 6. authoring 原则

`prerequisites` 仍然只表达“运行前需要满足的外部条件”，不表达命令内部的语法构件。

正确示例：

1. `binary:git`
2. `binary:docker`
3. `shell:powershell`
4. `env:GITHUB_TOKEN`

错误示例：

1. `binary:echo`
2. `binary:get-content`
3. `binary:sort-object`
4. `binary:select-string`

---

## 7. 实施范围

### 7.1 生成器

修改：

1. `scripts/generate_builtin_commands.ps1`
2. `scripts/__tests__/generate-builtin-commands.test.ts`

### 7.2 source

迁移：

1. `docs/command_sources/_*.md` 全部 prerequisite 写法
2. `docs/command_sources/README.md`

### 7.3 生成产物

刷新：

1. `assets/runtime_templates/commands/builtin/*.json`
2. `assets/runtime_templates/commands/builtin/index.json`
3. `docs/builtin_commands.generated.md`

---

## 8. 验收

1. 所有 builtin source 不再出现未带类型前缀的 prerequisite token。
2. 生成器遇到老写法会直接失败并报错。
3. 多个 prerequisite 的顺序在 json 中保持不变。
4. 运行时 preflight 不需要改调用方式，仍统一按 json 中的 prerequisite 列表执行。
