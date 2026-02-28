# ZapCmd 开发约束（Current + Target）

> 基线日期：2026-02-21
> 说明：本文件拆分为“当前已执行约束”和“目标约束（待达成）”，避免文档与现状冲突。

---

## 1. 当前已执行约束

1. 前端 TypeScript 使用 `strict`。
2. 禁止 `any`（ESLint：`@typescript-eslint/no-explicit-any = error`）。
3. 已接入 ESLint 门禁，`lint` 配置为 `--max-warnings=0`。
4. 已接入统一门禁：`npm run check:all`。
5. 已接入 pre-commit 门禁（lint + typecheck + related tests）。
6. `check:all` 已纳入 Rust 校验（`cargo check --manifest-path src-tauri/Cargo.toml`）。
7. 主窗口采用透明壳层 + 组件实体背景，不使用毛玻璃。
8. 交互控件主要使用语义化元素（`button/input/form/main/section/nav`）。
9. 主窗口失焦自动隐藏，窗口位置会持久化。
10. 已接入前端单测基线（Vitest + coverage 配置）。

---

## 2. 目标约束（待达成）

### 2.1 前端结构

1. 将超大 `App.vue` 拆分为功能组件（搜索、结果、暂存、设置、输出）。
2. 跨组件状态进入 store，局部状态留在组件内。
3. 抽离快捷键、窗口同步、执行流程为 composables/services。

### 2.2 安全与执行

1. 增加参数注入防护。
2. 增加危险命令检测与执行前确认。
3. 增加执行结果可视反馈与日志追踪。

### 2.3 工程门禁

1. 继续保持 `check:all` 全绿交付标准。
2. 继续扩展 UI 回归与失败链路分支覆盖。
3. 后续接入 CI（lint + typecheck + coverage + build）。

---

## 3. 当前与目标差距（审查口径）

1. `src/App.vue` 仍然偏大，后续拆分优先级高。
2. 自动化已覆盖主路径，但真机行为仍需人工回归兜底。
3. 当前执行链路已具备基础安全防护（注入拦截 + 高危确认）；高级治理与输出体验增强仍待推进。
4. 文档与实现一致性已纳入提交流程，需持续执行。

---

## 4. 当前脚本（已执行）

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.vue",
    "precommit:guard": "node scripts/precommit-guard.mjs",
    "typecheck": "vue-tsc --noEmit",
    "build": "vue-tsc --noEmit && vite build",
    "test:related": "vitest related --run",
    "test:coverage": "vitest run --coverage",
    "check:rust": "cargo check --manifest-path src-tauri/Cargo.toml",
    "check:all": "npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run check:rust"
  }
}
```

---

## 5. 执行规则

1. 行为变更必须同步更新：
   - 对外入口文档（`README.md` / `README.zh-CN.md`）
   - 相关实现文档（`docs/` 下对应主题）
   - 自动化测试（至少一条回归覆盖关键行为）
2. 新增未落地能力时，必须明确标注为 Roadmap，不得写成“已实现”。
