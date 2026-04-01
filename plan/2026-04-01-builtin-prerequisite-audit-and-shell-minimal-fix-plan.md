# 2026-04-01 builtin prerequisite 审计与 shell 最小修复计划

## 目标

解决 builtin preflight 的两类主要误拦：

1. `shell` 类型当前统一 unsupported，导致带 `powershell/shell` prerequisite 的命令一律失败。
2. builtin source 把 shell builtin / PowerShell cmdlet 误写成 `binary` prerequisite，导致本不该失败的命令被 preflight 提前阻断。

## 范围

1. 先补测试，锁定 `shell` probe 的最小支持与 builtin prerequisite authoring 规则。
2. 修改 Rust probe，支持 `shell` 的最小探测。
3. 清理 builtin source 中明显错误的 prerequisite，并刷新生成产物。
4. 更新 command source README，明确 prerequisite 只写外部依赖。

## 分步

1. 在 `src-tauri/src/command_catalog/prerequisites.rs` 先写失败单测：
   - `shell:powershell` 可通过
   - `shell:shell` 视为 satisfied
2. 在 `src/features/commands/__tests__/runtimeLoader.test.ts` 先写失败用例：
   - builtin 不再把 shell builtin / PowerShell cmdlet 建模成 `binary`
   - builtin 不再出现 `shell:shell`
3. 实现 Rust probe 最小支持：
   - `shell` 复用可执行存在性检查
   - generic `shell` 直接通过
4. 修改 `docs/command_sources/_dev.md`、`_file.md`、`_network.md`、`_system.md`：
   - 删除 `echo`
   - 删除 `Get-* / Stop-* / Test-* / Measure-* / Compress-* / Expand-*` 这类误建模 prerequisite
   - 删除 generic `shell`
5. 刷新 builtin 生成产物。
6. 更新 `docs/command_sources/README.md` authoring 规则。

## 验收

1. `cargo test --manifest-path src-tauri/Cargo.toml prerequisites` 全绿。
2. `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts scripts/__tests__/generate-builtin-commands.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/services/__tests__/commandPreflight.test.ts` 全绿。
3. `npm run check:all` 全绿。
