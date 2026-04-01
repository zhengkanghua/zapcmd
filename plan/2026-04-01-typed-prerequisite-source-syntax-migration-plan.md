# 2026-04-01 typed prerequisite source 语法迁移计划

## 目标

把 builtin command source 的 prerequisite authoring 从“名字列表 + 生成器猜类型”改成“显式 typed token”，并直接全量迁移，不保留老写法兼容。

## 范围

1. 先补测试，锁定新语法与拒绝老写法。
2. 修改生成器解析逻辑。
3. 全量迁移 `docs/command_sources/_*.md`。
4. 刷新生成产物并跑全量验证。

## 步骤

1. 在 `scripts/__tests__/generate-builtin-commands.test.ts` 先写失败测试：
   - 接受 `binary:git, shell:powershell` 这类 typed prerequisite
   - 保持 prerequisite 顺序
   - 拒绝 `git`、`docker,powershell` 这类老写法
2. 修改 `scripts/generate_builtin_commands.ps1`：
   - prerequisite token 必须匹配 `<type>:<target>`
   - 校验 type 是否属于 `binary/shell/env/network/permission`
   - target 不能为空
   - 不再保留名字猜类型逻辑
3. 批量迁移 `docs/command_sources/_*.md`：
   - 外部命令改为 `binary:*`
   - 特定壳改为 `shell:*`
   - 无 prerequisite 保持 `-`
4. 刷新 builtin 生成产物。
5. 更新 `docs/command_sources/README.md` 文档说明。

## 验收

1. `npm run test -- scripts/__tests__/generate-builtin-commands.test.ts` 全绿。
2. `npm run test -- src/features/commands/__tests__/runtimeLoader.test.ts` 全绿。
3. `npm run check:all` 全绿。
