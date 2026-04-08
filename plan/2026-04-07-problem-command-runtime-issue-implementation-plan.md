# 2026-04-07 问题命令可见但不可执行实现记录

## 目标

- 非法 `args[].validation.pattern` 不再等到运行期首次输入时才暴露。
- 问题命令继续出现在 Launcher 搜索结果里，不再被直接过滤掉。
- 问题命令不能执行、不能复制、不能加入执行流，且要有明确标识。
- Settings -> Commands 需要能看到对应的问题归档，方便维护者定位。

## 本次落地决策

1. 加载阶段标记
   - 在 `runtimeLoader` 映射完成后，检查命令参数正则是否可编译。
   - 命令保留在模板列表中，但附带 `blockingIssue`。
2. 执行阶段统一拦截
   - `useCommandExecution` 统一拦截 execute / stage / copy / queue execute。
   - 参数面板提交也加兜底，避免绕过入口判断。
3. UI 标识
   - Launcher 搜索结果显示“问题命令”徽标。
   - Action Panel 展示原因说明，并禁用动作按钮。
4. Settings 问题归档
   - `loadIssues` 扩展 `invalid-command-config` + `command` stage。
   - Command Management 按 `commandId` 精准标记问题行，不再把同文件所有命令都算成有问题。
5. 运行期兜底日志
   - 删除非法 regex 日志去重 `Set`。
   - 运行期仍保留 `console.warn` 兜底，避免把问题静默吞掉。

## 涉及文件

- 核心
  - `src/features/commands/commandIssues.ts`
  - `src/features/commands/runtimeLoader.ts`
  - `src/features/commands/types.ts`
- 执行链路
  - `src/composables/execution/useCommandExecution/actions.ts`
  - `src/composables/execution/useCommandExecution/helpers.ts`
  - `src/features/launcher/types.ts`
- Launcher UI
  - `src/components/launcher/parts/LauncherSearchPanel.vue`
  - `src/components/launcher/parts/LauncherActionPanel.vue`
  - `src/components/launcher/types.ts`
- Settings / i18n
  - `src/composables/settings/useCommandManagement/index.ts`
  - `src/composables/settings/useCommandManagement/rows.ts`
  - `src/composables/settings/useCommandManagement/issues.ts`
  - `src/features/settings/types.ts`
  - `src/i18n/messages.ts`
- 测试
  - `src/features/commands/__tests__/runtimeLoader.test.ts`
  - `src/composables/__tests__/execution/useCommandExecution.test.ts`
  - `src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts`
  - `src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts`
  - `src/composables/__tests__/settings/useCommandManagement.test.ts`
  - `src/features/security/__tests__/commandSafety.test.ts`

## 验证

- 定向测试
  - `npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts src/composables/__tests__/execution/useCommandExecution.test.ts src/components/launcher/parts/__tests__/LauncherActionPanel.test.ts src/components/launcher/parts/__tests__/LauncherSearchPanel.pointer-actions.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/features/security/__tests__/commandSafety.test.ts`
- 类型检查
  - `npm run typecheck`
  - `npm run typecheck:test`

## 后续可迭代点

- 若后续还会出现更多“可见但不可执行”的命令问题，可把 `blockingIssue` 扩展成多种 code，而不是继续堆 if/else。
- 如果要进一步收口用户提示，可考虑在 Settings 命令列表中直接显示问题 badge，而不只依赖下方 issues 列表。
