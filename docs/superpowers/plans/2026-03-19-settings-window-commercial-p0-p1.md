# Settings 窗口商业化 P0/P1 收口 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 消除 settings 窗口首帧白闪，拆开 Commands 临时视图态与持久设置态，并把拖拽语义与 topbar 壳体统一到单一模型。

**Architecture:** P0 采用双保险首帧策略：`settings.html` 在 bundle 启动前同步落深色底与主题属性，Rust 侧新建窗口保持 hidden，直到 `AppSettings.vue` 首次挂载完成再显式 `show/focus`。P1 将 `commands.view` 从持久化 snapshot 中移除，`useCommandManagement` 改为持有本地瞬态 `commandView`；同时明确继续保留原生标题栏作为唯一拖拽语义，把 WebView topbar 降级为导航工具条而非伪标题栏。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Vitest, Tauri 2, Rust, CSS Custom Properties

**Spec:** `docs/superpowers/specs/2026-03-19-settings-window-commercial-review-design.md`

**Recommended workflow:** `@superpowers:test-driven-development` → `@superpowers:verification-before-completion` → `@superpowers:requesting-code-review`

---

## 范围护栏

- 只处理 settings 窗口，不改 launcher 主窗口 UI。
- 不新增设置项，不做品牌级视觉改版，不扩主题系统。
- Commands 本轮只拆“视图态 vs 持久态”，不做虚拟列表或大规模性能重构。
- 拖拽本轮采用“原生标题栏唯一语义”路径；如果 Windows 手验后原生标题栏本身仍明显迟滞，本计划判定未完成，另开后续 spec，不在本波次偷偷回到半自绘混合态。

## 文件结构

### 修改文件（预期）

| 文件路径 | 职责 / 改动概述 |
|---|---|
| `settings.html` | 首帧同步写入 `data-theme` / `data-blur` / 深色背景 / `color-scheme`，避免 WebView 默认白底先曝光。 |
| `src/AppSettings.vue` | 新建窗口首次挂载后通知 Rust 显示窗口；停止对 Commands 搜索/筛选 view-state 的即时持久化。 |
| `src-tauri/src/windowing.rs` | 新建 settings 窗口时仅 build hidden，不再立即 `show()`；新增 `show_settings_window_when_ready` 命令。 |
| `src-tauri/src/lib.rs` | 注册新的 settings ready/show 命令。 |
| `src/stores/settings/defaults.ts` | 从持久化 snapshot 中移除 `commands.view`，保留 `createDefaultCommandViewState()` 供瞬态 view-model 使用。 |
| `src/stores/settings/normalization.ts` | 持久化规范化不再写入/读取 `commands.view`，但保留 `normalizeCommandViewState()` 给 UI 本地状态复用。 |
| `src/stores/settings/migration.ts` | 兼容读取旧 payload 中的 `commands.view`，但 round-trip 时丢弃该字段，不 bump schema。 |
| `src/stores/settingsStore.ts` | store 只持久化真正设置：`disabledCommandIds` 保留，`commandView` 与 `setCommandViewState()` 删除。 |
| `src/composables/settings/useCommandManagement.ts` | 组合函数内部持有本地 `commandView` ref，并继续暴露过滤、重置、启停切换 API。 |
| `src/composables/app/useAppCompositionRoot/context.ts` | shared settings 路径不再从 store 注入 `commandView`，避免 `App.vue` 与 `AppSettings.vue` 行为漂移。 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | `updateCommandView` / `resetCommandFilters` 不再触发 saved toast、persist 和 broadcast。 |
| `src/components/settings/SettingsWindow.vue` | 为 topbar 增加明确的导航壳体 wrapper，保留“无自绘窗控 / 无 drag-region”的 native-titlebar 路径。 |
| `src/styles/settings.css` | 把 `.settings-window-topbar` 从“伪标题栏”收口为 bounded toolbar shell，去掉易被误判为标题栏的整条 chrome 感。 |
| `src/__tests__/app.settings-hotkeys.test.ts` | 扩展 settings 集成回归：ready-show 握手、Commands view-state 不落盘、toggle 仍持久化。 |
| `src/__tests__/settings.bootstrap-contract.test.ts` | 锁定 `settings.html` 的同步首帧 bootstrap contract。 |
| `src/stores/__tests__/settingsStore.test.ts` | 锁定旧 payload 兼容、新 snapshot 不再包含 `commands.view`。 |
| `src/composables/__tests__/settings/useCommandManagement.test.ts` | 锁定 `commandView` 改为本地瞬态后，过滤/重置行为仍正确。 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定 topbar 新的“导航壳体”结构，以及继续保持 native-titlebar 路径。 |

### 参考测试（不一定改动）

| 文件路径 | 用途 |
|---|---|
| `src/__tests__/tauri-capabilities.test.ts` | 继续作为“不要回到自绘标题栏权限”的护栏。 |
| `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts` | Commands toolbar / 表格结构回归，确保 view-state 拆分后 DOM 不回退。 |

---

## Chunk 1: P0 首帧白闪修复

### Task 1: 先锁定首帧 bootstrap 与 ready-show contract

**Files:**
- Create: `src/__tests__/settings.bootstrap-contract.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 新增 `settings.html` contract test**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

it("boots settings with synchronous dark-frame guards before the main bundle", () => {
  const html = readFileSync(resolve(process.cwd(), "settings.html"), "utf8");
  expect(html).toContain('document.documentElement.dataset.theme');
  expect(html).toContain('document.documentElement.style.backgroundColor');
  expect(html).toContain('document.createElement("style")');
  expect(html.indexOf('document.createElement("style")')).toBeLessThan(
    html.indexOf('/src/main-settings.ts')
  );
});
```

- [ ] **Step 2: 扩展 `AppSettings` 集成测试，要求首次挂载后才请求显示窗口**

```ts
it("requests show_settings_window_when_ready after the settings shell mounts", async () => {
  hoisted.isTauriRuntime = true;
  await mountAppSettings();
  expect(hoisted.invokeSpy).toHaveBeenCalledWith("show_settings_window_when_ready");
});
```

- [ ] **Step 3: 跑定向测试并确认失败**

Run:
```bash
npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```
Expected:
- `settings.bootstrap-contract.test.ts` 因当前 `settings.html` 没有同步背景写入而失败。
- `app.settings-hotkeys.test.ts` 因当前没有 `show_settings_window_when_ready` 调用而失败。

- [ ] **Step 4: Commit（仅测试）**

```bash
git add src/__tests__/settings.bootstrap-contract.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "test(settings): 锁定首帧 bootstrap 与 ready-show 契约"
```

---

### Task 2: 实现首帧深色 bootstrap 与延迟显示握手

**Files:**
- Modify: `settings.html`
- Modify: `src/AppSettings.vue`
- Modify: `src-tauri/src/windowing.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/__tests__/settings.bootstrap-contract.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 强化 `settings.html` 同步 bootstrap**

保留现有主题/blur 读取逻辑，但在同一个 head script 中追加：

```html
document.documentElement.style.colorScheme = "dark";
document.documentElement.style.backgroundColor = "#0b0b0c";
var style = document.createElement("style");
style.textContent = "html,body,#app{background:#0b0b0c;} html{color-scheme:dark;}";
document.head.appendChild(style);
```

要求：
- 仍然先于 `/src/main-settings.ts` 执行。
- 不把颜色写进 `reset.css`，避免污染 launcher 透明窗。
- 只对 settings 首帧兜底，不引入新主题配置项。

- [ ] **Step 2: Rust 侧只在“已有窗口”路径立即显示**

在 `src-tauri/src/windowing.rs` 中：
- 已存在 settings 窗口时，保持 `show()` / `unminimize()` / `set_focus()` 逻辑不变。
- 新建窗口时，继续 `.visible(false).focused(false)`，但去掉 build 后的立即 `show()`。
- 新增命令：

```rust
#[tauri::command]
pub(crate) fn show_settings_window_when_ready(window: WebviewWindow) -> Result<(), String> {
    if window.label() != SETTINGS_WINDOW_LABEL {
        return Ok(());
    }
    window.show().map_err(|err| err.to_string())?;
    let _ = window.unminimize();
    let _ = window.set_focus();
    Ok(())
}
```

- [ ] **Step 3: `AppSettings.vue` 在首个稳定帧后通知显示**

在 `onMounted` 中，先完成：
1. `loadSettingsSetting()`
2. `applySettingsRouteFromHash(true)`
3. `await nextTick()`
4. `await new Promise(requestAnimationFrame)`

然后仅在 `ports.isTauriRuntime()` 时调用：

```ts
await ports.invoke("show_settings_window_when_ready");
```

要求：
- 该调用要早于 `loadAvailableTerminalsSetting()` / `loadLauncherHotkey()` 这类非首帧关键异步。
- invoke 失败只记录 `ports.logError(...)`，不阻塞 settings 自身加载。

- [ ] **Step 4: 跑本任务验证**

Run:
```bash
npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
npm run check:rust
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add settings.html
git add src/AppSettings.vue
git add src-tauri/src/windowing.rs
git add src-tauri/src/lib.rs
git add src/__tests__/settings.bootstrap-contract.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "fix(settings): 收口首帧白闪与窗口延迟显示"
```

---

## Chunk 2: P1 Commands 视图态与持久态分层

### Task 3: 先写“view-state 不再落盘”回归测试

**Files:**
- Modify: `src/stores/__tests__/settingsStore.test.ts`
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 扩展 `settingsStore` 回归，要求 snapshot 不再包含 `commands.view`**

新增断言：

```ts
const raw = localStorage.getItem(SETTINGS_STORAGE_KEY)!;
expect(raw).not.toContain('"view"');
expect(JSON.parse(raw).commands).toEqual({
  disabledCommandIds: ["docker-ps"]
});
```

并新增一条 legacy payload 测试：

```ts
localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
  version: 1,
  commands: { disabledCommandIds: [], view: { query: "docker" } }
}));
const roundTrip = readSettingsFromStorage(localStorage);
expect((roundTrip.commands as Record<string, unknown>).view).toBeUndefined();
```

- [ ] **Step 2: 扩展 `useCommandManagement` 测试，要求 `updateCommandView()` 只改本地 ref**

目标断言：

```ts
model.updateCommandView({ query: "docker" });
expect(model.commandView.value.query).toBe("docker");
```

同时删除对 `setCommandViewState` spy 的依赖，防止实现仍偷偷回写 store。

- [ ] **Step 3: 扩展 `AppSettings` 集成测试，要求搜索/筛选不持久化，但 enable toggle 仍持久化**

至少覆盖：
1. 进入 Commands 路由。
2. 在搜索框输入 `"docker"`。
3. 断言 `localStorage.getItem(SETTINGS_STORAGE_KEY)` 仍为 `null` 或已有 payload 中不出现 `commands.view`。
4. 点击某条命令的 toggle 后，再断言 `commands.disabledCommandIds` 正常落盘。

- [ ] **Step 4: 跑定向测试并确认失败**

Run:
```bash
npm run test:run -- src/stores/__tests__/settingsStore.test.ts
npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```
Expected:
- store 测试因当前 payload 仍写入 `commands.view` 而失败。
- composable / 集成测试因当前 update/reset 仍走 store + persist 路径而失败。

- [ ] **Step 5: Commit（仅测试）**

```bash
git add src/stores/__tests__/settingsStore.test.ts
git add src/composables/__tests__/settings/useCommandManagement.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "test(settings): 锁定 Commands 视图态不落盘回归"
```

---

### Task 4: 实现 Commands 瞬态 view-model 与持久化边界收口

**Files:**
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/composables/settings/useCommandManagement.ts`
- Modify: `src/AppSettings.vue`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`

- [ ] **Step 1: 从 persisted snapshot 中删掉 `commands.view`**

在 `defaults.ts` / `settingsStore.ts` 中把持久化结构改成：

```ts
commands: {
  disabledCommandIds: string[];
}
```

要求：
- `createDefaultCommandViewState()` 继续保留，但只给 UI 本地状态用。
- 不 bump `SETTINGS_SCHEMA_VERSION`；旧字段直接兼容读取、静默丢弃即可。

- [ ] **Step 2: 迁移与规范化层继续兼容旧 payload，但不再 round-trip**

在 `migration.ts` / `normalization.ts` 中：
- 允许旧 payload 带 `commands.view`。
- 读取后仍正常返回 `disabledCommandIds`。
- `normalizePersistedSettingsSnapshot()` 不再生成 `view` 字段。

- [ ] **Step 3: `useCommandManagement` 内聚本地 `commandView`**

把 `commandView` 改成 composable 内部 `ref(createDefaultCommandViewState())`，继续对外暴露：
- `commandView`
- `updateCommandView`
- `resetCommandFilters`
- `toggleCommandEnabled`
- `setFilteredCommandsEnabled`

要求：
- 过滤、排序、分组逻辑不变。
- 不再依赖 `settingsStore.setCommandViewState()`。

- [ ] **Step 4: 只保留“真正设置”走 persist/broadcast**

在 `AppSettings.vue` 与 shared `viewModel.ts` 中：
- `toggleCommandEnabled()` / `setFilteredCommandsEnabled()` 继续持久化。
- `updateCommandView()` / `resetCommandFilters()` 改为只更新本地瞬态状态，不再 `persistImmediate()`，不再触发 saved toast。

- [ ] **Step 5: 跑本任务验证**

Run:
```bash
npm run test:run -- src/stores/__tests__/settingsStore.test.ts
npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/stores/settings/defaults.ts
git add src/stores/settings/normalization.ts
git add src/stores/settings/migration.ts
git add src/stores/settingsStore.ts
git add src/composables/settings/useCommandManagement.ts
git add src/AppSettings.vue
git add src/composables/app/useAppCompositionRoot/context.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/stores/__tests__/settingsStore.test.ts
git add src/composables/__tests__/settings/useCommandManagement.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git commit -m "refactor(settings): 拆分 Commands 瞬态视图态与持久设置态"
```

---

## Chunk 3: P1 拖拽模型与 topbar 壳体统一

### Task 5: 先锁定 native-titlebar 路径下的 topbar shell contract

**Files:**
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`

- [ ] **Step 1: 扩展 layout test，要求 topbar 拥有明确的导航壳体 wrapper**

新增断言：

```ts
expect(wrapper.find(".settings-window-topbar__nav-shell").exists()).toBe(true);
expect(wrapper.find(".settings-window-topbar").attributes("data-tauri-drag-region")).toBeUndefined();
expect(wrapper.find(".settings-window-topbar__nav-shell").attributes("data-tauri-drag-region")).toBeUndefined();
```

目的：
- 锁定“topbar 是导航工具条，不是 drag-region”。
- 防止后续又回到“看起来像标题栏但拖拽仍靠原生栏”的混合表达。

- [ ] **Step 2: 跑定向测试并确认失败**

Run:
```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
```
Expected: 因当前没有 `.settings-window-topbar__nav-shell` 而失败。

- [ ] **Step 3: Commit（仅测试）**

```bash
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "test(settings): 锁定 topbar 导航壳体结构"
```

---

### Task 6: 将 topbar 从“伪标题栏”收口为 bounded navigation shell

**Files:**
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/styles/settings.css`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`

- [ ] **Step 1: 在 `SettingsWindow.vue` 增加导航壳体 wrapper**

目标结构：

```vue
<div class="settings-window-topbar">
  <div class="settings-window-topbar__nav-shell">
    <SSegmentNav :items="navItems" v-model="settingsRoute" />
  </div>
</div>
```

要求：
- 继续不引入自绘窗控。
- 继续不加 `data-tauri-drag-region`。
- 不把 app 标题文案重新塞回 topbar。

- [ ] **Step 2: 在 `settings.css` 去掉整条“标题栏感”**

关键改动：
- `.settings-window-topbar` 改为透明的 framing 容器，只负责居中与留白。
- `.settings-window-topbar__nav-shell` 变成 bounded toolbar card：有自己的圆角、边框、背景和内边距。
- 移除或显著削弱整条 full-width bar 的 `background + border-bottom + backdrop-filter` 组合，避免继续像第二条标题栏。
- 保持普通页 `720px`、Commands 页 `1120px` 的宽度上限，不把 topbar 拉成整窗 chrome。

- [ ] **Step 3: 跑本任务验证**

Run:
```bash
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/__tests__/tauri-capabilities.test.ts
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/SettingsWindow.vue
git add src/styles/settings.css
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "refactor(settings): 统一原生拖拽语义与 topbar 壳体"
```

---

## Chunk 4: 验证与 Windows 手验

### Task 7: 跑自动化门禁并执行 Windows 验收

**Files:**
- Reference: `docs/superpowers/specs/2026-03-19-settings-window-commercial-review-design.md`
- Reference: `docs/superpowers/plans/2026-03-19-settings-window-commercial-p0-p1.md`

- [ ] **Step 1: 跑 focused 回归**

Run:
```bash
npm run test:run -- src/__tests__/settings.bootstrap-contract.test.ts
npm run test:run -- src/__tests__/app.settings-hotkeys.test.ts
npm run test:run -- src/stores/__tests__/settingsStore.test.ts
npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts
npm run test:run -- src/components/settings/__tests__/SettingsWindow.layout.test.ts
npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
```
Expected: 全绿。

- [ ] **Step 2: 跑全量门禁**

Run:
```bash
npm run check:all
```
Expected: `lint -> typecheck -> test:coverage -> build -> check:rust` 全绿。

- [ ] **Step 3: Windows 手动验收**

Run: `npm run dev`

手动检查：
1. 冷启动后连续打开 settings 10 次，首帧不出现白色闪底。
2. Commands 路由输入搜索词、切换筛选器后关闭窗口并重新打开：搜索词/筛选器恢复默认，禁用状态仍保留。
3. 只有原生标题栏承担拖拽语义；topbar 视觉上读作导航工具条，而不是第二条标题栏。
4. 连续拖动原生标题栏 10 次，窗口跟手、无明显迟滞或抽动。

- [ ] **Step 4: 失败判定**

以下任一命中则本计划不得标记完成：
- 任意一次仍出现可见白闪。
- Commands 搜索/筛选仍写入 `zapcmd.settings`。
- topbar 仍明显读作可拖标题栏。
- 原生标题栏本身仍明显迟滞。

处理方式：
- 保留当前证据。
- 新开 follow-up spec，专门处理 Windows 原生拖拽迟滞；不要在本波次里临时塞回半自绘标题栏方案。

- [ ] **Step 5: Commit**

```bash
git status
git add settings.html
git add src/AppSettings.vue
git add src-tauri/src/windowing.rs
git add src-tauri/src/lib.rs
git add src/stores/settings/defaults.ts
git add src/stores/settings/normalization.ts
git add src/stores/settings/migration.ts
git add src/stores/settingsStore.ts
git add src/composables/settings/useCommandManagement.ts
git add src/composables/app/useAppCompositionRoot/context.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/components/settings/SettingsWindow.vue
git add src/styles/settings.css
git add src/__tests__/settings.bootstrap-contract.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git add src/stores/__tests__/settingsStore.test.ts
git add src/composables/__tests__/settings/useCommandManagement.test.ts
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "fix(settings): 完成商业化 P0 P1 收口"
```

---

## 验收对照表

- P0 首帧：`settings.html` 在 bundle 前同步写入深色首帧背景；新建 settings 窗口不再先 show 再等 WebView。
- P1 状态边界：`commands.view` 不再进入 persisted snapshot；只有 `disabledCommandIds` 继续持久化。
- P1 交互语义：继续保留 native titlebar 路线，但 WebView topbar 已降级为导航工具条，不再伪装成标题栏。
- 自动化验证：focused Vitest + `npm run check:all` 全绿。
- Windows 手验：白闪、拖拽、Commands 关闭重开边界三项全部通过。

---

## 本轮执行入口

- **首个执行任务：** `Task 1`
- **原因：** 白闪是唯一 P0，且可用最小 contract test 先钉死 `settings.html` 与 ready-show 协议，后续实现不会偏向纯样式猜测。
- **不要先做：**
  - 不要先改 `settings.css`
  - 不要先删 store 字段
  - 不要先跑全量门禁
  - 先把首帧 contract 锁死，再进入状态分层与 topbar 壳体收口
