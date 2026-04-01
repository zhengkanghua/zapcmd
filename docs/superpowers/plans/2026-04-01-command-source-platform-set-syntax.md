# Command Source Platform Set Syntax Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `docs/command_sources/_*.md` 的 `平台` 列增加数组/集合语法支持，同时保持 generated runtime JSON、schema 与 loader 契约不变。

**Architecture:** 这轮只升级 source DSL 解析层，不改 runtime 契约。实现将围绕 `scripts/generate_builtin_commands.ps1` 展开：新增平台集合解析与归一化 helper，让 generator 同时支持旧标量写法与新数组写法；最终仍输出单值 `platform` 的物理命令。验证以 generator 单测为主，再补 README 文档同步。

**Tech Stack:** PowerShell, Markdown command source DSL, JSON, Vitest

---

## File Structure

- Modify: `scripts/generate_builtin_commands.ps1`
  - 增加平台集合解析、归一化与物理命令展开逻辑；旧标量 DSL 保持兼容。
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
  - 新增数组单平台、双平台拆分、全平台归一化与非法数组报错测试。
- Modify: `docs/command_sources/README.md`
  - 更新 `平台` 列合法语法、示例、兼容规则与非法写法说明。
- Reference: `docs/superpowers/specs/2026-04-01-command-source-platform-set-syntax-design.md`
- Do Not Modify: `docs/schemas/command-file.schema.json`
- Do Not Modify: `src/features/commands/runtimeTypes.ts`
- Do Not Modify: `src/features/commands/runtimeLoader.ts`

## Chunk 1: Lock The Parsing Contract

### Task 1: 先用 generator tests 锁住新 DSL 行为

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`

- [ ] **Step 1: 为数组单平台写红灯**

```ts
it("accepts platform array with a single target", () => {
  // _network.md 平台列写 ["win"]
  // 期望生成一条 platform="win" 的命令，不追加 -win 后缀
});
```

- [ ] **Step 2: 为数组双平台拆分写红灯**

```ts
it("splits platform arrays into physical commands for non-all subsets", () => {
  // _network.md 平台列写 ["mac","linux"]
  // 期望生成 dig-short-mac / dig-short-linux
});
```

- [ ] **Step 3: 为数组全集归一化写红灯**

```ts
it("normalizes full platform arrays to all without extra physical split", () => {
  // 平台列写 ["win","mac","linux"]
  // 期望只生成一条 platform="all" 的命令
});
```

- [ ] **Step 4: 为非法数组写红灯**

```ts
it("rejects invalid platform arrays", () => {
  // ["all"], ["mac/linux"], [], [win,mac], ["win","win"], ["android"]
});
```

- [ ] **Step 5: 跑 generator focused test，确认当前为红灯**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`
Expected: FAIL，失败点集中在新平台数组语法尚未被 generator 识别。

## Chunk 2: Implement Platform Set Parsing

### Task 2: 在 generator 中新增平台集合解析与归一化

**Files:**
- Modify: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 抽取平台归一化 helper**

新增 helper，职责拆成两层：

1. `Parse-PlatformSpec`
   - 输入：原始单元格字符串
   - 输出：归一化后的平台集合或标量表示
2. `Normalize-PlatformTargets`
   - 输入：解析后的平台集合
   - 输出：固定顺序的唯一平台列表（`win -> mac -> linux`）

- [ ] **Step 2: 保持旧 DSL 向后兼容**

旧写法必须继续可用：

```powershell
"all"
"win"
"mac"
"linux"
"mac/linux"
```

行为要求：

- `all` 继续返回单条 `platform = "all"`
- `mac/linux` 继续展开为 `-mac / -linux`

- [ ] **Step 3: 支持数组 JSON 字面量**

新逻辑：

```powershell
if ($trimmed.StartsWith("[") -and $trimmed.EndsWith("]")) {
  # ConvertFrom-Json 解析
  # 验证数组成员只能是 win/mac/linux
}
```

校验点：

- 必须是字符串数组
- 不能空数组
- 不能重复
- 不允许 `all`
- 不允许 `mac/linux`

- [ ] **Step 4: 统一 physical split 规则**

把 `Get-PlatformVariants` 改成接收“归一化结果”而不是只接收旧字符串。

规则：

1. 全集 `win+mac+linux` -> 单条 `platform="all"`
2. 单元素集合 -> 单条该平台命令，不追加后缀
3. 非全集多平台集合 -> 拆成多条物理命令，并沿用现有后缀规则

- [ ] **Step 5: 保持 manifest 统计语义不变**

`logicalCount / physicalCount` 继续按现有规则统计：

1. 一行 source 记一次 `logical`
2. 拆分后的命令数计入 `physical`

## Chunk 3: Document The New DSL

### Task 3: 更新 README 中的平台字段说明

**Files:**
- Modify: `docs/command_sources/README.md`

- [ ] **Step 1: 更新合法写法说明**

把当前：

```md
`平台`：支持 `all / win / mac / linux / mac/linux`
```

改成同时覆盖：

```md
`平台`：支持旧标量写法 `all / win / mac / linux / mac/linux`，
也支持数组写法 `["win"] / ["mac","linux"] / ["win","mac","linux"]`
```

- [ ] **Step 2: 写清楚 `all` 与数组全集关系**

补充说明：

1. `all` 保留，推荐继续用于全平台命令
2. `["win","mac","linux"]` 会被归一化为 `all`
3. 数组内部只能出现基础平台值

- [ ] **Step 3: 补非法写法示例**

至少写明这些非法例子：

```md
["all"]
["mac/linux"]
[]
[win,mac]
["win","win"]
```

## Chunk 4: Verify Green

### Task 4: 跑绿色验证并确认不影响 runtime 契约

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `scripts/generate_builtin_commands.ps1`
- Modify: `docs/command_sources/README.md`

- [ ] **Step 1: 重新运行 generator focused tests**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`
Expected: PASS，新增数组语法测试和旧 DSL 回归测试全部通过。

- [ ] **Step 2: 运行 command schema sync 检查**

Run: `npm run commands:schema:check`
Expected: PASS，证明这轮没有误改 runtime schema 生成物。

- [ ] **Step 3: spot check runtime contract**

Run: `rg -n "export type RuntimePlatform|platform" src/features/commands/runtimeTypes.ts docs/schemas/command-file.schema.json`
Expected: 仍然看到 runtime platform 是单值枚举，没有被改成数组。

## Chunk 5: Context And Handoff

### Task 5: 更新短期记忆并准备执行

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 补一条计划阶段摘要**

```md
- 已落盘平台列数组语法实施计划：只升级 source DSL 与 generator/test/README，保留 `all` 和单值 runtime platform 契约，不做 schema/loader 改造。
```

- [ ] **Step 2: 整理执行入口**

Expected: 最终交付应明确实现只需读取：

1. `docs/superpowers/specs/2026-04-01-command-source-platform-set-syntax-design.md`
2. `docs/superpowers/plans/2026-04-01-command-source-platform-set-syntax.md`
3. `scripts/generate_builtin_commands.ps1`
4. `scripts/__tests__/generate-builtin-commands.test.ts`

