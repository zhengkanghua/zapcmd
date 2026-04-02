# prerequisite preflight 用户提示收口设计

> 日期：2026-04-02
> 状态：设计确认后实施
> 范围：`prerequisites` 用户提示语义、YAML/JSON 契约轻扩展、preflight 反馈收口、旧字段兼容

---

## 1. 背景

当前 builtin / user command 的 preflight 链路已经成型：

1. YAML / JSON 声明 `prerequisites`
2. runtime mapper 把 prerequisite 映射到前端
3. Tauri probe 返回 `ok / code / message / required`
4. 前端将 `probe.message`、`installHint`、`fallbackCommandId` 直接拼接成反馈文本

这条链路在“功能可用”层面没有问题，但在“用户提示质量”上已经暴露出四个结构问题：

### 1.1 用户提示仍偏技术日志

当前 probe 缺失场景主要返回：

1. `required binary not found: docker`
2. `required shell not found: pwsh`
3. `required environment variable not found: GITHUB_TOKEN`

这些字符串适合调试，不适合作为最终用户提示主文案。

### 1.2 `installHint` 的字段语义过窄

`installHint` 对 `binary` 尚可成立，但对 `env` 与 `shell` 场景并不自然。

例如：

1. 环境变量缺失，本质上不是“安装”
2. shell 缺失，用户动作也可能是“切换运行环境”而不是安装

继续把所有补救动作都塞进 `installHint`，语义会越来越别扭。

### 1.3 `fallbackCommandId` 直接展示为裸 id，不够优雅

当前前端只会把 `fallbackCommandId` 作为字符串拼出来，例如：

1. `可改用命令：install-docker`

这对作者友好，但对用户不够自然，应该优先展示 fallback 命令的真实标题。

### 1.4 系统级 preflight 异常与依赖缺失混在一起

当 probe transport 失败或返回畸形结果时，当前链路会把同一条异常复制到每个 prerequisite 上。

这会造成：

1. 用户看到重复错误
2. 看起来像多个依赖同时缺失
3. 实际上却是“预检系统本身出了问题”

---

## 2. 目标

本轮设计目标：

1. 统一 `binary / shell / env` 三类 prerequisite 的用户提示口径。
2. 把“检测事实”和“用户提示语义”拆开，避免继续依赖原始字符串拼接。
3. 让用户在最短路径内看懂四件事：
   - 缺了什么
   - 为什么被阻断
   - 下一步先做什么
   - 有没有替代路径
4. 保持现有 preflight 执行模型不变，避免为提示升级重做探测链路。
5. 对已有 `installHint` 保持渐进兼容，不一次性打断现有 YAML / JSON。

本轮不做：

1. 不新增新的 prerequisite 类型。
2. 不引入新的复杂 UI 容器或多按钮操作面板。
3. 不把 probe 结果改造成完整的重量级诊断对象。
4. 不把所有调试细节都前置为主文案。

---

## 3. 总体决策

### 3.1 probe 只返回“稳定事实”，不再承担最终用户文案

Tauri probe 的核心职责保留为：

1. 判断 prerequisite 是否满足
2. 返回稳定 code
3. 保留最小必要 message 作为调试或兜底信息

前端生成用户提示时，优先依据：

1. `result.code`
2. prerequisite 自身 metadata

而不是优先消费 `result.message`。

### 3.2 prerequisite 契约新增“用户展示语义”字段

在现有 prerequisite 结构上轻量新增：

1. `displayName`
2. `resolutionHint`

并保留：

1. `fallbackCommandId`

同时将旧字段 `installHint` 视为兼容别名，不再作为长期主字段。

### 3.3 前端统一按“三段式提示”渲染

所有 prerequisite 失败反馈统一收口为：

1. 结论
2. 核心原因
3. 下一步

这意味着当前“技术 message + 括号建议”的串接方式将被替换。

### 3.4 系统级 preflight 异常单独处理

以下错误不应继续按 prerequisite 列表逐项拼接：

1. `probe-error`
2. `probe-invalid-response`

它们属于“预检系统异常”，应直接以系统级错误提示输出。

---

## 4. 新契约设计

### 4.1 prerequisite 新增字段

在 schema / runtime / YAML authoring 中新增：

1. `displayName?: localizedTextOrString`
2. `resolutionHint?: localizedTextOrString`

字段语义：

1. `displayName`
   - 给用户看的依赖名称
   - 用于替代 `id` 或裸 `check` 作为主提示对象
2. `resolutionHint`
   - 给用户看的主补救动作
   - 不限定为安装，可以是设置环境变量、切换环境、启用某项能力等

### 4.2 旧字段兼容策略

现有字段：

1. `installHint`
2. `fallbackCommandId`

兼容规则：

1. `resolutionHint` 存在时，前端优先使用 `resolutionHint`
2. `resolutionHint` 缺失时，回退到 `installHint`
3. `fallbackCommandId` 继续保留，但展示时优先解析成命令标题

这样可以在不打断现有作者体验的前提下，逐步把 authoring 口径迁往更通用的 `resolutionHint`。

### 4.3 示例

#### binary 示例

```yaml
prerequisites:
  - id: docker
    type: binary
    required: true
    check: binary:docker
    displayName:
      zh-CN: Docker Desktop
      en-US: Docker Desktop
    resolutionHint:
      zh-CN: 安装 Docker Desktop 后重启 ZapCmd
      en-US: Install Docker Desktop and restart ZapCmd
    fallbackCommandId: install-docker
```

#### env 示例

```yaml
prerequisites:
  - id: github-token
    type: env
    required: true
    check: env:GITHUB_TOKEN
    displayName:
      zh-CN: GitHub Token
      en-US: GitHub Token
    resolutionHint:
      zh-CN: 在系统环境变量中设置 GITHUB_TOKEN 后，重新打开 ZapCmd
      en-US: Set GITHUB_TOKEN in your system environment, then reopen ZapCmd
```

#### shell 示例

```yaml
prerequisites:
  - id: pwsh
    type: shell
    required: true
    check: shell:pwsh
    displayName:
      zh-CN: PowerShell 7
      en-US: PowerShell 7
    resolutionHint:
      zh-CN: 安装 PowerShell 7，或切换到已包含 pwsh 的环境后重试
      en-US: Install PowerShell 7 or switch to an environment that already provides pwsh
```

---

## 5. 数据流设计

### 5.1 YAML / JSON -> runtime

新数据流：

1. schema 允许 `displayName`、`resolutionHint`
2. runtime mapper 将其映射到 `CommandPrerequisite`
3. 前端 preflight helper 依据 metadata + code 生成最终提示

### 5.2 runtime -> probe

probe 仍只消费：

1. `id`
2. `type`
3. `required`
4. `check`

新增的展示字段不需要传入 Rust probe，因为它们不影响探测逻辑。

### 5.3 probe -> UI

前端处理规则：

1. `missing-binary / missing-shell / missing-env`
   - 视为“依赖缺失”
   - 使用 `displayName`、`resolutionHint`、`fallbackCommandId`
2. `probe-error / probe-invalid-response`
   - 视为“系统级预检异常”
   - 直接输出系统错误提示，不重复展开到每个 prerequisite

---

## 6. 提示渲染规则

### 6.1 三段式结构

最终反馈统一为三段式：

1. 结论
2. 核心原因
3. 下一步

#### required prerequisite 失败

目标文案形态：

1. `无法执行该命令。`
2. `未检测到 Docker Desktop。`
3. `处理建议：安装 Docker Desktop 后重启 ZapCmd。`
4. `可改用“安装 Docker”命令。`

#### optional prerequisite 失败

目标文案形态：

1. `命令已发送到终端，但有一项可选依赖未满足。`
2. `当前未检测到 jq。`
3. `处理建议：安装 jq 后可获得格式化输出能力。`

### 6.2 原因文案模板

按 `code` 分类映射：

1. `missing-binary`
   - `未检测到 {displayNameOrTarget}。`
2. `missing-shell`
   - `当前环境缺少 {displayNameOrTarget}。`
3. `missing-env`
   - `缺少 {displayNameOrTarget}（环境变量 {normalizedTarget}）。`

其中：

1. `displayNameOrTarget` 优先使用 `displayName`
2. `normalizedTarget` 从 `check` 解析，例如 `env:GITHUB_TOKEN -> GITHUB_TOKEN`
3. 若 `displayName` 缺失，则回退到 `normalizedTarget` 或 `id`

### 6.3 fallback 展示规则

`fallbackCommandId` 的展示顺序：

1. 优先从已加载命令集中解析真实标题
2. 若解析成功，显示标题
3. 若解析失败，再回退为原始 `commandId`

这样：

1. 作者仍维护稳定 id
2. 用户看到的却是更自然的命令标题

### 6.4 调试信息降级

`result.message` 不再作为主提示来源。

保留原则：

1. 仅当 `code` 无法命中已知模板时，才使用 `message` 作为兜底
2. 对 `probe-error` / `probe-invalid-response`，可在日志或调试信息中保留原始 message
3. 不让技术 message 主导正常用户提示

---

## 7. 前端与后端职责边界

### 7.1 Rust probe 职责

保持：

1. 校验依赖是否存在
2. 返回稳定 `code`
3. 返回最小必要 `message`

不承担：

1. 多语言用户文案拼装
2. 基于产品语气的提示润色
3. fallback 命令标题解析

### 7.2 前端职责

前端负责：

1. 将 prerequisite metadata 与 probe result 合并
2. 区分 required / optional / system probe failure
3. 按统一模板生成最终用户文案
4. 解析 fallback 命令标题并渲染更自然的建议动作

---

## 8. 测试与验收

### 8.1 schema / mapper

需要覆盖：

1. `displayName`、`resolutionHint` 可通过 schema
2. 旧 `installHint` 仍可被加载
3. mapper 对新旧字段的优先级正确：
   - `resolutionHint > installHint`

### 8.2 helper 文案测试

需要覆盖：

1. `missing-binary` 输出人话化提示
2. `missing-shell` 输出人话化提示
3. `missing-env` 同时展示显示名与环境变量名
4. optional prerequisite 失败时只追加 warning，不阻断执行
5. `fallbackCommandId` 可解析命令标题
6. fallback 标题解析失败时回退原 id

### 8.3 system probe failure

需要覆盖：

1. `probe-error` 不会对每个 prerequisite 重复拼接同一条 transport error
2. `probe-invalid-response` 走统一系统级错误文案

### 8.4 验收标准

1. 用户不再直接看到默认的 `required binary not found: xxx` 作为主提示。
2. `binary / shell / env` 三类 prerequisite 都使用统一提示结构。
3. `installHint` 仍可兼容，但新 authoring 默认改用 `resolutionHint`。
4. `fallbackCommandId` 在常规场景下展示为命令标题，而不是裸 id。
5. probe transport 失败时，错误不会被重复扩散成多条“缺依赖”提示。

---

## 9. 风险与迁移策略

### 9.1 风险

主要风险：

1. 新旧字段并存期间，作者可能继续沿用 `installHint`
2. fallback 命令标题解析依赖当前命令集已加载
3. 文案模板若设计不稳，容易再次回到“字符串拼接”风格

### 9.2 迁移策略

建议分两步：

1. 先落 schema / mapper / 前端渲染兼容层，支持新字段但不强制立刻迁移所有 YAML
2. 再逐步把 builtin catalog 中更重要的 prerequisite authoring 从 `installHint` 迁到 `resolutionHint`

---

## 10. 结论

本设计选择“契约轻扩展 + 前端语义化收口”，而不是：

1. 只在 UI 层继续拼接旧字符串
2. 或一次性把 probe 结果做成重量级诊断对象

最终收口原则是：

1. 机器负责判断有没有
2. prerequisite metadata 负责描述对用户怎么称呼、怎么补
3. 前端负责用统一产品口径把结果说清楚

这样可以在不推翻现有 preflight 执行链路的前提下，把提示从“技术日志”升级为“清楚、自然、可执行的下一步提示”。
