# Windows 视觉回归跨设备稳定性治理 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 先把 Windows 视觉回归的跨设备不稳定收敛成“可诊断、可解释、可逐步治理”的工程问题，再按优先级去掉最主要的跨设备渲染漂移来源。

**Architecture:** 先补运行时环境证据和 baseline 操作口径，避免继续在“看不见环境”的前提下误判 diff。随后把最不稳定的 Unicode icon 文本渲染收口为受控 SVG，并仅在 visual harness 范围内引入更稳定的字体约束，先降低截图门禁漂移，再决定是否需要更重的仓库内置字体方案。

**Tech Stack:** Node.js CJS scripts、Vue 3、Vitest、Tailwind、Windows Edge / WSL bridge visual regression

---

## 0. 执行约束

- [ ] 本轮优先级固定为：环境日志补强 -> canonical baseline machine 策略 -> Unicode icon SVG 化 -> visual harness 字体约束；不要先做仓库级字体大改。
- [ ] 修改前先搜索定位相关文件和现有测试，禁止凭经验扩散改动范围。
- [ ] 只把稳定性治理限制在视觉回归脚本、Settings 顶部导航 icon、visual harness 字体作用域；不顺手改其他业务样式。
- [ ] 行为变更默认按 TDD 执行；纯文档更新至少跑 `git diff --check`。
- [ ] 每个代码任务结束至少执行：相关 focused tests、`npm run lint`、`npm run typecheck`、`npm run build`。
- [ ] 任何声称“跨设备已收敛”的结论，都必须基于同一提交在 canonical Windows 机器与对照机器各跑一次 `npm run test:visual:ui`。
- [ ] Windows 仍是最终 blocking baseline；WSL bridge 继续作为诊断/对照口径，不把 Linux smoke 提升为最终 baseline。

## 1. 优先级与阶段边界

### 短期（本轮第一批，高优先级）

1. 补齐视觉回归运行环境日志，让每次 mismatch 都能附带浏览器/Windows/字体事实。
2. 明确 canonical baseline machine 策略，统一“谁可以更新 baseline、谁只能做对照比对”的流程。
3. 把 `SSegmentNav` 与 `AppVisual.vue` 中的 Unicode icon 文本替换成受控 SVG。

### 中期（第一批完成后）

1. 在 `AppVisual.vue` 作用域内引入更稳定的字体变量，优先压低 screenshot harness 的文字漂移。
2. 基于新日志重新比较设备一/设备二，判断 residual diff 是否仍主要来自字体栅格化。

### 长期（只有在中期后仍不稳定时才进入）

1. 评估仓库内置字体资源，仅限 visual harness 或极少数关键 UI 热点，不做全局无差别换字。
2. 若产品口径要求“任意 Windows 机器都要稳定过同一 baseline”，再决定是否扩大字体治理到真实运行时 UI。

## Chunk 1: 文件边界与职责

### 1.1 计划内新增/修改文件

- `scripts/e2e/visual-regression-env.cjs`
  责任：集中收集 visual regression 的运行环境事实，输出可落盘 JSON。
- `scripts/e2e/visual-regression.cjs`
  责任：在每轮截图前后写入环境清单，并把 artifact 路径打印到控制台。
- `scripts/e2e/visual-regression-runner.cjs`
  责任：保留现有 browser spawn log，并补足与环境清单关联的输出字段。
- `scripts/README.md`
  责任：记录 canonical baseline machine、对照机回传物、baseline 更新口径。
- `src/components/settings/ui/settingsNavIcon.ts`
  责任：定义 Settings 顶部导航允许的 icon name union。
- `src/components/settings/ui/SettingsNavIcon.vue`
  责任：把导航 icon 渲染为受控 SVG，而不是 Unicode 文本。
- `src/components/settings/ui/SSegmentNav.vue`
  责任：消费 `SettingsNavIcon`，保留现有 tab 语义与 hit target。
- `src/components/settings/types.ts`
  责任：把 `SettingsNavItem.icon` 从 `string` 收紧到受控 icon name。
- `src/composables/settings/useSettingsWindow/viewModel.ts`
  责任：输出 icon name，而不是直接输出 Unicode glyph。
- `src/AppVisual.vue`
  责任：visual harness 改用受控 icon name，并承载 visual-only 字体作用域。
- `src/styles/tokens.css`
  责任：新增 visual harness 专用稳定字体变量，不直接重写整站默认字体策略。
- `scripts/__tests__/visual-regression-env.test.ts`
  责任：验证环境清单采集逻辑与输出字段。
- `src/components/settings/ui/__tests__/SettingsNavIcon.test.ts`
  责任：验证导航 icon 组件稳定输出 SVG。
- `src/__tests__/visual.font-contract.test.ts`
  责任：验证 visual harness 字体作用域与 token 契约。

### 1.2 只读参考文件（不要无理由修改）

- `docs/plan/2026-03-28_05-windows-visual-regression-cross-device-instability.md`
- `scripts/e2e/visual-regression-config.cjs`
- `src/components/settings/ui/SHotkeyRecorder.vue`
- `src/components/launcher/parts/LauncherSearchPanel.vue`
- `src/components/launcher/parts/LauncherStagingPanel.vue`
- `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- `src/components/launcher/parts/LauncherFlowPanel.vue`

这些文件是字体漂移的热点参考面，但第一批治理不主动扩散到它们，除非 visual-only 字体作用域验证后仍然证明必须继续下钻。

## Chunk 2: 短期治理任务

## 2. Task A: 环境日志补强与 canonical baseline machine 口径

**Files:**
- Create: `scripts/e2e/visual-regression-env.cjs`
- Modify: `scripts/e2e/visual-regression.cjs`
- Modify: `scripts/e2e/visual-regression-runner.cjs`
- Modify: `scripts/README.md`
- Test: `scripts/__tests__/visual-regression-env.test.ts`
- Test: `scripts/__tests__/visual-regression-lib.test.ts`

- [ ] **Step 1: 先补环境清单 failing tests**

覆盖要求：
- 新 helper 能返回运行模式、浏览器命令路径、浏览器版本、diff runtime 路径。
- Windows / WSL bridge 模式都能返回关键字体存在性（至少 `Segoe UI`、`Segoe UI Variable`、`Consolas`、`Fira Code`、`JetBrains Mono`、`Noto Sans`）。
- 输出对象包含 `baselineDir`、`outputDir`、`serverBinding`、`gitHead`，方便与 actual/baseline 对齐。

建议测试骨架：

```ts
it("collects visual environment manifest", async () => {
  const manifest = await collectVisualEnvironment({
    mode: "windows-edge",
    browserRuntime: { name: "Microsoft Edge", command: "C:\\Edge\\msedge.exe" },
    diffRuntime: { name: "PowerShell", command: "C:\\pwsh.exe" }
  });

  expect(manifest.mode).toBe("windows-edge");
  expect(manifest.browser.version).toContain("Edge");
  expect(manifest.fonts["Segoe UI"]).toBeDefined();
  expect(manifest.gitHead).toMatch(/[0-9a-f]{7,}/);
});
```

- [ ] **Step 2: 跑 focused tests，确认先失败**

Run:
`npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts scripts/__tests__/visual-regression-env.test.ts`

Expected:
- `scripts/__tests__/visual-regression-env.test.ts` 因模块不存在或字段缺失而失败。

- [ ] **Step 3: 最小实现环境清单与日志落盘**

实现要求：
- 新增 `collectVisualEnvironment()`，把运行事实写到：
  - Windows 原生：`.tmp/e2e/visual-regression/environment.json`
  - WSL bridge：`.tmp/e2e/visual-regression/windows-edge/environment.json`
  - Linux smoke：`.tmp/e2e/visual-regression/linux-chromium/environment.json`
- `visual-regression.cjs` 在启动时打印：
  - `mode`
  - `baselineDir`
  - `outputDir`
  - `environment manifest path`
- mismatch 输出追加 `env: <path>`，让用户不必只看 `browser.log`。
- `scripts/README.md` 新增固定口径：
  - canonical baseline 只允许指定 Windows 原生机器更新 `scripts/e2e/visual-baselines/*.png`
  - 对照机器只跑 compare，不直接更新 baseline
  - 任何 mismatch 回传必须包含 `environment.json` + `*.browser.log` + 控制台输出

建议 helper 结构：

```js
async function collectVisualEnvironment(runtime) {
  return {
    capturedAt: nowIso(),
    gitHead: resolveGitHead(),
    mode: runtime.mode,
    browser: await probeBrowser(runtime.browserRuntime),
    diffRuntime: await probeDiffRuntime(runtime.diffRuntime),
    system: await probeSystemInfo(runtime),
    fonts: await probeKeyFonts(runtime),
    baselineDir: runtime.baselineDir,
    outputDir: runtime.outputDir,
    serverBinding: runtime.serverBinding
  };
}
```

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts scripts/__tests__/visual-regression-env.test.ts`

Expected:
- 所有脚本级测试通过。

- [ ] **Step 5: 阶段验证**

Run:
- `npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts scripts/__tests__/visual-regression-env.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Manual:
- canonical Windows 机器执行 `npm run test:visual:ui`
- 对照 Windows 机器执行 `npm run test:visual:ui`

Expected:
- 两端都生成 `environment.json`
- mismatch 输出中能直接看到 env artifact 路径
- `scripts/README.md` 明确写出 canonical/update 流程

## 3. Task B: Unicode icon 收口为受控 SVG

**Files:**
- Create: `src/components/settings/ui/settingsNavIcon.ts`
- Create: `src/components/settings/ui/SettingsNavIcon.vue`
- Modify: `src/components/settings/ui/SSegmentNav.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/composables/settings/useSettingsWindow/viewModel.ts`
- Modify: `src/AppVisual.vue`
- Test: `src/components/settings/ui/__tests__/SettingsNavIcon.test.ts`
- Test: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`
- Test: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`

- [ ] **Step 1: 先补 failing tests**

覆盖要求：
- `SettingsNavIcon` 对每个支持的 name 都输出 `<svg aria-hidden="true">`。
- `SSegmentNav` 渲染后仍保留 tab 语义，但 icon 区不再依赖 `⌨ / ⚙ / ☰ / ✦ / ℹ` 文本。
- `SettingsWindow.layout.test.ts` 仍能验证 nav items 正常透传。

建议测试骨架：

```ts
it("renders deterministic svg icons for settings nav", () => {
  const wrapper = mount(SettingsNavIcon, { props: { name: "general" } });
  expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
  expect(wrapper.text()).toBe("");
});
```

- [ ] **Step 2: 跑 focused tests，确认先失败**

Run:
`npm run test:run -- src/components/settings/ui/__tests__/SettingsNavIcon.test.ts src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`

Expected:
- 新测试因缺少 `SettingsNavIcon` 或旧 icon contract 失败。

- [ ] **Step 3: 最小实现受控 icon contract**

实现要求：
- `settingsNavIcon.ts` 定义：

```ts
export type SettingsNavIconName =
  | "hotkeys"
  | "general"
  | "commands"
  | "appearance"
  | "about";
```

- `viewModel.ts` 输出 icon name：

```ts
{ id: "general", label: t("settings.nav.general"), icon: "general" }
```

- `SettingsNavIcon.vue` 仅使用 inline SVG + `currentColor`，不依赖 icon font。
- `SSegmentNav.vue` 保留现有 `min-h-[36px]`、键盘导航、tablist 语义，不额外改布局。
- `AppVisual.vue` 的 `segmentItems` 同步改成 icon name，确保 screenshot harness 与真实 Settings 顶部导航共享同一 icon 渲染路径。

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/components/settings/ui/__tests__/SettingsNavIcon.test.ts src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`

Expected:
- 受影响的 Settings nav focused tests 全部通过。

- [ ] **Step 5: 阶段验证**

Run:
- `npm run test:run -- src/components/settings/ui/__tests__/SettingsNavIcon.test.ts src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run test:visual:ui`

Expected:
- Settings 顶部导航相关 screenshot diff 至少不再由 Unicode glyph 本身驱动。

## Chunk 3: 中期治理、验证与长期门槛

## 4. Task C: visual harness 字体依赖治理

**Files:**
- Modify: `src/styles/tokens.css`
- Modify: `src/AppVisual.vue`
- Create: `src/__tests__/visual.font-contract.test.ts`
- Test: `src/__tests__/settings.bootstrap-contract.test.ts`
- Reference: `src/components/settings/ui/SHotkeyRecorder.vue`
- Reference: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Reference: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Reference: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- Reference: `src/components/launcher/parts/LauncherFlowPanel.vue`

- [ ] **Step 1: 先补 visual font contract failing tests**

覆盖要求：
- `tokens.css` 新增 visual-only 字体变量，例如 `--ui-font-visual-sans`、`--ui-font-visual-mono`。
- `AppVisual.vue` 根节点带上 visual-only 字体作用域 class。
- 现有 `visual.html` bootstrap 契约不被破坏。

建议测试骨架：

```ts
it("scopes stable font variables to visual harness only", () => {
  const appVisual = readProjectFile("src/AppVisual.vue");
  const tokens = readProjectFile("src/styles/tokens.css");

  expect(appVisual).toContain("visual-regression-root");
  expect(tokens).toContain("--ui-font-visual-sans");
  expect(tokens).toContain("--ui-font-visual-mono");
});
```

- [ ] **Step 2: 跑 focused tests，确认先失败**

Run:
`npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts src/__tests__/visual.font-contract.test.ts`

Expected:
- 新 contract test 因缺少 visual font scope 而失败。

- [ ] **Step 3: 最小实现 visual-only 字体约束**

实现要求：
- 不直接改 `:root` 的默认 `font-family`，避免把真实产品 UI 一次性全局改掉。
- 在 `tokens.css` 中增加 visual harness 专用变量，优先使用两台 Windows 设备都存在的本机字体：

```css
--ui-font-visual-sans: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
--ui-font-visual-mono: Consolas, "SF Mono", Monaco, monospace;
```

- 在 `AppVisual.vue` 根容器挂载类似以下作用域：

```html
<main class="visual-regression-root ...">
```

```css
.visual-regression-root {
  font-family: var(--ui-font-visual-sans);
  --ui-font-mono: var(--ui-font-visual-mono);
}
```

- 第一轮只稳定 visual harness，不主动把这个作用域抬升到 `SettingsWindow.vue` 或 `LauncherWindow.vue`。
- 若 Task B 后 residual diff 仍集中在 mono 文本区域，再基于日志判断是否把同样策略扩到少数关键 UI 热点。

- [ ] **Step 4: 再跑 focused tests**

Run:
`npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts src/__tests__/visual.font-contract.test.ts`

Expected:
- bootstrap contract 与 visual font contract 全部通过。

- [ ] **Step 5: 阶段验证**

Run:
- `npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts src/__tests__/visual.font-contract.test.ts`
- `npm run lint`
- `npm run typecheck`
- `npm run build`

Manual:
- canonical Windows 机器执行 `npm run test:visual:ui`
- 对照 Windows 机器执行 `npm run test:visual:ui`

Expected:
- 剩余 diff 数量下降，或至少能清晰收敛到“非 icon / 非 visual harness 字体”以外的面。

## 5. 验证与回归策略

### 5.1 每个任务的最小自动化门禁

- Task A:
  - `npm run test:run -- scripts/__tests__/visual-regression-lib.test.ts scripts/__tests__/visual-regression-env.test.ts`
- Task B:
  - `npm run test:run -- src/components/settings/ui/__tests__/SettingsNavIcon.test.ts src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Task C:
  - `npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts src/__tests__/visual.font-contract.test.ts`

### 5.2 阶段级验证

- 第一批高优先级任务（A + B）完成后：
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:visual:ui`
- 中期字体治理（C）完成后：
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run test:visual:ui`
  - 如需区分桥接链路与 Windows baseline 问题，再补 `npm run test:visual:ui:wsl-bridge`
- 全部收口后：
  - `npm run check:all`

### 5.3 双机回归固定流程

两台机器都必须执行：

```bash
git pull --ff-only
git rev-parse --short HEAD
npm run build
npm run test:visual:ui
```

回传物固定为：
- `.tmp/e2e/visual-regression/**/environment.json`
- `.tmp/e2e/visual-regression/**/*.browser.log`
- mismatch 控制台输出
- 需要人工对图时再补 `.actual.png`

### 5.4 成功判定

满足以下条件才算“跨设备稳定性第一阶段完成”：

1. 所有 mismatch 都附带可读环境清单，不再出现“只看到 diff，不知道机器差异”的盲区。
2. canonical baseline machine 策略已写进仓库文档，团队对 baseline 更新口径一致。
3. Settings 顶部导航与 visual harness 不再依赖 Unicode icon 文本。
4. visual harness 已有独立字体作用域，跨设备 diff 数量下降，或至少 residual diff 的原因已可解释。

## 6. 长期升级门槛（暂不在第一批实现）

- [ ] **Decision Gate 1: 是否需要仓库内置字体**

仅当 Task C 后仍满足以下条件时，才进入字体资产方案：
- residual diff 依旧稳定集中在文本栅格化；
- 两台设备 `environment.json` 已证明浏览器版本或字体安装差异无法再通过本机稳定字体栈规避；
- 视觉门禁确实要求“多台 Windows 机器共享同一 baseline”。

如果进入该阶段，再单开计划，候选文件如下：
- Create: `public/fonts/<approved-font>/*.woff2`
- Create: `src/styles/visual-fonts.css`
- Modify: `src/styles/index.css`
- Modify: `src/styles/tokens.css`
- Modify: `visual.html`

- [ ] **Decision Gate 2: 是否要把字体治理抬升到真实运行时 UI**

只在以下条件同时成立时推进：
- visual harness 已稳定，但真实 `SettingsWindow` / `LauncherWindow` 截图仍因字体差异失败；
- 变更范围能被限制在少数关键热点，而不是整站盲改；
- 已评估多主题与桌面 UI 可读性，不破坏现有 token 体系。

## 7. 建议执行顺序

1. 先做 Task A，先让所有后续 diff 都带上可诊断证据。
2. 立即做 Task B，先去掉最不稳定的 Unicode icon 文本渲染。
3. 用 A+B 的新结果重新比对两台机器，再决定 Task C 的 font scope 是否已经足够。
4. 不要在第一批里直接上仓库字体资产；那是 long-term gate，不是默认动作。
