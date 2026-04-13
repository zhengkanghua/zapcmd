# 命令目录多语言真源 / 单文件隔离失败 / 运行时过胖模块拆分设计

> 日期：2026-04-13
> 状态：设计已确认，待用户审阅 spec
> 范围：user command 单文件隔离失败、builtin 命令 YAML 多语言真源、命令目录增量加载与语言切换、历史过胖模块拆分轨道

---

## 1. 背景

这轮不是泛泛做“代码优化”，而是收掉 3 个已经在代码里确认的真实问题。

### 1.1 user command 读取仍是“整批失败”

当前 user command 读取链路为：

1. Rust 侧递归扫描 `~/.zapcmd/commands`
2. 逐个读取 JSON 文件
3. 前端统一解析和校验

问题在于：

1. Rust 侧当前仍是逐文件读取后直接 `?` 返回。
2. 只要单个文件读失败，整批刷新就可能失败。
3. 前端最后只能看到一个总括性的 `read-failed`，无法区分“哪个文件坏了、其他文件是否还能继续用”。

这不符合命令目录的产品心智。  
用户预期应是：坏一个文件，只影响那一个文件，其余命令继续可用。

### 1.2 builtin 命令真源已切到 YAML，但还没有长期可扩展的多语言结构

当前 builtin 维护链路已经是：

1. 人工维护 `commands/catalog/_*.yaml`
2. 生成器产出 `assets/runtime_templates/commands/builtin/_*.json`
3. runtime 读取 JSON

当前 runtime 层其实已经支持 localized object：

1. `RuntimeLocalizedText = Record<string, string>`
2. `runtimeMapper` 会按当前 locale 走 `zh-CN -> zh -> en-US -> en` fallback

但生成器和 YAML 真源仍主要按“单字符串字段”工作。  
这意味着：

1. 系统“能消费多语言”，但 builtin 真源“还不方便维护多语言”。
2. 如果直接把多语言全内联进单个 YAML，短期可行，长期会变得臃肿。
3. 如果以后扩展更多语言，需要一个不会反复推翻的源结构。

### 1.3 若继续在现有超长文件上叠逻辑，问题会从“文件大”演变为“边界失真”

这轮审查里已经定位到几个过胖文件：

1. `src-tauri/src/terminal.rs`
2. `src/composables/app/useAppCompositionRoot/runtime.ts`
3. `src/components/launcher/LauncherWindow.vue`
4. `src/components/launcher/parts/LauncherQueueReviewPanel.vue`

问题不只是行数超标，而是它们同时承载：

1. 装配
2. 生命周期
3. 事件桥接
4. 执行编排
5. UI 行为细节

如果这轮又把命令目录多语言、增量加载、容错都继续叠进去，后续回归风险会持续上升。

---

## 2. 总体决策

这 3 个问题不应当作为一个“单 patch”处理，而应拆成两个轨道。

### 2.1 Track A：命令目录主链路收口

Track A 覆盖：

1. user command 单文件隔离失败
2. builtin YAML 多语言真源
3. user command 增量扫描 / 增量读取
4. 语言切换时只重映射，不重扫磁盘

这是本轮的主轨道，优先落地。

### 2.2 Track B：历史过胖模块拆分

Track B 覆盖：

1. `terminal.rs` 拆边界
2. `runtime.ts` 拆装配职责
3. `LauncherWindow.vue` / `LauncherQueueReviewPanel.vue` 拆交互壳层

它与 Track A 有关，但不应和 Track A 交叉在一个实现 chunk 里。

### 2.3 推荐顺序

推荐顺序固定为：

1. 先做 Track A
2. 再做 Track B

原因：

1. Track A 决定命令数据结构和加载边界。
2. Track B 应在新边界确定后再拆，避免拆完又重接一次。

---

## 3. 目标与非目标

### 3.1 本轮目标

1. 坏掉的 user command 文件必须只影响自己，不拖垮整批。
2. builtin 命令源支持长期可扩展的多语言维护方式。
3. 第一阶段强制 builtin 至少维护 `zh` 和 `en`。
4. 以后新增语言时，不推翻命令 schema，只增加 locale overlay。
5. user command 继续支持“单文件 inline 多语言 JSON”。
6. 语言切换时不再重新扫描 user command 目录，不再重新读取未变化文件。
7. 过胖模块拆分时不改变现有用户行为。

### 3.2 本轮不做

1. 不在这轮处理 launcher session 的同步持久化问题。
2. 不把 user command 的作者体验强制改成多文件目录结构。
3. 不把 tags 直接改成多语言搜索主入口。
4. 不做大规模 UI 改版。
5. 不在 Track B 顺手改行为或顺手补新功能。

---

## 4. Track A 设计：命令目录主链路

### 4.1 builtin 真源改成“Base YAML + locale overlay”

内置命令源目录改为：

1. `commands/catalog/_git.yaml`
2. `commands/catalog/_docker.yaml`
3. `commands/catalog/locales/config.yaml`
4. `commands/catalog/locales/zh/_git.yaml`
5. `commands/catalog/locales/en/_git.yaml`

其中：

1. base YAML 只放结构、执行模型、参数 key、platform、prerequisite、category。
2. locale overlay 只放文案。
3. 生成器负责把 base + overlay 合并为最终 runtime JSON。

这样做的核心收益：

1. 结构和翻译职责分离。
2. 加新语言只新增 overlay 文件，不改 base 结构。
3. 不会把一个 YAML 膨胀成难维护的大杂烩。

### 4.2 locale 配置文件

新增：

`commands/catalog/locales/config.yaml`

建议结构：

```yaml
defaultLocale: zh
requiredBuiltinLocales:
  - zh
  - en
supportedLocales:
  - zh
  - en
fallbackOrder:
  zh-CN:
    - zh
    - en
  zh:
    - zh
    - en
  en-US:
    - en
    - zh
  en:
    - en
    - zh
```

说明：

1. `defaultLocale` 决定 generator 在缺失时的默认补位语言。
2. `requiredBuiltinLocales` 决定 builtin 最低翻译覆盖面。
3. `supportedLocales` 为未来扩展语言预留。
4. `fallbackOrder` 让 generator/runtime 用同一套语言回退口径。

这样未来新增 `ja` / `fr` / `de` 时，只需要：

1. 更新 config
2. 增加对应 locale 目录
3. 补充翻译 overlay

不需要再推翻 runtime schema。

### 4.3 base YAML 结构

base YAML 只保留“结构事实”：

```yaml
meta:
  moduleSlug: git

commands:
  - id: git-status
    category: git
    platform: all
    exec:
      program: git
      args:
        - status
    adminRequired: false
    prerequisites:
      - id: git
        type: binary
        required: true
        check: binary:git
```

这里不再要求：

1. `meta.name` 必须是字符串
2. `command.name` 必须直接写在 base

base 只负责稳定结构，不负责可变语言文本。

### 4.4 locale overlay 结构

overlay 不再使用 array，而使用稳定 key 定位，避免翻译文件跟着数组顺序漂移。

建议结构：

```yaml
meta:
  name: Git 版本控制
  description: Git 相关内置命令

commands:
  git-status:
    name: 查看仓库状态
    description: 查看当前仓库工作区与暂存区状态

  git-log:
    name: 查看提交历史
    args:
      count:
        label: 条数
        placeholder: 输入要展示的条数
```

规则：

1. `commands` 一级 key 必须是 command id。
2. `args` 一级 key 必须是 arg key。
3. `prerequisites` 若需本地化，一级 key 必须是 prerequisite id。

这样未来改命令顺序、加字段、拆平台时，不会导致翻译文件整体重排。

### 4.5 生成器行为

生成器从“单 YAML 直出 JSON”改为“base + overlay merge”：

1. 先解析 base YAML
2. 再按 `supportedLocales` 读取 overlay
3. 合并成 runtime JSON 的 localized object
4. 对 builtin 的 `requiredBuiltinLocales` 做完整性校验

产物 JSON 继续保持现有 runtime schema 能消费的形态：

```json
{
  "id": "git-status",
  "name": {
    "zh": "查看仓库状态",
    "en": "View repository status"
  }
}
```

这意味着：

1. runtime 层不需要推翻现有 `RuntimeLocalizedTextOrString`
2. 现有 `runtimeMapper` 可以继续工作
3. 生成器成为多语言真源合并点

### 4.6 user command 保持“单文件 inline 多语言 JSON”

用户自定义命令不要求改成 overlay 结构，仍然允许：

```json
{
  "commands": [
    {
      "id": "echo-hello",
      "name": {
        "zh": "输出问候",
        "en": "Echo Hello"
      }
    }
  ]
}
```

原因：

1. 用户命令作者通常只维护少量命令。
2. 强迫用户拆成 base + locale overlay，会显著增加使用门槛。
3. builtin 和 user command 不必强行共用作者体验，只需共用 runtime schema。

### 4.7 user command 读取改成“扫描 / 读取”两阶段

为实现“单文件隔离失败 + 增量加载 + 切语言不重读”，Rust 侧 API 改为两阶段。

新增建议接口：

1. `scan_user_command_files`
   - 返回 `path / modifiedMs / size`
   - 返回目录扫描级 issue
2. `read_user_command_file(path)`
   - 只读取单个文件
   - 失败时只返回该文件自己的 read issue

不再保留“一次返回整批内容，单文件失败就整批失败”的接口模型。

### 4.8 前端新增 `UserCommandSourceCache`

前端在 `useCommandCatalog` 之下新增独立缓存层，职责：

1. 记录每个文件的 `path -> modifiedMs -> raw payload`
2. 只对变化文件重新读取
3. 语言切换时只重新 map，不重新读磁盘
4. 为单文件 issue 和可用命令做统一聚合

缓存层应保留两类结果：

1. 原始 payload
2. 解析 / schema / business rule issue

这样 locale 改变时，只需要对缓存中的 payload 重新执行：

1. `validateRuntimeCommandFile`
2. `mapRuntimeCommandToTemplate`

而不是重新去 Rust 侧取整批文件内容。

### 4.9 单文件隔离失败的错误模型

user command 全链路错误需要显式分层：

1. scan issue
   - 目录不可读
   - 某个文件路径无法枚举
2. read issue
   - 某个文件权限不足
   - 某个文件读取失败
3. parse issue
   - JSON 非法
4. schema issue
   - 结构不符合 runtime schema
5. command issue
   - business rule 不合法

收口原则：

1. 目录级失败只影响失败目录。
2. 文件级失败只影响失败文件。
3. 成功文件继续进入模板构建。
4. Settings Commands 中能准确显示 issue 来源。

### 4.10 搜索与多语言

当前 launcher 搜索只使用：

1. `title`
2. `description`
3. `preview`
4. `folder`
5. `category`

不使用 `tags`。

因此第一阶段的多语言搜索策略是：

1. 本地化 `name/description/arg label/...`
2. 搜索继续命中本地化后的 `title/description`

本轮不把 `tags` 升级为多语言主入口。

如果未来确实需要“多语言别名搜索”，单独增加：

1. `searchKeywords`
2. 或 `aliases`

并允许它是 localized object。  
但这不是本轮阻塞项。

### 4.11 迁移顺序

Track A 推荐按 4 个 chunk 落地：

1. 先改 Rust API，完成 user command 单文件隔离失败
2. 再改前端 cache，完成增量读取和 locale remap
3. 再改 generator，支持 base + locale overlay
4. 最后补 builtin `zh/en` overlay，并完成文档和测试更新

这样可以先把“坏文件拖垮整批”的鲁棒性问题收掉，再推进长期多语言结构。

---

## 5. Track B 设计：历史过胖模块拆分

Track B 的目标不是改行为，而是把已失真的边界收正。

### 5.1 `src-tauri/src/terminal.rs`

建议拆成：

1. `src-tauri/src/terminal/execution_contract.rs`
   - `ExecutionSpec`
   - sanitize
   - host command build
2. `src-tauri/src/terminal/discovery.rs`
   - terminal detect / cache / refresh
3. `src-tauri/src/terminal/tauri_commands.rs`
   - `get_available_terminals`
   - `refresh_available_terminals`
   - `run_command_in_terminal`

平台专属 launch 逻辑继续留在：

1. `windows_launch.rs`
2. `windows_routing.rs`

### 5.2 `src/composables/app/useAppCompositionRoot/runtime.ts`

建议拆成：

1. `launcherRuntime.ts`
   - queue / nav / execution / visibility 装配
2. `lifecycleRuntime.ts`
   - `useAppLifecycleBridge` 接线
3. `windowSizingRuntime.ts`
   - `useWindowSizing` 和 settle notifiers
4. `windowKeydownRuntime.ts`
   - keydown option build

保留：

1. `runtime.ts` 作为顶层组装入口

但不再继续承载所有细节。

### 5.3 `LauncherWindow.vue`

`LauncherWindow.vue` 应退回成壳层组件。

建议把事件转发、搜索 capsule back、nav settle 等逻辑抽到：

1. `useLauncherWindowEvents.ts`

组件自己只负责：

1. provide nav
2. template 结构
3. 极薄事件绑定

### 5.4 `LauncherQueueReviewPanel.vue`

建议拆出：

1. `useQueueReviewPanelShell.ts`
   - focus trap
   - scroll handoff
   - ref normalize

保留现有：

1. `useFlowPanelInlineArgs`
2. `useFlowPanelGripReorder`
3. `useFlowPanelHeightObservation`

避免 `LauncherQueueReviewPanel.vue` 继续承担“UI + shell 行为 + 业务防守”三种角色。

### 5.5 Track B 顺序

Track B 建议作为单独实施计划，按下列顺序推进：

1. `runtime.ts`
2. `LauncherWindow.vue`
3. `LauncherQueueReviewPanel.vue`
4. `terminal.rs`

原因：

1. 前端装配层拆分回归成本更可控。
2. `terminal.rs` 体量最大，放最后更适合在前两步边界稳定后处理。

---

## 6. 测试与验证

### 6.1 Track A

必须新增或调整：

1. generator 单测
   - base + overlay merge
   - required locale 缺失时报错
2. Rust command catalog 单测
   - 单文件 read 失败不拖垮整批
   - scan / read issue 分层正确
3. 前端 `useCommandCatalog` 单测
   - locale 切换只重映射，不重新读取未变化文件
   - 修改单文件时只重读该文件
   - 单文件 parse/schema issue 不影响其他文件
4. runtimeLoader / schemaGuard 单测
   - localized object 继续兼容

### 6.2 Track B

必须新增或保持：

1. `lint`
2. `typecheck`
3. `test:coverage`
4. `build`
5. `check:rust`

以及现有关键回归：

1. app failure regression
2. app hotkeys regression
3. launcher flow regression
4. settings layout regression

Track B 不接受“拆完但测试覆盖倒退”的结果。

---

## 7. 风险与取舍

### 7.1 为什么 builtin 和 user command 采用不同作者模型

这是有意的，不是妥协。

1. builtin 是团队维护资产，适合更强结构化约束。
2. user command 是用户自定义资产，优先作者体验。
3. 二者只需 runtime schema 一致，不必强行 authoring 一致。

### 7.2 为什么不在这轮做多语言 tags

因为当前搜索不消费 tags。  
现在硬把 tags 改成多语言，会扩大范围，但不直接提升当前搜索体验。

### 7.3 为什么先做 Track A 再做 Track B

因为 Track A 会先定义命令目录的长期边界。  
如果先拆运行时，再改命令边界，容易做两遍装配。

---

## 8. 最终决策

本轮设计最终采用：

1. Track A：`Base YAML + locale overlay` 作为 builtin 长期多语言真源；user command 保持 inline 多语言 JSON；Rust 改为 scan/read 两阶段；前端新增增量缓存与 locale remap。
2. Track B：把历史过胖文件拆成更窄的装配层与命令层，但不与 Track A 混成同一批实现。

一句话概括：

1. 命令目录问题先收口成“结构和翻译分离、坏文件只坏自己、语言切换不扫盘”。
2. 体积过胖问题再单独按边界拆，不在本轮和命令源重构互相缠绕。
