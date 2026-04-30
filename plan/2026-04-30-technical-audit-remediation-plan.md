# Technical Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED: Use TDD for behavior changes. Keep edits scoped to the execution, queue, catalog, terminal lifecycle, and launcher runtime boundaries.

**Goal:** 修复本次技术审计确认的安全确认、队列快照、命令参数、终端资源和 composition root 耦合问题。

**Architecture:** 前端执行入口默认 fail-closed，队列执行期间冻结编辑；catalog 与 runtime 保持一致的结构化执行语义；Rust 侧终端启动与发现路径减少长期资源占用和关键路径阻塞。composition root 只做依赖装配，业务规则下沉到小型 helper。

**Tech Stack:** Vue 3, TypeScript, Vitest, Tauri 2, Rust.

---

## Tasks

- [x] `src/services/commandExecutor.ts`: 默认 `safetyConfirmed=false`，补充 payload 回归测试。
- [x] `src/composables/execution/useCommandExecution/*` 与 queue UI: 执行期间冻结队列编辑、删除、刷新、清空、拖拽。
- [x] `commands/catalog/_file.yaml` 与命令运行时测试: 修正 `stdinArgKey` 误用，保证搜索参数进入 argv。
- [x] `src/features/launcher/commandRuntime.ts`: 为 script token 替换提供 runner-aware 转义，避免原始拼接。
- [x] `src-tauri/src/terminal/launch_posix.rs`: 用共享 reaper 管理 POSIX child，避免每个终端长期占用一个线程。
- [x] `src-tauri/src/terminal/cache.rs`: 缓存过期时优先尝试旧终端并后台刷新，减少执行前同步探测。
- [x] `src/composables/app/useAppCompositionRoot/runtime.ts`: 提取启动器 runtime helper，降低 composition root 业务判断密度。
- [x] `docs/active_context.md`: 补充 200 字以内短期记忆。
