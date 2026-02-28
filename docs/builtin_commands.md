# ZapCmd 内置命令资产（源索引 + 生成流程）

> 本文件是命令资产唯一维护入口：包含“源文件索引 + 生成流程 + CI 校验口径”。

## 1. 单一事实源（SSOT）

- 编辑入口：`docs/command_sources/*.md`
- 生成脚本：`scripts/generate_builtin_commands.ps1`
- 生成输出：`assets/runtime_templates/commands/builtin/*.json`
- 可选：生成一份 Markdown 快照用于 Review（不要求提交到仓库）

## 2. 命令源目录（人维护）

- `docs/command_sources/_network.md`
- `docs/command_sources/_system.md`
- `docs/command_sources/_git.md`
- `docs/command_sources/_docker.md`
- `docs/command_sources/_file.md`
- `docs/command_sources/_ssh.md`
- `docs/command_sources/_dev.md`
- `docs/command_sources/_package.md`

统一表头：

`# | ID | 名称 | 平台 | 模板 | 参数 | 高危 | adminRequired | prerequisites | tags`

## 3. 一键生成

```powershell
./scripts/generate_builtin_commands.ps1
```

可选参数：

```powershell
./scripts/generate_builtin_commands.ps1 `
  -SourceDir "docs/command_sources" `
  -SourcePattern "_*.md" `
  -OutputDir "assets/runtime_templates/commands/builtin" `
  -ManifestPath "assets/runtime_templates/commands/builtin/index.json" `
  -GeneratedMarkdownPath "<your-local-markdown-path>"
```

## 4. 参数说明（作用与何时使用）

| 参数 | 默认值 | 作用 | 什么时候改 |
|---|---|---|---|
| `SourceDir` | `docs/command_sources` | 指定命令 markdown 源目录 | 源目录迁移、分仓库时 |
| `SourcePattern` | `_*.md` | 指定参与生成的源文件匹配规则 | 需要只生成某一类文件时 |
| `OutputDir` | `assets/runtime_templates/commands/builtin` | 指定输出 JSON 目录 | 切换到临时输出目录做验证时 |
| `ManifestPath` | `assets/runtime_templates/commands/builtin/index.json` | 生成清单文件（计数与文件映射） | 需要多套清单并存时 |
| `GeneratedMarkdownPath` | （自定义） | 生成人类可读快照 | 想保留不同批次快照时 |
| `ExpectedLogicalCount` | `0`（不校验） | 锁定逻辑命令总数；不一致则失败 | CI 防止误删命令时 |

说明：

- `ExpectedLogicalCount=0` 表示关闭数量校验。
- `SourcePattern` 过宽会把非命令 markdown 也纳入解析，建议保持 `_*.md`。

## 5. 常用命令模板

默认全量生成：

```powershell
./scripts/generate_builtin_commands.ps1
```

只生成单一文件（示例：仅 network）：

```powershell
./scripts/generate_builtin_commands.ps1 -SourcePattern "_network.md"
```

CI 锁定数量（示例：170）：

```powershell
./scripts/generate_builtin_commands.ps1 -ExpectedLogicalCount 170
```

## 6. 生成规则（实现口径）

1. 一个 markdown 源文件对应一个输出 json 文件（同名）。
2. 每行命令以 `ID` 作为逻辑标识。
3. `高危` 列映射：`⚠️ => dangerous=true`，`- => dangerous=false`。
4. `参数` 列转换为 `args[]`（`text/number/path/select`）。
5. `prerequisites` 逗号切分，转为对象数组（包含 `id/type/required/check`）。
6. `tags` 空格切分并去重。
7. `platform=mac/linux` 自动拆分为两条：`mac` + `linux`。
8. 平台拆分会生成物理命令后缀（必要时自动加 `-mac/-linux`）。
9. 输出 JSON 必须仅使用 schema 定义字段（见 `docs/schemas/command-file.schema.json`）。

## 7. 当前生成结果（基线）

- 逻辑命令数：170
- 物理命令数（拆分后）：209
- 输出文件：
  - `_network.json`
  - `_system.json`
  - `_git.json`
  - `_docker.json`
  - `_file.json`
  - `_ssh.json`
  - `_dev.json`
  - `_package.json`

## 8. 维护流程（新增/修改命令）

1. 修改对应的 `docs/command_sources/_xxx.md`。
2. 运行 `./scripts/generate_builtin_commands.ps1`。
3. 检查 `assets/runtime_templates/commands/builtin/index.json` 的计数变化是否符合预期。
4. （可选）若生成了 Markdown 快照，检查快照是否符合预期。
5. 提交 `md + json` 同步变更，避免“源与产物漂移”。

## 9. 执行记录（建议每次提交都记录）

建议在 PR 描述或变更说明中记录以下字段：

- 执行命令（含参数）
- 逻辑命令数（来自 `index.json.logicalCommandCount`）
- 物理命令数（来自 `index.json.physicalCommandCount`）
- 变更的源文件（`docs/command_sources/_*.md`）
- 变更的输出文件（`assets/runtime_templates/commands/builtin/_*.json`）

最小记录模板：

```text
Generate Command Assets
- cmd: ./scripts/generate_builtin_commands.ps1 -ExpectedLogicalCount 170
- logical: 170
- physical: 209
- changed sources: _network.md, _system.md
- changed outputs: _network.json, _system.json, index.json
```
