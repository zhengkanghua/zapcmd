# 主滚动容器细滚动条精修 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 `.scrollbar-subtle` 统一 Settings 与 Launcher 主滚动容器的细滚动条视觉，替换“隐藏滚动条 / 原生滚动条”混用状态，同时保持覆盖范围克制、交互语义不变。

**Architecture:** 在 [src/styles/tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css) 新增 A 风格细滚动条 utility，并只显式挂载到主滚动容器。先用契约测试锁定 utility 与模板 class contract，再做最小模板改动。`FlowPanel` 的空态滚动宿主在 [LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue) 中采用“仅空态条件挂载 `.scrollbar-subtle` 到 `.flow-panel__body`”的方案；有列表时继续由 `.flow-panel__list` 承担滚动与细滚动条。

**Tech Stack:** Vue 3 `<script setup>`, Tailwind CSS v4（preflight disabled）, Vitest, ESLint, vue-tsc, Tauri desktop shell

**Specs:**
- [2026-03-27-main-scrollbar-subtle-polish-design.md](/home/work/projects/zapcmd/docs/superpowers/specs/2026-03-27-main-scrollbar-subtle-polish-design.md)

**Execution Skills:** `@superpowers:test-driven-development` `@superpowers:verification-before-completion`

---

## 约束与验收（DoD）

- 覆盖范围仅限主滚动容器：
  - [SettingsWindow.vue](/home/work/projects/zapcmd/src/components/settings/SettingsWindow.vue) 的 `.settings-content`
  - [LauncherCommandPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherCommandPanel.vue) 的 `.command-panel__content`
  - [LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue) 的 `.flow-panel__body`（仅空态条件挂载）与 `.flow-panel__list`
  - [LauncherStagingPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherStagingPanel.vue) 的 `.staging-list`
- 不允许使用全局 `*::-webkit-scrollbar` 覆盖。
- 不新增主题 token，直接复用 `--ui-text-rgb`。
- `scrollbar-none` 从运行时代码中删除：`rg -n "scrollbar-none" src` 结果为 `0`。
- focused 测试必须全绿：
  - `npm run test:run -- src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts`
  - `npm run test:contract:styles`
  - `npm run test:flow:settings`
- 最终门禁必须全绿：`npm run check:all`

---

## 文件结构

| 文件路径 | 责任 |
| --- | --- |
| [src/styles/tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css) | 定义 `.scrollbar-subtle` utility，并删除不再使用的 `.scrollbar-none`。 |
| [src/components/settings/SettingsWindow.vue](/home/work/projects/zapcmd/src/components/settings/SettingsWindow.vue) | 将 Settings 主内容滚动容器切换到 `.scrollbar-subtle`。 |
| [src/components/launcher/parts/LauncherCommandPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherCommandPanel.vue) | 为命令详情主内容区挂载 `.scrollbar-subtle`。 |
| [src/components/launcher/parts/LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue) | 空态滚动宿主条件挂载 `.scrollbar-subtle`；列表态滚动容器常驻 `.scrollbar-subtle`。 |
| [src/components/launcher/parts/LauncherStagingPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherStagingPanel.vue) | 为暂存列表挂载 `.scrollbar-subtle`。 |
| [src/styles/__tests__/tailwind-governance-contract.test.ts](/home/work/projects/zapcmd/src/styles/__tests__/tailwind-governance-contract.test.ts) | 锁定 `.scrollbar-subtle` 的 CSS 契约，以及 `.scrollbar-none` 已清理。 |
| [src/components/settings/__tests__/SettingsWindow.layout.test.ts](/home/work/projects/zapcmd/src/components/settings/__tests__/SettingsWindow.layout.test.ts) | 锁定 Settings 主滚动容器的 class contract。 |
| [src/styles/__tests__/launcher-style-contract.test.ts](/home/work/projects/zapcmd/src/styles/__tests__/launcher-style-contract.test.ts) | 锁定 Launcher 主滚动容器的 class contract 与 Flow 空态条件挂载。 |
| [docs/active_context.md](/home/work/projects/zapcmd/docs/active_context.md) | 执行完成后补充短期记忆。 |

---

## 首个执行子任务

首个执行子任务是 **Task 1：先用失败测试锁定 `.scrollbar-subtle` 与 Settings 迁移**。这一步范围最小，能先把 utility 形态和 Settings 主容器契约稳定下来，控制在一轮 5-10 分钟的改动内。

---

## Chunk 1：先锁 Settings + 全局 utility

### Task 1：用失败测试锁定 `.scrollbar-subtle` 与 Settings 迁移

**Files:**
- Modify: [src/styles/__tests__/tailwind-governance-contract.test.ts](/home/work/projects/zapcmd/src/styles/__tests__/tailwind-governance-contract.test.ts)
- Modify: [src/components/settings/__tests__/SettingsWindow.layout.test.ts](/home/work/projects/zapcmd/src/components/settings/__tests__/SettingsWindow.layout.test.ts)
- Modify: [src/styles/tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css)
- Modify: [src/components/settings/SettingsWindow.vue](/home/work/projects/zapcmd/src/components/settings/SettingsWindow.vue)

- [ ] **Step 1: 写失败测试，先锁 utility 契约**

在 [tailwind-governance-contract.test.ts](/home/work/projects/zapcmd/src/styles/__tests__/tailwind-governance-contract.test.ts) 新增一组断言，直接读取 [tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css)：

```ts
it("scrollbar-subtle utility 提供细滚动条契约，并清理旧的 scrollbar-none", () => {
  const tailwindSource = readProjectFile("src/styles/tailwind.css");

  expect(tailwindSource).toContain(".scrollbar-subtle");
  expect(tailwindSource).toMatch(/\.scrollbar-subtle\s*\{[\s\S]*scrollbar-width:\s*thin;/);
  expect(tailwindSource).toMatch(
    /\.scrollbar-subtle\s*\{[\s\S]*scrollbar-color:\s*rgba\(var\(--ui-text-rgb\),\s*0\.(16|18)\)\s+transparent;/
  );
  expect(tailwindSource).toMatch(/\.scrollbar-subtle::-webkit-scrollbar\s*\{[\s\S]*width:\s*4px;/);
  expect(tailwindSource).toMatch(
    /\.scrollbar-subtle::-webkit-scrollbar-thumb\s*\{[\s\S]*background:\s*rgba\(var\(--ui-text-rgb\),\s*0\.(16|18)\);/
  );
  expect(tailwindSource).toMatch(
    /\.scrollbar-subtle::-webkit-scrollbar-thumb:hover\s*\{[\s\S]*background:\s*rgba\(var\(--ui-text-rgb\),\s*0\.(26|28)\);/
  );
  expect(tailwindSource).not.toContain(".scrollbar-none");
});
```

- [ ] **Step 2: 写失败测试，锁定 Settings 主滚动容器 class contract**

在 [SettingsWindow.layout.test.ts](/home/work/projects/zapcmd/src/components/settings/__tests__/SettingsWindow.layout.test.ts) 新增测试：

```ts
it("uses subtle scrollbar on the single settings scroll host", () => {
  const wrapper = mountSettingsWindow(createSettingsWindowProps({ settingsRoute: "general" }));
  const content = wrapper.get(".settings-content");

  expect(content.classes()).toContain("scrollbar-subtle");
  expect(content.classes()).not.toContain("scrollbar-none");
});
```

- [ ] **Step 3: 跑 focused tests，确认它们先红**

Run:

```bash
npm run test:run -- src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected:

- FAIL，原因是 `.scrollbar-subtle` 尚不存在
- FAIL，原因是 `.settings-content` 仍在使用 `.scrollbar-none`

- [ ] **Step 4: 写最小实现，只满足 Chunk 1**

在 [tailwind.css](/home/work/projects/zapcmd/src/styles/tailwind.css) 的 `@layer utilities` 中新增 `.scrollbar-subtle`，并删除 `.scrollbar-none`：

```css
.scrollbar-subtle {
  scrollbar-width: thin;
  scrollbar-color: rgba(var(--ui-text-rgb), 0.16) transparent;
}

.scrollbar-subtle::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

.scrollbar-subtle::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-subtle::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background: rgba(var(--ui-text-rgb), 0.16);
}

.scrollbar-subtle::-webkit-scrollbar-thumb:hover {
  background: rgba(var(--ui-text-rgb), 0.28);
}
```

在 [SettingsWindow.vue](/home/work/projects/zapcmd/src/components/settings/SettingsWindow.vue) 中把：

```vue
class="settings-content ... scrollbar-none"
```

改为：

```vue
class="settings-content ... scrollbar-subtle"
```

- [ ] **Step 5: 重新跑 focused tests，确认转绿**

Run:

```bash
npm run test:run -- src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected:

- PASS

- [ ] **Step 6: 跑提交前门禁（Chunk 1 checkpoint）**

Run:

```bash
npm run lint
npm run typecheck
npm run test:related -- src/styles/tailwind.css src/components/settings/SettingsWindow.vue src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected:

- 全部 PASS

- [ ] **Step 7: Commit（checkpoint）**

```bash
git add src/styles/tailwind.css src/components/settings/SettingsWindow.vue src/styles/__tests__/tailwind-governance-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "feat(styles):为 Settings 主滚动容器启用细滚动条"
```

---

## Chunk 2：Launcher 主滚动容器统一

### Task 2：用失败测试锁定 Launcher 主滚动容器挂载与 Flow 空态策略

**Files:**
- Modify: [src/styles/__tests__/launcher-style-contract.test.ts](/home/work/projects/zapcmd/src/styles/__tests__/launcher-style-contract.test.ts)
- Modify: [src/components/launcher/parts/LauncherCommandPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherCommandPanel.vue)
- Modify: [src/components/launcher/parts/LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue)
- Modify: [src/components/launcher/parts/LauncherStagingPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherStagingPanel.vue)

- [ ] **Step 1: 写失败测试，锁定 Launcher 主滚动容器 class contract**

在 [launcher-style-contract.test.ts](/home/work/projects/zapcmd/src/styles/__tests__/launcher-style-contract.test.ts) 新增测试：

```ts
it("Launcher 主滚动容器挂载 subtle scrollbar utility", () => {
  expectClassContract(commandPanelSource, "command-panel__content", "scrollbar-subtle");
  expect(flowPanelSource).toMatch(/'scrollbar-subtle': props\.stagedCommands\.length === 0/);
  expectClassContract(flowPanelSource, "flow-panel__list", "scrollbar-subtle");
  expectClassContract(stagingPanelSource, "staging-list", "scrollbar-subtle");
});
```

- [ ] **Step 2: 跑 focused test，确认先红**

Run:

```bash
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected:

- FAIL，原因是目标容器尚未挂载 `.scrollbar-subtle`
- FAIL，原因是 `flow-panel__body` 尚未在空态条件挂载 `.scrollbar-subtle`

- [ ] **Step 3: 写最小实现，只改真实滚动宿主**

在 [LauncherCommandPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherCommandPanel.vue) 中把：

```vue
class="command-panel__content min-h-0 overflow-y-auto p-[16px] flex flex-col gap-[16px]"
```

改为：

```vue
class="command-panel__content min-h-0 overflow-y-auto scrollbar-subtle p-[16px] flex flex-col gap-[16px]"
```

在 [LauncherFlowPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherFlowPanel.vue) 中把 `reviewBodyRef` 的动态 class 改为：

```vue
:class="{
  'overflow-hidden': props.stagedCommands.length > 0,
  'overflow-y-auto': props.stagedCommands.length === 0,
  'scrollbar-subtle': props.stagedCommands.length === 0
}"
```

并把列表类：

```vue
class="staging-list flow-panel__list flex-1 min-h-0 overflow-y-auto pr-[2px]"
```

改为：

```vue
class="staging-list flow-panel__list flex-1 min-h-0 overflow-y-auto scrollbar-subtle pr-[2px]"
```

在 [LauncherStagingPanel.vue](/home/work/projects/zapcmd/src/components/launcher/parts/LauncherStagingPanel.vue) 中把：

```vue
class="staging-list m-0 p-0 pr-[2px] list-none flex flex-col gap-[8px] overflow-y-auto"
```

改为：

```vue
class="staging-list m-0 p-0 pr-[2px] list-none flex flex-col gap-[8px] overflow-y-auto scrollbar-subtle"
```

- [ ] **Step 4: 重新跑 focused style contract，确认转绿**

Run:

```bash
npm run test:run -- src/styles/__tests__/launcher-style-contract.test.ts
```

Expected:

- PASS

- [ ] **Step 5: 跑相关回归测试**

Run:

```bash
npm run test:contract:styles
npm run test:flow:settings
```

Expected:

- PASS

- [ ] **Step 6: 跑提交前门禁（Chunk 2 checkpoint）**

Run:

```bash
npm run lint
npm run typecheck
npm run test:related -- src/styles/tailwind.css src/components/settings/SettingsWindow.vue src/components/launcher/parts/LauncherCommandPanel.vue src/components/launcher/parts/LauncherFlowPanel.vue src/components/launcher/parts/LauncherStagingPanel.vue src/styles/__tests__/tailwind-governance-contract.test.ts src/styles/__tests__/launcher-style-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
```

Expected:

- 全部 PASS

- [ ] **Step 7: Commit（checkpoint）**

```bash
git add src/styles/tailwind.css src/components/settings/SettingsWindow.vue src/components/launcher/parts/LauncherCommandPanel.vue src/components/launcher/parts/LauncherFlowPanel.vue src/components/launcher/parts/LauncherStagingPanel.vue src/styles/__tests__/tailwind-governance-contract.test.ts src/styles/__tests__/launcher-style-contract.test.ts src/components/settings/__tests__/SettingsWindow.layout.test.ts
git commit -m "feat(styles):统一主滚动容器细滚动条"
```

---

## Chunk 3：完整验证与执行收尾

### Task 3：全量验证、Windows 手验与短期记忆更新

**Files:**
- Modify: [docs/active_context.md](/home/work/projects/zapcmd/docs/active_context.md)

- [ ] **Step 1: 跑完整工程门禁**

Run:

```bash
npm run check:all
```

Expected:

- PASS

- [ ] **Step 2: 在真实 Windows 运行时手验 scrollbars**

至少检查以下场景：

1. Settings 长内容页：
   - 打开 `General` / `Commands` 等能形成纵向滚动的页面
   - 确认滚动条默认弱可见，hover 略提亮
2. Launcher 命令详情页：
   - 让参数区或危险提示区形成滚动
   - 确认 `.command-panel__content` 使用细滚动条
3. Launcher 执行流：
   - 空态：确认 `flow-panel__body` 只有在空态滚动时才使用 `.scrollbar-subtle`
   - 列表态：确认 `.flow-panel__list` 是细滚动条
4. 暂存列表：
   - 确认 `.staging-list` 的 thumb 不会比卡片边框更抢眼

若发现默认态仍然太弱，只允许微调透明度，不要改宽度、不要引入轨道底色。

- [ ] **Step 3: 更新短期记忆**

在 [docs/active_context.md](/home/work/projects/zapcmd/docs/active_context.md) 追加一条不超过 200 字的记录，例如：

```md
## 补充（2026-03-27｜主滚动容器细滚动条 executing 完成）
- 已新增 `.scrollbar-subtle` 并覆盖 Settings 主内容区、Launcher Command/Flow/Staging 主滚动容器；`scrollbar-none` 已移除，`npm run check:all` 全绿。
```

- [ ] **Step 4: Commit（执行收尾）**

```bash
git add docs/active_context.md
git commit -m "docs(context):记录主滚动容器细滚动条完成状态"
```

---

## 执行顺序摘要

1. 先锁 utility 与 Settings 契约，确保 `.scrollbar-subtle` 的 CSS 形态和 Settings 主滚动容器都稳定。
2. 再把 Launcher 三个主滚动容器接入，并明确 `FlowPanel` 空态采用条件挂载。
3. 最后跑 `npm run check:all`，在真实 Windows 运行时手验视觉，再更新 `active_context` 收尾。

## 延后事项（本轮不做）

- dropdown / popover / input / textarea 的滚动条统一
- 新增 scrollbar 主题 token
- 更宽、更亮或带轨道底色的滚动条变体
- 任何 JS 自定义滚动行为
