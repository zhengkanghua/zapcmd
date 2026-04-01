# command source 平台集合语法设计

> 日期：2026-04-01
> 状态：for-review
> 范围：仅升级 `docs/command_sources/_*.md` 的 `平台` 列 DSL，支持数组/集合写法；生成后的 runtime JSON、schema 与 loader 契约保持不变

---

## 1. 背景

当前 builtin command source 的 `平台` 列只支持这几种字符串：

1. `all`
2. `win`
3. `mac`
4. `linux`
5. `mac/linux`

这套写法对当前需求是够用的，但有两个问题：

1. `mac/linux` 是特例字符串，不具备一般化表达能力。
2. 一旦以后需要表达 `win/mac`、`win/linux` 或任意平台子集，现有 DSL 会继续膨胀成更多魔法字符串。

用户提出的方向是把 `平台` 搞成“数组”的概念，这个方向合理，但需要区分 source DSL 与 runtime JSON 两层。

---

## 2. 设计结论

### 2.1 保持 runtime JSON 不变

生成后的 runtime JSON 继续保持当前契约：

- `platform` 仍然是单值枚举：`all / win / mac / linux`
- loader 继续按单平台过滤
- schema 不改

原因：

1. 当前运行时类型与 schema 都是单值平台枚举。
2. runtime loader 的过滤逻辑也围绕单值平台实现。
3. 生成器已经承担了“逻辑命令 -> 物理命令”的平台拆分职责。

因此，平台集合语法只应存在于 source DSL 层，不应该直接渗透到 runtime JSON 层。

### 2.2 只升级 source DSL

`docs/command_sources/_*.md` 的 `平台` 列新增“平台集合语法”，供维护者书写：

1. 继续支持旧写法：`all / win / mac / linux / mac/linux`
2. 新增数组写法：
   - `["win"]`
   - `["mac","linux"]`
   - `["win","mac"]`
   - `["win","mac","linux"]`

数组语法只在 source 中存在，generator 会把它 normalize 成当前运行时能够理解的物理命令集合。

### 2.3 `all` 保留，不废弃

虽然引入了数组语法，但 `all` 不应废弃。

原因：

1. `all` 语义清楚，表达“全平台命令”比 `["win","mac","linux"]` 更简洁。
2. 绝大多数跨平台命令本来就适合写 `all`。
3. 如果强制全平台都写数组，只会增加样板而不增加信息量。

最终规则：

1. 维护者可以继续写 `all`
2. 也可以写数组
3. generator 会把 `["win","mac","linux"]` 自动视为 `all`

---

## 3. Source DSL 新规则

### 3.1 合法写法

`平台` 列新增以下合法输入：

1. 旧标量：
   - `all`
   - `win`
   - `mac`
   - `linux`
   - `mac/linux`
2. 新数组：
   - `["win"]`
   - `["mac"]`
   - `["linux"]`
   - `["mac","linux"]`
   - `["win","mac"]`
   - `["win","linux"]`
   - `["win","mac","linux"]`

### 3.2 非法写法

以下都应直接报错：

1. `["all"]`
2. `["mac/linux"]`
3. `["win","win"]`
4. `["android"]`
5. `[]`
6. `[win,mac]`
7. `win/mac`

理由：

1. `all` 是标量语义，不应嵌入数组
2. 数组内部成员必须是基础平台值，不允许再嵌套旧 DSL
3. 必须去重且不能为空
4. 当前产品只支持 `win / mac / linux`
5. 为避免维护歧义，数组必须是合法 JSON 字面量

---

## 4. Generator 归一化规则

### 4.1 解析阶段

generator 在读取 `平台` 列时，按以下顺序判断：

1. 若单元格是旧标量写法，按旧逻辑处理
2. 若单元格以 `[` 开头、以 `]` 结尾，按 JSON 数组解析
3. 其余情况直接报错

### 4.2 集合归一化

数组解析成功后，归一化为去重后的平台集合，合法成员仅允许：

1. `win`
2. `mac`
3. `linux`

归一化顺序固定为：

1. `win`
2. `mac`
3. `linux`

这样可以避免同一集合因为顺序不同而导致生成产物漂移。

### 4.3 与 `all` 的关系

当集合恰好等于 `["win","mac","linux"]` 时，归一化结果视为 `all`。

也就是说：

- `all`
- `["win","mac","linux"]`

在生成后的 runtime JSON 中应得到同样的结果：单条命令，`platform = "all"`。

### 4.4 子集拆分规则

如果平台集合不是全平台集合，则继续采用“拆成物理命令”的现有策略：

1. 单平台集合：
   - `["win"]` -> 一条命令，`platform = "win"`
2. 双平台集合：
   - `["mac","linux"]` -> 两条物理命令
   - `["win","mac"]` -> 两条物理命令
   - `["win","linux"]` -> 两条物理命令

当一条逻辑命令拆成多个物理命令时，ID 继续沿用当前 generator 规则追加平台后缀：

- `dig-short` -> `dig-short-mac` / `dig-short-linux`
- `foo` -> `foo-win` / `foo-mac`

这保证 runtime JSON 仍然维持“单命令单平台”的现有形态。

---

## 5. 为什么不直接把 runtime JSON 改成数组

表面上看，把 runtime JSON 也改成数组会更“统一”，但这轮不建议这么做。

因为这会连带改动：

1. `docs/schemas/command-file.schema.json`
2. `src/features/commands/runtimeTypes.ts`
3. `src/features/commands/runtimeLoader.ts`
4. duplicate-id / sourceByCommandId 的合并语义
5. 现有依赖物理命令拆分的测试与 manifest 统计

这些都不是 source DSL 升级本身的必要成本。

因此更合理的边界是：

1. source DSL 提升表达力
2. generator 做 normalize
3. runtime 契约保持稳定

---

## 6. 文档与测试影响

### 6.1 需要更新

1. `docs/command_sources/README.md`
   - 平台列合法写法
   - 数组语法示例
   - `all` 与数组集合的关系
2. `scripts/generate_builtin_commands.ps1`
   - 平台列解析与归一化
3. `scripts/__tests__/generate-builtin-commands.test.ts`
   - 数组单平台
   - 数组双平台拆分
   - 数组全平台归一化为 `all`
   - 非法数组报错

### 6.2 不需要改

1. `docs/schemas/command-file.schema.json`
2. `src/features/commands/runtimeTypes.ts`
3. `src/features/commands/runtimeLoader.ts`

---

## 7. 兼容性策略

这是一次 source DSL 向后兼容升级。

要求：

1. 仓库里现有 `all / win / mac / linux / mac/linux` 全部继续可用
2. 新数组语法与旧写法并存
3. 生成产物在“语义相同”的情况下不应出现额外结构变化

也就是说，这不是一轮全仓语法迁移，而是先支持新写法。

是否要把现有 `mac/linux` 逐步迁移成数组，应该作为后续单独决策，而不是本轮强制动作。

---

## 8. 推荐落地方案

推荐按两步走：

### 第一步

只做“支持新语法 + 保持旧语法”的 generator 升级：

1. README 更新
2. generator 增强
3. generator tests 增强

### 第二步

视维护体验再决定是否要批量把现有 `mac/linux` source 改写成数组语法。

这样可以把“语法能力升级”和“全仓格式迁移”拆开，避免一次性引入大量无业务价值的 churn。

---

## 9. 结论

本轮最合理的方案不是“删除 `all` 并把 runtime JSON 也改成数组”，而是：

1. 保留 `all`
2. 让 source DSL 支持数组平台集合
3. generator 负责归一化
4. generated runtime JSON 保持当前单平台契约

这样既能提升维护表达力，也不会打穿现有运行时模型。
