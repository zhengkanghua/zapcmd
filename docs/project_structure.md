# ZapCmd 项目结构与技术栈

> 状态：Active  
> 最后更新：2026-03-01  
> 目标：让开发者/维护者/Agent 在 10 分钟内建立“仓库结构 + 边界划分 + 常用入口”的心智模型。

---

## 1. 技术栈（按职责）

1. 桌面壳层：Tauri 2.x（Rust）。
2. 前端渲染：Vue 3 + TypeScript（`strict`）。
3. 状态管理：Pinia。
4. 多语言：`vue-i18n`。
5. 构建：Vite。
6. 样式：模块化 CSS（入口 `src/styles/index.css`；Tailwind 已移除）。
7. 测试：Vitest + Vue Test Utils（`jsdom`）+ coverage（v8）。
8. 代码质量：ESLint（含 Vue/TS 规则）。
9. CI/Release：GitHub Actions（`ci-gate` / `codeql` / `release-build` / `release-dry-run`）。

---

## 2. 目录结构速览

```text
src/                      前端（Vue）
  components/             纯 UI 组件（尽量无业务副作用）
  composables/            可复用业务逻辑（hooks）
  features/               按领域组织的功能模块
  services/               边界与 I/O（Tauri bridge、执行器等）
  stores/                 Pinia stores（跨组件状态）
  __tests__/              UI 回归与集成测试（vitest）
  App.vue                 主窗口 UI 组合入口
  main.ts                 前端启动入口

src-tauri/                 后端（Rust）
  src/                     Tauri commands 与系统能力（终端/窗口/热键/启动）
  tauri.conf.json           Tauri 配置

assets/runtime_templates/   运行时命令模板资产（内置命令 JSON）
docs/                       协作文档入口（见 docs/README.md）
docs/plan/                  需求/计划文档（Docs-first）
docs/.maintainer/           维护者/Agent 内部资料（跑书/人工回归/归档）
scripts/                    工具脚本（版本同步、hooks、命令生成等）
.github/                    工作流、模板、协作配置
```

---

## 3. 关键入口与边界（建议从这里开始读）

1. 前端入口：`src/main.ts` -> `src/App.vue`
2. Tauri 边界（前端调用后端）：`src/services/tauriBridge.ts`
3. Tauri commands 注册：`src-tauri/src/lib.rs`
4. 终端执行核心能力：`src-tauri/src/terminal.rs`（命令执行在系统终端中发生）

---

## 4. 常用命令（维护者/开发者）

1. 本地开发（桌面真机）：`npm run tauri:dev`
2. 全量门禁（提交前）：`npm run check:all`
3. 单测：`npm run test:run`
4. 覆盖率：`npm run test:coverage`

发布与回滚流程：`docs/.maintainer/work/release_runbook.md`  
人工回归清单：`docs/.maintainer/work/manual_regression_m0_m0a.md`（发布前场景按 `release_runbook.md` 执行）

---

## 5. “当前实现是什么”的入口

短期快照（含 UI 行为基线，建议每轮变更后更新）：`docs/active_context.md`
