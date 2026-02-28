# ZapCmd 变更清单（提交前）

> 目标：每次需求完成后，用同一张清单收口“代码 + 测试 + 文档”。

## 1. 代码

1. 改动范围明确，无无关文件修改。
2. 新增逻辑已做异常/边界处理。
3. 不引入 `any`，无新增 lint warning/error。

## 2. 测试

1. 已执行 `npm run lint`。
2. 已执行 `npm run typecheck`。
3. 已执行 `npm run test:run` 或 `npm run test:related`（与改动匹配）。
4. 已执行 `npm run check:all`（提交前最终确认）。
5. 若涉及窗口/终端/跨平台行为，已执行 `docs/.maintainer/work/manual_regression_m0_m0a.md` 对应用例。
6. 若包含 `src-tauri/**` 改动，已执行 `cargo check --manifest-path src-tauri/Cargo.toml`。

## 3. 文档

1. 行为改动已同步：
   - `docs/README.md`（如文档导航/入口需要变更）
   - `README.md` / `README.zh-CN.md`（如影响开源用户入口：安装/运行/命令目录/配置/行为口径）
2. 若新增文档或文档重命名，已更新 `docs/README.md`。
3. 若涉及发布流程变更，已同步更新公开口径（README/CHANGELOG/工作流与模板）。

## 4. 交付备注模板

1. 本轮改动：
2. 自动化验证结果：
3. 人工回归结果：
4. 已知风险与下一步：
