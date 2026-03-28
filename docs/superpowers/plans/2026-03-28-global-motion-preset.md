# Global Motion Preset Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把全局 `appearance.motionPreset` 正式接入 Launcher 与 Settings，使默认 `expressive` 保持当前动画基线，同时新增 `steady-tool` 并通过 `motionRegistry + useMotionPreset + data-motion-preset + --motion-* token` 统一驱动关键动画表面。

**Architecture:** 设置层只持久化一个全局 preset id，运行时由 `useMotionPreset()` 把合法 preset 写入 `document.documentElement.dataset.motionPreset`。动画差异不通过组件级 `if/else` 分叉，而是由 `src/styles/motion.css` 提供 preset scope 下的 `--motion-*` token，再让 Tailwind 语义动画和少量关键 transition/pressable 热点消费这些 token；`prefers-reduced-motion` 始终高于用户 preset。

**Tech Stack:** Vue 3, Pinia, Tailwind CSS 4, Vitest, Vite multi-entry bootstrap, Edge headless visual regression

**设计文档:** `docs/superpowers/specs/2026-03-28-global-motion-preset-design.md`

**分支:** `feat/review-remediation`

---

## 实施护栏

1. `expressive` 必须与当前真实基线零差异或近零差异；一旦 contract test 发现漂移，先修正基线再继续扩 preset。
2. `prefers-reduced-motion: reduce` 不是第三套 preset；不得持久化到 `appearance.motionPreset`。
3. 组件模板禁止大面积出现 `motionPreset === "steady-tool" ? ... : ...`；差异必须优先沉到 root dataset 和 `--motion-*` token。
4. 第一版只覆盖真正定义“手感”的热点：Launcher nav / toast / overlay / panel / dialog，加上 Settings Appearance 卡片与少量通用 press/hover；不要全仓搜索替换 `duration-*`。
5. `useStagedFeedback.ts` 当前用 220ms JS timer 控制 staged feedback 标记。除非把这条链路改成 `animationend` 驱动，否则 v1 必须让 staged feedback 的视觉持续时间在两个 preset 中保持一致，避免 JS 与 CSS 漂移。

## 文件结构

### 新建

| 文件 | 职责 |
|---|---|
| `src/features/motion/motionRegistry.ts` | 声明 `MotionPresetMeta`、registry、默认 preset、合法 preset 解析 |
| `src/features/motion/__tests__/motionRegistry.test.ts` | 锁定 `expressive` / `steady-tool` / fallback contract |
| `src/composables/app/useMotionPreset.ts` | 把 preset 应用到 `document.documentElement.dataset.motionPreset` |
| `src/composables/__tests__/app/useMotionPreset.test.ts` | 锁定 dataset 立即写入、更新和 fallback |
| `src/styles/motion.css` | 提供 `data-motion-preset` scope 与 `--motion-*` token，必要时承接 reduced-motion 覆盖 |
| `src/styles/__tests__/motion-style-contract.test.ts` | 锁定 `motion.css` selector、Tailwind 动画是否消费 `var(--motion-*)`、热点组件是否仍走语义类 |

### 修改

| 文件 | 职责 |
|---|---|
| `src/stores/settings/defaults.ts` | 为 `appearance` 增加 `motionPreset` 默认值与 snapshot 字段 |
| `src/stores/settings/normalization.ts` | 增加 `normalizeMotionPresetId()` |
| `src/stores/settings/migration.ts` | 对缺失或非法 `appearance.motionPreset` 回退 `expressive` |
| `src/stores/settingsStore.ts` | 暴露 `motionPreset` state、setter、snapshot / hydrate round-trip |
| `src/stores/__tests__/settingsStore.test.ts` | 锁定新设置项默认值、迁移和 persist round-trip |
| `src/composables/app/useAppCompositionRoot/context.ts` | 在 Launcher 主链路接入 `useMotionPreset()` |
| `src/AppSettings.vue` | 在 Settings 独立入口接入 `useMotionPreset()`，并把 `motionPreset` / `motionPresets` / `update-motion-preset` 接到 UI |
| `src/components/settings/types.ts` | 为 Appearance section / SettingsWindow props 增加 motion preset contract |
| `src/components/settings/SettingsWindow.vue` | 透传 motion preset props 与 emits |
| `src/components/settings/parts/SettingsAppearanceSection.vue` | 渲染 motion preset 卡片、标签、描述与 active 态 |
| `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts` | 锁定 motion preset 卡片数量、active 态与发出的事件 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | 锁定 `update-motion-preset` 事件透传 |
| `src/i18n/messages.ts` | 新增中英文 motion preset label / description / tag / hint 文案 |
| `index.html` | 启动时同步设置 Launcher 的 `data-motion-preset` |
| `settings.html` | 启动时同步设置 Settings 的 `data-motion-preset` |
| `visual.html` | 固定 visual harness 的默认 motion preset，避免截图被 localStorage 污染 |
| `src/__tests__/settings.bootstrap-contract.test.ts` | 锁定 `index.html` / `settings.html` / `visual.html` 的 bootstrap contract |
| `src/styles/index.css` | 引入 `motion.css` |
| `tailwind.config.cjs` | 让关键 animation / easing / duration / transform 改为消费 `var(--motion-*)` |
| `src/components/launcher/LauncherWindow.vue` | nav slide 改接 motion 语义 utility |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | toast hotspot 继续走语义动画，但改由 motion token 驱动 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | toast 与 pressable hotspot 接 motion token |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | overlay scrim/panel、toast、flow panel 宽度/进入节奏接 motion token |
| `src/components/launcher/parts/LauncherStagingPanel.vue` | enter/exit 与卡片 pressable 接 motion token |
| `src/components/launcher/parts/LauncherSafetyOverlay.vue` | scrim / dialog enter 接 motion token |
| `src/AppVisual.vue` | 增加 motion preset 相关视觉回归场景 |
| `scripts/e2e/visual-regression.cjs` | 注册新的 motion screenshot 场景 |
| `scripts/e2e/visual-baselines/*.png` | 在确认预期视觉后新增或更新 baseline |
| `docs/active_context.md` | 实施完成后记录阶段结果与关键决策 |

## 迁移 / 回滚策略

1. **存量设置迁移：** 老用户缺失 `appearance.motionPreset` 时自动补 `expressive`；非法值同样回退 `expressive`；不做“猜用户喜欢哪套动画”的智能迁移。
2. **默认行为稳定：** Launcher / Settings / visual harness 的 bootstrap 都必须在 bundle 执行前写入 `data-motion-preset`，这样老用户不会在首帧先看到错误 preset。
3. **回滚路径简单：** 如果 `steady-tool` 在实现中发现某个热点还没收口完，优先让 UI 不暴露该 preset，而不是允许半成品 preset 进入设置页。
4. **视觉基线更新纪律：** `scripts/e2e/visual-baselines/*` 只有在设计稿对齐且 `expressive` 未漂移时才允许更新；若只是默认基线被意外改动，必须修代码，不能直接刷 baseline。
5. **Reduced Motion 优先级：** reduced-motion 覆盖发生在 CSS / utility 层；切回系统设置即可回滚，不触碰持久化 snapshot。

## 重点测试矩阵

1. Store / migration
   - `npm run test:run -- src/features/motion/__tests__/motionRegistry.test.ts src/stores/__tests__/settingsStore.test.ts`
2. Runtime / bootstrap
   - `npm run test:run -- src/composables/__tests__/app/useMotionPreset.test.ts src/__tests__/settings.bootstrap-contract.test.ts`
3. Settings UI
   - `npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`
4. Motion contract
   - `npm run test:run -- src/styles/__tests__/motion-style-contract.test.ts`
5. Visual regression
   - `npm run test:visual:ui`
6. Final gate
   - `npm run check:all`

## Chunk 1: 基础设施与设置持久化

### Task 1: 建立 `motionRegistry` 并把 `motionPreset` 接入 settings snapshot

**Files:**
- Create: `src/features/motion/motionRegistry.ts`
- Create: `src/features/motion/__tests__/motionRegistry.test.ts`
- Modify: `src/stores/settings/defaults.ts`
- Modify: `src/stores/settings/normalization.ts`
- Modify: `src/stores/settings/migration.ts`
- Modify: `src/stores/settingsStore.ts`
- Modify: `src/stores/__tests__/settingsStore.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 preset 元数据与持久化 contract**

在 `motionRegistry.test.ts` 增加：

```ts
it("contains expressive and steady-tool presets", () => {
  expect(MOTION_PRESET_REGISTRY.map((item) => item.id)).toEqual(
    expect.arrayContaining(["expressive", "steady-tool"])
  );
  expect(DEFAULT_MOTION_PRESET_ID).toBe("expressive");
});

it("falls back to expressive for unknown ids", () => {
  expect(resolveMotionPresetMeta("unknown").id).toBe("expressive");
});
```

在 `settingsStore.test.ts` 增加：

```ts
it("defaults appearance.motionPreset to expressive", () => {
  expect(createDefaultSettingsSnapshot().appearance.motionPreset).toBe("expressive");
});

it("migrates missing appearance.motionPreset to expressive", () => {
  const migrated = migrateSettingsPayload({ version: 1, appearance: { theme: "obsidian" } });
  expect(migrated?.appearance.motionPreset).toBe("expressive");
});

it("falls back invalid appearance.motionPreset to expressive", () => {
  const migrated = migrateSettingsPayload({
    version: 1,
    appearance: { motionPreset: "loud-mode" }
  });
  expect(migrated?.appearance.motionPreset).toBe("expressive");
});
```

- [ ] **Step 2: 跑定向测试，确认当前实现尚未支持**

Run:
- `npm run test:run -- src/features/motion/__tests__/motionRegistry.test.ts src/stores/__tests__/settingsStore.test.ts`

Expected:
- FAIL，提示缺少 `motionRegistry`、`appearance.motionPreset`、setter 或 migration fallback

- [ ] **Step 3: 做最小实现，把 preset 注册表与 settings round-trip 接通**

实现要求：

```ts
export interface MotionPresetMeta {
  id: string;
  name: string;
  description: string;
  badge?: string;
}

export const MOTION_PRESET_REGISTRY = [
  { id: "expressive", name: "Expressive", description: "...", badge: "当前默认" },
  { id: "steady-tool", name: "Steady Tool", description: "...", badge: "更稳" }
] as const;
```

以及：

```ts
setMotionPreset(value: string): void {
  this.motionPreset = normalizeMotionPresetId(value);
}
```

注意点：
- `normalizeMotionPresetId()` 只校验 id 格式与是否为空；最终合法性由 registry resolver 保底。
- `migrateSettingsPayload()` 必须接受“version=1 但没有 `appearance.motionPreset`”的旧快照。
- 不要 bump schema version，只补字段与 fallback。

- [ ] **Step 4: 重新运行定向测试，确认变绿**

Run:
- `npm run test:run -- src/features/motion/__tests__/motionRegistry.test.ts src/stores/__tests__/settingsStore.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/features/motion/motionRegistry.ts src/features/motion/__tests__/motionRegistry.test.ts src/stores/settings/defaults.ts src/stores/settings/normalization.ts src/stores/settings/migration.ts src/stores/settingsStore.ts src/stores/__tests__/settingsStore.test.ts
git commit -m "feat(settings):接入 motion preset 持久化"
```

## Chunk 2: Runtime 应用链路与启动 bootstrap

### Task 2: 新增 `useMotionPreset()`，并在 Launcher / Settings / visual bootstrap 中同步应用

**Files:**
- Create: `src/composables/app/useMotionPreset.ts`
- Create: `src/composables/__tests__/app/useMotionPreset.test.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/AppSettings.vue`
- Modify: `index.html`
- Modify: `settings.html`
- Modify: `visual.html`
- Modify: `src/__tests__/settings.bootstrap-contract.test.ts`

- [ ] **Step 1: 先写失败测试，锁定 dataset 与 bootstrap contract**

在 `useMotionPreset.test.ts` 增加：

```ts
it("immediately writes data-motion-preset", () => {
  const presetId = ref("expressive");
  useMotionPreset({ presetId });
  expect(document.documentElement.dataset.motionPreset).toBe("expressive");
});

it("falls back invalid ids to expressive", async () => {
  const presetId = ref("bad-id");
  useMotionPreset({ presetId });
  expect(document.documentElement.dataset.motionPreset).toBe("expressive");
});
```

在 `settings.bootstrap-contract.test.ts` 增加：

```ts
expect(settingsHtml).toContain("document.documentElement.dataset.motionPreset");
expect(launcherHtml).toContain("document.documentElement.dataset.motionPreset");
expect(visualHtml).toContain('document.documentElement.dataset.motionPreset = "expressive"');
```

- [ ] **Step 2: 跑 runtime / bootstrap 定向测试，确认失败**

Run:
- `npm run test:run -- src/composables/__tests__/app/useMotionPreset.test.ts src/__tests__/settings.bootstrap-contract.test.ts`

Expected:
- FAIL，提示缺少 `useMotionPreset()` 或 html bootstrap 未写 `data-motion-preset`

- [ ] **Step 3: 实现 runtime hook，并把 preset 接到两个真实入口**

实现要求：

```ts
function applyMotionPreset(id: string): void {
  document.documentElement.dataset.motionPreset = resolveMotionPresetMeta(id).id;
}

watch(() => options.presetId.value, applyMotionPreset, { immediate: true });
```

接线要求：
- `src/composables/app/useAppCompositionRoot/context.ts`：从 `storeToRefs(settingsStore)` 取出 `motionPreset`，与 `useTheme()` 同级调用 `useMotionPreset()`。
- `src/AppSettings.vue`：`storeToRefs()` 取出 `motionPreset`，与 `useTheme()` 同级调用 `useMotionPreset()`。
- `index.html` / `settings.html`：在读取 localStorage 时同步解析 `appearance.motionPreset`，缺失或非法都写 `expressive`。
- `visual.html`：固定写 `data-motion-preset="expressive"`，不要从 localStorage 继承，避免截图漂移。

- [ ] **Step 4: 重新运行 runtime / bootstrap 定向测试**

Run:
- `npm run test:run -- src/composables/__tests__/app/useMotionPreset.test.ts src/__tests__/settings.bootstrap-contract.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/composables/app/useMotionPreset.ts src/composables/__tests__/app/useMotionPreset.test.ts src/composables/app/useAppCompositionRoot/context.ts src/AppSettings.vue index.html settings.html visual.html src/__tests__/settings.bootstrap-contract.test.ts
git commit -m "feat(app):接入 motion preset runtime 与 bootstrap"
```

## Chunk 3: Settings Appearance UI 与文案 contract

### Task 3: 在 Appearance 页增加 motion preset 卡片，并把更新事件接到 store

**Files:**
- Modify: `src/components/settings/types.ts`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/parts/SettingsAppearanceSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/AppSettings.vue`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 先写失败测试，锁定新的 Appearance card 和事件**

在 `SettingsAppearanceSection.layout.test.ts` 增加：

```ts
it("renders two motion preset cards and marks the active one", () => {
  const wrapper = mount(SettingsAppearanceSection, {
    props: {
      windowOpacity: 0.96,
      theme: "obsidian",
      blurEnabled: true,
      motionPreset: "steady-tool",
      themes: THEME_REGISTRY,
      motionPresets: MOTION_PRESET_REGISTRY
    }
  });

  expect(wrapper.findAll(".motion-preset-card")).toHaveLength(2);
  expect(wrapper.find(".motion-preset-card--active").text()).toContain("steady-tool");
});
```

在 `SettingsWindow.layout.test.ts` 增加：

```ts
await wrapper.get(".motion-preset-stub").trigger("click");
expect(wrapper.emitted("update-motion-preset")?.[0]).toEqual(["steady-tool"]);
```

并在同一个 layout test 里补中文可见文案断言，避免只改 key 不改 UI：

```ts
expect(wrapper.text()).toContain("动画风格");
expect(wrapper.text()).toContain("当前默认");
expect(wrapper.text()).toContain("更稳");
```

- [ ] **Step 2: 跑 UI 定向测试，确认失败**

Run:
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`

Expected:
- FAIL，提示缺少 props / emits / 文案 / motion preset 卡片

- [ ] **Step 3: 实现 Settings UI，并把更新动作接到 `settingsStore.setMotionPreset()`**

实现要求：
- `SettingsAppearanceSection.vue` 新结构改为四块：theme、motion preset、effects、preview。
- motion preset 交互与 theme card 保持同等级，不用 dropdown。
- 每张卡片至少展示：名称、描述、标签。
- active 卡片必须通过单一 class 表达，不要分叉模板。
- `AppSettings.vue` 新增：

```ts
function updateMotionPreset(value: string): void {
  settingsStore.setMotionPreset(value);
  persistImmediate();
}
```

同时把 `motionPreset` / `motionPresets` 透传到 `SettingsWindow`。

- [ ] **Step 4: 重新运行 UI 定向测试**

Run:
- `npm run test:run -- src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/components/settings/types.ts src/components/settings/SettingsWindow.vue src/components/settings/parts/SettingsAppearanceSection.vue src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/AppSettings.vue src/i18n/messages.ts
git commit -m "feat(settings):新增 motion preset 外观设置"
```

## Chunk 4: Motion Token 收口、视觉回归与最终门禁

### Task 4: 新增 `motion.css`，把 Launcher / Settings 关键热点改成 token 驱动

**Files:**
- Create: `src/styles/motion.css`
- Create: `src/styles/__tests__/motion-style-contract.test.ts`
- Modify: `src/styles/index.css`
- Modify: `tailwind.config.cjs`
- Modify: `src/components/launcher/LauncherWindow.vue`
- Modify: `src/components/launcher/parts/LauncherCommandPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherFlowPanel.vue`
- Modify: `src/components/launcher/parts/LauncherStagingPanel.vue`
- Modify: `src/components/launcher/parts/LauncherSafetyOverlay.vue`

- [ ] **Step 1: 先写失败 contract test，锁定 token selector 与关键语义动画**

在 `motion-style-contract.test.ts` 增加：

```ts
expect(motionCss).toContain('[data-motion-preset="expressive"]');
expect(motionCss).toContain('[data-motion-preset="steady-tool"]');
expect(motionCss).toContain("@media (prefers-reduced-motion: reduce)");
expect(tailwindConfigSource).toContain("var(--motion-duration-toast)");
expect(tailwindConfigSource).toContain("var(--motion-ease-emphasized)");
expect(launcherWindowSource).toContain("ease-motion-emphasized");
expect(flowPanelSource).toContain("motion-reduce:transition-none");
```

- [ ] **Step 2: 跑 style contract，确认失败**

Run:
- `npm run test:run -- src/styles/__tests__/motion-style-contract.test.ts`

Expected:
- FAIL，提示 `motion.css` 未创建或 Tailwind 动画仍然写死常量

- [ ] **Step 3: 实现 token 化，但只覆盖关键热点**

`motion.css` 至少提供：

```css
:root,
[data-motion-preset="expressive"] {
  --motion-duration-nav-enter: 250ms;
  --motion-duration-nav-exit: 200ms;
  --motion-duration-toast: 350ms;
  --motion-duration-panel-enter: 300ms;
  --motion-duration-panel-exit: 200ms;
  --motion-duration-dialog-enter: 300ms;
  --motion-duration-press: 150ms;
  --motion-ease-emphasized: cubic-bezier(0.175, 0.885, 0.32, 1.15);
  --motion-ease-exit: ease-in;
  --motion-distance-toast-y: 10px;
  --motion-distance-panel-y: 10px;
  --motion-distance-dialog-y: 10px;
  --motion-scale-dialog-enter: 0.95;
  --motion-scale-press-active: 0.985;
}

[data-motion-preset="steady-tool"] {
  --motion-duration-nav-enter: 220ms;
  --motion-duration-nav-exit: 180ms;
  --motion-duration-toast: 320ms;
  --motion-duration-panel-enter: 260ms;
  --motion-duration-panel-exit: 180ms;
  --motion-duration-dialog-enter: 260ms;
  --motion-duration-press: 130ms;
  --motion-ease-emphasized: cubic-bezier(0.22, 1, 0.36, 1);
  --motion-distance-toast-y: 7px;
  --motion-distance-panel-y: 8px;
  --motion-distance-dialog-y: 7px;
  --motion-scale-dialog-enter: 0.975;
  --motion-scale-press-active: 0.992;
}
```

热点接入顺序：
1. `LauncherWindow.vue`
   - nav enter / leave 改成 `duration-motion-nav-enter` / `duration-motion-nav-exit` + `ease-motion-emphasized` / `ease-motion-exit`
2. `LauncherCommandPanel.vue` / `LauncherSearchPanel.vue` / `LauncherFlowPanel.vue`
   - toast 继续用 `animate-launcher-toast-slide-down`
   - 语义动画内部的 translate / scale / duration / easing 改读 `var(--motion-*)`
3. `LauncherFlowPanel.vue` / `LauncherStagingPanel.vue` / `LauncherSafetyOverlay.vue`
   - overlay/panel/dialog keyframes 改读 `var(--motion-*)`
4. pressable 热点
   - 只改 search result、staging card、Appearance motion cards；其他普通 hover 暂不动

不要做的事：
- 不要把全仓 `duration-150` 一把替换。
- 不要让 `steady-tool` 变成“无动画”。
- 不要让 `animate-launcher-staged-feedback` 在 v1 改成与 JS timer 不一致的时长；若要改时长，必须另起一步把生命周期改成 `animationend`。

- [ ] **Step 4: 重新运行 style contract**

Run:
- `npm run test:run -- src/styles/__tests__/motion-style-contract.test.ts`

Expected:
- PASS

- [ ] **Step 5: 提交 checkpoint**

```bash
git add src/styles/motion.css src/styles/__tests__/motion-style-contract.test.ts src/styles/index.css tailwind.config.cjs src/components/launcher/LauncherWindow.vue src/components/launcher/parts/LauncherCommandPanel.vue src/components/launcher/parts/LauncherSearchPanel.vue src/components/launcher/parts/LauncherFlowPanel.vue src/components/launcher/parts/LauncherStagingPanel.vue src/components/launcher/parts/LauncherSafetyOverlay.vue
git commit -m "feat(launcher):以 motion token 收口关键动画热点"
```

### Task 5: 扩展 visual regression，并完成最终验证

**Files:**
- Modify: `src/AppVisual.vue`
- Modify: `scripts/e2e/visual-regression.cjs`
- Modify: `scripts/e2e/visual-baselines/*.png`
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先补 visual harness 场景，再跑视觉失败**

新增场景建议：
- `settings-appearance-motion-preset`
  - 使用真实 `SettingsAppearanceSection`，同时展示 `expressive` 与 `steady-tool` active 态
- `launcher-motion-surfaces-expressive`
  - 固定 `data-motion-preset="expressive"`，展示 toast / flow overlay / staging panel / safety dialog 的 end-state
- `launcher-motion-surfaces-steady-tool`
  - 与上面同构，但切 `data-motion-preset="steady-tool"`

先把 `scripts/e2e/visual-regression.cjs` 增加 screenshot 配置，再运行：

Run:
- `npm run test:visual:ui`

Expected:
- FAIL，因为场景或 baseline 尚未补齐

- [ ] **Step 2: 生成并审查 baseline**

Run:
- `npm run test:visual:ui:update`
- `npm run test:visual:ui`

Expected:
- 生成新的 baseline png
- `expressive` 场景与现有视觉基线一致或仅有设计文档确认过的微小差异
- `steady-tool` 静态 end-state 布局不漂移，差异只体现在 active card 与受控 surface 结构

- [ ] **Step 3: 跑完整门禁，确认没有回归**

Run:
- `npm run test:run -- src/features/motion/__tests__/motionRegistry.test.ts src/stores/__tests__/settingsStore.test.ts src/composables/__tests__/app/useMotionPreset.test.ts src/__tests__/settings.bootstrap-contract.test.ts src/components/settings/parts/__tests__/SettingsAppearanceSection.layout.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/styles/__tests__/motion-style-contract.test.ts`
- `npm run test:visual:ui`
- `npm run check:all`

Expected:
- 全部 PASS

- [ ] **Step 4: 更新短期记忆并提交收口**

`docs/active_context.md` 只补充 1 条短记忆，内容控制在 200 字内，记录：
- 已实现全局 `appearance.motionPreset`
- 默认 `expressive` 保持基线
- `steady-tool` 已接入
- contract / visual / `check:all` 结果

提交：

```bash
git add src/AppVisual.vue scripts/e2e/visual-regression.cjs scripts/e2e/visual-baselines/*.png docs/active_context.md
git commit -m "test(visual):补齐 motion preset 视觉回归与门禁"
```

## 实施顺序建议

1. 先做 Task 1，确保 store / migration / fallback 稳定，再让 UI 可见。
2. 再做 Task 2，保证 bootstrap 和 runtime dataset 一致，否则视觉回归没有意义。
3. 完成 Task 3 后再开放 Settings UI，否则用户会点到尚未真正应用的 preset。
4. Task 4 只覆盖优先级最高的热点；若新增 token 数量开始失控，立即停下来收敛共享 token。
5. 最后做 Task 5，先补视觉场景，再刷 baseline，最后跑 `npm run check:all`。

Plan complete and saved to `docs/superpowers/plans/2026-03-28-global-motion-preset.md`. Ready to execute?
