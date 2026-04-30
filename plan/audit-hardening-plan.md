# 审计加固实施计划

> **For agentic workers:** REQUIRED: 使用 TDD 小步实现，每个行为先写失败测试，再写最小实现并验证。

**Goal:** 修复技术审计中确认的系统边界风险，提升终端探测、用户命令扫描、命令目录刷新和窗口 resize 的鲁棒性。

**Architecture:** 后端边界统一走显式超时、限额和输入校验；前端刷新失败保留 last-known-good 缓存。改动保持在现有模块边界内，不重构无关 UI 或业务流。

**Tech Stack:** Rust/Tauri、Vue 3、TypeScript、Vitest、Cargo test。

---

## Chunk 1: Rust 边界加固

### Task 1: 终端发现进程超时

**Files:**
- Modify: `src-tauri/src/terminal/discovery.rs`
- Test: `src-tauri/src/terminal/tests_discovery.rs`

- [ ] 写失败测试：探测进程超时时应返回 missing/fallback 而不是无限等待。
- [ ] 运行 `cargo test --manifest-path src-tauri/Cargo.toml terminal_discovery -- --nocapture` 验证失败。
- [ ] 抽出带超时的进程探测 helper，并用于 `command_exists` / `command_path`。
- [ ] 运行相关 Rust 测试验证通过。

### Task 2: 用户命令扫描前置限额

**Files:**
- Modify: `src-tauri/src/command_catalog/scan.rs`
- Test: `src-tauri/src/command_catalog/tests_io.rs`

- [ ] 写失败测试：扫描在海量目录项场景中应提前停止继续读取后续目录。
- [ ] 运行相关 Cargo 测试验证失败。
- [ ] 将文件数/总 issue/目录遍历预算前移到 DFS 过程中。
- [ ] 运行相关 Cargo 测试验证通过。

### Task 3: 窗口 resize 输入和错误传播

**Files:**
- Modify: `src-tauri/src/animation/mod.rs`
- Test: `src-tauri/src/animation/tests_logic.rs`

- [ ] 写失败测试：非有限尺寸和超大尺寸应返回错误。
- [ ] 运行相关 Cargo 测试验证失败。
- [ ] 增加尺寸校验 helper；让设置窗口尺寸失败时不更新缓存。
- [ ] 运行相关 Cargo 测试验证通过。

## Chunk 2: 前端缓存降级

### Task 4: 用户命令刷新失败保留缓存

**Files:**
- Modify: `src/composables/launcher/useCommandCatalog/controller.ts`
- Test: `src/composables/__tests__/launcher/commandCatalogController.test.ts`

- [ ] 写失败测试：已 primed 的用户源刷新失败时保留旧用户命令并报告 issue。
- [ ] 运行对应 Vitest 验证失败。
- [ ] 修改失败处理逻辑，避免清空 last-known-good cache。
- [ ] 运行对应 Vitest 验证通过。

## Chunk 3: 收口验证

- [ ] 运行 `npm run lint`
- [ ] 运行 `npm run typecheck`
- [ ] 运行 `npm run test:coverage`
- [ ] 运行 `npm run build`
- [ ] 运行 `npm run check:rust`
- [ ] 运行 `npm run test:rust`
- [ ] 更新 `docs/active_context.md`
- [ ] 提交开发分支，不合并 main
