# ZapCmd 项目宪法（Project Constitution）

> 状态：Active  
> 最后更新：2026-03-01  
> 目的：用一份文档统一“规范/约束/门禁/文档治理/测试策略”，避免口径分散与互相打架。

---

## 1. 冲突时的优先级（以谁为准）

1. `README.md` / `README.zh-CN.md`：面向开源用户的使用入口与口径。
2. `CHANGELOG.md`：发布版本的变更事实。
3. `docs/project_constitution.md`：项目规范/约束/门禁/Docs-first（规则口径）。
4. `docs/active_context.md`：当前实现快照（短期记忆，含行为基线）。
5. `docs/project_structure.md`：项目结构与技术栈说明。
6. `docs/architecture_plan.md`：架构说明（当前实现 + Roadmap）。
7. 其他 `docs/**`：主题文档与补充说明。

---

## 2. 交付门禁（必须全绿）

### 2.1 本地统一门禁

- 提交前最终确认：`npm run check:all`
- 约定链路顺序：`lint` -> `typecheck` -> `check:style-guard` -> `typecheck:test` -> `test:coverage` -> `build` -> `check:rust` -> `test:rust`

### 2.2 pre-commit（本地提交前）

- pre-commit 会按 staged 变更触发：`lint` / `typecheck` / `test:related`（以及必要时的 `cargo check`）。
- 若你遇到“commit 没拦住坏代码”，先检查 hooks 是否生效：`docs/.maintainer/work/ci_cd_verification.md`。

---

## 3. 代码开发规范与约束

> 说明：本节是“写代码必须遵守的规则”，不是建议。

### 3.1 TypeScript 与类型

1. TypeScript 必须保持 `strict`（见 `tsconfig.json`）。
2. 禁止 `any`；确需承接不可信输入时使用 `unknown` 并进行类型收窄。
3. 禁止通过“关闭类型检查/忽略报错”来绕开问题（例如临时注释/禁用规则）。

### 3.2 结构与分层（防止 App.vue 继续膨胀）

1. 新增功能不得直接堆到 `App.vue`：必须落到对应职责层（`components` / `composables` / `features` / `services` / `stores`）。
2. 关注点分离：跨组件/跨窗口状态进入 store；可复用业务逻辑进入 composable；I/O 边界进入 service。
3. 任何行为改动必须能定位到“哪个模块负责”：禁止“到处插一点”导致后续不可维护。

### 3.3 超大文件与复杂度控制（必须拆）

1. 出现“超大组件/超大模块”时，必须拆分为功能组件/独立模块；禁止继续增加体积。
2. 逻辑嵌套过深时使用卫语句/早返回来展平；避免多层 if/else 嵌套。
3. 避免魔术值：所有关键数值与阈值必须提取为具名常量（并集中到对应模块内）。

### 3.4 失败显式（不允许静默降级）

1. 不得吞掉错误或“假装成功”；失败必须可见（错误信息/日志/测试用例）。
2. 不得为了让流程“看起来正常”而引入隐式回退路径；需要回退必须显式标注并写清原因与可禁用方式。

### 3.5 测试是功能的一部分（每个功能必须有自动化回归）

1. 新增功能必须新增至少一条自动化测试覆盖关键路径（单元/UI 回归均可，按风险选择）。
2. 用户可见行为变更必须补齐回归测试（尤其是热键/焦点/队列/失败分支/安全确认/注入拦截/会话恢复）。
3. 仅在“纯文档/纯资产”且不影响运行时行为时，才允许不新增测试。

### 3.6 UI 语义与可达性

1. UI 语义优先：使用语义化 HTML（`main/section/nav/button` 等），不要为样式牺牲语义。
2. 可达性是功能的一部分：新增交互必须保证键盘可达（focus 顺序、`Esc` 关闭、快捷键一致性）。

### 3.7 样式治理（Tokens + Tailwind）

1. 多主题只通过 `data-theme` + CSS Variables 实现；组件侧只消费 `--ui-*` token。
2. 禁止在 `src/**/*.vue` / `src/**/*.ts` 硬编码色值（hex / `rgb(` / `rgba(` / `hsl(`）；`rgba()` 仅允许 `rgba(var(--ui-...))` 形式。需要新颜色语义先补齐 theme/tokens，再在组件侧消费 token。
3. 禁止 Tailwind arbitrary hex color（例如 `text-[#fff]`）。
4. 样式门禁：`npm run check:style-guard`（已接入 `check:all`；不扫描 `__tests__` / `*.test.ts` 等测试文件；`rgba()` 规则不扫描 `.vue` 的 `<style>` block）。

---

## 4. 测试策略（自动化 + 人工）

### 4.1 自动化分层（仓库现状）

1. 单元测试（Vitest）：`src/composables` / `src/services` / `src/stores` / `src/features`
2. UI 回归（Vitest + Vue Test Utils）：`src/__tests__/app.*.test.ts`

### 4.2 覆盖率与回归底线

1. 覆盖率门槛保持不低于当前基线（85%+）。
2. 前端 JS coverage 门禁覆盖 `src/App.vue`、`src/components/**/*.vue`、`src/composables/**/*.ts`、`src/features/**/*.ts`、`src/services/**/*.ts`、`src/stores/**/*.ts`。
3. Rust 质量继续独立走 `check:rust` / `cargo test` / smoke gate，不与前端 coverage 混成“全仓单一百分比”。
4. 高风险行为（热键/焦点/队列/失败分支/安全确认/注入拦截/会话恢复）必须有自动化回归。

### 4.3 必须人工回归的场景（真机）

触发条件：

1. 终端执行链路变化。
2. 窗口生命周期、焦点策略、拖拽/位置恢复变化。
3. Tauri/Rust 侧窗口或终端能力变化。
4. 发布前至少 1 轮真机。

人工回归清单：

- 日常（M0/M0A）：`docs/.maintainer/work/manual_regression_m0_m0a.md`
- 发布前：按 `docs/.maintainer/work/release_runbook.md` 的“发布前人工验收（macOS 真机）”执行

---

## 5. 文档治理（Docs-first）

1. 先改文档，再改代码；代码改了，必须在同一轮补齐相关文档。
2. 文档必须明确区分：
   - 当前已实现（Current）
   - 未来计划（Roadmap）
3. 禁止把“未落地能力”写成“已实现能力”。
4. 需求/计划文档统一落到 `docs/plan/`（文档先行的落地入口），并至少包含：
   - 背景与范围（in/out）
   - 交互与行为口径（Current vs Roadmap）
   - 验收标准（可验证）
   - 测试计划（自动化 + 必要的人工回归点）
   - 需要同步的文档清单（README/CHANGELOG/契约等）
5. 文档新增/重命名必须同步更新：`docs/README.md`。
6. 影响开源用户入口（安装/运行/命令目录/配置/行为口径）的改动，必须同步更新：
   - `README.md`
   - `README.zh-CN.md`

---

## 6. 变更同步矩阵（收口规则）

| 改动类型 | 必须同步 |
|---|---|
| 新需求/新功能（必须 Docs-first） | `docs/plan/*` + 自动化回归（至少 1 条） +（如影响用户）`README*` |
| 主界面交互变化（搜索/抽屉/暂存） | `README.md` + `README.zh-CN.md`（如影响使用方式） + `docs/active_context.md` + 必要的自动化回归 |
| 快捷键变化 | `README.md` + `README.zh-CN.md`（如影响使用方式） + `docs/active_context.md` + 自动化回归 +（如涉及真机窗口行为）`docs/.maintainer/work/manual_regression_m0_m0a.md` |
| 执行语义变化（成功/失败/队列） | `README.md` + `README.zh-CN.md` + `docs/active_context.md` + 自动化回归 |
| 工程规则变化（lint/test/结构约束） | `docs/project_constitution.md` + `AGENTS.md` +（如影响贡献者）`CONTRIBUTING*` |
| 发布链路变化（CI/Release） | `docs/.maintainer/work/release_runbook.md` + `docs/.maintainer/work/ci_cd_verification.md` +（必要时）`README*` / `CHANGELOG.md` |
| 新增/重命名文档 | `docs/README.md` |

---

## 7. 提交前收口清单（Checklist）

### 7.1 代码

1. 改动范围明确，无无关文件修改。
2. 新增逻辑已处理边界与失败分支。
3. 不引入 `any`，不新增 lint warning/error。

### 7.2 测试

1. 已执行 `npm run lint`。
2. 已执行 `npm run typecheck`。
3. 已执行 `npm run test:run` 或 `npm run test:related`（与改动匹配）。
4. 已执行 `npm run check:all`（提交前最终确认）。
5. 若涉及窗口/终端/跨平台行为，已按需执行人工回归清单（见第 4 节）。

### 7.3 文档

1. 行为改动已同步：`README*` / `docs/active_context.md` / `docs/architecture_plan.md`（按变更类型选择）。
2. 新需求已落地到 `docs/plan/*`（Docs-first）。
3. 新增/重命名文档已更新：`docs/README.md`。

### 7.4 交付备注模板

1. 本轮改动：
2. 自动化验证结果：
3. 人工回归结果：
4. 已知风险与下一步：
