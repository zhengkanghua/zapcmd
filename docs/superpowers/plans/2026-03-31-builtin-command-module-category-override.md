# Builtin Command Module Category Override Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改 builtin runtime loader 结构的前提下，为 Markdown 命令源增加文件级 `运行时分类` 覆盖，并把 `package` 从单一 `_package.md` 拆成 7 个模块文件，运行时仍统一落到 `category=package`。

**Architecture:** 先用 generator 定向红灯锁住新 contract，再最小实现头部元数据解析、manifest/snapshot 字段切换与 stale JSON 清理。随后再做 `package` 命令源拆分、刷新生成产物，并用 runtime loader 回归证明运行时加载链无需结构性修改。实现期间始终保持 `1 md = 1 json`、logical/physical totals 不变，以及失败时不触发 stale 删除。

**Tech Stack:** PowerShell generator, Markdown command sources, TypeScript, Vitest, runtime command loader, generated JSON assets

---

## File Structure

### Contract / Generator

- Modify: `scripts/generate_builtin_commands.ps1`
  - 解析 `# _slug` + 首个连续 blockquote 元数据区。
  - 提取 `分类`、可选 `运行时分类`，并在缺省时回退到 `fileSlug`。
  - 将命令 `category` 改为写入 `runtimeCategory`。
  - 将 `index.json` / generated snapshot 改为 `moduleSlug + runtimeCategory` contract。
  - 在“全部解析成功后”执行 stale builtin JSON 清理。
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
  - 增加 override/fallback/header-failure/stale-cleanup 的 generator 回归测试。

### Runtime Verification

- Reference: `src/features/commands/runtimeLoader.ts`
  - 只读参照。按 spec 预期不需要结构性修改；若测试暴露真实冲突再回头评估。
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
  - 锁定拆分后的 `_npm/_pnpm/_yarn/_bun/_pip/_brew/_cargo.json` 会被正常加载。
  - 锁定这些命令仍只暴露 `category=package`。
  - 锁定 builtin 加载报告中不存在 stale `_package.json` 带来的 `duplicate-id` issue。

### Command Sources / Generated Assets

- Delete: `docs/command_sources/_package.md`
- Create: `docs/command_sources/_npm.md`
- Create: `docs/command_sources/_pnpm.md`
- Create: `docs/command_sources/_yarn.md`
- Create: `docs/command_sources/_bun.md`
- Create: `docs/command_sources/_pip.md`
- Create: `docs/command_sources/_brew.md`
- Create: `docs/command_sources/_cargo.md`
- Delete: `assets/runtime_templates/commands/builtin/_package.json`
- Create: `assets/runtime_templates/commands/builtin/_npm.json`
- Create: `assets/runtime_templates/commands/builtin/_pnpm.json`
- Create: `assets/runtime_templates/commands/builtin/_yarn.json`
- Create: `assets/runtime_templates/commands/builtin/_bun.json`
- Create: `assets/runtime_templates/commands/builtin/_pip.json`
- Create: `assets/runtime_templates/commands/builtin/_brew.json`
- Create: `assets/runtime_templates/commands/builtin/_cargo.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

### Docs / References

- Modify: `docs/command_sources/README.md`
  - 更新“文件名直接成为 category”的旧口径，补充头部 grammar 与 `运行时分类` 规则。
- Modify: `docs/schemas/README.md`
  - 将 builtin `category` 说明改成“默认回退到文件 slug，但可被文件级 `运行时分类` 覆盖”。
- Reference: `docs/superpowers/specs/2026-03-31-builtin-command-module-category-override-design.md`
- Reference: `docs/active_context.md`
- Reference: `assets/runtime_templates/commands/builtin/index.json`
- Reference: `docs/builtin_commands.generated.md`

---

## Chunk 1: Lock Generator Override Contract

### Task 1: 先锁“运行时分类覆盖 + manifest/snapshot 新字段”红灯

**Why first:** 这是本轮最小且最高价值的 5-10 分钟子任务。只改一处测试即可同时锁住 3 个核心风险：命令 `category` 写错、manifest 字段没切换、snapshot 表头仍沿用旧语义。

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Reference: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 写一个最小 failing test，覆盖 override contract**

```ts
it("applies file-level runtime category override and records module metadata", () => {
  writeFileSync(
    path.join(sourceDir, "_pnpm.md"),
    [
      "# _pnpm",
      "",
      "> 分类：PNPM",
      "> 运行时分类：package",
      "> 说明：此文件为 JSON 生成源（人维护）。",
      "",
      tableHeader,
      "| 1 | `pnpm-run` | PNPM 运行脚本 | all | `pnpm run {{script}}` | script(text) | - | false | pnpm | pnpm run script |"
    ].join("\\n"),
    "utf8"
  );

  expect(generated.commands[0]?.category).toBe("package");
  expect(manifest.generatedFiles[0]).toEqual({
    file: "_pnpm.json",
    sourceFile: "_pnpm.md",
    moduleSlug: "pnpm",
    runtimeCategory: "package",
    logicalCount: 1,
    physicalCount: 1
  });
  expect(snapshot).toContain("| File | Source | Module | Runtime Category | Logical | Physical |");
  expect(snapshot).toContain("| _pnpm.json | _pnpm.md | pnpm | package | 1 | 1 |");
});
```

- [ ] **Step 2: 运行 generator 定向测试，确认当前为红灯**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- FAIL，至少包含以下一种失败：
- `generated.commands[0].category` 实际为 `pnpm` 而不是 `package`
- `manifest.generatedFiles[0]` 仍输出旧字段 `category`
- generated snapshot 表头仍是 `Category`

- [ ] **Step 3: 在生成器里做最小实现，让 override contract 先变绿**

```powershell
$moduleSlug = $fileId.TrimStart('_')
$runtimeCategory = if ($headerMetadata.runtimeCategory) {
  $headerMetadata.runtimeCategory
} else {
  $moduleSlug
}

$cmd.category = $runtimeCategory

$manifestFiles += [pscustomobject][ordered]@{
  file = "$fileId.json"
  sourceFile = $summary.sourceFile
  moduleSlug = $summary.moduleSlug
  runtimeCategory = $summary.runtimeCategory
  logicalCount = $summary.logicalCount
  physicalCount = $summary.physicalCount
}
```

- [ ] **Step 4: 重新运行 generator 定向测试，确认 override contract 变绿**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- PASS
- 新测试通过
- 现有 `min/max` 与非法文件名测试不回归

- [ ] **Step 5: 提交最小 contract 红绿切换**

```bash
git add scripts/__tests__/generate-builtin-commands.test.ts \
  scripts/generate_builtin_commands.ps1
git commit -m "test(commands):锁定 builtin runtime 分类覆盖 contract"
```

---

## Chunk 2: Harden Header Grammar And Stale Cleanup

### Task 2: 补齐头部 grammar 的失败矩阵与缺省回退

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 追加 header grammar 红灯用例**

```ts
it("falls back to file slug when runtime category is omitted", () => {
  // _git.md 只写 # _git + > 分类：Git，不写 > 运行时分类：...
  expect(generated.commands[0]?.category).toBe("git");
  expect(manifest.generatedFiles[0]?.runtimeCategory).toBe("git");
});

it("rejects missing or invalid header metadata", () => {
  // case 1: 缺失 # _slug
  // case 2: # _slug 与文件名不一致
  // case 3: 缺失 > 分类：...
  // case 4: 重复/空值/非法 > 运行时分类：...
  expect(result.status).not.toBe(0);
});
```

- [ ] **Step 2: 跑 generator 测试，确认当前实现还没覆盖完整 grammar**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- FAIL
- 报错点至少覆盖一个 header grammar 场景，例如当前脚本接受了缺失 `# _slug` 的文件，或没有拒绝重复 `运行时分类`

- [ ] **Step 3: 在脚本中抽出头部解析 helper，并收紧失败矩阵**

```powershell
function Get-SourceHeaderMetadata {
  param([string[]]$Lines, [string]$ExpectedFileId)

  # 只解析首个一级标题与其后的首个连续 blockquote 元数据区
  # 强制要求 分类 必填，运行时分类可选但若出现必须唯一、非空、合法
}
```

- [ ] **Step 4: 重新跑 generator 测试，确认 fallback / failure matrix 全绿**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- PASS
- fallback 用例显示未写 `运行时分类` 时回退到文件 slug
- failure matrix 用例全部稳定拒绝非法头部

### Task 3: 锁 stale builtin JSON 清理 contract

**Files:**
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `scripts/generate_builtin_commands.ps1`

- [ ] **Step 1: 写“成功后删除 stale `_package.json`”红灯**

```ts
it("removes stale builtin json files after a successful generation", () => {
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, "_package.json"), "{\"commands\":[]}", "utf8");
  writeMarkdownFixtureForSplitModules(sourceDir);

  expect(result.status).toBe(0);
  expect(existsSync(path.join(outputDir, "_package.json"))).toBe(false);
});
```

- [ ] **Step 2: 写“解析失败时不删 stale 文件”红灯**

```ts
it("keeps stale builtin json files untouched when parsing fails", () => {
  writeBrokenMarkdownFixture(sourceDir);
  writeFileSync(path.join(outputDir, "_package.json"), "{\"commands\":[]}", "utf8");

  expect(result.status).not.toBe(0);
  expect(existsSync(path.join(outputDir, "_package.json"))).toBe(true);
});
```

- [ ] **Step 3: 跑 generator 测试，确认 stale cleanup 目前是红灯**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- FAIL
- 成功路径下 `_package.json` 仍残留
- 失败路径下当前实现没有 staged write / staged delete 语义

- [ ] **Step 4: 在生成器里实现 staged write + post-write stale delete**

```powershell
# 先完整构建 outputByFile / manifest / snapshot
# 全部成功后再写新文件
# 新文件、index.json、snapshot 全部写完后，对 outputDir 做 stale _*.json 删除
# 排除 index.json，且失败时返回非零并打印失败路径
```

- [ ] **Step 5: 重新跑 generator 测试，确认 stale cleanup contract 变绿**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected:
- PASS
- 成功路径会自动删除 `_package.json`
- 失败路径不会触发 stale 删除

- [ ] **Step 6: 提交 header grammar 与 stale cleanup**

```bash
git add scripts/__tests__/generate-builtin-commands.test.ts \
  scripts/generate_builtin_commands.ps1
git commit -m "feat(commands):收口 builtin 生成器头部元数据与清理契约"
```

---

## Chunk 3: Split Package Sources And Refresh Generated Assets

### Task 4: 先写 runtime loader 红灯，锁住“拆文件但分类不变”

**Files:**
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Reference: `src/features/commands/runtimeLoader.ts`

- [ ] **Step 1: 增加 builtin split 回归测试**

```ts
it("loads split package modules without introducing new runtime categories", () => {
  const loaded = loadBuiltinCommandTemplatesWithReport({ runtimePlatform: "win" });
  const categories = new Set(loaded.templates.map((item) => item.category));

  expect(loaded.templates.some((item) => item.id === "npm-install")).toBe(true);
  expect(loaded.templates.some((item) => item.id === "pnpm-run")).toBe(true);
  expect(loaded.templates.some((item) => item.id === "bun-run")).toBe(true);
  expect(loaded.templates.some((item) => item.id === "pip-freeze")).toBe(true);
  expect(loaded.templates.some((item) => item.id === "brew-list")).toBe(true);
  expect(loaded.templates.some((item) => item.id === "cargo-add")).toBe(true);

  expect(categories.has("package")).toBe(true);
  expect(categories.has("pnpm")).toBe(false);
  expect(categories.has("bun")).toBe(false);
  expect(
    loaded.issues.some((item) => item.code === "duplicate-id" && item.sourceId.includes("_package.json"))
  ).toBe(false);
});
```

- [ ] **Step 2: 跑 runtime loader 定向测试，确认当前资产下红灯**

Run: `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- FAIL
- 失败点应体现为 split 后的模块文件尚不存在，或 builtin report 尚未覆盖 stale `_package.json` 风险

### Task 5: 拆分 `docs/command_sources/_package.md` 并刷新生成产物

**Files:**
- Delete: `docs/command_sources/_package.md`
- Create: `docs/command_sources/_npm.md`
- Create: `docs/command_sources/_pnpm.md`
- Create: `docs/command_sources/_yarn.md`
- Create: `docs/command_sources/_bun.md`
- Create: `docs/command_sources/_pip.md`
- Create: `docs/command_sources/_brew.md`
- Create: `docs/command_sources/_cargo.md`
- Delete: `assets/runtime_templates/commands/builtin/_package.json`
- Create: `assets/runtime_templates/commands/builtin/_npm.json`
- Create: `assets/runtime_templates/commands/builtin/_pnpm.json`
- Create: `assets/runtime_templates/commands/builtin/_yarn.json`
- Create: `assets/runtime_templates/commands/builtin/_bun.json`
- Create: `assets/runtime_templates/commands/builtin/_pip.json`
- Create: `assets/runtime_templates/commands/builtin/_brew.json`
- Create: `assets/runtime_templates/commands/builtin/_cargo.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 按命令生态拆出 7 个 Markdown 源文件**

```md
# _pnpm

> 分类：PNPM
> 运行时分类：package
> 说明：此文件为 JSON 生成源（人维护）。
```

拆分原则：
- `npm-*` 留在 `_npm.md`
- `pnpm-*` 留在 `_pnpm.md`
- `yarn-*` 留在 `_yarn.md`
- `bun-*` 留在 `_bun.md`
- `pip-*` 留在 `_pip.md`
- `brew-*` 留在 `_brew.md`
- `cargo-*` 留在 `_cargo.md`

- [ ] **Step 2: 删除旧 `_package.md`，运行生成脚本刷新产物**

Run: `./scripts/generate_builtin_commands.ps1`

Expected:
- PASS
- 新增 7 个 `assets/runtime_templates/commands/builtin/_{npm,pnpm,yarn,bun,pip,brew,cargo}.json`
- 旧 `assets/runtime_templates/commands/builtin/_package.json` 被自动删除
- `index.json` 与 `docs/builtin_commands.generated.md` 被同步刷新

- [ ] **Step 3: 核对生成产物 totals 与 manifest contract**

Run: `node -e "const fs=require('fs');const p='assets/runtime_templates/commands/builtin/index.json';const j=JSON.parse(fs.readFileSync(p,'utf8'));console.log(j.logicalCommandCount,j.physicalCommandCount,j.generatedFiles.find(x=>x.moduleSlug==='pnpm'))"`

Expected:
- 输出 logical / physical 仍为 `255 300`
- `generatedFiles` 中存在 `moduleSlug: "pnpm"` 与 `runtimeCategory: "package"`
- 不再存在 `generatedFiles[].category`

- [ ] **Step 4: 重新运行 generator + runtime loader 定向测试**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- PASS
- runtime loader 仍只暴露 `package`，不会新增 `pnpm` / `bun` 分类
- builtin report 不出现 stale `_package.json` 导致的 `duplicate-id`

- [ ] **Step 5: 提交 package 模块拆分与生成产物**

```bash
git add docs/command_sources/_npm.md \
  docs/command_sources/_pnpm.md \
  docs/command_sources/_yarn.md \
  docs/command_sources/_bun.md \
  docs/command_sources/_pip.md \
  docs/command_sources/_brew.md \
  docs/command_sources/_cargo.md \
  docs/command_sources/_package.md \
  assets/runtime_templates/commands/builtin/_npm.json \
  assets/runtime_templates/commands/builtin/_pnpm.json \
  assets/runtime_templates/commands/builtin/_yarn.json \
  assets/runtime_templates/commands/builtin/_bun.json \
  assets/runtime_templates/commands/builtin/_pip.json \
  assets/runtime_templates/commands/builtin/_brew.json \
  assets/runtime_templates/commands/builtin/_cargo.json \
  assets/runtime_templates/commands/builtin/_package.json \
  assets/runtime_templates/commands/builtin/index.json \
  docs/builtin_commands.generated.md \
  src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands):拆分 package builtin 模块"
```

---

## Chunk 4: Align Docs And Run Final Verification

### Task 6: 修正文档口径，避免继续传播“文件名直接成为 category”

**Files:**
- Modify: `docs/command_sources/README.md`
- Modify: `docs/schemas/README.md`

- [ ] **Step 1: 先写 docs checklist，明确必须替换的旧口径**

```md
- “文件名去掉前缀 _ 后直接成为 builtin category” -> 改成“默认回退到文件 slug，可被 `运行时分类` 覆盖”
- 补头部 grammar：`# _slug` + 首个连续 blockquote 元数据区
- 补 manifest / snapshot 的 `moduleSlug + runtimeCategory` 语义
```

- [ ] **Step 2: 更新 `docs/command_sources/README.md`**

```md
3. 文件 slug 决定模块名与输出文件名；命令运行时 `category` 默认回退到 slug，也可由 `> 运行时分类：...` 覆盖。
4. 头部元数据区只解析首个一级标题之后的首个连续 blockquote 区块。
```

- [ ] **Step 3: 更新 `docs/schemas/README.md`**

```md
- builtin 与用户命令共用同一 slug 规则
- builtin 默认使用源文件 slug 写入 `category`
- 若 Markdown 头部声明 `运行时分类`，生成器会优先写入该值
```

- [ ] **Step 4: 跑文档关联的 generator / runtime 回归**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- PASS
- 文档更新不引入额外代码变更需求

### Task 7: 做最终验证并收口

**Files:**
- Reference: `scripts/generate_builtin_commands.ps1`
- Reference: `scripts/__tests__/generate-builtin-commands.test.ts`
- Reference: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Reference: `assets/runtime_templates/commands/builtin/index.json`
- Reference: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 运行生成器，确认工作区无额外漂移**

Run: `./scripts/generate_builtin_commands.ps1`

Expected:
- PASS
- 再次运行后无额外 diff

- [ ] **Step 2: 运行 focused tests**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected:
- PASS
- generator contract、split package、duplicate-id regression 全绿

- [ ] **Step 3: 运行 schema check**

Run: `npm run commands:schema:check`

Expected:
- PASS
- 新生成的 builtin JSON 全部满足 schema

- [ ] **Step 4: 运行全量工程门禁**

Run: `npm run check:all`

Expected:
- PASS
- lint -> typecheck -> test:coverage -> build -> check:rust 全绿

- [ ] **Step 5: 如 docs 变更尚未单独提交，则在这里完成 docs commit**

```bash
git add docs/command_sources/README.md \
  docs/schemas/README.md
git commit -m "docs(commands):更新 builtin 模块分类覆盖文档"
```

- [ ] **Step 6: 确认验证后工作区干净**

Run: `git status --short`

Expected:
- 无输出
- 若仍有 diff，只允许是本轮实现本身遗漏提交，禁止带着脏工作区结束

---

## Risks To Watch

- `scripts/generate_builtin_commands.ps1` 当前是单文件脚本，头部解析与 stale cleanup 很容易把“解析阶段”和“落盘阶段”搅在一起；实现时应优先抽 helper，避免再把责任堆回主循环。
- `runtimeLoader.ts` 依赖 `import.meta.glob(".../_*.json")`，因此 stale `_package.json` 风险只能靠生成器 contract 和 runtime report regression 双重兜底，不能只依赖人工删除。
- `docs/command_sources/README.md` 与 `docs/schemas/README.md` 当前都含有“文件名直接成为 category”的旧文案；如果漏改，后续执行者很容易按旧口径继续加 `_pnpm.md` 却忘记写 `运行时分类：package`。
- `package` 拆分后 logical/physical totals 应保持 `255 / 300`；若 totals 改变，优先排查命令迁移遗漏、平台拆分丢失或重复写入。

## Definition Of Done

- generator 支持头部 `运行时分类` 覆盖，并在缺省时回退到文件 slug。
- generator 会把 `index.json` / generated snapshot 切换到 `moduleSlug + runtimeCategory` contract。
- generator 在成功生成后会自动删除失去源文件映射的 stale builtin JSON；失败时不删除。
- `_package.md` 已拆为 7 个模块文件，所有新文件都显式写 `> 运行时分类：package`。
- runtime loader 回归证明拆分后仍只暴露 `package`，且不存在 stale `_package.json` 触发的 `duplicate-id` issue。
- `docs/command_sources/README.md`、`docs/schemas/README.md`、`assets/runtime_templates/commands/builtin/index.json`、`docs/builtin_commands.generated.md` 与新 contract 保持一致。
