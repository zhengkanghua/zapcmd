# 参数面板重构：导航栈 + CommandPanel 实现计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将参数填写/高危确认从左侧抽屉改为 Raycast 风格页面推入，引入导航栈架构和 24h 免提示机制。

**Architecture:** 新增 `useLauncherNavStack` composable 通过 provide/inject 注入组件树；新建 `LauncherCommandPanel.vue` 替代 `LauncherFlowDrawer.vue`；合并参数填写和高危确认为三场景合一面板；24h 免提示数据存 localStorage。

**Tech Stack:** Vue 3 Composition API, TypeScript, Vitest, CSS Transitions

**Spec:** `docs/superpowers/specs/2026-03-15-command-panel-nav-stack-design.md`

---

## 文件结构

### 新增文件

| 文件路径 | 职责 |
|---------|------|
| `src/composables/launcher/useLauncherNavStack.ts` | 导航栈 composable（push/pop/reset + provide/inject） |
| `src/composables/launcher/__tests__/useLauncherNavStack.test.ts` | 导航栈单元测试 |
| `src/features/security/dangerDismiss.ts` | 24h 免提示逻辑（localStorage 读写 + 过期清理） |
| `src/features/security/__tests__/dangerDismiss.test.ts` | 24h 免提示单元测试 |
| `src/components/launcher/parts/LauncherCommandPanel.vue` | 命令操作面板（三场景合一：参数+高危+两者） |
| `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts` | CommandPanel 组件测试 |

### 修改文件

| 文件路径 | 改动概述 |
|---------|---------|
| `src/components/launcher/LauncherWindow.vue` | provide navStack；条件渲染 SearchPanel/CommandPanel；移除 FlowDrawer slot |
| `src/components/launcher/parts/LauncherSearchPanel.vue` | 移除 content-overlays slot；inject navStack；调整 flowOpen 逻辑 |
| `src/components/launcher/parts/LauncherFlowPanel.vue` | flowOpen 来源从 props 改为 inject navStack |
| `src/composables/launcher/useMainWindowShell.ts` | Esc 层级增加 navStack.canGoBack 分支 |
| `src/composables/execution/useCommandExecution/actions.ts` | submitParamInput 跳过 safetyDialog；requestSingleExecution 增加 isDangerDismissed |
| `src/composables/app/useAppWindowKeydown.ts` | paramDialogOpen 从 pendingCommand 改为 navStack currentPage |
| `src/features/hotkeys/windowKeydownHandlers/types.ts` | MainHandlers 中 paramDialogOpen+safetyDialogOpen → commandPanelOpen |
| `src/features/hotkeys/windowKeydownHandlers/index.ts` | flowOpen 使用 commandPanelOpen |
| `src/features/hotkeys/windowKeydownHandlers/main.ts` | flowOpen 局部计算使用 commandPanelOpen |
| `src/components/launcher/types.ts` | 移除 ParamOverlayProps/SafetyOverlayProps；新增 CommandPanelProps |
| `src/i18n/messages.ts` | 新增 12 个 commandPanel.* i18n key |
| `src/styles/launcher.css` | 新增 .command-panel* + .nav-slide-* 样式 |

### 删除文件

| 文件路径 |
|---------|
| `src/components/launcher/parts/LauncherFlowDrawer.vue` |
| `src/components/launcher/parts/LauncherParamOverlay.vue` |
| `src/components/launcher/parts/LauncherSafetyOverlay.vue` |
| `src/components/launcher/parts/flowDrawerMotion.ts` |
| `src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts` |

---

## Chunk 1: 基础设施（导航栈 + 24h 免提示）

### Task 1: useLauncherNavStack — 编写失败测试

**Files:**
- Create: `src/composables/launcher/__tests__/useLauncherNavStack.test.ts`

- [ ] **Step 1: 编写导航栈核心行为的测试**

```typescript
// src/composables/launcher/__tests__/useLauncherNavStack.test.ts
import { describe, it, expect } from "vitest";
import { useLauncherNavStack } from "../useLauncherNavStack";

describe("useLauncherNavStack", () => {
  it("初始状态为 search 页面", () => {
    const { currentPage, canGoBack, stack } = useLauncherNavStack();
    expect(currentPage.value.type).toBe("search");
    expect(canGoBack.value).toBe(false);
    expect(stack.value).toHaveLength(1);
  });

  it("pushPage 推入新页面", () => {
    const { currentPage, canGoBack, pushPage } = useLauncherNavStack();
    pushPage({ type: "command-action", props: { mode: "execute" } });
    expect(currentPage.value.type).toBe("command-action");
    expect(currentPage.value.props?.mode).toBe("execute");
    expect(canGoBack.value).toBe(true);
  });

  it("popPage 弹出栈顶回到搜索", () => {
    const { currentPage, canGoBack, pushPage, popPage } = useLauncherNavStack();
    pushPage({ type: "command-action" });
    popPage();
    expect(currentPage.value.type).toBe("search");
    expect(canGoBack.value).toBe(false);
  });

  it("popPage 在栈底时为空操作", () => {
    const { currentPage, popPage } = useLauncherNavStack();
    popPage(); // 不应抛错
    expect(currentPage.value.type).toBe("search");
  });

  it("resetToSearch 清空栈回到搜索首页", () => {
    const { currentPage, stack, pushPage, resetToSearch } = useLauncherNavStack();
    pushPage({ type: "command-action" });
    pushPage({ type: "command-action" });
    resetToSearch();
    expect(currentPage.value.type).toBe("search");
    expect(stack.value).toHaveLength(1);
  });

  it("重复 pushPage 同类型页面不崩溃", () => {
    const { stack, pushPage } = useLauncherNavStack();
    pushPage({ type: "command-action" });
    pushPage({ type: "command-action" });
    expect(stack.value).toHaveLength(3);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

运行: `npx vitest run src/composables/launcher/__tests__/useLauncherNavStack.test.ts`
预期: FAIL — `Cannot find module '../useLauncherNavStack'`

- [ ] **Step 3: 提交测试文件**

```bash
git add src/composables/launcher/__tests__/useLauncherNavStack.test.ts
git commit -m "test(nav-stack): 导航栈核心行为失败测试"
```

---

### Task 2: useLauncherNavStack — 实现

**Files:**
- Create: `src/composables/launcher/useLauncherNavStack.ts`

- [ ] **Step 1: 编写最小实现**

```typescript
// src/composables/launcher/useLauncherNavStack.ts
import { ref, computed, type Ref, type ComputedRef, type InjectionKey } from "vue";
import type { CommandTemplate } from "@/features/commands/types";

export type NavPageType = "search" | "command-action";

export interface NavPage {
  type: NavPageType;
  props?: {
    command?: CommandTemplate;
    mode?: "execute" | "stage";
    isDangerous?: boolean;
  };
}

export interface LauncherNavStack {
  stack: Ref<NavPage[]>;
  currentPage: ComputedRef<NavPage>;
  canGoBack: ComputedRef<boolean>;
  pushPage: (page: NavPage) => void;
  popPage: () => void;
  resetToSearch: () => void;
}

export const LAUNCHER_NAV_STACK_KEY: InjectionKey<LauncherNavStack> =
  Symbol("launcherNavStack");

const SEARCH_PAGE: NavPage = { type: "search" };

export function useLauncherNavStack(): LauncherNavStack {
  const stack = ref<NavPage[]>([SEARCH_PAGE]);

  const currentPage = computed(() => stack.value[stack.value.length - 1]);
  const canGoBack = computed(() => stack.value.length > 1);

  function pushPage(page: NavPage): void {
    stack.value = [...stack.value, page];
  }

  function popPage(): void {
    if (stack.value.length <= 1) return;
    stack.value = stack.value.slice(0, -1);
  }

  function resetToSearch(): void {
    stack.value = [SEARCH_PAGE];
  }

  return { stack, currentPage, canGoBack, pushPage, popPage, resetToSearch };
}
```

- [ ] **Step 2: 运行测试确认通过**

运行: `npx vitest run src/composables/launcher/__tests__/useLauncherNavStack.test.ts`
预期: 6 tests PASS

- [ ] **Step 3: 提交**

```bash
git add src/composables/launcher/useLauncherNavStack.ts
git commit -m "feat(nav-stack): 实现导航栈 composable"
```

---

### Task 3: dangerDismiss — 编写失败测试

**Files:**
- Create: `src/features/security/__tests__/dangerDismiss.test.ts`

- [ ] **Step 1: 编写 24h 免提示核心行为的测试**

```typescript
// src/features/security/__tests__/dangerDismiss.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  isDangerDismissed,
  dismissDanger,
  cleanExpiredDismissals,
  DANGER_DISMISS_STORAGE_KEY,
} from "../dangerDismiss";

describe("dangerDismiss", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("未记录的命令返回 false", () => {
    expect(isDangerDismissed("cmd-1")).toBe(false);
  });

  it("记录后返回 true", () => {
    dismissDanger("cmd-1");
    expect(isDangerDismissed("cmd-1")).toBe(true);
  });

  it("不同命令独立记录", () => {
    dismissDanger("cmd-1");
    expect(isDangerDismissed("cmd-2")).toBe(false);
  });

  it("超过 24h 后返回 false", () => {
    dismissDanger("cmd-1");
    // 模拟 25 小时后
    const stored = JSON.parse(
      localStorage.getItem(DANGER_DISMISS_STORAGE_KEY)!
    );
    stored["cmd-1"] = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(stored));
    expect(isDangerDismissed("cmd-1")).toBe(false);
  });

  it("cleanExpiredDismissals 清理过期记录", () => {
    dismissDanger("cmd-1");
    dismissDanger("cmd-2");
    // cmd-1 过期，cmd-2 未过期
    const stored = JSON.parse(
      localStorage.getItem(DANGER_DISMISS_STORAGE_KEY)!
    );
    stored["cmd-1"] = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(stored));
    cleanExpiredDismissals();
    const result = JSON.parse(
      localStorage.getItem(DANGER_DISMISS_STORAGE_KEY)!
    );
    expect(result["cmd-1"]).toBeUndefined();
    expect(result["cmd-2"]).toBeDefined();
  });

  it("localStorage 格式异常时安全降级", () => {
    localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, "not-json");
    expect(isDangerDismissed("cmd-1")).toBe(false);
    // 写入后应恢复正常
    dismissDanger("cmd-1");
    expect(isDangerDismissed("cmd-1")).toBe(true);
  });

  it("localStorage 值为 null 时安全处理", () => {
    expect(isDangerDismissed("cmd-1")).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

运行: `npx vitest run src/features/security/__tests__/dangerDismiss.test.ts`
预期: FAIL — `Cannot find module '../dangerDismiss'`

- [ ] **Step 3: 提交测试文件**

```bash
git add src/features/security/__tests__/dangerDismiss.test.ts
git commit -m "test(danger-dismiss): 24h 免提示核心行为失败测试"
```

---

### Task 4: dangerDismiss — 实现

**Files:**
- Create: `src/features/security/dangerDismiss.ts`

- [ ] **Step 1: 编写最小实现**

```typescript
// src/features/security/dangerDismiss.ts

export const DANGER_DISMISS_STORAGE_KEY = "zapcmd:danger-dismiss";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type DangerDismissMap = Record<string, number>;

function readDismissals(): DangerDismissMap {
  try {
    const raw = localStorage.getItem(DANGER_DISMISS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as DangerDismissMap;
  } catch {
    return {};
  }
}

function writeDismissals(map: DangerDismissMap): void {
  localStorage.setItem(DANGER_DISMISS_STORAGE_KEY, JSON.stringify(map));
}

export function isDangerDismissed(commandId: string): boolean {
  const map = readDismissals();
  const timestamp = map[commandId];
  if (timestamp === undefined) return false;
  return Date.now() - timestamp < TWENTY_FOUR_HOURS_MS;
}

export function dismissDanger(commandId: string): void {
  const map = readDismissals();
  map[commandId] = Date.now();
  writeDismissals(map);
}

export function cleanExpiredDismissals(): void {
  const map = readDismissals();
  const now = Date.now();
  const cleaned: DangerDismissMap = {};
  for (const [id, timestamp] of Object.entries(map)) {
    if (now - timestamp < TWENTY_FOUR_HOURS_MS) {
      cleaned[id] = timestamp;
    }
  }
  writeDismissals(cleaned);
}
```

- [ ] **Step 2: 运行测试确认通过**

运行: `npx vitest run src/features/security/__tests__/dangerDismiss.test.ts`
预期: 7 tests PASS

- [ ] **Step 3: 提交**

```bash
git add src/features/security/dangerDismiss.ts
git commit -m "feat(danger-dismiss): 实现 24h 免提示逻辑"
```

---

### Task 5: i18n — 新增 CommandPanel 相关 key

**Files:**
- Modify: `src/i18n/messages.ts`

- [ ] **Step 1: 在 zh-CN 的 launcher 命名空间下添加 key（约第 37 行后）**

```typescript
// 在 launcher 命名空间尾部追加：
"commandPanel.badge.paramInput": "参数输入",
"commandPanel.badge.dangerConfirm": "高危操作确认",
"commandPanel.badge.dangerWithParam": "高危拦截与配置",
"commandPanel.danger.title": "危险操作提醒",
"commandPanel.danger.description": "此命令将直接操作敏感系统资源，请确保你知道该命令的作用范围后再继续执行。",
"commandPanel.danger.dismissToday": "今日不再针对此命令进行高危提示",
"commandPanel.btn.execute": "直接执行",
"commandPanel.btn.confirmExecute": "确定执行",
"commandPanel.btn.addToFlow": "+ 加入执行流",
"commandPanel.btn.cancel": "取消",
"commandPanel.hint.escCancel": "按 Esc 取消返回",
"commandPanel.preview.label": "实际执行",
```

- [ ] **Step 2: 在 en-US 的 launcher 命名空间下添加对应 key（约第 321 行后）**

```typescript
"commandPanel.badge.paramInput": "Parameter Input",
"commandPanel.badge.dangerConfirm": "Danger Confirmation",
"commandPanel.badge.dangerWithParam": "Danger Intercept",
"commandPanel.danger.title": "Danger Warning",
"commandPanel.danger.description": "This command directly operates on sensitive system resources. Make sure you understand its scope before proceeding.",
"commandPanel.danger.dismissToday": "Don't show danger warning for this command today",
"commandPanel.btn.execute": "Execute",
"commandPanel.btn.confirmExecute": "Confirm Execute",
"commandPanel.btn.addToFlow": "+ Add to Flow",
"commandPanel.btn.cancel": "Cancel",
"commandPanel.hint.escCancel": "Press Esc to cancel",
"commandPanel.preview.label": "Actual Command",
```

- [ ] **Step 3: 运行 lint 确认无错**

运行: `npx eslint src/i18n/messages.ts --no-error-on-unmatched-pattern`
预期: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/i18n/messages.ts
git commit -m "i18n: 新增 CommandPanel 相关 12 个中英文 key"
```

---

### Task 6: types.ts — 新增 CommandPanelProps 接口

**Files:**
- Modify: `src/components/launcher/types.ts`

- [ ] **Step 1: 在 types.ts 尾部追加 CommandPanelProps 接口**

参考现有 `LauncherParamOverlayProps`（第 78-85 行）和 `LauncherSafetyOverlayProps`（第 98-101 行），新增合并后的接口：

```typescript
// 在文件尾部追加（暂不删除旧接口，Chunk 4 统一清理）
export interface LauncherCommandPanelProps {
  command: CommandTemplate;
  mode: ParamSubmitMode;
  isDangerous: boolean;
}
```

- [ ] **Step 2: 运行 typecheck 确认无错**

运行: `npx vue-tsc --noEmit 2>&1 | head -20`
预期: 无新错误

- [ ] **Step 3: 提交**

```bash
git add src/components/launcher/types.ts
git commit -m "feat(types): 新增 LauncherCommandPanelProps 接口"
```

---

## Chunk 2: LauncherCommandPanel 组件

### Task 7: LauncherCommandPanel — 编写组件测试

**Files:**
- Create: `src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`

- [ ] **Step 1: 编写三场景渲染测试 + 按钮文案测试**

```typescript
// src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { ref, computed } from "vue";
import LauncherCommandPanel from "../LauncherCommandPanel.vue";
import { LAUNCHER_NAV_STACK_KEY } from "@/composables/launcher/useLauncherNavStack";
import type { CommandTemplate, CommandArg } from "@/features/commands/types";

// 创建测试用命令模板
function createCommand(overrides: Partial<CommandTemplate> = {}): CommandTemplate {
  return {
    id: "test-cmd",
    title: "测试命令",
    description: "描述",
    preview: "echo {{value}}",
    folder: "test",
    category: "system",
    needsArgs: true,
    args: [
      {
        key: "value",
        label: "VALUE",
        token: "{{value}}",
        placeholder: "输入值",
        required: true,
      },
    ],
    ...overrides,
  };
}

function createNavStackMock() {
  return {
    stack: ref([{ type: "search" as const }]),
    currentPage: computed(() => ({ type: "command-action" as const })),
    canGoBack: computed(() => true),
    pushPage: vi.fn(),
    popPage: vi.fn(),
    resetToSearch: vi.fn(),
  };
}

function mountPanel(props: Record<string, unknown>) {
  const navStack = createNavStackMock();
  return mount(LauncherCommandPanel, {
    props,
    global: {
      provide: { [LAUNCHER_NAV_STACK_KEY as symbol]: navStack },
      stubs: { LauncherIcon: true },
    },
  });
}

describe("LauncherCommandPanel", () => {
  describe("场景 1：有参数 + 非高危", () => {
    it("显示参数输入徽标", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "execute",
        isDangerous: false,
      });
      expect(wrapper.text()).toContain("参数输入");
    });

    it("execute 模式显示"直接执行"按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "execute",
        isDangerous: false,
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("直接执行");
    });

    it("stage 模式显示"加入执行流"按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "stage",
        isDangerous: false,
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("加入执行流");
    });

    it("不显示高危横幅", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: false }),
        mode: "execute",
        isDangerous: false,
      });
      expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(false);
    });
  });

  describe("场景 2：无参数 + 高危", () => {
    it("显示高危操作确认徽标", () => {
      const wrapper = mountPanel({
        command: createCommand({ needsArgs: false, args: [], dangerous: true }),
        mode: "execute",
        isDangerous: true,
      });
      expect(wrapper.text()).toContain("高危操作确认");
    });

    it("显示高危横幅和 24h 复选框", () => {
      const wrapper = mountPanel({
        command: createCommand({ needsArgs: false, args: [], dangerous: true }),
        mode: "execute",
        isDangerous: true,
      });
      expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(true);
      expect(wrapper.find("[data-testid='dismiss-checkbox']").exists()).toBe(true);
    });

    it("execute 模式显示红色"确定执行"按钮", () => {
      const wrapper = mountPanel({
        command: createCommand({ needsArgs: false, args: [], dangerous: true }),
        mode: "execute",
        isDangerous: true,
      });
      const btn = wrapper.find("[data-testid='confirm-btn']");
      expect(btn.text()).toContain("确定执行");
      expect(btn.classes()).toContain("command-panel__btn--danger");
    });
  });

  describe("场景 3：有参数 + 高危", () => {
    it("显示高危拦截与配置徽标", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        mode: "stage",
        isDangerous: true,
      });
      expect(wrapper.text()).toContain("高危拦截与配置");
    });

    it("同时显示高危横幅和参数表单", () => {
      const wrapper = mountPanel({
        command: createCommand({ dangerous: true }),
        mode: "stage",
        isDangerous: true,
      });
      expect(wrapper.find("[data-testid='danger-banner']").exists()).toBe(true);
      expect(wrapper.find("[data-testid='param-form']").exists()).toBe(true);
    });
  });

  describe("命令预览", () => {
    it("使用文本插值渲染命令预览", () => {
      const wrapper = mountPanel({
        command: createCommand(),
        mode: "execute",
        isDangerous: false,
      });
      expect(wrapper.find("[data-testid='command-preview']").exists()).toBe(true);
    });
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

运行: `npx vitest run src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
预期: FAIL — `Cannot find module '../LauncherCommandPanel.vue'`

- [ ] **Step 3: 提交**

```bash
git add src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts
git commit -m "test(command-panel): 三场景渲染 + 按钮文案失败测试"
```

---

### Task 8: LauncherCommandPanel — 实现组件

**Files:**
- Create: `src/components/launcher/parts/LauncherCommandPanel.vue`

- [ ] **Step 1: 编写完整组件**

参考现有 `LauncherFlowDrawer.vue`（第 304-430 行模板，第 1-302 行脚本）的结构，新建合并后的页面推入组件。

组件需要：
1. inject `LAUNCHER_NAV_STACK_KEY` 获取 `popPage`
2. 从 `useCommandExecution` 获取 `pendingArgValues`、`updatePendingArgValue` 等状态
3. 使用 `getCommandArgs` 和 `renderCommand` 做实时预览
4. 使用 `collectConfirmationReasons`（通过 `buildSafetyInputFromTemplate`）做动态 dangerReasons
5. 三种场景徽标判断
6. 按钮文案和颜色基于 `mode` + `isDangerous` 计算
7. 24h 免提示复选框绑定

关键代码结构：

```vue
<script setup lang="ts">
import { ref, computed, inject, onMounted, nextTick } from "vue";
import { useI18n } from "@/i18n";
import { LAUNCHER_NAV_STACK_KEY } from "@/composables/launcher/useLauncherNavStack";
import { getCommandArgs, renderCommand } from "@/features/launcher/commandRuntime";
import {
  checkSingleCommandSafety,
  buildSafetyInputFromTemplate,
} from "@/features/security/commandSafety";
import type { LauncherCommandPanelProps } from "@/components/launcher/types";
import type { CommandArg } from "@/features/commands/types";
import LauncherIcon from "./LauncherIcon.vue";

const props = defineProps<LauncherCommandPanelProps>();

const emit = defineEmits<{
  "submit": [args: Record<string, string>, dismissDanger: boolean];
  "cancel": [];
  "toggle-staging": [];
}>();

const { t } = useI18n();
const navStack = inject(LAUNCHER_NAV_STACK_KEY)!;

// 参数
const args = computed<CommandArg[]>(() => getCommandArgs(props.command));
const hasArgs = computed(() => args.value.length > 0);
const argValues = ref<Record<string, string>>({});

// 初始化参数值
onMounted(() => {
  const initial: Record<string, string> = {};
  for (const arg of args.value) {
    initial[arg.key] = arg.defaultValue ?? "";
  }
  argValues.value = initial;
  void nextTick(() => {
    firstInputRef.value?.focus();
  });
});

// 实时命令预览
const renderedCommand = computed(() =>
  renderCommand(props.command, argValues.value)
);

// 动态高危原因
const dangerReasons = computed(() => {
  const input = buildSafetyInputFromTemplate(
    props.command,
    renderedCommand.value,
    argValues.value,
    args.value
  );
  const result = checkSingleCommandSafety(input);
  return result.confirmationReasons;
});

// 场景徽标
const badge = computed(() => {
  if (props.isDangerous && hasArgs.value) return t("commandPanel.badge.dangerWithParam");
  if (props.isDangerous) return t("commandPanel.badge.dangerConfirm");
  return t("commandPanel.badge.paramInput");
});

// 按钮文案和样式
const confirmLabel = computed(() => {
  if (props.mode === "execute") {
    return props.isDangerous
      ? t("commandPanel.btn.confirmExecute")
      : t("commandPanel.btn.execute");
  }
  return t("commandPanel.btn.addToFlow");
});
const isDangerBtn = computed(() => props.isDangerous);

// 24h 免提示
const dismissChecked = ref(false);

// Refs
const firstInputRef = ref<HTMLInputElement | null>(null);

function onArgInput(key: string, value: string): void {
  argValues.value = { ...argValues.value, [key]: value };
}

function onCancel(): void {
  emit("cancel");
  navStack.popPage();
}

function onSubmit(): void {
  emit("submit", argValues.value, dismissChecked.value);
}

function onBack(): void {
  onCancel();
}
</script>

<template>
  <section class="command-panel">
    <!-- 标题栏 -->
    <header class="command-panel__header">
      <button
        type="button"
        class="command-panel__back"
        :aria-label="t('commandPanel.btn.cancel')"
        @click="onBack"
      >
        ←
      </button>
      <LauncherIcon
        :icon="props.command.category"
        class="command-panel__icon"
      />
      <h2 class="command-panel__title">{{ props.command.title }}</h2>
      <span
        class="command-panel__badge"
        :class="{ 'command-panel__badge--danger': props.isDangerous }"
      >
        {{ badge }}
      </span>
      <div class="command-panel__header-spacer" />
      <button
        type="button"
        class="command-panel__queue-btn"
        @click="emit('toggle-staging')"
      >
        📋
      </button>
    </header>

    <div class="command-panel__divider" />

    <!-- 内容区 -->
    <div class="command-panel__content">
      <!-- 高危横幅 -->
      <div
        v-if="props.isDangerous"
        class="command-panel__danger-banner"
        data-testid="danger-banner"
      >
        <div class="command-panel__danger-header">
          <span class="command-panel__danger-icon">⚠</span>
          <strong>{{ t("commandPanel.danger.title") }}</strong>
        </div>
        <p class="command-panel__danger-desc">
          {{ t("commandPanel.danger.description") }}
        </p>
        <label class="command-panel__danger-dismiss" data-testid="dismiss-checkbox">
          <input
            v-model="dismissChecked"
            type="checkbox"
          />
          {{ t("commandPanel.danger.dismissToday") }}
        </label>
      </div>

      <!-- 参数表单 -->
      <form
        v-if="hasArgs"
        class="command-panel__form"
        data-testid="param-form"
        @submit.prevent="onSubmit"
      >
        <div v-for="(arg, i) in args" :key="arg.key" class="command-panel__field">
          <label class="command-panel__label">
            {{ arg.label }}
            <span v-if="arg.required" class="command-panel__required">*</span>
          </label>
          <select
            v-if="arg.argType === 'select' && arg.options?.length"
            :value="argValues[arg.key] ?? ''"
            class="command-panel__select"
            @change="onArgInput(arg.key, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in arg.options" :key="opt" :value="opt">{{ opt }}</option>
          </select>
          <input
            v-else
            :ref="(el) => { if (i === 0) firstInputRef = el as HTMLInputElement | null; }"
            :value="argValues[arg.key] ?? ''"
            :type="arg.argType === 'number' ? 'number' : 'text'"
            :placeholder="arg.placeholder"
            class="command-panel__input"
            :class="{ 'command-panel__input--danger': props.isDangerous }"
            @input="onArgInput(arg.key, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </form>

      <!-- 命令预览 -->
      <div class="command-panel__preview" data-testid="command-preview">
        <span class="command-panel__preview-label">
          {{ t("commandPanel.preview.label") }}:
        </span>
        <code class="command-panel__preview-code">{{ renderedCommand }}</code>
      </div>
    </div>

    <div class="command-panel__divider" />

    <!-- 底部操作栏 -->
    <footer class="command-panel__footer">
      <span class="command-panel__hint">
        {{ t("commandPanel.hint.escCancel") }}
      </span>
      <button
        type="button"
        class="command-panel__btn command-panel__btn--cancel"
        @click="onCancel"
      >
        {{ t("commandPanel.btn.cancel") }}
      </button>
      <button
        type="button"
        class="command-panel__btn command-panel__btn--confirm"
        :class="{ 'command-panel__btn--danger': isDangerBtn }"
        data-testid="confirm-btn"
        @click="onSubmit"
      >
        {{ confirmLabel }}
      </button>
    </footer>
  </section>
</template>
```

- [ ] **Step 2: 运行测试确认通过**

运行: `npx vitest run src/components/launcher/parts/__tests__/LauncherCommandPanel.test.ts`
预期: 所有测试 PASS

- [ ] **Step 3: 提交**

```bash
git add src/components/launcher/parts/LauncherCommandPanel.vue
git commit -m "feat(command-panel): 实现三场景合一命令操作面板"
```

---

### Task 9: 样式 — 新增 CommandPanel + 导航滑动动效

**Files:**
- Modify: `src/styles/launcher.css`

- [ ] **Step 1: 在 launcher.css 尾部追加 CommandPanel 样式和导航动效**

参考现有 `.flow-overlay`（第 397-597 行）和 `.flow-panel`（第 424-478 行）的深色/间距风格。

```css
/* === CommandPanel 页面推入面板 === */
.command-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ui-bg);
  overflow: hidden;
}

.command-panel__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  flex-shrink: 0;
}

.command-panel__back {
  background: none;
  border: none;
  color: var(--ui-text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 150ms;
}
.command-panel__back:hover { color: var(--ui-text); }

.command-panel__icon { width: 20px; height: 20px; flex-shrink: 0; }

.command-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ui-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.command-panel__badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(var(--theme-text-rgb), 0.1);
  color: var(--ui-text-secondary);
  white-space: nowrap;
}
.command-panel__badge--danger {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.command-panel__header-spacer { flex: 1; }

.command-panel__queue-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 150ms;
}
.command-panel__queue-btn:hover { opacity: 1; }

.command-panel__divider {
  height: 1px;
  background: rgba(var(--theme-text-rgb), 0.08);
  margin: 0 16px;
}

.command-panel__content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 高危横幅 */
.command-panel__danger-banner {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.command-panel__danger-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #ef4444;
  font-size: 14px;
  font-weight: 600;
}

.command-panel__danger-icon { font-size: 16px; }

.command-panel__danger-desc {
  font-size: 13px;
  color: var(--ui-text-secondary);
  margin: 0;
  line-height: 1.5;
}

.command-panel__danger-dismiss {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ui-text-secondary);
  cursor: pointer;
  opacity: 0.7;
}
.command-panel__danger-dismiss:hover { opacity: 1; }

/* 参数表单 */
.command-panel__form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.command-panel__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.command-panel__label {
  font-size: 12px;
  font-weight: 500;
  color: var(--ui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.command-panel__required { color: #ef4444; }

.command-panel__input,
.command-panel__select {
  background: rgba(var(--theme-text-rgb), 0.05);
  border: 1px solid rgba(var(--theme-text-rgb), 0.15);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--ui-font-mono);
  color: var(--ui-text);
  outline: none;
  transition: border-color 150ms;
}
.command-panel__input:focus,
.command-panel__select:focus {
  border-color: var(--ui-brand);
}
.command-panel__input--danger:focus { border-color: #ef4444; }

/* 命令预览 */
.command-panel__preview {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(var(--theme-text-rgb), 0.03);
  border-radius: 6px;
  border: 1px solid rgba(var(--theme-text-rgb), 0.08);
}

.command-panel__preview-label {
  font-size: 12px;
  color: var(--ui-text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}
.command-panel__preview-label::before { content: ">_ "; }

.command-panel__preview-code {
  font-family: var(--ui-font-mono);
  font-size: 13px;
  color: var(--ui-brand);
  word-break: break-all;
}

/* 底部操作栏 */
.command-panel__footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  flex-shrink: 0;
}

.command-panel__hint {
  font-size: 12px;
  color: var(--ui-text-secondary);
  flex: 1;
}

.command-panel__btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background 150ms, color 150ms;
}

.command-panel__btn--cancel {
  background: rgba(var(--theme-text-rgb), 0.08);
  color: var(--ui-text-secondary);
}
.command-panel__btn--cancel:hover {
  background: rgba(var(--theme-text-rgb), 0.15);
}

.command-panel__btn--confirm {
  background: var(--ui-brand);
  color: #000;
}
.command-panel__btn--confirm:hover { opacity: 0.9; }

.command-panel__btn--danger {
  background: #ef4444;
  color: #fff;
}
.command-panel__btn--danger:hover { opacity: 0.9; }

/* === 导航滑动动效 === */
.nav-slide-enter-active {
  transition: transform 250ms cubic-bezier(0.175, 0.885, 0.32, 1.15);
}
.nav-slide-enter-from {
  transform: translateX(100%);
}
.nav-slide-leave-active {
  transition: transform 200ms ease-in;
}
.nav-slide-leave-to {
  transform: translateX(100%);
}
```

- [ ] **Step 2: 运行 lint 确认无错**

运行: `npx eslint src/styles/launcher.css --no-error-on-unmatched-pattern`
预期: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/styles/launcher.css
git commit -m "style: 新增 CommandPanel 样式 + 导航滑动动效"
```

---

## Chunk 3: 集成（LauncherWindow + SearchPanel + Esc + 快捷键）

### Task 10: LauncherWindow — 集成导航栈 + 条件渲染

**Files:**
- Modify: `src/components/launcher/LauncherWindow.vue`

- [ ] **Step 1: 添加 import 和 provide**

在 `<script setup>` 顶部添加导航栈导入；在组件 setup 中 provide：

```typescript
import { provide } from "vue";
import LauncherCommandPanel from "./parts/LauncherCommandPanel.vue";
import {
  useLauncherNavStack,
  LAUNCHER_NAV_STACK_KEY,
} from "@/composables/launcher/useLauncherNavStack";
import { dismissDanger } from "@/features/security/dangerDismiss";

const navStack = useLauncherNavStack();
provide(LAUNCHER_NAV_STACK_KEY, navStack);
```

- [ ] **Step 2: 在 template 中添加导航栈条件渲染**

将 `<LauncherSearchPanel ... />` 包裹在 `<Transition name="nav-slide">` 和 `v-if` 中；新增 `<LauncherCommandPanel>` 分支。

将第 115-176 行的 `<LauncherSearchPanel>` 改为：

```html
<div class="launcher-nav-container" style="overflow: hidden; flex: 1; position: relative;">
  <Transition name="nav-slide" mode="out-in">
    <LauncherSearchPanel
      v-if="navStack.currentPage.value.type === 'search'"
      key="search"
      ... (现有所有 props 和 events，去掉 flow-open 相关)
    />
    <LauncherCommandPanel
      v-else-if="navStack.currentPage.value.type === 'command-action'"
      key="command-action"
      :command="navStack.currentPage.value.props?.command!"
      :mode="navStack.currentPage.value.props?.mode ?? 'execute'"
      :is-dangerous="navStack.currentPage.value.props?.isDangerous ?? false"
      @submit="onCommandPanelSubmit"
      @cancel="onCommandPanelCancel"
      @toggle-staging="$emit('toggle-staging')"
    />
  </Transition>
</div>
```

- [ ] **Step 3: 添加 CommandPanel 的事件处理函数**

```typescript
function onCommandPanelSubmit(argValues: Record<string, string>, shouldDismiss: boolean): void {
  if (shouldDismiss && navStack.currentPage.value.props?.command) {
    dismissDanger(navStack.currentPage.value.props.command.id);
  }
  // 通过现有 emit 链传递给 useCommandExecution
  emit("submit-param-input");
}

function onCommandPanelCancel(): void {
  emit("cancel-param-input");
}
```

- [ ] **Step 4: 移除 FlowDrawer 的 slot 注入**

删除第 158-175 行的 `<template #content-overlays>` 和 `<LauncherFlowDrawer>` 部分。移除 `LauncherFlowDrawer` 的 import。

- [ ] **Step 5: 更新 `onSearchCapsuleBack` 函数**

将第 84-96 行替换为使用导航栈：

```typescript
function onSearchCapsuleBack(): void {
  if (navStack.canGoBack.value) {
    navStack.popPage();
    return;
  }
  if (props.stagingExpanded) {
    emit("toggle-staging");
  }
}
```

- [ ] **Step 6: 运行 typecheck**

运行: `npx vue-tsc --noEmit 2>&1 | head -30`
预期: 无新类型错误

- [ ] **Step 7: 提交**

```bash
git add src/components/launcher/LauncherWindow.vue
git commit -m "feat(launcher-window): 集成导航栈 + CommandPanel 条件渲染"
```

---

### Task 11: SearchPanel — 移除 FlowDrawer 插槽 + 调整 flowOpen

**Files:**
- Modify: `src/components/launcher/parts/LauncherSearchPanel.vue`
- Modify: `src/components/launcher/types.ts` — `LauncherSearchPanelProps` 中 `flowOpen` 语义可能需要调整

- [ ] **Step 1: 调整 flowOpen 逻辑**

`flowOpen` 现在应该基于导航栈状态（是否在 command-action 页面），而非基于 `pendingCommand`/`safetyDialog`。

在 `LauncherSearchPanelProps`（`types.ts` 第 16-44 行）中，`flowOpen` prop 保留但语义改为"导航栈是否在非搜索页面"。

调用方 `LauncherWindow.vue` 传递：
```html
:flow-open="navStack.currentPage.value.type !== 'search'"
```

- [ ] **Step 2: 移除 content-overlays slot**

删除 SearchPanel 模板中第 175 行的 `<slot name="content-overlays" />`。

- [ ] **Step 3: 运行相关测试**

运行: `npx vitest run src/components/launcher/parts/__tests__/ --reporter verbose`
预期: 通过（可能有部分 FlowDrawer 相关测试失败，暂时可接受）

- [ ] **Step 4: 提交**

```bash
git add src/components/launcher/parts/LauncherSearchPanel.vue src/components/launcher/types.ts
git commit -m "feat(search-panel): 移除 FlowDrawer 插槽，flowOpen 改为导航栈驱动"
```

---

### Task 12: useMainWindowShell — Esc 层级更新

**Files:**
- Modify: `src/composables/launcher/useMainWindowShell.ts`

- [ ] **Step 1: 更新 UseMainWindowShellOptions 接口**

替换第 14-17 行的 `pendingCommand`/`cancelParamInput`/`safetyDialog`/`cancelSafetyExecution` 为导航栈相关选项：

```typescript
interface UseMainWindowShellOptions {
  // ... 保留第 9-13 行不变
  navStackCanGoBack: Ref<boolean>;      // 替代 pendingCommand + safetyDialog
  navStackPopPage: () => void;          // 替代 cancelParamInput + cancelSafetyExecution
  query: Ref<string>;
  stagingExpanded: Ref<boolean>;
  closeStagingDrawer: () => void;
}
```

- [ ] **Step 2: 更新 handleMainEscape 函数**

将第 64-82 行替换为新的 LIFO 层级：

```typescript
function handleMainEscape(): void {
  // 1. 执行流面板打开 → 关闭面板
  if (options.stagingExpanded.value) {
    options.closeStagingDrawer();
    return;
  }
  // 2. 导航栈深度 > 1（在 command-action 页面）→ 回到搜索
  if (options.navStackCanGoBack.value) {
    options.navStackPopPage();
    return;
  }
  // 3. 搜索首页 + 有搜索词 → 清空
  if (options.query.value.trim().length > 0) {
    options.query.value = "";
    return;
  }
  // 4. 隐藏窗口
  void hideMainWindow();
}
```

注意：根据设计文档 §3.5 的 Esc 层级，FlowPanel（stagingExpanded）优先于导航栈。

- [ ] **Step 3: 更新调用方传入的 options**

在 `useMainWindowShell` 的调用方（`useAppCompositionRoot` 或类似文件）中，更新传入的选项。

- [ ] **Step 4: 运行相关测试**

运行: `npx vitest run src/composables/launcher/__tests__/ --reporter verbose`
预期: PASS

- [ ] **Step 5: 提交**

```bash
git add src/composables/launcher/useMainWindowShell.ts
git commit -m "feat(esc): Esc 层级改为 FlowPanel → 导航栈 → 清空搜索 → 隐藏窗口"
```

---

### Task 13: actions.ts — 安全检查路径迁移

**Files:**
- Modify: `src/composables/execution/useCommandExecution/actions.ts`

- [ ] **Step 1: 修改 submitParamInput — 跳过 safetyDialog**

修改第 204-270 行的 `submitParamInput` 函数。当命令通过 CommandPanel 确认时（`pendingCommand` 不为 null），跳过 `requestSafetyConfirmation` 分支。

在 `submitMode === "execute"` 分支（第 223-261 行）中，将原来的：
```typescript
if (confirmationReasons.length > 0) {
  state.requestSafetyConfirmation(dialog, onConfirm);
  return;
}
```

改为直接执行（因为 CommandPanel 已经展示了高危警告，用户已确认）：
```typescript
// CommandPanel 已展示高危横幅，用户已确认，跳过独立 safetyDialog
```

- [ ] **Step 2: 修改 requestSingleExecution — 增加 isDangerDismissed**

修改第 120-164 行的 `requestSingleExecution`，在 `confirmationReasons.length > 0` 分支（第 142-161 行）内增加 `isDangerDismissed` 判断：

```typescript
import { isDangerDismissed } from "@/features/security/dangerDismiss";

// 在 confirmationReasons.length > 0 分支内
if (confirmationReasons.length > 0 && !isDangerDismissed(command.id)) {
  state.requestSafetyConfirmation(dialog, onConfirm);
  return;
}
```

- [ ] **Step 3: 导航栈联动 — executeResult / stageResult 推面板**

修改 `executeResult`（第 196-202 行）和 `stageResult`（第 188-194 行），增加判断是否需要推入面板：

```typescript
import { isDangerDismissed } from "@/features/security/dangerDismiss";

function needsPanel(command: CommandTemplate): boolean {
  const hasArgs = getCommandArgs(command).length > 0;
  const isDangerous = command.dangerous === true;
  const dismissed = isDangerDismissed(command.id);
  return hasArgs || (isDangerous && !dismissed);
}
```

在 `executeResult` 和 `stageResult` 中，当 `needsPanel(command)` 为 true 时，除了调用 `openParamInput` 外，还需要触发导航栈 push。此联动通过在 `createCommandExecutionActions` 的 options 中新增回调实现：

```typescript
// 在 UseCommandExecutionOptions 中新增：
onNeedPanel?: (command: CommandTemplate, mode: ParamSubmitMode) => void;
```

- [ ] **Step 4: 运行相关测试**

运行: `npx vitest run src/composables/execution/__tests__/ --reporter verbose`
预期: PASS

- [ ] **Step 5: 提交**

```bash
git add src/composables/execution/useCommandExecution/actions.ts src/composables/execution/useCommandExecution/model.ts
git commit -m "feat(actions): submitParamInput 跳过 safetyDialog + requestSingleExecution 增加 isDangerDismissed"
```

---

### Task 14: windowKeydownHandlers — 适配导航栈

**Files:**
- Modify: `src/features/hotkeys/windowKeydownHandlers/types.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/index.ts`
- Modify: `src/features/hotkeys/windowKeydownHandlers/main.ts`
- Modify: `src/composables/app/useAppWindowKeydown.ts`

- [ ] **Step 1: types.ts — 合并 paramDialogOpen + safetyDialogOpen → commandPanelOpen**

修改 `MainHandlers` 接口（第 25 行和第 44 行）：
- 删除 `paramDialogOpen: RefLike<boolean>` 和 `safetyDialogOpen: RefLike<boolean>`
- 新增 `commandPanelOpen: RefLike<boolean>`

- [ ] **Step 2: index.ts — flowOpen 使用 commandPanelOpen**

修改第 20-21 行：
```typescript
const flowOpen = options.main.commandPanelOpen.value;
```

- [ ] **Step 3: main.ts — 局部 flowOpen 同步更新**

修改第 49 行：
```typescript
const flowOpen = main.commandPanelOpen.value;
```

- [ ] **Step 4: useAppWindowKeydown.ts — 传递 commandPanelOpen**

修改第 75-76 行：
```typescript
const commandPanelOpen = computed(
  () => options.commandExecution.pendingCommand.value !== null
);
```

替换 `safetyDialogOpen` 和 `paramDialogOpen` 的传递（第 115-116 行）为：
```typescript
commandPanelOpen,
```

- [ ] **Step 5: 运行 typecheck + 测试**

运行: `npx vue-tsc --noEmit 2>&1 | head -30 && npx vitest run src/features/hotkeys/ --reporter verbose`
预期: 无类型错误，测试通过

- [ ] **Step 6: 提交**

```bash
git add src/features/hotkeys/windowKeydownHandlers/types.ts src/features/hotkeys/windowKeydownHandlers/index.ts src/features/hotkeys/windowKeydownHandlers/main.ts src/composables/app/useAppWindowKeydown.ts
git commit -m "feat(hotkeys): paramDialogOpen+safetyDialogOpen 合并为 commandPanelOpen"
```

---

## Chunk 4: 清理 + 回归验证

### Task 15: 删除旧文件

**Files:**
- Delete: `src/components/launcher/parts/LauncherFlowDrawer.vue`
- Delete: `src/components/launcher/parts/LauncherParamOverlay.vue`
- Delete: `src/components/launcher/parts/LauncherSafetyOverlay.vue`
- Delete: `src/components/launcher/parts/flowDrawerMotion.ts`
- Delete: `src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts`

- [ ] **Step 1: 删除文件**

```bash
git rm src/components/launcher/parts/LauncherFlowDrawer.vue
git rm src/components/launcher/parts/LauncherParamOverlay.vue
git rm src/components/launcher/parts/LauncherSafetyOverlay.vue
git rm src/components/launcher/parts/flowDrawerMotion.ts
git rm src/components/launcher/parts/__tests__/LauncherFlowDrawer.test.ts
```

- [ ] **Step 2: 清理 import 引用**

搜索所有引用被删文件的代码，逐一修复：
```bash
grep -r "LauncherFlowDrawer\|LauncherParamOverlay\|LauncherSafetyOverlay\|flowDrawerMotion" src/ --include="*.ts" --include="*.vue" -l
```

- [ ] **Step 3: 提交**

```bash
git commit -m "chore: 删除旧 FlowDrawer/ParamOverlay/SafetyOverlay 组件"
```

---

### Task 16: types.ts — 清理旧接口

**Files:**
- Modify: `src/components/launcher/types.ts`

- [ ] **Step 1: 移除旧接口**

删除 `LauncherParamOverlayProps`（第 78-85 行）和 `LauncherSafetyOverlayProps`（第 98-101 行）。

- [ ] **Step 2: 确认无编译错误**

运行: `npx vue-tsc --noEmit 2>&1 | head -20`
预期: 无新错误

- [ ] **Step 3: 提交**

```bash
git add src/components/launcher/types.ts
git commit -m "chore(types): 移除旧 ParamOverlayProps / SafetyOverlayProps"
```

---

### Task 17: 旧测试迁移 — LauncherWindow.flow.test.ts

**Files:**
- Modify: `src/components/launcher/__tests__/LauncherWindow.flow.test.ts`

- [ ] **Step 1: 重写测试**

更新测试中对 `LauncherFlowDrawer`、`LauncherParamOverlay`、`LauncherSafetyOverlay` 的 stub 引用。

用新的 `LauncherCommandPanel` stub 替换：
```typescript
stubs: {
  LauncherSearchPanel: true,
  LauncherFlowPanel: true,
  LauncherCommandPanel: true,  // 替代旧的三个 stub
},
```

- [ ] **Step 2: 运行测试**

运行: `npx vitest run src/components/launcher/__tests__/ --reporter verbose`
预期: PASS

- [ ] **Step 3: 提交**

```bash
git add src/components/launcher/__tests__/LauncherWindow.flow.test.ts
git commit -m "test: 迁移 LauncherWindow 测试至新 CommandPanel"
```

---

### Task 18: 全量门禁验证

- [ ] **Step 1: 运行完整门禁**

运行: `npm run check:all`
预期: lint → typecheck → test:coverage → build → check:rust 全部通过

- [ ] **Step 2: 如有失败，逐一修复**

按错误类型分类修复：类型错误 > 测试失败 > lint 警告

- [ ] **Step 3: 最终提交（如有修复）**

```bash
git add -A
git commit -m "fix: 全量门禁修复 — CommandPanel 重构回归"
```

---

## 执行顺序总结

| Chunk | Tasks | 依赖 |
|-------|-------|------|
| 1. 基础设施 | Task 1-6 | 无 |
| 2. CommandPanel 组件 | Task 7-9 | Chunk 1 |
| 3. 集成 | Task 10-14 | Chunk 1 + 2 |
| 4. 清理 + 验证 | Task 15-18 | Chunk 1-3 |
