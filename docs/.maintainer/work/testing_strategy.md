# ZapCmd 测试策略（Current）

> 目标：把“自动化回归 + 人工回归”固定为标准流程，避免后续功能迭代失控。

## 1. 测试分层

1. 单元测试（Vitest）：
   - 目标：纯逻辑与工具函数。
   - 范围：`src/composables`、`src/services`、`src/stores`、`src/features`。
2. UI 回归测试（Vitest + Vue Test Utils）：
   - 目标：热键、焦点、设置、执行链路、失败分支、事件分支。
   - 范围：`src/__tests__/app.*.test.ts`。
3. 人工回归（真机）：
   - 目标：系统终端、窗口行为、跨平台探测、权限与真实环境交互。
   - 用例：`docs/.maintainer/work/manual_regression_m0_m0a.md`。

## 2. 门禁规则

1. 提交前（pre-commit）：
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:related -- <staged src/*.ts|*.vue>`
   - 若包含 `src-tauri/**` 或 Rust/Cargo 变更：`cargo check --manifest-path src-tauri/Cargo.toml`
2. 合并前（本地 + CI）：
   - 本地：`npm run check:all`
   - CI：`.github/workflows/ci-gate.yml` 必须通过
3. 任何改动如果触发行为变化，必须有对应测试更新。

## 3. 自动化覆盖策略

1. 核心交互必须自动化：
   - 搜索/队列/热键/焦点
   - 设置保存与冲突校验
   - 命令管理（启停开关、导入校验提示、覆盖冲突标记）
   - 执行失败与异常回退
   - 高危命令确认与参数注入拦截
2. 高风险边界必须自动化：
   - storage/broadcast 同步
   - 队列拖拽与重排
   - 终端探测 fallback
   - 会话状态恢复（`zapcmd.session.launcher`）
3. 低风险视觉细节可保留人工验证，不强制写重测试。

## 4. 人工回归触发条件

出现以下情况，必须跑手工清单：

1. 终端执行链路变化。
2. 窗口生命周期或焦点策略变化。
3. Tauri/Rust 侧窗口或终端能力变化。
4. 发布前（至少 1 轮真机）。

## 5. 发布验证（M4）

1. 发布前必须执行：
   - `docs/.maintainer/work/manual_regression_m0_m0a.md`
   - `docs/manual_regression_m4_release.md`
2. 版本标签 `vX.Y.Z` 推送后触发三平台构建：
   - `.github/workflows/release-build.yml`
3. 发布与回滚步骤以 `docs/release_runbook.md` 为准。

## 6. 覆盖率策略

1. 全局阈值保持不低于 85%（当前高于该值）。
2. 不追求 100%，优先保证“关键行为全覆盖”。
3. 新增功能导致覆盖率下降时，需在同一轮补齐测试或说明原因。
