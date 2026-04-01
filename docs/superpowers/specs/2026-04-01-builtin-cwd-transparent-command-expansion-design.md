# builtin cwd-transparent 命令扩充设计

> 日期：2026-04-01
> 状态：approved-for-implementation
> 范围：在保持 builtin 不托管工作目录的前提下，扩充一批高频 cwd-transparent 命令，并收正 `pnpm/yarn` 两个已有命令的语义命名

---

## 1. 背景

当前 builtin command source 已拆分为 `npm / pnpm / yarn / bun / gh / network / dev ...` 多个模块，schema、generator 与 runtime loader 也已经稳定。

这轮不再讨论 JSON 结构扩展，而是只补“现在还常用、且能在当前 DSL 下稳定表达”的命令覆盖面。

用户额外确认了一个硬约束：

1. builtin 不提供“在哪个目录执行”的参数。
2. builtin 模板不内嵌 `cd {{dir}} && ...`。
3. 所有命令都默认在终端当前上下文执行。
4. 如果需要切目录，由执行流组合先跑 `cd`，再执行后续命令。

---

## 2. 本轮目标

### 2.1 要做

1. 补一批 cwd-transparent 的常用 builtin 命令。
2. 只修改：
   - `docs/command_sources/_*.md`
   - 对应生成产物
   - 必要的 runtime loader 测试
3. 顺手修正两个命名语义不准的命令：
   - `pnpm-install` -> `pnpm-add`
   - `yarn-install` -> `yarn-add`

### 2.2 明确不做

1. 不新增工作目录字段、`cwd` 参数或项目绑定能力。
2. 不改 schema，不新增 JSON 顶层字段。
3. 不改执行链、预检链或 danger 策略。
4. 不在 builtin 层表达“先 cd 再执行”。
5. 不引入依赖复杂 shell escaping 的任意脚本形态。

---

## 3. 设计原则

### 3.1 cwd-transparent

本轮所有命令都只表达其原生命令模板，不托管目录切换。例如：

- `npm ci`
- `pnpm install`
- `yarn dlx {{package}}`
- `gh pr diff {{pr}}`

它们都只依赖“当前终端上下文”，而不是显式路径参数。

### 3.2 优先补高频一次性动作

优先追加：

1. 包管理项目安装 / 临时执行
2. 常见 API 调试请求
3. GitHub CLI 排查与触发
4. Windows 下 dev 工具 parity

这类命令都能在单次调用里完成，不依赖前序交互 shell 状态。

### 3.3 保持分类不漂移

尽管 source 文件已经拆成 `_npm.md`、`_pnpm.md`、`_yarn.md`，运行时 `category` 仍必须继续落到 `package`，不能引入 `npm/pnpm/yarn` 新 runtime 分类。

### 3.4 语义命名要和模板一致

若模板表达的是“添加依赖”，命令 ID/名称就不能写成“项目安装”。因此：

1. `pnpm add {{package}}` 应该对应 `pnpm-add`
2. `yarn add {{package}}` 应该对应 `yarn-add`
3. 真正的项目安装另补 `pnpm install` / `yarn install`

---

## 4. 本轮纳入清单

### 4.1 package

#### `npm`

1. `npm-install-project`
2. `npm-ci`
3. `npx-run`

#### `pnpm`

1. `pnpm-add`（由原 `pnpm-install` 收正）
2. `pnpm-install-project`
3. `pnpm-add-dev`
4. `pnpm-dlx`

#### `yarn`

1. `yarn-add`（由原 `yarn-install` 收正）
2. `yarn-install-project`
3. `yarn-add-dev`
4. `yarn-dlx`

### 4.2 network

1. `curl-json-post`
2. `curl-json-put`
3. `curl-json-delete`
4. `curl-form-post`
5. `dig-short`

### 4.3 gh

1. `gh-pr-diff`
2. `gh-workflow-run`
3. `gh-run-rerun`
4. `gh-run-download`

### 4.4 dev

1. `uuid-gen-win`
2. `base64-encode-win`
3. `base64-decode-win`
4. `sha256-hash-win`
5. `regex-test-win`

---

## 5. 文件组织决策

| 模块 | 文件 | 说明 |
|---|---|---|
| npm | `docs/command_sources/_npm.md` | 保持 `package` runtime category，不新增 runtime 分类 |
| pnpm | `docs/command_sources/_pnpm.md` | 收正 `pnpm-install` 命名，并补项目安装/临时执行 |
| yarn | `docs/command_sources/_yarn.md` | 收正 `yarn-install` 命名，并补项目安装/临时执行 |
| network | `docs/command_sources/_network.md` | 追加 JSON/Form API 调试命令 |
| gh | `docs/command_sources/_gh.md` | 追加 PR diff / workflow run / rerun / artifact download |
| dev | `docs/command_sources/_dev.md` | 补 Windows parity |

只允许通过 `scripts/generate_builtin_commands.ps1` 刷新生成产物。

---

## 6. 测试策略

这轮不需要改 schema test；最合适的红绿灯放在 `src/features/commands/__tests__/runtimeLoader.test.ts`。

要锁的内容：

1. 新命令 ID 能被加载。
2. 平台拆分正确。
3. `package` 仍然只落在 `package` category。
4. `pnpm-install` / `yarn-install` 被新语义 ID 替换，不再继续保留旧误导命名。

---

## 7. 风险与收口

### 7.1 风险

1. `curl` 写操作模板的引号在不同 shell 下表现不完全一致。
2. `PowerShell` 的 base64 / regex / sha256 写法若模板转义不当，容易破坏生成后的 JSON。
3. 命令改名后若有外部硬编码旧 ID，会出现兼容性差异。

### 7.2 收口策略

1. 只使用当前 DSL 已经稳定支持的参数形态。
2. 先写 `runtimeLoader` 红灯，再修改 command source。
3. 生成后跑 focused tests，最后至少跑 `commands:schema:check` 与相关 test。

---

## 8. 结论

本轮应被视为“命令覆盖扩充 + 两个语义命名收正”，而不是结构性改造。

落地边界非常明确：

1. builtin 继续 cwd-transparent
2. 目录切换继续交给执行流组合
3. schema 不扩
4. 只补 source / generated artifacts / runtime loader tests
