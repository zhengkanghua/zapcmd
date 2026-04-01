# builtin 命令模块拆分与运行时分类覆盖设计

> 日期：2026-03-31
> 状态：for-review
> 范围：保持 `1 md = 1 json` 的前提下，引入“文件级默认 + 行级覆盖”的运行时分类 DSL；首轮将 `package` 大类拆成多个模块文件，但运行时仍归类为 `package`
> 修订关系：本 spec 修订 [2026-03-31-command-category-slug-and-builtin-command-expansion-design.md](/home/work/projects/zapcmd/docs/superpowers/specs/2026-03-31-command-category-slug-and-builtin-command-expansion-design.md) 中“builtin 分类直接来自文件名”的口径，并取代 [2026-03-31-builtin-command-second-round-expansion-design.md](/home/work/projects/zapcmd/docs/superpowers/specs/2026-03-31-builtin-command-second-round-expansion-design.md) 与 [2026-03-31-builtin-command-second-round-expansion.md](/home/work/projects/zapcmd/docs/superpowers/plans/2026-03-31-builtin-command-second-round-expansion.md) 里关于“不要新增 `_pnpm.md/_bun.md/_npm.md`、不拆 `_package.md`”的 package 范围约束；slug contract 本身保持不变

---

## 1. 背景

当前 builtin 命令源已经采用：

- `docs/command_sources/_*.md`
- `scripts/generate_builtin_commands.ps1`
- `assets/runtime_templates/commands/builtin/_*.json`

这条 Markdown -> JSON 工作流，但仍有一个结构性约束：

1. 一个 Markdown 文件对应一个 JSON 文件。
2. 文件名去掉前缀 `_` 后，直接成为每条命令的 `category`。

这个约束让第一步迁移很顺，但随着 builtin 命令数量增加，问题已经开始出现：

1. `_package.md` 同时容纳 `npm / pnpm / yarn / bun / pip / brew / cargo`，维护时可扫描性持续变差。
2. 如果为了维护粒度拆成 `_pnpm.md`、`_bun.md`，当前生成器会把运行时分类一起改成 `pnpm`、`bun`，直接改变 UI/搜索语义。
3. 这意味着“文件组织”与“产品分类”被绑死，后续任何模块化整理都会被误解为运行时分类重构。

本轮目标不是重做运行时加载链，而是在保持 DSL 足够简单的前提下，把“模块文件名”和“运行时 category”解耦到可维护、可渐进迁移的程度。

---

## 2. 已确认范围

### 2.1 本轮要做

1. 保持 `1 md = 1 json` 不变。
2. 新增文件级元数据 `运行时分类`，作为文件内命令的默认运行时分类。
3. 表格可选新增列 `运行时分类`，允许命令级覆盖默认值。
4. 当行级与文件级 `运行时分类` 都缺省时，继续回退到文件 slug，保持兼容。
5. 首轮将 `package` 从单文件拆成多个源文件与多个 JSON 产物。
6. 拆分后 `npm / pnpm / yarn / bun / pip / brew / cargo` 这些模块的命令，运行时仍统一落到 `category=package`。
7. 同步更新生成器文档、manifest/snapshot 表达与必要测试。

### 2.2 本轮明确不做

1. 不新增额外 manifest 作为分类映射真源。
2. 不修改运行时命令加载机制。
3. 不修改 UI 层的分类展示/筛选规则。
4. 不强制把所有现有 builtin 大类都立即拆分。

---

## 3. 设计决策汇总

| 决策项 | 结论 |
|---|---|
| 文件与产物关系 | 继续保持 `1 md = 1 json` |
| 文件名职责 | 只负责模块命名与输出文件名，不再强绑定运行时 `category` |
| 运行时分类来源 | 优先读取行级 `运行时分类`；否则回退到文件级 `运行时分类`；再回退到文件 slug |
| 覆盖粒度 | 默认支持文件级单分类，也允许同一文件内通过行级列表达多分类 |
| 兼容策略 | 老文件不需要立即补元数据，继续按旧行为生成 |
| 首轮迁移范围 | 只拆 `package` |
| 运行时加载 | 继续按 `_*.json` 全量加载，不按文件名决定分组 |
| 维护目标 | 允许“模块更细，但产品分类不变” |
| 与旧 spec 关系 | 仅修订 builtin 分类来源，不推翻既有 slug contract 与运行时加载 contract |

---

## 4. 源文件元数据 Contract

### 4.1 现有头部字段保留

当前源文件已经约定：

```md
# _package

> 分类：包管理
> 说明：此文件为 JSON 生成源（人维护）。
```

其中：

- `# _package` 主要表达文件名
- `> 分类：...` 当前被生成器用于 `_meta.name`

这套格式继续保留，不改现有含义。

### 4.1.1 头部 grammar

本轮把源文件头部语法固定为：

1. 第一个非空行必须是且只能是一个一级标题：`# _slug`
2. 一级标题之后允许空行
3. 之后允许一个连续的 blockquote 元数据区，例如 `> 分类：...`
4. 元数据区结束后，进入普通说明文本或表格正文
5. 生成器只解析“首个一级标题 + 其后的首个连续 blockquote 元数据区”
6. 元数据区之后再次出现的 blockquote，不参与元数据解析

支持的头部元数据键：

- `分类`
- `运行时分类`
- `说明`

处理规则：

1. `分类`：参与生成
2. `运行时分类`：参与生成
3. `说明`：允许存在，但不参与 JSON 结构生成
4. 未知键：允许保留，生成器忽略，不报错

### 4.2 新增 `运行时分类`

新增一条可选元数据：

```md
> 运行时分类：package
```

完整示例：

```md
# _pnpm

> 分类：PNPM
> 运行时分类：package
> 说明：此文件为 JSON 生成源（人维护）。
```

`运行时分类` 在头部 blockquote 中表示“文件默认值”；若表格启用 `运行时分类` 列，则每一行可继续覆盖该默认值。

本轮继续要求以下头部字段保持现有约束：

1. `# _slug` 仍然是必填，且必须与文件名一致
2. `> 分类：...` 仍然是必填，用于 `_meta.name`
3. `> 运行时分类：...` 为可选

头部字段的失败矩阵在本轮也一并定死：

1. 缺失 `# _slug`：直接失败
2. `# _slug` 为空、非法或与文件名不一致：直接失败
3. 重复声明 `# _slug`：直接失败
4. 缺失 `> 分类：...`：直接失败
5. `> 分类：...` 为空：直接失败
6. 重复声明 `> 分类：...`：直接失败
7. 缺失 `> 运行时分类：...`：允许，回退到文件 slug
8. `> 运行时分类：...` 为空、重复、非法：直接失败

### 4.3 语义定义

- `分类`：源文件的人类可读显示名，继续用于生成 JSON 的 `_meta.name`
- `运行时分类`：命令写入 JSON 时使用的 `category` 默认值；若表格行显式填写 `运行时分类` 列，则以该行值为准

也就是说，默认情况下：

- `_pnpm.md` -> `_pnpm.json`
- `_meta.name = "PNPM"`
- 每条命令的 `category = "package"`

### 4.4 校验规则

`运行时分类` 必须与现有 schema 的 slug 规则一致：

```text
^[a-z0-9]+(?:-[a-z0-9]+)*$
```

允许示例：

- `package`
- `database`
- `postgres-tools`

禁止示例：

- `Package`
- `包管理`
- `postgres_tools`

生成器应在源文件阶段直接拒绝非法值，而不是先生成再交给运行时 schema 拦截。

此外，`运行时分类` 的解析边界也要明确：

1. 一个文件最多只允许声明一次 `> 运行时分类：...`
2. 空值视为非法输入，不按“缺省回退”处理
3. 重复声明视为源文件错误，生成器直接失败
4. 只有“未声明该字段”时，才允许回退到文件 slug

### 4.5 缺省回退

如果文件没有写 `运行时分类`，则继续保持当前行为：

- 文件 slug = 运行时 `category`

例如：

- `_git.md` 未写 `运行时分类`
- 生成结果仍然是 `category=git`

这样可以保证老文件不需要同步大改。

### 4.6 混合覆盖模式

本轮采用“文件级默认 + 行级覆盖”的混合模式：

1. 对绝大多数文件，继续保持单文件单分类，维护成本最低。
2. 对 `package` 这类模块拆分后的命令源，可在表格中逐行显式写 `运行时分类=package`，避免再被文件级头部绑定。
3. 当同一文件出现多个运行时分类时，manifest/snapshot 必须按集合表达，而不是强行压成单值。

仍然建议优先保持文件语义清晰，避免把无关命令重新塞回“大杂烩”文件。

---

## 5. 生成器 Contract 调整

### 5.1 读取顺序

`scripts/generate_builtin_commands.ps1` 需要先读取文件头部元数据，再解析表格行。

生成器对每个源文件应抽取以下信息：

1. `fileSlug`：由文件名 `_xxx.md` 得到
2. `displayName`：来自 `> 分类：...`
3. `defaultRuntimeCategory`：来自 `> 运行时分类：...`；若缺失则回退为 `fileSlug`
4. `rowRuntimeCategory`：若表格包含 `运行时分类` 列，则优先读取该行；写 `-` 或留空时回退到 `defaultRuntimeCategory`

### 5.2 命令 JSON 产出规则

输出文件名仍只由文件名决定：

- `_pnpm.md -> _pnpm.json`
- `_bun.md -> _bun.json`

但每条命令的 `category` 使用该行最终解析后的 runtime category，而不是直接使用 `fileSlug`。

### 5.3 `_meta` 行为

`_meta` 延续当前口径：

- `name`：继续使用 `displayName`
- `source`：继续写源 Markdown 路径

本轮不要求把 `runtimeCategory` 再重复写进 `_meta`，避免冗余。

### 5.4 manifest 与 generated snapshot

当前 `index.json` 与 `docs/builtin_commands.generated.md` 只展示 `category`，默认假设“文件名=分类”。

本轮把 `index.json` 的 contract 直接定死为：

```json
{
  "sourceDir": "docs/command_sources",
  "sourcePattern": "_*.md",
  "logicalCommandCount": 255,
  "physicalCommandCount": 300,
  "generatedFiles": [
    {
      "file": "_pnpm.json",
      "sourceFile": "_pnpm.md",
      "moduleSlug": "pnpm",
      "runtimeCategories": ["package"],
      "logicalCount": 3,
      "physicalCount": 3
    }
  ]
}
```

也就是说：

1. top-level 字段继续保留：
   - `sourceDir`
   - `sourcePattern`
   - `logicalCommandCount`
   - `physicalCommandCount`
   - `generatedFiles`
2. `generatedFiles[]` 只允许以下 6 个字段：
   - `file`
   - `sourceFile`
   - `moduleSlug`
   - `runtimeCategories`
   - `logicalCount`
   - `physicalCount`
3. 旧的 `generatedFiles[].category` 本轮直接删除，不保留兼容别名

其中：

- `file` 保留完整输出文件名，例如 `_pnpm.json`
- `sourceFile` 保留完整源文件名，例如 `_pnpm.md`
- `moduleSlug` 不带前缀 `_`，例如 `pnpm`
- `runtimeCategories` 是该模块内所有命令最终写入 JSON 的 `category` 去重集合，例如 `["gh", "package", "tooling"]`

generated snapshot 表头改为：

| File | Source | Module | Runtime Categories | Logical | Physical |

示例行：

| _pnpm.json | _pnpm.md | pnpm | package | 3 | 3 |

原因是拆分后会出现：

- `_npm.json`
- `_pnpm.json`
- `_bun.json`

但这些文件都属于 `package`。如果 snapshot 仍只有一个 `Category` 列，维护者很难一眼看清“模块名”和“运行时归类”是否符合预期。

这里不保留旧的 `generatedFiles[].category` 字段作为兼容别名。

原因：

1. `index.json` 当前没有运行时消费者，只是维护快照。
2. 如果同轮保留 `category` 与 `runtimeCategory` 双写，后续更容易出现语义漂移或字段不同步。
3. 本轮直接切成显式字段，成本最低，也最不容易让实现阶段自行脑补。

### 5.5 陈旧生成物清理 Contract

当前生成器只会写入和覆盖目标文件，不会主动删除已经失去源文件对应关系的旧 JSON。

在 `_package.md` 拆成多个模块后，如果旧的 `_package.json` 仍然留在：

- `assets/runtime_templates/commands/builtin/_package.json`

运行时 glob 会继续把它加载进来，并与新文件中的 `npm/pnpm/bun/...` 命令形成 duplicate-id 冲突。

因此，本轮必须把“输出目录与当前源文件集保持一致”升级为生成器 contract：

1. 生成器先完整读取、解析并校验全部源文件
2. 在内存中构建完整的目标 JSON 集合、manifest 与 snapshot 内容
3. 只有当第 1-2 步全部成功后，才开始落盘
4. 落盘阶段再统一删除所有不再有对应源文件的旧 builtin JSON
5. 明确排除：
   - `index.json`
   - 其他非 builtin 命令文件

也就是说：

1. `docs/command_sources/_package.md` 被删除后，下一次运行生成器必须自动删除旧 `_package.json`
2. 如果某个新源文件解析失败，生成器应整体失败，并保持上一次已提交的 builtin 产物不被部分删除或部分覆盖

本轮不要求实现复杂事务系统，也不要求必须引入 temp 文件 + rename 的原子替换。

最低可接受保证是：

1. 任何源文件解析/校验失败时，不进行任何输出目录删除动作
2. 写入阶段先覆盖所有新目标文件、`index.json` 与 generated snapshot
3. 只有当上述写入全部成功后，才执行 stale JSON 删除
4. 如果写入阶段中途失败，生成器直接报错退出，并跳过 stale JSON 删除
5. 如果 stale JSON 删除失败，生成器也必须以非零退出码失败，并显式打印失败文件路径，要求人工清理后重跑
6. stale 删除失败时，不要求回滚已经成功写入的新文件，但这些产物不视为有效结果，不得提交

这意味着本轮 contract 的底线是“禁止出现部分删除导致的输出缺口”，而不是“保证全量原子更新”。

---

## 6. 首轮文件组织策略

### 6.1 `package` 拆分

首轮把 `_package.md` 拆成以下模块：

- `_npm.md`
- `_pnpm.md`
- `_yarn.md`
- `_bun.md`
- `_pip.md`
- `_brew.md`
- `_cargo.md`

并删除旧源文件：

- `_package.md`

对应生成：

- `_npm.json`
- `_pnpm.json`
- `_yarn.json`
- `_bun.json`
- `_pip.json`
- `_brew.json`
- `_cargo.json`

### 6.2 首轮统一归类

上述 7 个文件全部显式声明：

```md
> 运行时分类：package
```

因此：

1. 维护粒度变细。
2. 运行时分类不变。
3. UI/搜索中不会新增 `npm / pnpm / bun` 等一级分类。

同时，由于生成器会执行陈旧产物清理，旧的：

- `_package.json`

必须在同轮迁移中被自动移除，避免 duplicate-id 残留。

### 6.3 其它分类暂不迁移

像：

- `_git.md`
- `_docker.md`
- `_network.md`
- `_system.md`

本轮不要求改名，也不要求补 `运行时分类`。

这些文件继续保持“文件 slug = category”的旧行为即可。

---

## 7. 运行时影响

### 7.1 加载链无需结构性修改

当前运行时加载器 [src/features/commands/runtimeLoader.ts](/home/work/projects/zapcmd/src/features/commands/runtimeLoader.ts) 通过 glob 读取：

- `assets/runtime_templates/commands/builtin/_*.json`

它不依赖 `index.json` 决定加载顺序，也不要求“文件名必须等于 category”。

因此本轮拆分后，运行时侧只会看到：

1. 更多的 builtin JSON 文件
2. 这些文件中的命令仍然带着 `category=package`

不需要新增专门的适配层。

### 7.2 UI/搜索语义保持不变

因为 `category` 仍然是 `package`，所以：

1. 搜索过滤逻辑不需要因为 `pnpm` / `bun` 新增额外分类认知。
2. 现有围绕 `package` 的展示和用户心智不变。
3. 模块拆分只影响维护者，不影响终端用户。

---

## 8. 通用化边界

这一机制不是只为 `package` 特判，而是通用能力。

后续如果要做：

- `_mysql.md -> category=database`
- `_postgres.md -> category=database`
- `_sqlite.md -> category=database`

只需要在对应文件头部写：

```md
> 运行时分类：database
```

不需要再次修改生成器协议。

这也是本轮选择“文件级覆盖”而不是“逐行分类 DSL”或“额外 manifest”的核心原因：能力足够通用，但仍保持最小复杂度。

---

## 9. 测试与验证建议

### 9.1 生成器测试

至少新增两类测试：

1. 写了 `运行时分类` 时，输出 JSON 的每条命令使用覆盖后的 `category`
2. 没写 `运行时分类` 时，仍然回退到文件 slug
3. 存在陈旧 `_package.json` 时，生成器成功运行后会自动清理
4. `index.json` 与 generated snapshot 的字段/表头已经切换到 `moduleSlug + runtimeCategories`
5. 缺失/重复/非法的 `# _slug`、`> 分类`、`> 运行时分类` 都会让生成器失败

### 9.2 运行时测试

补充 runtime loader 侧断言：

1. `_npm.json / _pnpm.json / _bun.json` 等模块会被正常加载
2. 加载后的命令分类仍然只有 `package`
3. 不会误出现 `npm / pnpm / bun` 新分类
4. 不会出现由陈旧 `_package.json` 引起的 duplicate-id issue

### 9.3 文档与生成产物同步

实施完成后，需要同步提交：

1. `docs/command_sources/README.md`
2. `docs/schemas/README.md`
3. `docs/command_sources/_package.md` 的替代拆分文件
4. 删除旧 `docs/command_sources/_package.md`
5. `assets/runtime_templates/commands/builtin/*.json`
6. 删除旧 `assets/runtime_templates/commands/builtin/_package.json`
7. `assets/runtime_templates/commands/builtin/index.json`
8. `docs/builtin_commands.generated.md`
9. 必要测试
10. 与 builtin 分类来源相关的旧口径文档必须同步修订，避免继续写“文件名直接成为 category”

最终仍以：

```bash
npm run check:all
```

作为工程门禁。

另外，进入 implementation plan 前必须把以下旧约束视为失效，不得继续作为 package 范围真源：

1. `docs/superpowers/specs/2026-03-31-builtin-command-second-round-expansion-design.md`
2. `docs/superpowers/plans/2026-03-31-builtin-command-second-round-expansion.md`

尤其是其中关于：

- 不新增 `_pnpm.md` / `_bun.md` / `_npm.md`
- 不拆 `_package.md`

的约束，在本 spec 生效后全部失效。

---

## 10. 结论

本轮采用“文件级默认 + 行级覆盖”的运行时分类 DSL：

1. 保留 `1 md = 1 json`
2. 让文件名只承担模块职责
3. 让运行时 `category` 可以按文件默认值或按命令显式归并
4. 用 `package` 拆分和 `service/gh/docker-compose/kubernetes` 扩充作为首轮迁移样板

这能同时解决“维护粒度过粗”和“产品分类被文件结构绑死”两个问题，又不会把 DSL 和运行时链路复杂化到难以维护的程度。
