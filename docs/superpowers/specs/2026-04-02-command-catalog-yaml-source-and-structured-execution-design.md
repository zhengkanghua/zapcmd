# 命令目录 YAML 真源与结构化执行模型设计

> 日期：2026-04-02
> 状态：设计确认后实施
> 范围：builtin 命令真源迁移、命令执行结构重构、CLI 严格化、生成链路重建

---

## 1. 背景

当前 ZapCmd 的 builtin 命令维护链路为：

1. 人工维护 `docs/command_sources/_*.md`
2. 通过生成器产出 `assets/runtime_templates/commands/builtin/_*.json`
3. runtime 读取生成后的 JSON

这套方案在“单行模板字符串”阶段是可工作的，但随着参数校验、preflight、shell 依赖、平台拆分不断增强，已经出现三个结构性问题：

### 1.1 `shell` prerequisite 只完成了探测，没有进入执行路由

当前 `shell:powershell` 已进入 preflight，但执行阶段仍主要按用户默认终端派发。结果是：

1. 命令可以校验通过。
2. 实际执行时仍可能落到 `wt/cmd` 的 CMD 路径。
3. PowerShell 专属语法因此在运行时失败。

这说明“环境依赖”与“执行 runner”当前是脱节的。

### 1.2 生成器 CLI 过于宽松

当前 `scripts/commands/generate-builtin-commands.mjs` 会吞掉未知 CLI flag，对错误参数缺少 fail-fast 约束。  
这会导致维护脚本拼错参数时，生成过程表面成功、实际退回默认值，排查成本高。

### 1.3 参数系统仍以“整句模板字符串 + 黑名单拦截”为核心

当前命令渲染本质是：

1. 维护者写整句 `template`
2. 运行时把 `{{arg}}` 直接替换成用户输入
3. 再用黑名单拦截明显危险字符

这会带来两类长期问题：

1. 对 regex / JSON / 多行文本这类合法输入误伤。
2. 把 quoting / escaping 责任继续压给命令作者和不同 shell 的隐式行为。

当命令模型继续增长时，表格化 Markdown DSL 也开始失去表达力，难以自然承载：

1. `program + args[]`
2. 多行脚本
3. `stdin` 输入
4. runner 选择
5. 更完整的参数元数据

---

## 2. 目标

本轮设计目标：

1. 把 builtin 命令的唯一真源从 Markdown 表格迁移到 YAML。
2. 把命令执行模型从“单句模板字符串”重构为“结构化执行描述”。
3. 让 `shell` 依赖与执行 runner 真正闭环。
4. 把 `md` 从“人维护源”降级为“自动生成的只读说明文档”。
5. 让生成器 CLI 改为严格参数校验，避免静默吞错。

本轮不做：

1. 不保留长期双轨兼容。
2. 不允许 `yaml` / `md` 双真源并存。
3. 不继续扩展旧表格 DSL。

---

## 3. 总体决策

### 3.1 真源切换为 YAML

新链路改为：

1. 人工维护：YAML
2. 程序消费：JSON
3. 人类阅读：Markdown

即：

`YAML -> JSON + Markdown`

其中：

1. YAML 是唯一真源。
2. JSON 是 runtime 产物。
3. Markdown 是只读说明产物。

### 3.2 命令执行模型改为结构化二选一

命令执行描述改为二选一：

1. `exec`
2. `script`

语义如下：

1. `exec`
   - 表示“启动某个程序，并传递参数数组”
   - 适用于绝大多数普通命令
2. `script`
   - 表示“交给某个明确 runner 执行一段脚本”
   - 只用于真正依赖 shell 语义的命令

### 3.3 默认不用 shell，只有显式声明时才进入 shell

迁移分类规则固定为：

1. 能 100% 拆成 `program + args[]` 的，归 `exec`
2. 只要依赖 pipe / redirect / shell builtin / PowerShell cmdlet / 条件表达式 / 变量语义，归 `script`
3. 不允许“看起来像 exec，内部却偷偷依赖 shell 语义”的灰区命令

### 3.4 一次切换，不保留长期兼容层

本轮不做半新半旧共存。实施完成后：

1. 删除旧 `template` 主路径
2. 删除旧 Markdown 表格解析器
3. 删除旧 builtin source 的“md 为真源”口径

---

## 4. 新数据模型

### 4.1 通用字段

以下字段继续保留：

1. `id`
2. `name`
3. `description`
4. `tags`
5. `category`
6. `platform`
7. `adminRequired`
8. `dangerous`
9. `args`
10. `prerequisites`

### 4.2 `exec` 命令

```yaml
exec:
  program: python3
  args:
    - -m
    - http.server
    - "{{port}}"
  stdinArgKey: body
```

语义：

1. `program` 是可执行程序名或路径。
2. `args` 是参数数组，不再把整句命令交给 shell 拆词。
3. `stdinArgKey` 可选，用于把某个参数值写入标准输入，而不是继续内联到参数数组中。

### 4.3 `script` 命令

```yaml
script:
  runner: powershell
  command: |
    [DateTimeOffset]::Now.ToUnixTimeSeconds()
```

语义：

1. `runner` 是执行脚本的壳或解释器。
2. `command` 是交给该 runner 的完整脚本文本。
3. 只有显式声明 `script` 的命令才允许依赖 shell 语法。

### 4.4 参数模型

参数定义继续保留现有核心能力：

1. `key`
2. `label`
3. `type`
4. `required`
5. `default`
6. `placeholder`
7. `validation`

参数 token 仍可写成 `{{key}}`，但只出现在：

1. `exec.args[]`
2. `script.command`
3. 可选的 `stdinArgKey` 指向参数值

---

## 5. YAML 真源与产物目录

### 5.1 推荐目录

建议新增真源目录：

1. `commands/catalog/_*.yaml`

产物目录保持：

1. `assets/runtime_templates/commands/builtin/_*.json`
2. `assets/runtime_templates/commands/builtin/index.json`

文档产物建议为：

1. `docs/generated_commands/_*.md`
2. 或保留原目录名 `docs/command_sources/_*.md`，但文件头需明确 generated

### 5.2 `md` 的新定位

Markdown 不再承担配置职责，只用于：

1. 浏览当前 builtin 命令清单
2. 展示模块说明
3. 展示命令条目、参数、平台、依赖、风险级别

所有生成文档必须带明显声明：

`此文件为自动生成，禁止手动修改。`

---

## 6. YAML authoring 形式

不再使用“表格一行一条命令”的 DSL。  
每个模块文件使用结构化 YAML：

```yaml
meta:
  name: 开发工具
  moduleSlug: dev

commands:
  - id: http-server
    name: 快速启动 HTTP 服务
    category: dev
    platform: all
    exec:
      program: python3
      args:
        - -m
        - http.server
        - "{{port}}"
    args:
      - key: port
        label: 端口
        type: number
        required: true
        default: "8000"
        validation:
          min: 1
          max: 65535
    prerequisites:
      - id: python3
        type: binary
        required: true
        check: binary:python3
    tags:
      - 开发
      - dev
      - http
      - server
    adminRequired: false

  - id: timestamp-now-win
    name: 当前 Unix 时间戳
    category: dev
    platform: win
    script:
      runner: powershell
      command: |
        [DateTimeOffset]::Now.ToUnixTimeSeconds()
    prerequisites:
      - id: powershell
        type: shell
        required: true
        check: shell:powershell
    tags:
      - 开发
      - dev
      - 时间戳
    adminRequired: false
```

这样做的原因：

1. `args[]`、`prerequisites[]`、多行脚本都能自然表达。
2. 后续新增 `installHint`、`fallbackCommandId`、`stdinArgKey` 等字段不再需要继续发明表格语法。
3. 维护者能一眼区分 `exec` 与 `script` 两种命令。

---

## 7. 执行链设计

### 7.1 runtime loader

runtime loader 读取 JSON 后映射为新的命令模板类型：

1. `exec` 命令映射为结构化参数数组模型
2. `script` 命令映射为 runner + script 文本模型

旧 `template` 主路径彻底删除。

### 7.2 预览

预览层不再假设所有命令都能无损拼成一整句 shell 文本。

建议：

1. `exec`
   - 预览展示为程序与参数数组渲染后的可读文本
   - 明确这是“展示串”，不是 shell source
2. `script`
   - 预览展示 runner 与脚本摘要
   - 必要时可提供展开查看完整脚本

### 7.3 实际执行

#### `exec`

执行层应直接按：

1. `program`
2. `args[]`
3. `stdin`

进行调用，不再通过 shell 再次拆词。

#### `script`

执行层按 `runner` 显式路由：

1. `powershell` / `pwsh`
2. `cmd`
3. `bash`
4. `sh`

交给对应 runner 执行脚本文本。

### 7.4 `shell` prerequisite 闭环

`shell:powershell` 不再只表示“环境里有 powershell.exe”，还应和 `script.runner=powershell` 对齐。

预期闭环如下：

1. schema 允许 `script.runner=powershell`
2. prerequisite 可声明 `shell:powershell`
3. preflight 检查 PowerShell 是否可用
4. 执行阶段真实按 PowerShell 路由

这样命令的“依赖检查”和“实际执行”才是同一语义。

---

## 8. CLI 严格化设计

生成器 CLI 改为严格模式：

1. 未知 flag 直接报错并退出非 0
2. 必需值缺失直接报错
3. 数字类 flag 必须做 `NaN` 校验
4. 提供 `--help`
5. 可补 `--check` / `--dry-run`，但不属于本轮硬要求

原则：

1. CLI 是工具控制面，不应该静默吞错
2. 数据兼容性问题应由 schema / loader 解决，不应放到 CLI 宽容处理

---

## 9. 迁移策略

### 9.1 一次切换顺序

建议实施顺序：

1. 定义新 schema
2. 定义新 TypeScript / Rust 运行时类型
3. 编写 YAML 生成器：
   - `yaml -> json`
   - `yaml -> md`
4. 编写迁移脚本，把现有 builtin 源批量转成 YAML
5. 改 runtime loader / preview / executor / preflight 对齐新模型
6. 删除旧实现与旧文档口径

### 9.2 builtin 分类规则

迁移时对每条命令做三选一判断：

1. 可完全拆成 `program + args[]`
   - 归 `exec`
2. 依赖 shell 语义
   - 归 `script`
3. 适合把大文本通过 stdin 输送
   - 归 `exec + stdinArgKey`

### 9.3 文档迁移

迁移完成后：

1. README 改口径为“YAML 为真源”
2. `docs/command_sources/README.md` 重写为“生成文档目录说明”或迁走
3. 新增 YAML 维护文档

---

## 10. 验证与门禁

### 10.1 结构验证

需要补：

1. YAML schema / parser 测试
2. `yaml -> json` 生成器测试
3. `yaml -> md` 文档生成测试
4. JSON schema validator 同步检查

### 10.2 产物验证

至少增加以下快照或契约验证：

1. builtin 命令总数
2. 各模块物理文件数
3. 平台拆分后的物理命令数
4. category / runtime category 稳定性
5. 生成 Markdown 的模块与命令说明快照

### 10.3 行为验证

需要挑选代表性命令做回归：

1. PowerShell only 命令
2. 普通 argv-safe 命令
3. 带 number/path/select 参数的命令
4. 使用 `stdinArgKey` 的命令
5. 带 pipe / redirect 的脚本命令
6. 队列执行场景

---

## 11. 风险与控制

### 11.1 主要风险

风险 1：误把 shell 命令拆成 `exec`

1. 命令表面看起来像普通参数数组
2. 实际仍偷偷依赖 pipe / builtin / 特定 runner
3. 迁移后运行行为变化

风险 2：文档、生成器、runtime 三层字段不同步

1. schema 改了
2. loader 没跟上
3. 执行器还按旧字段跑
4. 会导致整批命令不可用

### 11.2 控制措施

1. 迁移脚本必须输出“哪些命令归 `exec`、哪些归 `script`”的分类报告
2. 高风险命令人工复核，不只依赖脚本自动猜测
3. 先补测试，再删除旧实现

---

## 12. 验收标准

1. builtin 命令真源已切换到 YAML，仓库内不再手改 builtin Markdown 作为配置源。
2. runtime JSON 由 YAML 生成，Markdown 文档同样由 YAML 生成。
3. 命令模型不再以 `template` 为主，而是显式区分 `exec` 与 `script`。
4. `shell:powershell` 这类 prerequisite 与实际 runner 路由闭环。
5. 生成器 CLI 对未知参数和非法值 fail-fast。
6. 旧 Markdown 表格 DSL 与旧 `template` 主链被删除。
7. builtin 数量、平台拆分、分类与关键行为回归通过。

---

## 13. 推荐后续步骤

1. 基于本设计文档编写详细 implementation plan。
2. 先做 schema 与类型设计，再落迁移脚本。
3. 在批量迁移 builtin 前，先选 1 个模块做试迁移验证 authoring 与产物格式。
