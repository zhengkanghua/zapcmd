# Controlled Visual Regression Runner Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 blocking visual gate 从开发机本地 `windows-edge / wsl-windows-edge` compare 迁移到唯一的 `controlled-runner`，并把受控字体限定在 visual harness，不污染真实产品运行时。

**Architecture:** `scripts/e2e/visual-regression-lib.cjs` 负责统一模式、baseline 目录和浏览器契约，其中 `controlled-runner` 成为唯一 blocking baseline 来源，Windows/WSL 本机模式继续做 compare，Linux 保留 smoke。受控字体通过 `src/styles/visual-fonts.css` 只在 `src/main-visual.ts` 引入，覆盖 `AppVisual.vue` 已有的 `--ui-font-visual-*` 语义变量；真实 `index.html/settings.html` 与运行时全局样式不引入这些 `@font-face`。`scripts/verify-local-gate.mjs` 则改为“质量门禁阻断 + visual compare 非阻断”的执行器，CI 只调用 `npm run test:visual:ui:runner` 作为最终视觉门禁。

**Tech Stack:** Node.js CJS/MJS scripts, Vitest, Vue 3, Vite multi-entry, GitHub Actions, WOFF2 visual harness fonts

**设计文档:** `docs/superpowers/specs/2026-03-28-controlled-visual-regression-runner-design.md`

---

## 实施护栏

1. `controlled-runner` 是唯一 blocking visual mode；`windows-edge` / `wsl-windows-edge` / `linux-chromium` 不得再被文档或脚本描述成最终 gate。
2. baseline 目录只保留两层事实源：`scripts/e2e/visual-baselines/controlled-runner/` 与 `scripts/e2e/visual-baselines/linux-chromium/`；旧根目录 Windows baseline 迁移后不再继续使用。
3. 受控字体只能从 `visual.html -> src/main-visual.ts -> src/styles/visual-fonts.css` 这条链路进入，禁止导入到 `src/styles/index.css` 或任何真实产品入口。
4. `verify:local` 默认仍运行本机 visual compare，但 mismatch 只能给 warning/artifact 路径，不能让本地 gate 直接非零退出。
5. `controlled-runner` 模式必须硬失败于“浏览器路径缺失 / 版本不匹配 / 受控 baseline 缺失”；不要静默回退系统 Edge。
6. runner 机器的浏览器 provisioning 属于外部前置条件；repo 内只落 `ZAPCMD_VISUAL_RUNNER_BROWSER_PATH` 与 `ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION` 契约，不在本轮顺手实现下载器。
7. 每个代码任务都按 TDD 落地；文档/工作流任务至少有字符串契约测试，避免只改 README 不改入口。

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/styles/visual-fonts.css` | visual harness 专用 `@font-face` 与受控字体变量覆盖 |
| `public/fonts/visual-regression/zapcmd-visual-sans-subset.woff2` | visual harness 受控 sans 子集字体 |
| `public/fonts/visual-regression/zapcmd-visual-mono-subset.woff2` | visual harness 受控 mono 子集字体 |
| `public/fonts/visual-regression/LICENSES.md` | 记录字体来源、许可证与子集化说明 |
| `scripts/verify-local-gate-lib.mjs` | 计算本地 gate 步骤与阻断/非阻断语义 |
| `scripts/__tests__/verify-local-gate-lib.test.ts` | 锁定 Windows/WSL/macOS 下本地 gate 的步骤规划 |
| `scripts/__tests__/controlled-visual-runner-contract.test.ts` | 锁定 package/workflow/README/verify-local 对 `controlled-runner` 的文本契约 |

### 修改

| 文件 | 职责 |
|---|---|
| `package.json` | 新增 runner 视觉命令，保留本机 compare/smoke 命令 |
| `scripts/e2e/visual-regression-lib.cjs` | 新增 `controlled-runner` 模式、baseline/output/browser 契约 |
| `scripts/e2e/visual-regression.cjs` | CLI help、运行时断言、mode 特定 update hint、artifact 打印 |
| `scripts/e2e/visual-regression-env.cjs` | 输出 `controlled-runner` 的浏览器期望版本与字体模式事实 |
| `scripts/e2e/visual-regression-runner.cjs` | mode 特定 baseline 缺失提示与 runner 日志补充 |
| `scripts/__tests__/visual-regression-lib.test.ts` | 锁定新模式与 baseline/output 目录行为 |
| `scripts/__tests__/visual-regression-env.test.ts` | 锁定 `controlled-runner` manifest 字段 |
| `src/styles/tokens.css` | 把 `--ui-font-visual-*` 拆为 fallback semantic token，允许 visual-only CSS 覆盖 |
| `src/main-visual.ts` | 仅 visual 入口导入 `visual-fonts.css` |
| `src/__tests__/visual.font-contract.test.ts` | 锁定 visual-only 字体链路与 tokens 覆盖关系 |
| `scripts/verify-local-gate.mjs` | 改为消费 gate plan，并把 visual compare 降级为非阻断步骤 |
| `scripts/README.md` | 明确本机 compare 与 controlled-runner gate 的职责边界 |
| `.github/workflows/ci-gate.yml` | 将 blocking visual step 切换为 `npm run test:visual:ui:runner` |
| `scripts/e2e/visual-baselines/controlled-runner/*.png` | controlled-runner 真正 blocking baseline |
| `docs/active_context.md` | 收口本阶段新事实，控制在 200 字内补充 |

## 重点测试矩阵

1. 脚本 mode/baseline/env contract  
   `npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts scripts/__tests__/visual-regression-env.test.ts`
2. 本地 gate / workflow / docs contract  
   `npm run test:run -- scripts/__tests__/verify-local-gate-lib.test.ts scripts/__tests__/controlled-visual-runner-contract.test.ts`
3. visual font contract  
   `npm run test:run -- src/__tests__/visual.font-contract.test.ts`
4. runner 实机验证  
   `npm run test:visual:ui:runner`
5. 本机 compare / smoke 回归  
   `npm run test:visual:ui`  
   `npm run test:visual:ui:wsl-bridge`  
   `npm run test:visual:ui:linux`
6. 最终门禁  
   `npm run check:all`

## Chunk 1: `controlled-runner` 模式与 baseline 契约

### Task 1: 为 visual-regression 脚本增加 `controlled-runner` 模式与 runner 命令入口

**Files:**
- Modify: `package.json`
- Modify: `scripts/e2e/visual-regression-lib.cjs`
- Modify: `scripts/e2e/visual-regression.cjs`
- Modify: `scripts/__tests__/visual-regression-lib.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 mode / baseline / output / browser contract**

在 `scripts/__tests__/visual-regression-lib.test.ts` 增加至少这些断言：

```ts
it("allows forcing controlled-runner mode", () => {
  expect(
    resolveVisualMode({
      platform: "linux",
      env: { ZAPCMD_VISUAL_MODE: "controlled-runner" }
    })
  ).toBe("controlled-runner");
});

it("routes windows and wsl compare modes to controlled-runner baselines", () => {
  const baselineRoot = path.join("/repo", "scripts", "e2e", "visual-baselines");

  expect(resolveBaselineDir({ rootDir: baselineRoot, mode: "windows-edge" })).toBe(
    path.join(baselineRoot, "controlled-runner")
  );
  expect(resolveBaselineDir({ rootDir: baselineRoot, mode: "wsl-windows-edge" })).toBe(
    path.join(baselineRoot, "controlled-runner")
  );
});

it("isolates controlled-runner artifacts into its own output directory", () => {
  expect(
    resolveOutputDir({
      rootDir: path.join("/repo", ".tmp", "e2e", "visual-regression"),
      mode: "controlled-runner"
    })
  ).toBe(path.join("/repo", ".tmp", "e2e", "visual-regression", "controlled-runner"));
});

it("reads controlled-runner browser contract from dedicated env vars", () => {
  const runtime = resolveBrowserRuntime({
    mode: "controlled-runner",
    env: {
      ZAPCMD_VISUAL_RUNNER_BROWSER_PATH: "C:\\controlled\\chrome.exe",
      ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION: "146.0.0.0"
    }
  });

  expect(runtime.command).toBe("C:\\controlled\\chrome.exe");
  expect(runtime.expectedVersion).toBe("146.0.0.0");
  expect(runtime.name).toBe("Controlled Chromium");
});
```

- [ ] **Step 2: 跑 focused tests，确认当前实现未支持该契约**

Run:
- `npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts`

Expected:
- FAIL，提示缺少 `controlled-runner` mode、baseline 目录仍指向旧 Windows 根目录，或 browser runtime 没有 runner 专属 env contract。

- [ ] **Step 3: 做最小实现，接通新模式和命令入口**

实现要求：

```js
const VISUAL_MODES = Object.freeze({
  windowsEdge: "windows-edge",
  wslBridge: "wsl-windows-edge",
  linuxSmoke: "linux-chromium",
  controlledRunner: "controlled-runner",
  skip: "skip"
});
```

`resolveBaselineDir()` 规则改成：

```js
if (mode === VISUAL_MODES.linuxSmoke) {
  return path.join(baseRoot, "linux-chromium");
}
return path.join(baseRoot, "controlled-runner");
```

`resolveOutputDir()` 只为 `controlled-runner` 新增单独子目录，不要顺手改掉现有 Windows/WSL compare 产物目录：

```js
if (mode === VISUAL_MODES.controlledRunner) {
  return path.join(baseRoot, "controlled-runner");
}
```

`resolveBrowserRuntime()` 对 runner 模式只读 dedicated env vars，不自动回退系统 Edge：

```js
if (mode === VISUAL_MODES.controlledRunner) {
  return {
    command: trimString(env.ZAPCMD_VISUAL_RUNNER_BROWSER_PATH),
    name: "Controlled Chromium",
    expectedVersion: trimString(env.ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION),
    useWindowsPaths: false
  };
}
```

`package.json` 新增：

```json
{
  "test:visual:ui:runner": "node scripts/e2e/visual-regression.cjs --mode=controlled-runner",
  "test:visual:ui:update:runner": "node scripts/e2e/visual-regression.cjs --mode=controlled-runner --update"
}
```

`scripts/e2e/visual-regression.cjs` 的 help 文案补 runner 模式和 env vars：

```txt
--mode=controlled-runner
ZAPCMD_VISUAL_RUNNER_BROWSER_PATH
ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION
```

- [ ] **Step 4: 重新运行 focused tests，确认 mode contract 变绿**

Run:
- `npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add package.json scripts/e2e/visual-regression-lib.cjs scripts/e2e/visual-regression.cjs scripts/__tests__/visual-regression-lib.test.ts
git commit -m "test(visual):接入 controlled-runner 模式契约"
```

## Chunk 2: runner 严格断言与 harness-only 受控字体

### Task 2: 为 `controlled-runner` 增加浏览器版本硬断言与 manifest 事实字段

**Files:**
- Modify: `scripts/e2e/visual-regression.cjs`
- Modify: `scripts/e2e/visual-regression-env.cjs`
- Modify: `scripts/e2e/visual-regression-runner.cjs`
- Modify: `scripts/__tests__/visual-regression-env.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 runner manifest 与 update hint**

在 `scripts/__tests__/visual-regression-env.test.ts` 新增：

```ts
it("records controlled-runner expected browser version and font mode", () => {
  const manifest = collectVisualEnvironment({
    mode: "controlled-runner",
    browserRuntime: {
      name: "Controlled Chromium",
      command: "C:\\controlled\\chrome.exe",
      expectedVersion: "146.0.0.0"
    },
    diffRuntime: { name: "PowerShell", command: "pwsh" },
    baselineDir: "scripts/e2e/visual-baselines/controlled-runner",
    outputDir: ".tmp/e2e/visual-regression/controlled-runner",
    serverBinding: { listenHost: "127.0.0.1", urlHost: "127.0.0.1" }
  });

  expect(manifest.mode).toBe("controlled-runner");
  expect(manifest.browser.expectedVersion).toBe("146.0.0.0");
  expect(manifest.fontScope).toBe("visual-harness-controlled");
  expect(manifest.baselineKind).toBe("controlled-runner");
});
```

同任务里补一条字符串契约断言，确保 runner baseline 缺失时提示的是 runner update 命令：

```ts
expect(readFileSync(resolve(process.cwd(), "scripts/e2e/visual-regression-runner.cjs"), "utf8")).toContain(
  "test:visual:ui:update:runner"
);
```

- [ ] **Step 2: 跑 focused tests，确认 runner 专属字段当前不存在**

Run:
- `npm run test:run -- scripts/__tests__/visual-regression-env.test.ts`

Expected:
- FAIL，提示 `expectedVersion` / `fontScope` / `baselineKind` 缺失，或 update hint 仍写默认命令。

- [ ] **Step 3: 最小实现 runner 断言与 manifest 增量字段**

实现要求：
- `collectVisualEnvironment()` 输出以下 runner 事实：

```js
browser: {
  name,
  command,
  version,
  expectedVersion,
  versionMatchesExpected
},
baselineKind: runtime.mode === VISUAL_MODES.linuxSmoke ? "linux-smoke" : "controlled-runner",
fontScope: runtime.mode === VISUAL_MODES.controlledRunner
  ? "visual-harness-controlled"
  : "local-compare"
```

- `scripts/e2e/visual-regression.cjs` 在真正截图前新增 runner 断言：

```js
if (runtime.mode === VISUAL_MODES.controlledRunner) {
  assertControlledRunnerBrowser(runtime, environmentManifestPath);
}
```

断言行为必须是：
- 缺少 `ZAPCMD_VISUAL_RUNNER_BROWSER_PATH` 直接失败
- 缺少 `ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION` 直接失败
- `manifest.browser.version` 不包含期望版本时直接失败
- 错误信息必须带 `environment.json` 路径，方便 runner 诊断

- `scripts/e2e/visual-regression-runner.cjs` 中 baseline 缺失提示按 mode 分流：

```js
const updateCommand =
  mode === "controlled-runner"
    ? "npm run test:visual:ui:update:runner"
    : "node scripts/e2e/visual-regression.cjs --update";
```

- [ ] **Step 4: 重新运行 focused tests，确认 env contract 通过**

Run:
- `npm run test:run -- scripts/__tests__/visual-regression-env.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add scripts/e2e/visual-regression.cjs scripts/e2e/visual-regression-env.cjs scripts/e2e/visual-regression-runner.cjs scripts/__tests__/visual-regression-env.test.ts
git commit -m "test(visual):加严 controlled-runner 浏览器与 manifest 断言"
```

### Task 3: 把受控字体隔离到 visual harness 专用入口

**Files:**
- Create: `src/styles/visual-fonts.css`
- Create: `public/fonts/visual-regression/zapcmd-visual-sans-subset.woff2`
- Create: `public/fonts/visual-regression/zapcmd-visual-mono-subset.woff2`
- Create: `public/fonts/visual-regression/LICENSES.md`
- Modify: `src/styles/tokens.css`
- Modify: `src/main-visual.ts`
- Modify: `src/__tests__/visual.font-contract.test.ts`

- [ ] **Step 1: 先写失败 contract test，锁定 visual-only 字体链路**

把 `src/__tests__/visual.font-contract.test.ts` 扩展为至少校验：

```ts
const mainVisual = readProjectFile("src/main-visual.ts");
const visualFonts = readProjectFile("src/styles/visual-fonts.css");
const tokens = readProjectFile("src/styles/tokens.css");

expect(mainVisual).toContain('import "./styles/visual-fonts.css"');
expect(visualFonts).toContain("@font-face");
expect(visualFonts).toContain("/fonts/visual-regression/zapcmd-visual-sans-subset.woff2");
expect(visualFonts).toContain("/fonts/visual-regression/zapcmd-visual-mono-subset.woff2");
expect(tokens).toContain("--ui-font-visual-sans-fallback:");
expect(tokens).toContain("--ui-font-visual-sans: var(--ui-font-visual-sans-fallback);");
expect(tokens).toContain("--ui-font-visual-mono-fallback:");
expect(tokens).toContain("--ui-font-visual-mono: var(--ui-font-visual-mono-fallback);");
```

- [ ] **Step 2: 跑 focused tests，确认当前还没有 visual-only font entry**

Run:
- `npm run test:run -- src/__tests__/visual.font-contract.test.ts`

Expected:
- FAIL，提示 `src/main-visual.ts` 未引入 `visual-fonts.css` 或 tokens 尚未拆成 semantic fallback。

- [ ] **Step 3: 做最小实现，让 controlled fonts 只进 visual harness**

`src/styles/tokens.css` 先把现有 visual token 改成 fallback+semantic 两层：

```css
--ui-font-visual-sans-fallback: "Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif;
--ui-font-visual-mono-fallback: Consolas, "Courier New", monospace;
--ui-font-visual-sans: var(--ui-font-visual-sans-fallback);
--ui-font-visual-mono: var(--ui-font-visual-mono-fallback);
```

`src/styles/visual-fonts.css` 只做三件事：

```css
@font-face {
  font-family: "ZapCmd Visual Sans Controlled";
  src: url("/fonts/visual-regression/zapcmd-visual-sans-subset.woff2") format("woff2");
  font-display: block;
}

@font-face {
  font-family: "ZapCmd Visual Mono Controlled";
  src: url("/fonts/visual-regression/zapcmd-visual-mono-subset.woff2") format("woff2");
  font-display: block;
}

.visual-regression-root {
  --ui-font-visual-sans: "ZapCmd Visual Sans Controlled", var(--ui-font-visual-sans-fallback);
  --ui-font-visual-mono: "ZapCmd Visual Mono Controlled", var(--ui-font-visual-mono-fallback);
}
```

`src/main-visual.ts` 只在 visual 入口引入：

```ts
import "./styles/index.css";
import "./styles/visual-fonts.css";
```

`public/fonts/visual-regression/LICENSES.md` 至少记录：
- 字体原始名称
- 许可证类型
- 子集化范围
- 生成日期/来源命令

- [ ] **Step 4: 重新运行 focused tests，确认 harness-only contract 通过**

Run:
- `npm run test:run -- src/__tests__/visual.font-contract.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/styles/visual-fonts.css public/fonts/visual-regression/zapcmd-visual-sans-subset.woff2 public/fonts/visual-regression/zapcmd-visual-mono-subset.woff2 public/fonts/visual-regression/LICENSES.md src/styles/tokens.css src/main-visual.ts src/__tests__/visual.font-contract.test.ts
git commit -m "test(visual):隔离 visual harness 受控字体"
```

## Chunk 3: 本地 gate 改为非阻断 compare

### Task 4: 把 `verify:local` 重构为“阻断质量门禁 + 非阻断 visual compare”执行器

**Files:**
- Create: `scripts/verify-local-gate-lib.mjs`
- Create: `scripts/__tests__/verify-local-gate-lib.test.ts`
- Modify: `scripts/verify-local-gate.mjs`

- [ ] **Step 1: 先写失败测试，锁定各平台 gate 计划**

在 `scripts/__tests__/verify-local-gate-lib.test.ts` 增加：

```ts
it("keeps windows visual compare as non-blocking by default", () => {
  const plan = buildLocalGatePlan({
    platform: "win32",
    isWsl: false,
    flags: new Set()
  });

  expect(plan.steps.map((step) => step.command)).toContain("npm run test:visual:ui");
  expect(plan.steps.find((step) => step.command === "npm run test:visual:ui")?.allowFailure).toBe(true);
});

it("keeps wsl visual compare as non-blocking", () => {
  const plan = buildLocalGatePlan({
    platform: "linux",
    isWsl: true,
    flags: new Set()
  });

  expect(plan.steps.find((step) => step.command === "npm run test:visual:ui")?.allowFailure).toBe(true);
});

it("does not schedule visual compare on macOS default gate", () => {
  const plan = buildLocalGatePlan({
    platform: "darwin",
    isWsl: false,
    flags: new Set()
  });

  expect(plan.steps.map((step) => step.command)).not.toContain("npm run test:visual:ui");
});
```

- [ ] **Step 2: 跑 focused tests，确认当前脚本还没有可测试的 gate planner**

Run:
- `npm run test:run -- scripts/__tests__/verify-local-gate-lib.test.ts`

Expected:
- FAIL，提示 `buildLocalGatePlan` 不存在。

- [ ] **Step 3: 抽出 gate planner，并让 visual compare 失败只记 warning**

`scripts/verify-local-gate-lib.mjs` 设计成纯函数：

```js
export function buildLocalGatePlan({ platform, isWsl, flags }) {
  return {
    steps: [
      { command: "npm run check:all", allowFailure: false },
      { command: "npm run e2e:desktop:smoke", allowFailure: false },
      { command: "npm run test:visual:ui", allowFailure: true, artifactHint: ".tmp/e2e/visual-regression/" }
    ]
  };
}
```

`scripts/verify-local-gate.mjs` 改为：
- 先调用 `buildLocalGatePlan()`
- 对 `allowFailure: true` 的步骤执行 `runOptionalCommand()`，失败时打印 warning 和 artifact 路径，但不抛错
- `--dry-run` 输出时要显式标明 `(non-blocking compare)`，避免用户误解

不要做的事：
- 不要把 visual compare 整个移出 `verify:local`
- 不要引入新的强制 flag 才能跑 visual compare

- [ ] **Step 4: 重新运行 focused tests，确认 gate planner contract 通过**

Run:
- `npm run test:run -- scripts/__tests__/verify-local-gate-lib.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add scripts/verify-local-gate-lib.mjs scripts/__tests__/verify-local-gate-lib.test.ts scripts/verify-local-gate.mjs
git commit -m "refactor(scripts):将 verify local 视觉比对降级为非阻断步骤"
```

## Chunk 4: workflow/docs/baseline 收口

### Task 5: 统一 package / workflow / README 契约，并迁移 controlled-runner baselines

**Files:**
- Create: `scripts/__tests__/controlled-visual-runner-contract.test.ts`
- Modify: `scripts/README.md`
- Modify: `.github/workflows/ci-gate.yml`
- Modify: `scripts/e2e/visual-baselines/controlled-runner/*.png`
- Modify/Delete: `scripts/e2e/visual-baselines/*.png`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先写失败 contract test，锁定 repo 对外口径**

在 `scripts/__tests__/controlled-visual-runner-contract.test.ts` 读取文本并断言：

```ts
expect(packageJson.scripts["test:visual:ui:runner"]).toBeDefined();
expect(readProjectFile(".github/workflows/ci-gate.yml")).toContain("npm run test:visual:ui:runner");
expect(readProjectFile("scripts/README.md")).toContain("blocking visual gate 只来自 `controlled-runner`");
expect(readProjectFile("scripts/README.md")).toContain("本地 mismatch 不等价于最终 visual gate 失败");
expect(readProjectFile("scripts/verify-local-gate.mjs")).toContain("non-blocking compare");
```

- [ ] **Step 2: 跑 focused tests，确认文档与 workflow 还没切到 controlled-runner**

Run:
- `npm run test:run -- scripts/__tests__/controlled-visual-runner-contract.test.ts`

Expected:
- FAIL，提示 README 仍把 `test:visual:ui` 当 blocking，workflow 仍直接跑本机 visual gate。

- [ ] **Step 3: 实现 repo 契约切换并迁 baseline**

具体改动：

1. `scripts/README.md` 必须明确列出四条事实：
   - `npm run test:visual:ui` = 本机 compare/diagnose
   - `npm run test:visual:ui:runner` = 唯一 blocking visual gate
   - `npm run verify:local` 默认不会被本机 visual mismatch 阻断
   - baseline 更新只能通过 `npm run test:visual:ui:update:runner`

2. `.github/workflows/ci-gate.yml` 把当前 visual step：

```yaml
- name: Run screenshot-level visual regression gate
  run: npm run test:visual:ui
```

替换为：

```yaml
- name: Run controlled visual regression gate
  run: npm run test:visual:ui:runner
```

并在同一个 job 注释里写清楚：
- runner 环境必须提供 `ZAPCMD_VISUAL_RUNNER_BROWSER_PATH`
- runner 环境必须提供 `ZAPCMD_VISUAL_RUNNER_BROWSER_VERSION`

3. baseline 迁移用 `git mv`，不要复制留双份：

```bash
git mv scripts/e2e/visual-baselines/*.png scripts/e2e/visual-baselines/controlled-runner/
```

4. 在 controlled runner 机器上刷新 baseline：

Run:
- `npm run test:visual:ui:update:runner`
- `npm run test:visual:ui:runner`

Expected:
- `scripts/e2e/visual-baselines/controlled-runner/*.png` 生成或更新
- `.tmp/e2e/visual-regression/controlled-runner/environment.json` 存在

- [ ] **Step 4: 跑最终自动化验证**

Run:
- `npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts scripts/__tests__/visual-regression-env.test.ts scripts/__tests__/verify-local-gate-lib.test.ts scripts/__tests__/controlled-visual-runner-contract.test.ts src/__tests__/visual.font-contract.test.ts`
- `npm run test:visual:ui:runner`
- `npm run check:all`

附加人工验证：
- Windows 或 WSL 开发机运行 `npm run test:visual:ui`，确认 mismatch 只报 warning/产物路径，不再阻断 `verify:local`
- Linux 运行 `npm run test:visual:ui:linux`，确认 smoke baseline 目录未回归

Expected:
- focused tests PASS
- runner visual gate PASS
- `check:all` PASS

- [ ] **Step 5: 更新短期记忆并提交收口**

`docs/active_context.md` 只补 1 条短记忆，控制在 200 字内，至少包含：
- blocking visual gate 已切到 `controlled-runner`
- `verify:local` 默认 visual mismatch 非阻断
- visual harness 已改为受控字体
- 关键验证结果

提交：

```bash
git add scripts/README.md .github/workflows/ci-gate.yml scripts/e2e/visual-baselines/controlled-runner docs/active_context.md scripts/__tests__/controlled-visual-runner-contract.test.ts
git commit -m "test(visual):切换 controlled-runner 作为唯一阻断门禁"
```

## 建议执行顺序

1. 先做 Task 1，把 `controlled-runner` mode、baseline 目录与命令入口接好，否则后续文档与 workflow 都没有锚点。
2. 再做 Task 2，先把 runner 断言加严，再隔离 visual-only font 入口；这样实际 baseline 刷新时不会混入系统字体。
3. Task 4 放在 Task 2 后执行，确保 `verify:local` 的非阻断 compare 与 runner gate 语义同时切换，避免团队在半迁移状态下误用旧命令。
4. 最后做 Task 5，用 contract test 锁定 README/workflow，再由 controlled runner 刷 baseline 并跑最终门禁。

Plan complete and saved to `docs/superpowers/plans/2026-03-28-controlled-visual-regression-runner.md`. Ready to execute?
