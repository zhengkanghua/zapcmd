# Command Catalog Track A Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不处理 session 持久化与 Track B 拆边界的前提下，完成命令目录 Track A：user command 单文件隔离失败、Rust scan/read 两阶段、前端增量缓存 + locale remap、builtin `Base YAML + locale overlay` 多语言真源。

**Architecture:** 先在 Rust/Tauri 暴露 additive 的 `scan_user_command_files` / `read_user_command_file` 两阶段接口，并暂时保留旧的 `read_user_command_files` 兼容垫片，先把“单文件坏掉拖垮整批”的问题收掉。随后前端新增 `UserCommandSourceCache`，以 scan 元数据为准只重读变化文件，locale 切换时只重映射内存中的 builtin/user payload，不重新扫磁盘。最后把 builtin 生成链升级为 `base yaml + locale overlay + locale config -> runtime json + generated docs`，再批量迁移所有 builtin 模块到 `zh/en` overlay，并移除临时兼容分支。

**Tech Stack:** Tauri 2 / Rust / Vue 3 / TypeScript / Vitest / cargo test / Node.js scripts / YAML / AJV standalone validator

---

## Scope Guard

- 只覆盖 Track A，不进入 `src-tauri/src/terminal.rs`、`runtime.ts`、`LauncherWindow.vue`、`LauncherQueueReviewPanel.vue` 的 Track B 拆分。
- 不处理 launcher session 持久化。
- builtin 首批强制语言只有 `zh` / `en`。
- user command 继续支持单文件 inline 多语言 JSON，不强迫用户采用 overlay 目录结构。
- 搜索仍使用本地化后的 `title` / `description` / `preview` 等既有字段；本轮不把 tags 升级为多语言主入口。
- 中间 chunk 允许存在“兼容窗口”，但每个 chunk 结束都必须有定向测试兜底，并且主链保持可运行。

## 当前链路事实

- `src-tauri/src/command_catalog.rs` 当前只提供 `read_user_command_files()`，内部逐文件 `?` 返回；任何单文件读取失败都会直接中止整批 payload。
- `src/composables/launcher/useCommandCatalog.ts` 目前依赖整批 `UserCommandJsonFile[]`，locale watcher 会把 `lastSignature` 清空并重新走一轮后端读取。
- `src/features/commands/runtimeTypes.ts` 已支持大多数 localized object，但 `RuntimeCommandArg.placeholder` 仍是单字符串，不能完整承接 overlay 文案。
- `src/features/commands/runtimeMapper.ts` 仍硬编码 locale fallback 顺序，没有和 builtin locale config 对齐。
- `scripts/commands/catalogGenerator/parseYamlCatalog.mjs` 仍强制 `meta.name`、`command.name` 位于单个 base YAML 中，不能表达结构/翻译分离。
- `commands/catalog/README.md` 仍声明 `commands/catalog/_*.yaml` 是 builtin 命令唯一真源，尚未描述 `commands/catalog/locales/`。

## File Structure

### Backend: user command transport contract

- `src-tauri/src/command_catalog.rs`
  只保留 home dir / commands dir 解析、Tauri command facade 和过渡期兼容垫片；scan/read 细节下沉到子模块。
- `src-tauri/src/command_catalog/contracts.rs`
  新增。只定义 serde payload：scan entry、scan issue、scan result、single-file read payload。
- `src-tauri/src/command_catalog/scan.rs`
  新增。只负责递归扫描、`modified_ms/size` 采集、按路径排序和 non-fatal scan issue 聚合。
- `src-tauri/src/command_catalog/read.rs`
  新增。只负责单文件读取与 metadata 二次确认。
- `src-tauri/src/lib.rs`
  注册新 invoke command；chunk 2 完成前保留旧 `read_user_command_files`。
- `src-tauri/src/command_catalog/tests_io.rs`
  扩展单元测试，锁住 scan/read 契约和兼容垫片行为。

### Frontend: command source cache and issue surface

- `src/features/commands/userCommandSourceTypes.ts`
  新增。定义 scan/read payload、cache entry 和 Tauri bridge 用的共享前端类型。
- `src/features/commands/runtimeIssues.ts`
  新增。集中定义 `CommandLoadIssueCode` / `CommandLoadIssueStage` / issue factory，补齐 `scan-failed`。
- `src/features/commands/userCommandSourceCache.ts`
  新增。缓存 `path -> scan metadata -> raw content -> parsed payload -> issues`，提供 `refreshFromScan()` / `remapFromCache()`。
- `src/features/commands/runtimeLoader.ts`
  只保留 builtin 读取、runtime payload 校验、template merge；不再承担整批后端读取职责。
- `src/composables/launcher/useCommandCatalog.ts`
  退回为 orchestration：backend scan/read、builtin reload、user cache remap、merged template 应用。
- `src/features/settings/types.ts`
  扩展 `scan` stage 和 `scan-failed` code。
- `src/composables/settings/useCommandManagement/issues.ts`
  只负责新旧 issue stage/code 的展示文案。
- `src/i18n/messages.ts`
  为 `scan` stage、新增的 issue summary 补齐 `zh/en` 文案。

### Generator: builtin locale source and runtime locale policy

- `commands/catalog/locales/config.yaml`
  新增。保存 `defaultLocale`、`requiredBuiltinLocales`、`supportedLocales`、`fallbackOrder`。
- `scripts/commands/catalogGenerator/readCatalogLocaleConfig.mjs`
  新增。解析 locale config。
- `scripts/commands/catalogGenerator/parseYamlCatalogLocaleOverlay.mjs`
  新增。读取单个 locale overlay 文件并校验 key 形状。
- `scripts/commands/catalogGenerator/mergeCatalogLocales.mjs`
  新增。把 base + overlays 合并成 localized catalog view model。
- `scripts/commands/catalogGenerator/parseYamlCatalog.mjs`
  退回为 base parser；chunk 3 过渡期支持 legacy inline text fallback，chunk 4 迁移完成后再删除。
- `scripts/commands/catalogGenerator/buildRuntimeJson.mjs`
  消费 localized catalog，输出 runtime localized object，并把 locale metadata 写入 manifest。
- `scripts/commands/catalogGenerator/buildGeneratedMarkdown.mjs`
  使用 `defaultLocale` 解析后的文案生成 docs，避免 Markdown 被双语内容撑爆。
- `scripts/commands/catalogGenerator/writeCatalogManifest.mjs`
  在 `index.json` 中写入 `localeConfig` 和 counts。
- `src/features/commands/runtimeLocale.ts`
  新增。读取 generated builtin manifest，按当前 locale 生成 fallback candidate list。
- `src/features/commands/runtimeTypes.ts`
  最小化扩展 runtime schema 相关类型，重点把 `RuntimeCommandArg.placeholder` 改成 `RuntimeLocalizedTextOrString`。
- `docs/schemas/command-file.schema.json`
  扩展 placeholder 等本轮必须本地化字段的 schema。
- `src/features/commands/generated/commandSchemaValidator.ts`
  由 `npm run commands:schema:generate` 重新生成，不手改。

## Chunk Overview

| Chunk | 目标 | 完成门槛 |
|---|---|---|
| 1 | Rust scan/read 两阶段契约落地，旧聚合读取先保留 | Rust 定向测试全绿，scan/read API 可用，旧前端不受影响 |
| 2 | 前端切到增量 cache + locale remap，并移除旧 bulk-read 路径 | locale 切换不重读磁盘，修改单文件只重读单文件，Settings 能区分 `scan/read/parse/schema/merge/command` |
| 3 | locale config / overlay 生成基础设施 + runtime locale fallback / localized placeholder 契约 | generator fixture 测试和 runtime i18n/schema 测试全绿，repo 仍兼容未迁移的 legacy base YAML |
| 4 | 所有 builtin 模块迁移到 `zh/en` overlays，删除 generator 过渡兼容分支，重新生成全部产物 | `npm run commands:builtin:generate -- --expectedLogicalCount 357`、定向命令测试、`npm run check:all` 全绿 |

## Chunk 1: Rust scan/read Two-Phase Contract

### Task 1.1: 定义 scan/read Rust contract，并先用测试锁住“单文件坏掉不拖垮整批”

**Files:**
- Create: `src-tauri/src/command_catalog/contracts.rs`
- Create: `src-tauri/src/command_catalog/scan.rs`
- Create: `src-tauri/src/command_catalog/read.rs`
- Modify: `src-tauri/src/command_catalog.rs`
- Test: `src-tauri/src/command_catalog/tests_io.rs`

- [ ] **Step 1: 先写失败的 Rust tests**

```rust
#[test]
fn scan_user_command_files_collects_nonfatal_scan_issues_and_keeps_good_json_files() {
    // 目录里同时存在:
    // 1. 可读 json
    // 2. metadata / file_type 故障项
    // 断言 scan result 仍返回 good files，并把问题落到 issues[]
}

#[test]
fn read_user_command_file_returns_single_file_payload_without_touching_other_entries() {
    // 断言 path/content/modified_ms/size 都来自目标文件
}

#[test]
fn read_user_command_files_legacy_wrapper_still_reads_all_scanned_files_during_transition() {
    // 过渡期兼容：旧 bulk wrapper 由 scan + per-file read 组合而成
}
```

- [ ] **Step 2: 运行定向测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io -- --nocapture`

Expected: FAIL，提示新的 scan/read 函数、payload struct 或兼容 wrapper 尚未定义。

- [ ] **Step 3: 实现最小 contract 与 scan/read 模块**

```rust
#[derive(serde::Serialize)]
pub(crate) struct UserCommandFileScanEntry {
    path: String,
    modified_ms: u64,
    size: u64,
}

#[derive(serde::Serialize)]
pub(crate) struct UserCommandFileScanIssue {
    path: String,
    reason: String,
}

#[derive(serde::Serialize)]
pub(crate) struct UserCommandFileScanResult {
    files: Vec<UserCommandFileScanEntry>,
    issues: Vec<UserCommandFileScanIssue>,
}

pub(crate) fn scan_user_command_files() -> Result<UserCommandFileScanResult, String> { /* ... */ }
pub(crate) fn read_user_command_file(path: &Path) -> Result<UserCommandFile, String> { /* ... */ }
```

实现要求：
- `scan_user_command_files()` 只为根级目录不可解析/不可创建返回 `Err(String)`。
- 单个 entry 的 `read_dir` / `file_type` / `metadata` 故障都写入 `issues[]`，不让整个 scan 提前失败。
- `files[]` 按 path 排序，保证 cache signature 稳定。
- `read_user_command_file()` 只读单文件，并重新读取 `modified_ms/size`，避免 scan metadata 与 read metadata 脱节。

- [ ] **Step 4: 运行定向测试确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io -- --nocapture`

Expected: PASS，新增 scan/read 测试和既有目录辅助函数测试全部通过。

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/command_catalog.rs src-tauri/src/command_catalog src-tauri/src/lib.rs
git commit -m "feat(commands): 新增用户命令 scan/read Rust 契约"
```

### Task 1.2: 暴露新的 Tauri commands，但保留旧 bulk-read 兼容垫片一轮

**Files:**
- Modify: `src-tauri/src/command_catalog.rs`
- Modify: `src-tauri/src/lib.rs`
- Test: `src-tauri/src/command_catalog/tests_io.rs`

- [ ] **Step 1: 先补失败测试，锁住过渡期命令面**

```rust
#[test]
fn legacy_read_user_command_files_now_delegates_to_scan_plus_single_file_read() {
    // 断言旧命令仍可用，但内部行为不再直接“整批 read”
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io::legacy_read_user_command_files_now_delegates_to_scan_plus_single_file_read -- --exact`

Expected: FAIL，提示旧 wrapper 仍是直接整批读取或新命令尚未注册。

- [ ] **Step 3: 暴露命令并保持过渡兼容**

```rust
#[tauri::command]
pub(crate) fn scan_user_command_files() -> Result<UserCommandFileScanResult, String> { /* ... */ }

#[tauri::command]
pub(crate) fn read_user_command_file(path: String) -> Result<UserCommandFile, String> { /* ... */ }

#[tauri::command]
pub(crate) fn read_user_command_files() -> Result<Vec<UserCommandFile>, String> {
    let scan = scan_user_command_files()?;
    scan.files
        .into_iter()
        .map(|entry| read_user_command_file(entry.path))
        .collect()
}
```

实现要求：
- `src-tauri/src/lib.rs` 先新增 `scan_user_command_files` / `read_user_command_file`，但不要在本 chunk 删除 `read_user_command_files`。
- 在 `command_catalog.rs` 内写清楚注释：旧 bulk-read wrapper 只用于前端切换窗口，chunk 2 完成后删除。

- [ ] **Step 4: 重新运行 Rust 定向测试**

Run: `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io -- --nocapture`

Expected: PASS，兼容 wrapper 测试与新增 scan/read 测试同时通过。

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/command_catalog.rs src-tauri/src/command_catalog src-tauri/src/lib.rs
git commit -m "feat(commands): 暴露命令目录 scan/read Tauri 接口"
```

**Chunk 1 Exit Criteria**

- Rust 侧已有 `scan_user_command_files` / `read_user_command_file` 可调用。
- 旧 `read_user_command_files` 仍可用，前端还没切换之前不破坏现有行为。
- `src-tauri/src/command_catalog.rs` 明显变薄，scan/read 细节不继续堆在单文件里。

**Chunk 1 Rollback Point**

- 这是 additive chunk。若后续前端切换失败，只需回滚 `lib.rs` 的 invoke 注册与新模块文件即可，旧 `read_user_command_files` 主路径仍完好。

## Chunk 2: Frontend Incremental Cache and Locale Remap

### Task 2.1: 定义前端 scan/read 类型、issue model 和 bridge contract

**Files:**
- Create: `src/features/commands/userCommandSourceTypes.ts`
- Create: `src/features/commands/runtimeIssues.ts`
- Modify: `src/services/tauriBridge.ts`
- Modify: `src/services/__tests__/tauriBridge.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/ports.ts`
- Modify: `src/composables/__tests__/app/settingsEntry.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 写失败测试，先锁住新的 bridge / ports 形状**

```ts
it("bridges scan_user_command_files and normalizes scan payload", async () => {
  // 断言 invoke("scan_user_command_files") -> files[] + issues[]
});

it("bridges read_user_command_file and normalizes modifiedMs/size", async () => {
  // 断言 invoke("read_user_command_file", { path }) -> 单文件 payload
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts`

Expected: FAIL，提示 bridge/ports 中缺少 `scanUserCommandFiles` / `readUserCommandFile`，或旧 mock 还在返回 `read_user_command_files`。

- [ ] **Step 3: 实现 TS contract，但暂时保留旧 bridge 仅作兼容**

```ts
export interface UserCommandFileScanEntry {
  path: string;
  modifiedMs: number;
  size: number;
}

export interface UserCommandFileScanIssue {
  path: string;
  reason: string;
}

export interface UserCommandFileScanResult {
  files: UserCommandFileScanEntry[];
  issues: UserCommandFileScanIssue[];
}

export type CommandLoadIssueStage = "scan" | "read" | "parse" | "schema" | "merge" | "command";
export type CommandLoadIssueCode =
  | "scan-failed"
  | "read-failed"
  | "invalid-json"
  | "invalid-schema"
  | "duplicate-id"
  | "invalid-command-config";
```

实现要求：
- `tauriBridge.ts` 新增 `scanUserCommandFiles()` 和 `readUserCommandFile(path)`。
- `ports.ts` 和相关 app tests 先加新 ports，不立即删除旧 `readUserCommandFiles`，把删除留到 Task 2.3。
- `runtimeIssues.ts` 统一收口 issue code/stage 和 factory，包括 `createScanFailedIssue()`、`createReadFailedIssue()`。

- [ ] **Step 4: 运行 bridge / port 定向测试**

Run: `npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts`

Expected: PASS，Tauri invoke 命令名、ports stubs 和旧 Settings mock 都已经切到 scan/read 口径。

- [ ] **Step 5: Commit**

```bash
git add src/features/commands/userCommandSourceTypes.ts src/features/commands/runtimeIssues.ts src/services/tauriBridge.ts src/services/__tests__/tauriBridge.test.ts src/composables/app/useAppCompositionRoot/ports.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts
git commit -m "feat(commands): 新增前端命令目录 scan/read 契约"
```

### Task 2.2: 引入 UserCommandSourceCache，并把 locale 切换改成 remap cache

**Files:**
- Create: `src/features/commands/userCommandSourceCache.ts`
- Modify: `src/features/commands/runtimeLoader.ts`
- Modify: `src/composables/launcher/useCommandCatalog.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Test: `src/composables/__tests__/launcher/useCommandCatalog.test.ts`
- Test: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 先写失败测试，锁住“locale 切换不重读磁盘、改单文件只重读单文件”**

```ts
it("remaps cached user payloads on locale change without calling scan/read again", async () => {
  // 断言 locale 从 zh-CN -> en-US 时，不再调用 scan/read mock
});

it("only re-reads changed files after scan metadata changes", async () => {
  // 初次 scan 返回 a.json / b.json
  // 第二次 scan 只提升 a.json 的 modifiedMs，断言只 read a.json
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: FAIL，当前实现仍整批读文件，locale watcher 仍会走后端。

- [ ] **Step 3: 实现 cache，并把 runtimeLoader 改成“吃 payload，不管来源”**

```ts
export interface CachedUserCommandSourceEntry {
  path: string;
  modifiedMs: number;
  size: number;
  content?: string;
  parsedPayload?: unknown;
  issues: CommandLoadIssue[];
}

export function createUserCommandSourceCache(/* ports */) {
  async function refreshFromScan(): Promise<CachedLoadResult> { /* compare scan metadata, read changed paths only */ }
  function remapFromCache(): CachedLoadResult { /* builtin reload + cached payload remap only */ }
  return { refreshFromScan, remapFromCache, clear, hasPrimedScan };
}
```

实现要求：
- `useCommandCatalog.ts` 中 locale watcher 不再 `resetLastSignature + refreshUserCommands()`，而是：
  1. builtin 重新 map；
  2. 若 user cache 已预热，则 `remapFromCache()`；
  3. 若 cache 尚未预热，才首次走 `refreshFromScan()`。
- `runtimeLoader.ts` 暴露“从 payload entry 列表加载 templates”的纯函数，让 cache 既能复用 parsed payload，也能统一 merge duplicate-id / invalid-command-config。
- `useCommandCatalog.ts` 保持对外 API 不变：仍然暴露 `commandTemplates` / `allCommandTemplates` / `loadIssues` / `refreshUserCommands()`。

- [ ] **Step 4: 运行定向测试**

Run: `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: PASS，locale remap 不再触发磁盘读取，scan metadata 只重读变化文件。

- [ ] **Step 5: Commit**

```bash
git add src/features/commands/userCommandSourceCache.ts src/features/commands/runtimeLoader.ts src/composables/launcher/useCommandCatalog.ts src/composables/app/useAppCompositionRoot/settingsScene.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands): 引入用户命令增量缓存与 locale remap"
```

### Task 2.3: Settings issue surface 切到 scan/read 分层，并删除旧 bulk-read 路径

**Files:**
- Modify: `src/features/settings/types.ts`
- Modify: `src/composables/settings/useCommandManagement/issues.ts`
- Modify: `src/i18n/messages.ts`
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
- Modify: `src/services/tauriBridge.ts`
- Modify: `src/composables/app/useAppCompositionRoot/ports.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src-tauri/src/command_catalog.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: 写失败测试，锁住新的 issue stage/code 和旧 bulk-read 删除后的行为**

```ts
it("formats scan issues separately from read issues", () => {
  // issue.stage === "scan" -> 使用新的 stage label 和 summary 文案
});

it("no longer invokes read_user_command_files after cache migration", async () => {
  // settings/launcher 相关测试中，不应再出现旧命令名
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/services/__tests__/tauriBridge.test.ts`

Expected: FAIL，当前 union type / i18n message / invoke name 仍未完成切换。

- [ ] **Step 3: 更新 Settings 文案并移除旧 `read_user_command_files`**

```ts
if (issue.stage === "scan") {
  return t("settings.commands.issueStageScan");
}

if (issue.code === "scan-failed") {
  summary = t("settings.commands.issueScanFailed", { sourceId: issue.sourceId });
}
```

实现要求：
- `features/settings/types.ts`、`useCommandManagement/issues.ts`、`messages.ts` 全部补齐 `scan` stage / `scan-failed` code 的 `zh/en` 文案。
- `tauriBridge.ts`、`ports.ts`、`settingsScene.ts`、tests 不再保留 `readUserCommandFiles`。
- `src-tauri/src/lib.rs` 和 `src-tauri/src/command_catalog.rs` 删除旧 `read_user_command_files` invoke 与兼容 wrapper。

- [ ] **Step 4: 运行前端 + Rust 定向测试**

Run: `npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts`

Run: `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io -- --nocapture`

Expected: PASS，Settings issue 分层正确，旧 bulk-read 路径已消失但功能不回退。

- [ ] **Step 5: Commit**

```bash
git add src/features/settings/types.ts src/composables/settings/useCommandManagement/issues.ts src/i18n/messages.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/services/tauriBridge.ts src/composables/app/useAppCompositionRoot/ports.ts src/composables/app/useAppCompositionRoot/settingsScene.ts src-tauri/src/command_catalog.rs src-tauri/src/lib.rs
git commit -m "feat(commands): 切换前端到增量 scan/read 命令目录链路"
```

**Chunk 2 Exit Criteria**

- launcher / settings 已完全走 scan/read + `UserCommandSourceCache`。
- locale 切换只 remap 缓存，不重新扫磁盘。
- 修改单个 user command 文件只重读该文件。
- Settings Commands 能区分 `scan/read/parse/schema/merge/command`。
- 仓库内不再有 `read_user_command_files` 引用。

**Chunk 2 Rollback Point**

- 如果 cache invalidation 出现问题，只回滚 chunk 2 的前端 consumer；chunk 1 的 additive Rust API 仍可保留，不需要再回到“整批失败”的老实现。

## Chunk 3: Generator Locale Infrastructure and Runtime Locale Policy

### Task 3.1: 先把 runtime contract 扩到 overlay 真正需要的字段，再让 runtime fallback 读 manifest

**Files:**
- Create: `src/features/commands/runtimeLocale.ts`
- Modify: `src/features/commands/runtimeTypes.ts`
- Modify: `src/features/commands/runtimeMapper.ts`
- Modify: `src/features/commands/schemaBusinessRules.ts`
- Modify: `docs/schemas/command-file.schema.json`
- Regenerate: `src/features/commands/generated/commandSchemaValidator.ts`
- Test: `src/features/commands/__tests__/schemaValidation.test.ts`
- Test: `src/features/commands/__tests__/runtimeMapper.i18n.test.ts`
- Test: `src/features/commands/__tests__/runtimeLoader.test.ts`

- [ ] **Step 1: 写失败测试，锁住 localized placeholder 和 manifest-driven locale fallback**

```ts
it("accepts localized arg placeholder objects", () => {
  // placeholder: { zh: "端口", en: "Port" } 应通过 schemaValidation
});

it("uses manifest fallback order before generic zh/en hardcode", () => {
  // runtimeLocale 根据 generated manifest 的 fallbackOrder 生成 candidate list
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:run -- src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: FAIL，当前 placeholder 仍只能是 string，locale fallback 仍是硬编码。

- [ ] **Step 3: 实现最小 runtime/schema 扩展**

```ts
export interface RuntimeCommandArg {
  key: string;
  label: RuntimeLocalizedTextOrString;
  type: RuntimeArgType;
  required?: boolean;
  default?: string;
  placeholder?: RuntimeLocalizedTextOrString;
  validation?: RuntimeCommandArgValidation;
}

export function getRuntimeLocaleCandidates(locale: string, config: RuntimeLocaleConfig): string[] {
  // 先读 manifest.fallbackOrder[locale]，再兜底当前 locale / 短 locale / 任意非空值
}
```

实现要求：
- `RuntimeCommandArg.placeholder` 改成 `RuntimeLocalizedTextOrString`，`runtimeMapper.ts` 用 `resolveOptionalRuntimeText()` 解析。
- `docs/schemas/command-file.schema.json` 同步允许 `placeholder` 为 localizedTextOrString。
- `runtimeLocale.ts` 从 generated builtin manifest（`assets/runtime_templates/commands/builtin/index.json`）读 locale policy；fallback 顺序不再手写死在 `runtimeMapper.ts`。
- `schemaBusinessRules.ts` 补齐 localized placeholder 的 blank/empty-locale-key 校验。

- [ ] **Step 4: 生成 validator 并重跑测试**

Run: `npm run commands:schema:generate`

Run: `npm run commands:schema:check`

Run: `npm run test:run -- src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: PASS，validator 与 schema 同步，runtime locale fallback 从 manifest 读配置。

- [ ] **Step 5: Commit**

```bash
git add src/features/commands/runtimeLocale.ts src/features/commands/runtimeTypes.ts src/features/commands/runtimeMapper.ts src/features/commands/schemaBusinessRules.ts docs/schemas/command-file.schema.json scripts/commands/generate-command-schema-validator.mjs src/features/commands/generated/commandSchemaValidator.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts src/features/commands/__tests__/runtimeLoader.test.ts
git commit -m "feat(commands): 对齐命令目录 locale runtime 契约"
```

### Task 3.2: 引入 `base + locale overlay + locale config` 生成基础设施，但先保留 legacy inline fallback

**Files:**
- Create: `scripts/commands/catalogGenerator/readCatalogLocaleConfig.mjs`
- Create: `scripts/commands/catalogGenerator/parseYamlCatalogLocaleOverlay.mjs`
- Create: `scripts/commands/catalogGenerator/mergeCatalogLocales.mjs`
- Modify: `scripts/commands/generate-builtin-commands.mjs`
- Modify: `scripts/commands/catalogGenerator/parseYamlCatalog.mjs`
- Modify: `scripts/commands/catalogGenerator/buildRuntimeJson.mjs`
- Modify: `scripts/commands/catalogGenerator/buildGeneratedMarkdown.mjs`
- Modify: `scripts/commands/catalogGenerator/writeCatalogManifest.mjs`
- Modify: `scripts/__tests__/generate-builtin-commands.test.ts`
- Modify: `commands/catalog/README.md`

- [ ] **Step 1: 写失败的 generator fixture tests**

```ts
it("merges base yaml with zh/en overlays into localized runtime json", () => {
  // 断言 output._meta.name / commands[].name / args[].label / placeholder 都变成 { zh, en }
});

it("writes localeConfig into builtin manifest index", () => {
  // 断言 index.json 包含 defaultLocale / supportedLocales / fallbackOrder
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected: FAIL，当前 generator 仍只认识单个 `_*.yaml`，manifest 也没有 locale metadata。

- [ ] **Step 3: 实现 generator locale pipeline，并保留过渡兼容**

```js
const localeConfig = readCatalogLocaleConfig(path.join(sourceDir, "locales", "config.yaml"));
const baseCatalog = parseYamlCatalog(moduleFile);
const overlays = localeConfig.supportedLocales.map((locale) =>
  parseYamlCatalogLocaleOverlay(/* module, locale */)
);
const localizedCatalog = mergeCatalogLocales({
  baseCatalog,
  overlays,
  localeConfig,
  allowLegacyInlineText: true, // chunk 3 过渡期
});
```

实现要求：
- `parseYamlCatalog.mjs` 在 chunk 3 过渡期允许两种输入：
  1. 旧格式：text 仍内联在 base YAML；
  2. 新格式：text 来自 overlay。
- `mergeCatalogLocales.mjs` 输出统一的 localized catalog view model，供 `buildRuntimeJson.mjs` 和 `buildGeneratedMarkdown.mjs` 共用。
- `buildGeneratedMarkdown.mjs` 仅渲染 `defaultLocale` 文案；`buildRuntimeJson.mjs` 输出完整 localized object。
- `writeCatalogManifest.mjs` 把 `localeConfig` 写到 `assets/runtime_templates/commands/builtin/index.json`。
- `commands/catalog/README.md` 先补过渡说明：legacy inline text 只在迁移窗口允许，chunk 4 完成后移除。

- [ ] **Step 4: 运行 generator 定向测试**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`

Expected: PASS，fixture workspace 下可以同时验证 legacy inline fallback 和新 overlay merge。

- [ ] **Step 5: Commit**

```bash
git add scripts/commands/generate-builtin-commands.mjs scripts/commands/catalogGenerator/parseYamlCatalog.mjs scripts/commands/catalogGenerator/buildRuntimeJson.mjs scripts/commands/catalogGenerator/buildGeneratedMarkdown.mjs scripts/commands/catalogGenerator/writeCatalogManifest.mjs scripts/commands/catalogGenerator/readCatalogLocaleConfig.mjs scripts/commands/catalogGenerator/parseYamlCatalogLocaleOverlay.mjs scripts/commands/catalogGenerator/mergeCatalogLocales.mjs scripts/__tests__/generate-builtin-commands.test.ts commands/catalog/README.md
git commit -m "feat(commands): 引入 builtin locale overlay 生成基础设施"
```

**Chunk 3 Exit Criteria**

- runtime schema 已能承接 overlay 必须的 localized fields（至少包括 arg placeholder）。
- generated builtin manifest 已携带 locale config，runtime locale fallback 从 manifest 取值。
- generator 已支持 overlay，并在过渡期兼容未迁移的 legacy base YAML。

**Chunk 3 Rollback Point**

- 若 overlay generator 或 manifest-driven fallback 出现问题，可只回滚 chunk 3；chunk 2 的增量缓存与 scan/read 两阶段不受影响。

## Chunk 4: Builtin zh/en Overlay Migration and Final Cleanup

### Task 4.1: 先迁移 pilot modules，确认 authoring pattern 和产物格式

**Files:**
- Create: `commands/catalog/locales/config.yaml`
- Modify: `commands/catalog/_git.yaml`
- Modify: `commands/catalog/_network.yaml`
- Modify: `commands/catalog/_docker.yaml`
- Modify: `commands/catalog/_dev.yaml`
- Create: `commands/catalog/locales/zh/_git.yaml`
- Create: `commands/catalog/locales/zh/_network.yaml`
- Create: `commands/catalog/locales/zh/_docker.yaml`
- Create: `commands/catalog/locales/zh/_dev.yaml`
- Create: `commands/catalog/locales/en/_git.yaml`
- Create: `commands/catalog/locales/en/_network.yaml`
- Create: `commands/catalog/locales/en/_docker.yaml`
- Create: `commands/catalog/locales/en/_dev.yaml`
- Regenerate: `assets/runtime_templates/commands/builtin/_git.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_network.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_docker.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_dev.json`
- Regenerate: `docs/generated_commands/_git.md`
- Regenerate: `docs/generated_commands/_network.md`
- Regenerate: `docs/generated_commands/_docker.md`
- Regenerate: `docs/generated_commands/_dev.md`
- Regenerate: `assets/runtime_templates/commands/builtin/index.json`
- Regenerate: `docs/generated_commands/index.md`

- [ ] **Step 1: 先写失败测试，锁住 pilot module 的真实产物形状**

```ts
it("emits localized runtime json for git-status and network args", () => {
  // 断言 _git.json 和 _network.json 中 name/description/args.label/placeholder 都含 zh/en
});
```

- [ ] **Step 2: 运行失败测试**

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`

Expected: FAIL，当前仓库真实 catalog 还没迁到 overlay 目录。

- [ ] **Step 3: 迁移 4 个 pilot modules，并把 `commands/catalog/locales/config.yaml` 固定下来**

`commands/catalog/locales/config.yaml` 先落成：

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

pilot module 迁移要求：
- base YAML 只保留 `moduleSlug`、`commands[].id/category/platform/exec|script/adminRequired/dangerous/args.key/type/default/validation/prerequisites/check/tags`。
- `meta.name`、`meta.description`、`command.name`、`command.description`、`args.label`、`args.placeholder`、`prerequisites.displayName/resolutionHint/installHint` 全部进入 `zh/en` overlay。
- tags 保持现状，不做多语言化。

- [ ] **Step 4: 生成产物并跑 pilot regression**

Run: `npm run commands:builtin:generate -- --expectedLogicalCount 357`

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/__tests__/runtimeLoader.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts`

Expected: PASS，pilot module 的 runtime json/docs 已改成 overlay 真源，但 logical count 仍是 `357`。

- [ ] **Step 5: Commit**

```bash
git add commands/catalog/_git.yaml commands/catalog/_network.yaml commands/catalog/_docker.yaml commands/catalog/_dev.yaml commands/catalog/locales/config.yaml commands/catalog/locales/zh/_git.yaml commands/catalog/locales/zh/_network.yaml commands/catalog/locales/zh/_docker.yaml commands/catalog/locales/zh/_dev.yaml commands/catalog/locales/en/_git.yaml commands/catalog/locales/en/_network.yaml commands/catalog/locales/en/_docker.yaml commands/catalog/locales/en/_dev.yaml assets/runtime_templates/commands/builtin/_git.json assets/runtime_templates/commands/builtin/_network.json assets/runtime_templates/commands/builtin/_docker.json assets/runtime_templates/commands/builtin/_dev.json assets/runtime_templates/commands/builtin/index.json docs/generated_commands/_git.md docs/generated_commands/_network.md docs/generated_commands/_docker.md docs/generated_commands/_dev.md docs/generated_commands/index.md
git commit -m "feat(commands): 迁移 builtin pilot modules 到 locale overlays"
```

### Task 4.2: 完成全部 builtin 模块迁移，并移除 generator 过渡兼容分支

**Files:**
- Modify: `commands/catalog/_brew.yaml`
- Modify: `commands/catalog/_bun.yaml`
- Modify: `commands/catalog/_cargo.yaml`
- Modify: `commands/catalog/_cert.yaml`
- Modify: `commands/catalog/_file.yaml`
- Modify: `commands/catalog/_gh.yaml`
- Modify: `commands/catalog/_kubernetes.yaml`
- Modify: `commands/catalog/_mysql.yaml`
- Modify: `commands/catalog/_npm.yaml`
- Modify: `commands/catalog/_pip.yaml`
- Modify: `commands/catalog/_pnpm.yaml`
- Modify: `commands/catalog/_postgres.yaml`
- Modify: `commands/catalog/_redis.yaml`
- Modify: `commands/catalog/_service.yaml`
- Modify: `commands/catalog/_sqlite.yaml`
- Modify: `commands/catalog/_ssh.yaml`
- Modify: `commands/catalog/_system.yaml`
- Modify: `commands/catalog/_yarn.yaml`
- Create: `commands/catalog/locales/zh/_brew.yaml`
- Create: `commands/catalog/locales/zh/_bun.yaml`
- Create: `commands/catalog/locales/zh/_cargo.yaml`
- Create: `commands/catalog/locales/zh/_cert.yaml`
- Create: `commands/catalog/locales/zh/_file.yaml`
- Create: `commands/catalog/locales/zh/_gh.yaml`
- Create: `commands/catalog/locales/zh/_kubernetes.yaml`
- Create: `commands/catalog/locales/zh/_mysql.yaml`
- Create: `commands/catalog/locales/zh/_npm.yaml`
- Create: `commands/catalog/locales/zh/_pip.yaml`
- Create: `commands/catalog/locales/zh/_pnpm.yaml`
- Create: `commands/catalog/locales/zh/_postgres.yaml`
- Create: `commands/catalog/locales/zh/_redis.yaml`
- Create: `commands/catalog/locales/zh/_service.yaml`
- Create: `commands/catalog/locales/zh/_sqlite.yaml`
- Create: `commands/catalog/locales/zh/_ssh.yaml`
- Create: `commands/catalog/locales/zh/_system.yaml`
- Create: `commands/catalog/locales/zh/_yarn.yaml`
- Create: `commands/catalog/locales/en/_brew.yaml`
- Create: `commands/catalog/locales/en/_bun.yaml`
- Create: `commands/catalog/locales/en/_cargo.yaml`
- Create: `commands/catalog/locales/en/_cert.yaml`
- Create: `commands/catalog/locales/en/_file.yaml`
- Create: `commands/catalog/locales/en/_gh.yaml`
- Create: `commands/catalog/locales/en/_kubernetes.yaml`
- Create: `commands/catalog/locales/en/_mysql.yaml`
- Create: `commands/catalog/locales/en/_npm.yaml`
- Create: `commands/catalog/locales/en/_pip.yaml`
- Create: `commands/catalog/locales/en/_pnpm.yaml`
- Create: `commands/catalog/locales/en/_postgres.yaml`
- Create: `commands/catalog/locales/en/_redis.yaml`
- Create: `commands/catalog/locales/en/_service.yaml`
- Create: `commands/catalog/locales/en/_sqlite.yaml`
- Create: `commands/catalog/locales/en/_ssh.yaml`
- Create: `commands/catalog/locales/en/_system.yaml`
- Create: `commands/catalog/locales/en/_yarn.yaml`
- Modify: `scripts/commands/catalogGenerator/parseYamlCatalog.mjs`
- Modify: `commands/catalog/README.md`
- Regenerate: `assets/runtime_templates/commands/builtin/_brew.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_bun.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_cargo.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_cert.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_file.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_gh.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_kubernetes.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_mysql.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_npm.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_pip.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_pnpm.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_postgres.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_redis.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_service.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_sqlite.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_ssh.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_system.json`
- Regenerate: `assets/runtime_templates/commands/builtin/_yarn.json`
- Regenerate: `docs/generated_commands/_brew.md`
- Regenerate: `docs/generated_commands/_bun.md`
- Regenerate: `docs/generated_commands/_cargo.md`
- Regenerate: `docs/generated_commands/_cert.md`
- Regenerate: `docs/generated_commands/_file.md`
- Regenerate: `docs/generated_commands/_gh.md`
- Regenerate: `docs/generated_commands/_kubernetes.md`
- Regenerate: `docs/generated_commands/_mysql.md`
- Regenerate: `docs/generated_commands/_npm.md`
- Regenerate: `docs/generated_commands/_pip.md`
- Regenerate: `docs/generated_commands/_pnpm.md`
- Regenerate: `docs/generated_commands/_postgres.md`
- Regenerate: `docs/generated_commands/_redis.md`
- Regenerate: `docs/generated_commands/_service.md`
- Regenerate: `docs/generated_commands/_sqlite.md`
- Regenerate: `docs/generated_commands/_ssh.md`
- Regenerate: `docs/generated_commands/_system.md`
- Regenerate: `docs/generated_commands/_yarn.md`
- Regenerate: `assets/runtime_templates/commands/builtin/index.json`
- Regenerate: `docs/generated_commands/index.md`

- [ ] **Step 1: 先把剩余模块按“4-6 个模块一批”迁移，不要一口气改完整个目录**

批次建议：
- Batch A: `_brew` / `_bun` / `_cargo` / `_npm` / `_pnpm` / `_yarn`
- Batch B: `_cert` / `_file` / `_gh` / `_ssh` / `_system`
- Batch C: `_kubernetes` / `_docker` / `_service`
- Batch D: `_mysql` / `_postgres` / `_redis` / `_sqlite` / `_pip`

每一批都遵守同一 checklist：
- base YAML 不再含任何本地化文案字段；
- `zh` overlay 来自现有中文文案；
- `en` overlay 填入真实英文，不留 TODO / copy-zh 占位；
- 运行一次 `npm run commands:builtin:generate -- --expectedLogicalCount 357` 确认 batch 没破坏 manifest。

- [ ] **Step 2: 删除 chunk 3 的 legacy inline fallback**

```js
function parseYamlCatalog(filePath) {
  // chunk 4 完成后:
  // 1. 不再接受 base meta.name / command.name 作为真源
  // 2. 缺少 requiredBuiltinLocales 的 overlay 直接 fail-fast
}
```

实现要求：
- `parseYamlCatalog.mjs` 删除过渡期 `allowLegacyInlineText` 分支。
- `commands/catalog/README.md` 改成最终口径：base YAML 只放结构；所有文案都来自 `locales/<locale>/_*.yaml`。
- `commands/catalog/locales/config.yaml` 的 `requiredBuiltinLocales` 现在变成真正 blocking gate。

- [ ] **Step 3: 运行最终命令目录 regression 与全量门禁**

Run: `npm run commands:builtin:generate -- --expectedLogicalCount 357`

Run: `node -e "const m=require('./assets/runtime_templates/commands/builtin/index.json'); if (m.logicalCommandCount!==357 || m.physicalCommandCount!==403) throw new Error(JSON.stringify(m));"`

Run: `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts src/features/commands/__tests__/runtimeLoader.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/composables/__tests__/launcher/useCommandCatalog.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/services/__tests__/tauriBridge.test.ts`

Run: `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io -- --nocapture`

Run: `npm run check:all`

Expected:
- builtin manifest counts保持 `logical=357` / `physical=403`；
- 定向命令目录测试全部 PASS；
- `npm run check:all` 全绿。

- [ ] **Step 4: Commit**

```bash
git add commands/catalog commands/catalog/locales assets/runtime_templates/commands/builtin docs/generated_commands scripts/commands/catalogGenerator/parseYamlCatalog.mjs commands/catalog/README.md
git commit -m "feat(commands): 完成 builtin locale overlay 真源迁移"
```

**Chunk 4 Exit Criteria**

- 所有 builtin 模块都采用 `base yaml + zh/en overlay`。
- repo 中不再依赖 legacy inline text fallback。
- generated runtime json / markdown docs / manifest 已全部重新生成并和新真源对齐。
- `npm run commands:builtin:generate -- --expectedLogicalCount 357`、命令目录定向测试、`npm run check:all` 全绿。

**Chunk 4 Rollback Point**

- 若 translation sweep 或批量迁移回归太大，优先回滚“当前模块批次 + regenerated assets”，保留 chunk 3 的基础设施；不要再回退到 chunk 2 之前的 scan/read 或 cache 方案。

## Testing And Verification Strategy

### Rust / Tauri

- `cargo test --manifest-path src-tauri/Cargo.toml command_catalog::tests_io -- --nocapture`
  覆盖 scan/read contract、兼容 wrapper、目录辅助函数。
- `npm run check:rust`
  保证 `src-tauri` 在新增 commands 与模块拆分后仍可编译。

### Frontend cache / issue surface

- `npm run test:run -- src/composables/__tests__/launcher/useCommandCatalog.test.ts`
  锁住 locale remap 不走磁盘、改单文件只重读单文件、user override/builtin merge 不回退。
- `npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`
  锁住 `scan/read/parse/schema/merge/command` issue 展示。
- `npm run test:run -- src/services/__tests__/tauriBridge.test.ts src/composables/__tests__/app/settingsEntry.test.ts src/__tests__/app.settings-hotkeys.test.ts`
  锁住 bridge / ports / app wiring 切换。

### Generator / schema / runtime i18n

- `npm run test:run -- scripts/__tests__/generate-builtin-commands.test.ts`
  锁住 `base + overlay` merge、manifest locale config、generated docs default locale 行为。
- `npm run commands:schema:generate`
  重新生成 validator。
- `npm run commands:schema:check`
  防止 schema / generated validator 漂移。
- `npm run test:run -- src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeMapper.i18n.test.ts src/features/commands/__tests__/runtimeLoader.test.ts`
  锁住 localized placeholder、manifest-driven fallback 和 runtime template 读取。

### Final gate

- `npm run commands:builtin:generate -- --expectedLogicalCount 357`
- `node -e "const m=require('./assets/runtime_templates/commands/builtin/index.json'); if (m.logicalCommandCount!==357 || m.physicalCommandCount!==403) throw new Error(JSON.stringify(m));"`
- `npm run check:all`

说明：
- 本轮没有视觉布局变化，不需要单独跑 visual regression。
- 只要命令目录链路逻辑变更触碰 settings/launcher 显示层，就仍要保留对应 Vitest UI regression。

## Risks And Rollback

| 风险 | 触发位置 | 发现方式 | 回滚点 |
|---|---|---|---|
| scan issue 模型过粗，前端仍无法分辨问题来源 | Chunk 1-2 | `useCommandCatalog` / `useCommandManagement` 定向测试 | 回滚 chunk 2 consumer，保留 chunk 1 additive API |
| cache invalidation 出错，导致 locale remap 读到陈旧 payload | Chunk 2 | `useCommandCatalog.test.ts` 中“改单文件只重读单文件 / locale 不走磁盘”用例 | 回滚 chunk 2，仅恢复前端整批 reload，不回退 Rust API |
| manifest localeConfig 与 runtime fallback 不一致 | Chunk 3 | `runtimeMapper.i18n.test.ts` + generator fixture test | 回滚 chunk 3 runtimeLocale / manifest 变更，恢复硬编码 fallback |
| overlay merge 漏字段，造成 JSON schema 或 runtime mapping 失败 | Chunk 3-4 | `schemaValidation.test.ts` / `runtimeLoader.test.ts` / `commands:builtin:generate` | 先回滚当前迁移模块批次与 regenerated assets |
| 大批量 builtin 迁移中误删结构字段或改动 tags | Chunk 4 | `generate-builtin-commands.test.ts`、manifest count check、`rg -n "name:|description:|label:|placeholder:" commands/catalog/_*.yaml` 人工 spot check | 回滚当前批次 YAML + generated artifacts；保留 pilot modules 和基础设施 |

## Deferred Track B Note

- Track B 仍按 `docs/superpowers/specs/2026-04-13-command-catalog-i18n-resilience-and-runtime-split-design.md` 的后半部分推进。
- 本计划故意不碰：
  - `src-tauri/src/terminal.rs`
  - `src/composables/app/useAppCompositionRoot/runtime.ts`
  - `src/components/launcher/LauncherWindow.vue`
  - `src/components/launcher/parts/LauncherQueueReviewPanel.vue`
- Track A 合并并稳定后，再单独开 Track B 计划；不要在本实施里顺手拆这些超长文件。

## Ready Prompt

Plan complete and saved to `docs/superpowers/plans/2026-04-13-command-catalog-i18n-resilience-and-runtime-split-plan.md`.

下一阶段建议新会话直接进入执行，并从 Chunk 1 开始，不跨 Track B：

```text
$using-superpowers $subagent-driven-development

按仓库启动规则先读取：
1. /home/work/projects/zapcmd/CLAUDE.md
2. /home/work/projects/zapcmd/.ai/AGENTS.md
3. /home/work/projects/zapcmd/.ai/TOOL.md

本轮进入 Track A 实施，不做 Track B，不处理 session 持久化。

必读文件：
- /home/work/projects/zapcmd/docs/superpowers/plans/2026-04-13-command-catalog-i18n-resilience-and-runtime-split-plan.md
- /home/work/projects/zapcmd/docs/superpowers/specs/2026-04-13-command-catalog-i18n-resilience-and-runtime-split-design.md
- /home/work/projects/zapcmd/docs/superpowers/specs/2026-04-02-command-catalog-yaml-source-and-structured-execution-design.md
- /home/work/projects/zapcmd/docs/superpowers/specs/2026-04-09-runtime-boundary-remediation-design.md

执行要求：
- 严格按 plan 的 Chunk 1 -> Chunk 4 顺序推进。
- Chunk 1 先做 Rust scan/read 两阶段，保留旧 bulk-read 兼容一轮；不要提前做 builtin overlay 迁移。
- 每完成一个 chunk，更新 /home/work/projects/zapcmd/docs/active_context.md，并汇报验证结果、风险和回滚点。
- 不自动合并到 main，不进入 Track B 文件拆分。
```
