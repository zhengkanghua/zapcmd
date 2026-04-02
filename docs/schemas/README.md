# Command Schema 说明

## 这个文件是做什么的

`docs/schemas/command-file.schema.json` 是命令文件的结构契约（Contract），用于统一：

- 命令 JSON 必须有哪些字段、字段类型是什么。
- 导入社区命令时如何做格式校验。
- 内置命令/用户命令是否可被同一套加载器稳定解析。

一句话：**schema 负责“格式正确性”，不负责“命令语义是否合理”。**

## 在项目中的作用

1. 导入前校验：不符合 schema 的命令文件直接拒绝。
2. 启动加载校验：发现结构损坏的文件时给出错误并跳过。
3. 作为 `commands/catalog/_*.yaml` 生成产物的最终落地格式依据（唯一 JSON 结构）。

## category contract

- `category` 现在是开放 slug，而不是固定枚举。
- 规则：`^[a-z0-9]+(?:-[a-z0-9]+)*$`
- 合法示例：`custom`、`redis`、`mysql-tools`
- 非法示例：`Redis`、`mysql tools`、`postgres_tools`
- builtin 与用户命令共用同一规则。
- builtin 默认会把源文件 slug（`_*.yaml` 去掉前缀 `_`）写入 `category`。
- 若 YAML `meta.runtimeCategory` 存在，生成器会优先写入该值；例如 `_pnpm.yaml` 仍可生成 `category=package`。

## 与命令源的关系

- `commands/catalog/_*.yaml` 是 builtin 命令内容清单（人维护源）。
- `command-file.schema.json` 是最终结构规则。
- 生成时按规则转换后，产出的每条命令对象必须满足 schema。
- 自动合并与生成由 `scripts/commands/generate-builtin-commands.mjs` 完成（见 `commands/catalog/README.md`）。

## exec / script 与 prerequisite contract

- 命令对象不再允许 `template` 或顶层 `shell` 字段。
- 命令必须二选一声明：
  - `exec.program + exec.args[]`
  - `script.runner + script.command`
- `exec.stdinArgKey` 只能引用已定义参数；最终 `stdin` 在执行时由运行时展开。
- 若命令明确依赖某个 shell，应通过 `prerequisites` 声明，例如 `shell:powershell`。
- prerequisite 类型当前只保留三种：`binary`、`shell`、`env`。
- prerequisite 可新增用户提示字段：
  - `displayName`：给用户看的依赖名称
  - `resolutionHint`：新的主补救提示字段
  - `installHint`：兼容旧字段；仅在 `resolutionHint` 缺失时回退使用
  - `fallbackCommandId`：可选替代命令 id，运行时优先解析展示标题

## 运行时口径（schema 方案 3）

1. `docs/schemas/command-file.schema.json` 是唯一结构真源。
2. 运行时消费 committed 的 standalone validator：`src/features/commands/generated/commandSchemaValidator.ts`。
3. 结构校验之外的跨字段规则仍由手写层承担，例如 `min <= max`、number `default` 范围、`stdinArgKey` 对齐、`script.runner` 与 shell prerequisite 对齐。
4. 可用命令：
   - `npm run commands:schema:generate`
   - `npm run commands:schema:check`

## builtin YAML 边界

- builtin 真源使用 `commands/catalog/_*.yaml`。
- YAML 负责 authoring 体验；最终 runtime 契约仍以 `docs/schemas/command-file.schema.json` 为准。
- YAML / JSON 都可以直接声明 prerequisite 的 `displayName` 与 `resolutionHint`。
- `pattern`、`errorMessage` 等更复杂规则继续保留给 schema / 用户 JSON 文件入口。

## 首次启动写入建议

建议首次启动时将 schema 写入用户目录：

- 源：`docs/schemas/command-file.schema.json`
- 目标：`~/.zapcmd/schemas/command-file.schema.json`

这样运行时和导入流程都可使用同一份校验规则。

## 最小可通过示例

- `docs/schemas/examples/command-file.min.json`
- `docs/schemas/examples/command-file.platform-split.json`

这两个文件可直接作为测试夹具（fixture）使用。
