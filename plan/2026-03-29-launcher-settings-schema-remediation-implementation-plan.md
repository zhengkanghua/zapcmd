# Launcher / Settings / Command Schema 整改 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不改变默认动效 preset 和队列入口视觉方案的前提下，完成 Settings 语义/a11y、共享设置装配、Launcher contract 收窄、Queue 命名统一、schema 方案 3，以及相关大文件拆分。

**Architecture:** 先修正 Settings 语义与 aria/i18n 基线，再抽出共享的 settings scene 装配，随后把 Launcher 壳层改成分片 VM 并完成 Queue 命名迁移。命令 schema 改造采用“schema 真源 + 预编译 validator + 薄业务规则”三层结构，最后顺手拆分 `SettingsCommandsSection`、`useCommandManagement` 与 Queue Review 面板，保证每一步都能独立回归。

**Tech Stack:** Vue 3 `<script setup>`, TypeScript, Pinia, Vitest, Vue Test Utils, JSON Schema 2020-12, PowerShell 生成脚本, Node.js 脚本

**Specs:**
- `docs/superpowers/specs/2026-03-29-launcher-settings-schema-remediation-design.md`

**Plan Path Note:** 仓库规则要求 implementation plan 落到 `/plan`，因此本计划保存为 `plan/2026-03-29-launcher-settings-schema-remediation-implementation-plan.md`，而不是 skill 默认的 `docs/superpowers/plans/`。

**Design Guardrails:**
- 不修改默认动效 preset。
- 不修改队列入口的视觉可发现性。
- 不开放任意扩展字段；命令规则只允许白名单 DSL 扩展。
- `flow` 只保留给真正表示执行流的语义，不再指代右侧队列审阅面板。
- 任何重构都必须保留现有行为与测试语义，不做大爆炸重写。

---

## Scope Check

这份 spec 同时覆盖 Settings、Launcher、命令 schema 三个切面，但它们在当前代码中通过 `AppSettings.vue`、`useAppCompositionRoot`、Queue 命名和 `runtimeLoader` 直接耦合，拆成三份独立 plan 反而会导致接口反复回退。  
因此本计划仍保留单份文档，但按依赖顺序拆成 5 个 chunk，确保每个 chunk 都能单独落地、验证和提交。

---

## 文件结构

### 预期新增

| 文件路径 | 责任 |
| --- | --- |
| `src/composables/app/useAppCompositionRoot/settingsScene.ts` | 共享设置场景装配工厂，统一 settings store refs、settings side effects、settingsWindow、commandCatalog、commandManagement、updateManager、openHomepage。 |
| `src/composables/__tests__/app/settingsScene.test.ts` | 锁定共享设置场景装配 contract，防止 `context.ts` 与 `AppSettings.vue` 再次各自拼一套。 |
| `src/features/commands/schemaValidation.ts` | 结构校验薄适配层，消费预编译 validator，并输出统一校验结果。 |
| `src/features/commands/schemaBusinessRules.ts` | 承担 `min <= max`、默认值范围、模板 token 等跨字段业务规则。 |
| `src/features/commands/schemaErrorFormatter.ts` | 把 validator / business rules 错误转成运行时与设置页可消费的文案。 |
| `src/features/commands/generated/commandSchemaValidator.ts` | 由 schema 预编译生成的 standalone validator 产物，提交入库并供运行时直接导入。 |
| `src/features/commands/__tests__/schemaValidation.test.ts` | 覆盖 standalone validator + business rules 的公共 contract。 |
| `scripts/commands/generate-command-schema-validator.mjs` | 从 `docs/schemas/command-file.schema.json` 生成 runtime 可直接消费的 validator。 |
| `scripts/commands/check-command-schema-sync.mjs` | 校验 schema、生成器产物和 committed validator 是否同步。 |
| `src/components/launcher/parts/LauncherQueueReviewPanel.vue` | 取代 `LauncherFlowPanel.vue`，承载 Queue Review 面板主壳。 |
| `src/components/launcher/parts/queueReview/QueueReviewHeader.vue` | Queue Review 头部壳。 |
| `src/components/launcher/parts/queueReview/QueueReviewEmptyState.vue` | Queue 空态展示。 |
| `src/components/launcher/parts/queueReview/QueueReviewList.vue` | Queue 列表展示与局部交互壳。 |
| `src/composables/launcher/useCommandQueue/index.ts` | 由 `useStagingQueue` 迁移而来，统一 Queue 状态与动作命名。 |

### 预期删除 / 替换

| 文件路径 | 动作 |
| --- | --- |
| `src/features/commands/schemaGuard.ts` | 改造成薄导出壳或直接由新模块替代，不再保留手写结构解释器主体。 |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | 迁移为 `LauncherQueueReviewPanel.vue` 后删除旧文件。 |
| `src/components/launcher/parts/flowPanel/*` | 迁移到 `queueReview/*` 后删除旧路径。 |
| `src/composables/launcher/useStagingQueue/*` | 迁移到 `useCommandQueue/*` 后删除旧路径。 |
| `src/composables/settings/useCommandManagement.ts` | 迁移为目录结构后删除单文件入口。 |

### 预期修改

| 文件路径 | 责任 |
| --- | --- |
| `src/components/settings/ui/SSegmentNav.vue` | 完整 tab 语义、roving tabindex、焦点跟随、tab/panel 关联。 |
| `src/components/settings/SettingsWindow.vue` | 输出 `tabpanel` 结构与 panel id，收口 Settings 顶层 aria 语义。 |
| `src/components/settings/parts/SettingsCommandsSection.vue` | 去掉开发者语义 aria，后续顺手拆分 toolbar / summary / table / issues。 |
| `src/i18n/messages.ts` | 补齐 Settings / Launcher 新增 aria 与文案键。 |
| `src/AppSettings.vue` | 改为消费共享 settings scene，不再自行重复装配。 |
| `src/composables/app/useAppCompositionRoot/context.ts` | 改为组合 `settingsScene` 与 launcher 专属依赖。 |
| `src/composables/app/useAppCompositionRoot/viewModel.ts` | 让 `launcherVm` 输出分片 VM，同时保留 `settingsVm` / `appShellVm` 边界。 |
| `src/composables/app/useAppCompositionRoot/launcherVm.ts` | 从扁平大对象改为 `search / command / queue / nav / dom / actions` 分片。 |
| `src/composables/app/useAppCompositionRoot/settingsVm.ts` | 对齐共享 settings scene 结构，保留窗口壳消费边界。 |
| `src/App.vue` | 不再平铺几十个 props / emits，只向 `LauncherWindow` 传 `launcherVm`。 |
| `src/components/launcher/LauncherWindow.vue` | 改为消费分片 VM，减少顶层接线。 |
| `src/components/launcher/types.ts` | 队列与 review 面板类型命名统一。 |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | `staged` 命名迁移到 `queue`。 |
| `src/components/launcher/parts/LauncherQueueSummaryPill.vue` | 事件与 props 命名对齐 Queue 语义。 |
| `src/components/launcher/parts/LauncherStagingPanel.vue` / `src/AppVisual.vue` | 仅在确认为 visual-only 遗留后删除；否则同步迁移命名，不能继续保留 `staging` 残留。 |
| `src/features/commands/runtimeLoader.ts` | 改用 schema validator adapter + business rules。 |
| `scripts/generate_builtin_commands.ps1` | 继续保留 md -> json 工作流，但扩展白名单 DSL（本轮仅加 `min/max`）。 |
| `docs/command_sources/README.md` | 说明新的参数 DSL 写法与生成要求。 |
| `docs/schemas/README.md` | 说明 schema 真源、standalone validator 和手写业务规则边界。 |
| `package.json` | 增加 schema 生成/校验脚本与依赖。 |
| `package-lock.json` | 同步依赖变化。 |
| `docs/active_context.md` | 追加 writing-plans 阶段摘要。 |

### 重点测试文件

| 文件路径 | 用途 |
| --- | --- |
| `src/components/settings/ui/__tests__/SSegmentNav.test.ts` | tab 语义与键盘行为 contract。 |
| `src/components/settings/__tests__/SettingsWindow.layout.test.ts` | Settings 顶层 shell / tabpanel / route 渲染 contract。 |
| `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts` | 命令管理区语义与结构 contract。 |
| `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts` | 命令管理区交互 contract。 |
| `src/__tests__/app.settings-hotkeys.test.ts` | AppSettings 集成回归。 |
| `src/composables/__tests__/app/useAppCompositionViewModel.test.ts` | launcherVm/settingsVm/appShellVm 契约。 |
| `src/components/launcher/__tests__/LauncherWindow.flow.test.ts` | LauncherWindow 与 Queue Review 渲染 contract。 |
| `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts` | 迁移后改名为 Queue Review panel 测试入口。 |
| `src/features/commands/__tests__/runtimeLoader.test.ts` | runtime loader 校验、merge、issue 输出。 |
| `src/features/commands/__tests__/schemaGuard.test.ts` | 迁移为 schemaValidation contract 的现有夹具入口。 |
| `src/features/security/__tests__/commandSafety.test.ts` | `min/max` 和 pattern 等运行时参数校验回归。 |
| `src/composables/__tests__/settings/useCommandManagement.test.ts` | 命令管理组合逻辑回归。 |
| `src/services/__tests__/commandPreflight.test.ts` | prerequisite preflight 服务 contract。 |

---

## Chunk 1: Settings 语义 / a11y / i18n 基线

### Task 1: 先锁 Settings tab / panel / label 的失败测试

**Files:**
- Modify: `src/components/settings/ui/__tests__/SSegmentNav.test.ts`
- Modify: `src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`

- [ ] **Step 1: 在 `SSegmentNav.test.ts` 增加 tab id / controls / focus follow 的失败测试**

```ts
it("links each tab to its panel and moves focus with arrow navigation", async () => {
  const wrapper = mount(SSegmentNav, {
    props: {
      items: [
        { id: "hotkeys", label: "快捷键", icon: "hotkeys", panelId: "settings-panel-hotkeys" },
        { id: "general", label: "通用", icon: "general", panelId: "settings-panel-general" }
      ],
      modelValue: "hotkeys"
    },
    attachTo: document.body
  });

  const tabs = wrapper.findAll("[role='tab']");
  await tabs[0].trigger("focus");
  await wrapper.get("[role='tablist']").trigger("keydown", { key: "ArrowRight" });

  expect(tabs[0].attributes("aria-controls")).toBe("settings-panel-hotkeys");
  expect(document.activeElement).toBe(tabs[1].element);
});
```

- [ ] **Step 2: 在 `SettingsWindow.layout.test.ts` 增加 `tabpanel` 关联和无开发者 aria 文案断言**

```ts
it("renders the current section as a labelled tabpanel", () => {
  const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "general" }));
  const panel = wrapper.get("[role='tabpanel']");

  expect(panel.attributes("id")).toBe("settings-panel-general");
  expect(panel.attributes("aria-labelledby")).toBe("settings-tab-general");
  expect(wrapper.text()).not.toContain("Settings sections");
});
```

- [ ] **Step 3: 在 `SettingsCommandsSection.layout.test.ts` 增加 heading-led aria contract**

```ts
it("uses product semantics instead of developer-only aria labels", () => {
  const wrapper = mount(SettingsCommandsSection, { props: createProps() });
  expect(wrapper.find("[aria-label='command-management']").exists()).toBe(false);
  expect(wrapper.find("[aria-label='command-management-toolbar']").exists()).toBe(false);
});
```

- [ ] **Step 4: 运行定向测试，确认现在先失败**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
```

Expected:
- `SSegmentNav.test.ts` 因缺少 `panelId / aria-controls / focus follow` 失败。
- `SettingsWindow.layout.test.ts` 因缺少 `tabpanel` 结构与本地化 label 失败。
- `SettingsCommandsSection.layout.test.ts` 因仍存在开发者 aria label 失败。

- [ ] **Step 5: Commit（测试先行）**

```bash
git add src/components/settings/ui/__tests__/SSegmentNav.test.ts
git add src/components/settings/__tests__/SettingsWindow.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git commit -m "test(settings): 锁定 tab 语义与 aria 收口契约"
```

### Task 2: 实现完整 tabpanel 语义和基础 i18n

**Files:**
- Modify: `src/components/settings/ui/SSegmentNav.vue`
- Modify: `src/components/settings/SettingsWindow.vue`
- Modify: `src/components/settings/types.ts`
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 扩展 `SSegmentNav` 的 item 结构，显式传入 `panelId`**

把 item 类型从：

```ts
interface SegmentNavItem {
  id: string;
  label: string;
  icon: SettingsNavIconName;
}
```

扩成：

```ts
interface SegmentNavItem {
  id: string;
  label: string;
  icon: SettingsNavIconName;
  panelId: string;
}
```

- [ ] **Step 2: 在 `SSegmentNav.vue` 实现 roving focus + tab/panel 关联**

至少落下这几个 contract：

```ts
const tabRefs = ref<Array<HTMLButtonElement | null>>([]);

function getTabId(id: string): string {
  return `settings-tab-${id}`;
}

function focusTab(index: number): void {
  tabRefs.value[index]?.focus({ preventScroll: true });
}
```

模板里补：

```vue
:id="getTabId(item.id)"
:aria-controls="item.panelId"
:tabindex="modelValue === item.id ? 0 : -1"
:ref="(el) => { tabRefs[index] = el as HTMLButtonElement | null; }"
```

并在方向键处理后 `emit("update:modelValue", ...)` + `nextTick(() => focusTab(next))`。

- [ ] **Step 3: 在 `SettingsWindow.vue` 为当前 section 包一层 `tabpanel`**

采用单一容器，不要给每个分支套一堆重复壳：

```vue
<section
  :id="activePanelId"
  role="tabpanel"
  :aria-labelledby="activeTabId"
  class="settings-content__panel"
>
  <SettingsGeneralSection v-if="settingsRoute === 'general'" ... />
  ...
</section>
```

并把 `navItems` 改为：

```ts
const navItems = computed(() =>
  props.settingsNavItems.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    panelId: `settings-panel-${item.id}`
  }))
);
```

- [ ] **Step 4: 在 `messages.ts` 增加 Settings tablist / panel / commands 区域的文案键**

至少新增：

```ts
settings: {
  aria: {
    sections: "设置分区",
    content: "设置内容",
    commandsRegion: "命令管理",
    commandsToolbar: "命令筛选与操作",
    commandsTable: "命令列表",
    commandsIssues: "命令加载问题"
  }
}
```

并同步英文键，禁止继续硬编码英文 aria。

- [ ] **Step 5: 运行定向测试，确认全部转绿**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/settings/ui/SSegmentNav.vue
git add src/components/settings/SettingsWindow.vue
git add src/components/settings/types.ts
git add src/i18n/messages.ts
git commit -m "feat(settings): 完成 tabpanel 语义与基础 aria i18n"
```

### Task 3: 收口 `SettingsCommandsSection` 的开发者语义 aria

**Files:**
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`

- [ ] **Step 1: 先给命令管理区添加真实 heading id，不再依赖 `command-management` 一类 label**

目标结构示例：

```vue
<section class="settings-commands" :aria-labelledby="commandsRegionTitleId">
  <h2 :id="commandsRegionTitleId" class="sr-only">{{ t("settings.aria.commandsRegion") }}</h2>
  ...
</section>
```

- [ ] **Step 2: toolbar / summary / table / issues 区域改用 `aria-labelledby` 或本地化 label**

例如：

```vue
<div :aria-labelledby="toolbarTitleId">
  <h3 :id="toolbarTitleId" class="sr-only">{{ t("settings.aria.commandsToolbar") }}</h3>
</div>
```

只有在没有合适标题可关联时，才保留 `:aria-label="t(...)"`。

- [ ] **Step 3: 更新 layout / interactions 测试**

追加断言：

```ts
expect(wrapper.find("[aria-label='command-management-table']").exists()).toBe(false);
expect(wrapper.text()).toContain("命令");
```

不要去断言具体中文全文，只断结构和 i18n 已接管。

- [ ] **Step 4: 运行定向测试**

Run:

```bash
npm run test:run -- src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/settings/parts/SettingsCommandsSection.vue
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts
git commit -m "feat(settings): 收口命令管理区域 aria 语义"
```

---

## Chunk 2: 共享 Settings Scene 装配

### Task 4: 先锁共享 settings scene contract

**Files:**
- Create: `src/composables/__tests__/app/settingsScene.test.ts`
- Modify: `src/__tests__/app.settings-hotkeys.test.ts`
- Modify: `src/__tests__/app.failure-events.test.ts`

- [ ] **Step 1: 新增 `settingsScene.test.ts`，先描述共享场景工厂要提供的最小 contract**

```ts
it("creates a reusable settings scene with settingsWindow/commandManagement/updateManager", () => {
  const scene = createSettingsScene({ ports: createPortsStub() });

  expect(scene.settingsWindow).toBeDefined();
  expect(scene.commandManagement).toBeDefined();
  expect(scene.updateManager).toBeDefined();
  expect(scene.openHomepage).toBeTypeOf("function");
});
```

- [ ] **Step 2: 在 `app.settings-hotkeys.test.ts` 增加回归断言，锁定 `AppSettings` 不因装配提取而丢行为**

至少保留一条：

```ts
expect(wrapper.findComponent({ name: "SettingsWindow" }).exists()).toBe(true);
```

加一条 settings scene 提取后仍可正常录制 / 导航的断言，不要只测 mount 成功。

- [ ] **Step 3: 在 `app.failure-events.test.ts` 保持 `AppSettings` / `App.vue` 现有失败反馈 contract**

补一个最小 smoke：

```ts
const settingsWrapper = mount(AppSettings, ...);
expect(settingsWrapper.text()).not.toContain("homepage url is not configured");
```

这里只锁“提取共享装配后不冒出新失败路径”，不要扩大成新功能测试。

- [ ] **Step 4: 运行测试，确认因 `createSettingsScene` 不存在而先失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/app/settingsScene.test.ts src/__tests__/app.settings-hotkeys.test.ts src/__tests__/app.failure-events.test.ts
```

Expected:
- `settingsScene.test.ts` 因模块不存在失败。
- 其余测试可能通过，用于稳住集成行为基线。

- [ ] **Step 5: Commit（测试先行）**

```bash
git add src/composables/__tests__/app/settingsScene.test.ts
git add src/__tests__/app.settings-hotkeys.test.ts
git add src/__tests__/app.failure-events.test.ts
git commit -m "test(app): 锁定共享 settings scene 装配契约"
```

### Task 5: 抽出 `settingsScene` 并瘦身 `AppSettings.vue`

**Files:**
- Create: `src/composables/app/useAppCompositionRoot/settingsScene.ts`
- Modify: `src/composables/app/useAppCompositionRoot/context.ts`
- Modify: `src/composables/app/useAppCompositionRoot/settingsVm.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/AppSettings.vue`

- [ ] **Step 1: 在新模块里收拢重复逻辑**

目标最小接口：

```ts
export interface SettingsScene {
  settingsStore: ReturnType<typeof useSettingsStore>;
  settingsWindow: ReturnType<typeof useSettingsWindow>;
  commandCatalog: ReturnType<typeof useCommandCatalog>;
  commandManagement: ReturnType<typeof useCommandManagement>;
  updateManager: ReturnType<typeof useUpdateManager>;
  hotkeyBindings: ReturnType<typeof useHotkeyBindings>;
  appVersion: Ref<string>;
  openHomepage: () => Promise<void>;
}
```

并把 `language / windowOpacity` 副作用与 `useTheme / useMotionPreset` 放进这个模块。

- [ ] **Step 2: 改 `context.ts`，只在 settings scene 之上叠加 launcher 专属状态**

把原来的：

```ts
const settingsWindow = useSettingsWindow(...);
const commandCatalog = useCommandCatalog(...);
const commandManagement = useCommandManagement(...);
```

替换成：

```ts
const settingsScene = createSettingsScene({ ports, isSettingsWindow, settingsSyncChannel });
```

然后从 `settingsScene` 解出 `settingsWindow / commandCatalog / commandManagement / updateManager / hotkeyBindings`。

- [ ] **Step 3: 改 `AppSettings.vue`，直接消费 `createSettingsScene`**

`AppSettings.vue` 只保留：
- settings window 入口事件
- storage / broadcast 监听
- 视图级 `persistImmediate` / emit glue

不要再重复：
- `useTheme`
- `useMotionPreset`
- `useCommandCatalog`
- `useCommandManagement`
- `useUpdateManager`

- [ ] **Step 4: 把 settings mutation handlers 继续留在 `viewModel.ts`，但改为消费 scene 暴露对象**

避免本轮同时拆太多层；先保留：

```ts
const settingsMutationHandlers = createSettingsMutationHandlers(context);
```

只把其读取路径换成统一的 settings scene 语义。

- [ ] **Step 5: 运行定向测试**

Run:

```bash
npm run test:run -- src/composables/__tests__/app/settingsScene.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/__tests__/app.settings-hotkeys.test.ts src/__tests__/app.failure-events.test.ts src/__tests__/settings.bootstrap-contract.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/composables/app/useAppCompositionRoot/settingsScene.ts
git add src/composables/app/useAppCompositionRoot/context.ts
git add src/composables/app/useAppCompositionRoot/settingsVm.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/AppSettings.vue
git commit -m "refactor(app): 抽取共享 settings scene 装配"
```

---

## Chunk 3: Launcher Contract 收窄 + Queue 命名统一

### Task 6: 先锁新的 `launcherVm` 分片 contract 和 Queue 语义

**Files:**
- Modify: `src/composables/__tests__/app/useAppCompositionViewModel.test.ts`
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`
- Modify: `src/components/launcher/parts/__tests__/LauncherQueueSummaryPill.test.ts`

- [ ] **Step 1: 在 `useAppCompositionViewModel.test.ts` 先把预期从扁平 VM 改成分片 VM**

例如：

```ts
expect(viewModel.launcherVm.search.query).toBe("");
expect(viewModel.launcherVm.queue.items).toEqual([]);
expect(viewModel.launcherVm.actions.toggleQueue).toBeTypeOf("function");
expect("query" in viewModel.launcherVm).toBe(false);
```

- [ ] **Step 2: 在 `LauncherWindow.flow.test.ts` 把 props 入口改成单个 `launcherVm`**

先让测试红起来：

```ts
mount(LauncherWindow, {
  props: {
    launcherVm: createLauncherVmStub()
  }
});
```

同时把 `stagingExpanded / toggle-staging / LauncherFlowPanel` 的文案断言迁到 `queueOpen / toggle-queue / LauncherQueueReviewPanel`。

- [ ] **Step 3: 在 `LauncherFlowPanel.test.ts` 和 `LauncherQueueSummaryPill.test.ts` 先改断言文案和事件名**

至少先把用户语义改成：

```ts
expect(wrapper.text()).toContain("队列");
expect(wrapper.emitted("toggle-queue")).toHaveLength(1);
```

- [ ] **Step 4: 运行测试，确认 contract 与命名先失败**

Run:

```bash
npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/components/launcher/parts/__tests__/LauncherQueueSummaryPill.test.ts
```

Expected:
- 因 `launcherVm` 仍是扁平对象失败。
- 因组件/事件名仍是 `staging/flow` 失败。

- [ ] **Step 5: Commit（测试先行）**

```bash
git add src/composables/__tests__/app/useAppCompositionViewModel.test.ts
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git add src/components/launcher/parts/__tests__/LauncherQueueSummaryPill.test.ts
git commit -m "test(launcher): 锁定分片 vm 与 queue 命名契约"
```

### Task 7: 实现分片 `launcherVm`，收窄 `App.vue -> LauncherWindow.vue` 接口

**Files:**
- Modify: `src/composables/app/useAppCompositionRoot/launcherVm.ts`
- Modify: `src/composables/app/useAppCompositionRoot/viewModel.ts`
- Modify: `src/App.vue`
- Modify: `src/components/launcher/LauncherWindow.vue`

- [ ] **Step 1: 在 `launcherVm.ts` 把扁平对象拆成 6 个语义分片**

目标结构：

```ts
return proxyRefs({
  search: { query, filteredResults, activeIndex, keyboardHints, ... },
  command: { pendingCommand, pendingArgs, pendingArgValues, submitHint, submitMode, ... },
  queue: { items, queueOpen, panelState, activeIndex, focusZone, hints, ... },
  nav: { currentPage, canGoBack, stack, ... },
  dom: { setSearchShellRef, setSearchInputRef, setQueuePanelRef, ... },
  actions: { onQueryInput, enqueueResult, executeResult, toggleQueue, ... }
});
```

- [ ] **Step 2: 在 `App.vue` 改为只传 `launcherVm`**

从当前几十个 props / emits：

```vue
<LauncherWindow
  :query="launcherVm.query"
  ...
/>
```

收成：

```vue
<LauncherWindow :launcher-vm="launcherVm" @blank-pointerdown="appShellVm.hideMainWindow" @execution-feedback="appShellVm.setExecutionFeedback" />
```

`defineExpose` 里保留 `submitParamInput`，但不要继续暴露 settings 兼容字段。

- [ ] **Step 3: 在 `LauncherWindow.vue` 内部按分片取值，不再继续顶层扁平传递**

例如：

```ts
const props = defineProps<{
  launcherVm: LauncherVm;
}>();
```

模板里改成：

```vue
:query="props.launcherVm.search.query"
:staged-command-count="props.launcherVm.queue.items.length"
@query-input="props.launcherVm.actions.onQueryInput"
```

这里只是收窄壳层 contract，不同时处理大规模命名迁移。

- [ ] **Step 4: 运行定向测试**

Run:

```bash
npm run test:run -- src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/app/useAppCompositionRoot/launcherVm.ts
git add src/composables/app/useAppCompositionRoot/viewModel.ts
git add src/App.vue
git add src/components/launcher/LauncherWindow.vue
git commit -m "refactor(launcher): 收窄壳层 contract 为分片 vm"
```

### Task 8: 统一 Queue 命名并迁移 Review 面板文件

**Files:**
- Modify: `src/composables/launcher/useStagingQueue/index.ts`
- Modify: `src/composables/launcher/useStagingQueue/model.ts`
- Modify: `src/composables/launcher/useStagingQueue/drawer.ts`
- Modify: `src/composables/launcher/useStagingQueue/focus.ts`
- Modify: `src/components/launcher/types.ts`
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/parts/LauncherQueueSummaryPill.vue`
- Modify: `src/AppVisual.vue`
- Modify: `src/styles/__tests__/motion-style-contract.test.ts`
- Modify: `src/styles/__tests__/launcher-style-contract.test.ts`
- Modify: `src/styles/__tests__/tailwind-governance-contract.test.ts`
- Rename: `src/composables/launcher/useStagingQueue` -> `src/composables/launcher/useCommandQueue`
- Rename: `src/components/launcher/parts/LauncherFlowPanel.vue` -> `src/components/launcher/parts/LauncherQueueReviewPanel.vue`
- Rename: `src/components/launcher/parts/flowPanel` -> `src/components/launcher/parts/queueReview`

- [ ] **Step 1: 用 `git mv` 做路径迁移，先保证 import 图谱可追踪**

Run:

```bash
git mv src/composables/launcher/useStagingQueue src/composables/launcher/useCommandQueue
git mv src/components/launcher/parts/LauncherFlowPanel.vue src/components/launcher/parts/LauncherQueueReviewPanel.vue
git mv src/components/launcher/parts/flowPanel src/components/launcher/parts/queueReview
```

- [ ] **Step 2: 在代码中统一命名，但暂时保留少量 review 内部名**

目标替换：

```ts
stagedCommands -> queuedCommands
stageResult -> enqueueResult
toggleStaging -> toggleQueue
stagingExpanded -> queueOpen
stagingDrawerState -> queuePanelState
stagingActiveIndex -> queueActiveIndex
focusZone: "staging" -> "queue"
```

保留：

```ts
reviewPanelRef
closeReview()
```

这些是交互模式名，不用硬改。

- [ ] **Step 3: 清理 visual-only 遗留**

先搜索 `LauncherStagingPanel` 是否仍有主产品路径引用：

```bash
rg -n "LauncherStagingPanel" src -S
```

如果只剩 `AppVisual.vue` / 纯测试：
- 直接删除旧 visual-only 组件，并改 `AppVisual.vue` 场景引用

如果仍有有效产品路径引用：
- 同步改名，不允许继续保留 `staging` 命名

- [ ] **Step 4: 同步更新 style contract 测试中的文件路径**

例如：

```ts
const queueReviewPanelPath = path.resolve(process.cwd(), "src/components/launcher/parts/LauncherQueueReviewPanel.vue");
```

不要让样式契约继续引用已经删除的旧路径。

- [ ] **Step 5: 运行定向测试**

Run:

```bash
npm run test:run -- src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/components/launcher/parts/__tests__/LauncherQueueSummaryPill.test.ts src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts src/styles/__tests__/motion-style-contract.test.ts src/styles/__tests__/tailwind-governance-contract.test.ts
```

Expected: PASS  
说明：若测试文件名仍暂时沿用 `LauncherFlowPanel.test.ts`，允许先保留测试文件名，等行为稳定后再改测试文件名。

- [ ] **Step 6: Commit**

```bash
git add src/composables/launcher/useCommandQueue
git add src/components/launcher
git add src/AppVisual.vue
git add src/styles/__tests__/launcher-style-contract.test.ts
git add src/styles/__tests__/motion-style-contract.test.ts
git add src/styles/__tests__/tailwind-governance-contract.test.ts
git commit -m "refactor(launcher): 统一 queue 命名并迁移 review 面板"
```

### Task 9: 顺手拆薄 Queue Review 面板

**Files:**
- Create: `src/components/launcher/parts/queueReview/QueueReviewHeader.vue`
- Create: `src/components/launcher/parts/queueReview/QueueReviewEmptyState.vue`
- Create: `src/components/launcher/parts/queueReview/QueueReviewList.vue`
- Modify: `src/components/launcher/parts/LauncherQueueReviewPanel.vue`
- Modify: `src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts`

- [ ] **Step 1: 先用现有组件测试建立 refactor baseline**

Run:

```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
```

Expected: PASS  
这一步不是走红，是为纯拆分 refactor 锁基线。

- [ ] **Step 2: 把 presentational 片段拆成子组件，交互状态仍留在主壳**

主壳只保留：
- overlay / dialog 壳
- refs 与 focus trap
- composable 接线

子组件承接：

```vue
<QueueReviewHeader ... />
<QueueReviewEmptyState ... />
<QueueReviewList ... />
```

不要在这一步再次改业务行为。

- [ ] **Step 3: 运行同一组测试，确认纯拆分不回归**

Run:

```bash
npm run test:run -- src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/components/launcher/parts/__tests__/LauncherSearchPanel.floor-height.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/launcher/parts/LauncherQueueReviewPanel.vue
git add src/components/launcher/parts/queueReview
git add src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts
git commit -m "refactor(launcher): 拆薄 queue review 面板"
```

---

## Chunk 4: Schema 方案 3

### Task 10: 先锁 standalone validator + business rules 的失败测试

**Files:**
- Create: `src/features/commands/__tests__/schemaValidation.test.ts`
- Modify: `src/features/commands/__tests__/runtimeLoader.test.ts`
- Modify: `src/features/security/__tests__/commandSafety.test.ts`

- [ ] **Step 1: 新增 `schemaValidation.test.ts`，把结构规则与业务规则分开锁**

示例：

```ts
it("rejects payloads that violate schema structure", () => {
  const result = validateRuntimeCommandFile({
    commands: [{ id: "bad id", name: "bad", tags: ["t"], category: "custom", platform: "win", template: "echo", adminRequired: false }]
  });

  expect(result.valid).toBe(false);
  expect(result.reason).toContain("commands[0].id");
});

it("rejects numeric args when min is greater than max", () => {
  const result = validateRuntimeCommandFile(createPayloadWithMinMax(100, 1));
  expect(result.valid).toBe(false);
  expect(result.reason).toContain("min");
});
```

- [ ] **Step 2: 在 `runtimeLoader.test.ts` 增加 adapter 集成断言**

至少补一条：

```ts
expect(issue?.reason).toContain("commands[0].id");
```

继续锁“第一条失败原因可读”，不要让新 validator 把错误变成不可定位的泛文案。

- [ ] **Step 3: 在 `commandSafety.test.ts` 增加从 runtime 映射得到 `min/max` 的回归断言**

这里不是改行为，而是防 schema 改造时把已有 `min/max` 支持弄丢。

- [ ] **Step 4: 运行测试，确认先因新模块不存在或业务规则缺失而失败**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeLoader.test.ts src/features/security/__tests__/commandSafety.test.ts
```

Expected:
- `schemaValidation.test.ts` 因模块不存在失败。
- 如果 `runtimeLoader` 先改了导入但还没接通，也会失败。

- [ ] **Step 5: Commit（测试先行）**

```bash
git add src/features/commands/__tests__/schemaValidation.test.ts
git add src/features/commands/__tests__/runtimeLoader.test.ts
git add src/features/security/__tests__/commandSafety.test.ts
git commit -m "test(commands): 锁定 schema validator 与业务规则契约"
```

### Task 11: 接入 standalone validator，移除手写结构解释器主体

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/commands/generate-command-schema-validator.mjs`
- Create: `scripts/commands/check-command-schema-sync.mjs`
- Create: `src/features/commands/generated/commandSchemaValidator.ts`
- Create: `src/features/commands/schemaValidation.ts`
- Create: `src/features/commands/schemaBusinessRules.ts`
- Create: `src/features/commands/schemaErrorFormatter.ts`
- Modify: `src/features/commands/runtimeLoader.ts`
- Modify: `src/features/commands/schemaGuard.ts`

- [ ] **Step 1: 增加生成 standalone validator 所需依赖与脚本**

在 `package.json` 增加：

```json
{
  "devDependencies": {
    "ajv": "^8.x",
    "ajv-formats": "^3.x"
  },
  "scripts": {
    "commands:schema:generate": "node scripts/commands/generate-command-schema-validator.mjs",
    "commands:schema:check": "node scripts/commands/check-command-schema-sync.mjs"
  }
}
```

- [ ] **Step 2: 编写生成脚本，输出 committed validator**

生成脚本目标：

```js
import Ajv from "ajv";
import standaloneCode from "ajv/dist/standalone";
```

输出到：

```ts
export const validateCommandSchema = ...
```

放在 `src/features/commands/generated/commandSchemaValidator.ts`，运行时直接导入，不在客户端再动态编译 schema。

- [ ] **Step 3: 写 `schemaValidation.ts / schemaBusinessRules.ts / schemaErrorFormatter.ts`**

公共入口保留：

```ts
export function validateRuntimeCommandFile(value: unknown): { valid: true } | { valid: false; reason: string } {
  // schema structure -> business rules -> formatter
}
```

`schemaGuard.ts` 可以暂时改成重新导出壳：

```ts
export { validateRuntimeCommandFile, isRuntimeCommandFile } from "./schemaValidation";
```

这样能减小外部改动面。

- [ ] **Step 4: 改 `runtimeLoader.ts`，保持 issue 语义不变**

运行时继续：
- 非法文件跳过
- issue code 仍是 `invalid-schema`
- issue stage 仍是 `schema`

不要顺手改 `loadUserCommandTemplatesWithReport` 的外部 contract。

- [ ] **Step 5: 运行定向测试**

Run:

```bash
npm run commands:schema:generate
npm run test:run -- src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeLoader.test.ts src/features/commands/__tests__/schemaGuard.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json
git add scripts/commands/generate-command-schema-validator.mjs
git add scripts/commands/check-command-schema-sync.mjs
git add src/features/commands/generated/commandSchemaValidator.ts
git add src/features/commands/schemaValidation.ts
git add src/features/commands/schemaBusinessRules.ts
git add src/features/commands/schemaErrorFormatter.ts
git add src/features/commands/runtimeLoader.ts
git add src/features/commands/schemaGuard.ts
git commit -m "refactor(commands): 接入 standalone schema validator"
```

### Task 12: 扩展 md DSL（本轮只做 `min/max`）并回填文档与生成产物

**Files:**
- Modify: `scripts/generate_builtin_commands.ps1`
- Modify: `docs/command_sources/README.md`
- Modify: `docs/schemas/README.md`
- Modify: `docs/README.md`
- Modify: `assets/runtime_templates/commands/builtin/_*.json`
- Modify: `assets/runtime_templates/commands/builtin/index.json`
- Modify: `docs/builtin_commands.generated.md`

- [ ] **Step 1: 只扩展最小白名单 DSL，不同时引入 `pattern/errorMessage`**

在 `Convert-ArgsSpec` 中把：

```powershell
timeout(number, default:3000)
```

扩成支持：

```powershell
timeout(number, default:3000, min:1000, max:10000)
```

并生成：

```powershell
$arg.validation = [ordered]@{
  min = 1000
  max = 10000
}
```

如果同时存在 `default` 和 `validation`，需要合并，而不是互相覆盖。

- [ ] **Step 2: 保持 YAGNI，显式写入 README：本轮 md DSL 只新增 `min/max`**

不要在这轮顺手发明复杂 mini-language。  
`pattern/errorMessage` 暂时继续保留 JSON schema / 用户 JSON 文件入口，不要求 builtin md 同步支持。

- [ ] **Step 3: 运行生成与同步检查**

Run:

```bash
npm run commands:schema:check
pwsh -File scripts/generate_builtin_commands.ps1
```

Expected:
- schema sync check PASS
- builtin JSON 与 `docs/builtin_commands.generated.md` 更新完成

- [ ] **Step 4: 用 runtime loader 与 command safety 回归命令范围逻辑**

Run:

```bash
npm run test:run -- src/features/commands/__tests__/runtimeLoader.test.ts src/features/security/__tests__/commandSafety.test.ts src/services/__tests__/commandPreflight.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/generate_builtin_commands.ps1
git add docs/command_sources/README.md docs/schemas/README.md docs/README.md
git add assets/runtime_templates/commands/builtin
git add docs/builtin_commands.generated.md
git commit -m "feat(commands): 扩展 builtin 命令 min max DSL"
```

---

## Chunk 5: Settings 命令管理拆分与总回归

### Task 13: 拆分 `useCommandManagement` 与 `SettingsCommandsSection`

**Files:**
- Create: `src/composables/settings/useCommandManagement/index.ts`
- Create: `src/composables/settings/useCommandManagement/rows.ts`
- Create: `src/composables/settings/useCommandManagement/options.ts`
- Create: `src/composables/settings/useCommandManagement/issues.ts`
- Create: `src/composables/settings/useCommandManagement/mutations.ts`
- Create: `src/components/settings/parts/settingsCommands/SettingsCommandsToolbar.vue`
- Create: `src/components/settings/parts/settingsCommands/SettingsCommandsSummary.vue`
- Create: `src/components/settings/parts/settingsCommands/SettingsCommandsTable.vue`
- Create: `src/components/settings/parts/settingsCommands/SettingsCommandsIssues.vue`
- Modify: `src/components/settings/parts/SettingsCommandsSection.vue`
- Modify: `src/composables/__tests__/settings/useCommandManagement.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts`
- Modify: `src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts`

- [ ] **Step 1: 先跑现有测试建立 baseline**

Run:

```bash
npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts
```

Expected: PASS  
这是纯拆分 refactor 的起点，不先改测试目标行为。

- [ ] **Step 2: 把 `useCommandManagement.ts` 迁到目录结构**

拆分建议：

```ts
rows.ts        // createAllRows / createFilteredRows / createSummary / groups
options.ts     // createCategoryOptions / createCommandFilterOptions / source file options
issues.ts      // formatIssue / issue stage helpers
mutations.ts   // toggle / bulk enable / update view / reset
index.ts       // 对外 useCommandManagement
```

对外导出路径仍保持：

```ts
import { useCommandManagement } from "../../settings/useCommandManagement";
```

不要让调用方大面积改 import。

- [ ] **Step 3: 把 `SettingsCommandsSection.vue` 拆成子视图**

主壳只保留：
- 组合子视图
- `moreFiltersOpen`
- deferred rows 计时器
- emit glue

子视图承接：

```vue
<SettingsCommandsToolbar ... />
<SettingsCommandsSummary ... />
<SettingsCommandsTable ... />
<SettingsCommandsIssues ... />
```

不要改变交互行为和现有 props / emits。

- [ ] **Step 4: 运行同一组测试，确认纯拆分不回归**

Run:

```bash
npm run test:run -- src/composables/__tests__/settings/useCommandManagement.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/settings/useCommandManagement
git add src/components/settings/parts/SettingsCommandsSection.vue
git add src/components/settings/parts/settingsCommands
git add src/composables/__tests__/settings/useCommandManagement.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts
git add src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts
git commit -m "refactor(settings): 拆分命令管理组合与视图"
```

### Task 14: 做总回归、补上下文并收尾提交

**Files:**
- Modify: `docs/active_context.md`

- [ ] **Step 1: 先跑本轮关键定向回归**

Run:

```bash
npm run test:run -- src/components/settings/ui/__tests__/SSegmentNav.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.layout.test.ts src/components/settings/parts/__tests__/SettingsCommandsSection.interactions.test.ts src/composables/__tests__/app/useAppCompositionViewModel.test.ts src/components/launcher/__tests__/LauncherWindow.flow.test.ts src/components/launcher/parts/__tests__/LauncherFlowPanel.test.ts src/features/commands/__tests__/schemaValidation.test.ts src/features/commands/__tests__/runtimeLoader.test.ts src/features/security/__tests__/commandSafety.test.ts src/composables/__tests__/settings/useCommandManagement.test.ts src/services/__tests__/commandPreflight.test.ts
```

Expected: PASS

- [ ] **Step 2: 跑类型、lint 与全量门禁**

Run:

```bash
npm run lint
npm run typecheck
npm run check:all
```

Expected:
- `lint` PASS
- `typecheck` PASS
- `check:all` PASS

- [ ] **Step 3: 更新 `docs/active_context.md`**

追加一条不超过 200 字的摘要，例如：

```md
## 补充（2026-03-29｜Launcher / Settings / Schema 整改 writing-plans 完成）
- 已产出实施计划 `plan/2026-03-29-launcher-settings-schema-remediation-implementation-plan.md`：先收口 Settings 语义与 aria/i18n，再抽 settings scene、收窄 Launcher contract、统一 Queue 命名，最后完成 schema 方案 3 与命令管理拆分。
```

- [ ] **Step 4: 提交计划执行结果**

```bash
git add docs/active_context.md
git commit -m "docs(context): 更新整改实施进度"
```

说明：
- 如果 `check:all` 仍在同一次提交前刚跑完，允许把这一步和最后一个功能提交合并。
- 不允许在未跑完门禁前宣称整改完成。

---

## 执行顺序提醒

1. 先做 Chunk 1，别一上来碰 Queue rename。
2. Chunk 2 完成后再动 Launcher contract，避免主窗口和设置窗口同时漂。
3. Chunk 3 的分片 VM 先于大规模 Queue rename，防止“接口变化 + 命名变化”混成一锅。
4. Chunk 4 的 schema 改造要先接上 standalone validator，再扩 DSL；不要反过来。
5. Chunk 5 只做顺手拆分，不追加新行为。

---

## 失败处理策略

- 如果 Queue rename 影响面超出预估，优先保住主运行链路与测试，再处理 visual-only 遗留。
- 如果 standalone validator 生成脚本与运行时打包存在冲突，优先保证 committed 产物可被 runtime 直接导入，不要回退到运行时动态编译 schema。
- 如果 `generate_builtin_commands.ps1` 的 DSL 扩展引入歧义，本轮只保留 `min/max`，拒绝继续扩 DSL 语法面。

---

Plan complete and saved to `plan/2026-03-29-launcher-settings-schema-remediation-implementation-plan.md`. Ready to execute?
