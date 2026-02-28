# 用户自定义组合命令功能（Custom Combo）

> **创建日期**：2026-02-28
> **状态**：待审批
> **优先级**：P1（v1.1.0 首个功能迭代）
> **前置**：v1.0.0 发版完成

---

## 一、需求设计

### 1.1 功能定义

用户可以将暂存区中的多条命令保存为一个「组合（Combo）」，赋予自定义名称。保存后，该组合作为一个可搜索的"虚拟命令"出现在搜索结果中，用户输入组合名即可一键加载整个组合到暂存队列执行。

### 1.2 用户故事

```
作为一个经常执行固定流程的开发者，
我希望能把"前端部署"的 3 条命令（npm build → scp 上传 → ssh 重启服务）保存为一个组合，
以后输入"部署"就能找到并一键执行整套流程，
这样我就不用每次手动逐条搜索添加了。
```

### 1.3 核心流程

```
暂存区有命令 → 点击"保存组合" → 输入名称 → 保存到 ~/.zapcmd/combos.json
                                                  ↓
搜索框输入名称 → 看到组合结果（#custom 标签）→ 选中加载 → 暂存区填充所有子命令 → 批量执行
```

### 1.4 功能边界

| 维度 | 决策 |
|------|------|
| 创建入口 | 暂存区 footer 新增「保存组合」按钮 |
| 名称规则 | 1-50 字符，允许中英文、数字、空格、连字符 |
| 子命令数量 | 上限 20 条（防止误操作） |
| 参数值 | 保存时记录当前参数值作为默认值，加载后可修改 |
| 删除/编辑 | Settings → 命令管理 中管理组合（查看、删除、重命名） |
| 搜索标签 | 默认标签 `#custom`，搜索时可通过名字 + 标签命中 |
| 数据格式 | JSON，存储到 `~/.zapcmd/combos.json` |
| 导入/导出 | v1.1.0 不做，预留字段即可 |

### 1.5 子命令参与搜索的方案分析

**问题**：组合名叫"部署前端"，包含 `npm run build` 和 `scp` 命令，搜索 `npm` 时是否也能命中？

**我的建议：子命令参与搜索，但权重较低。理由如下：**

| 维度 | 仅名称搜索 | 子命令也搜索（推荐） |
|------|-----------|-------------------|
| 实现难度 | 简单，无改动 | 低，只需扩展 searchText 拼接 |
| 用户体验 | 必须记住组合名才能找到 | 记住任何子命令关键词都能找到 |
| 搜索噪音 | 零噪音 | 低噪音，因为组合数量有限 |
| 实现方式 | — | 将子命令的 title + template 拼入 searchText |

**实现细节**：

在 `useLauncherSearch.ts` 的 `getSearchText()` 函数中，对 Combo 类型的结果，额外拼接子命令摘要：

```typescript
function getSearchText(command: CommandTemplate): string {
  let text = `${command.title} ${command.description} ${command.preview} ${command.folder} ${command.category}`;
  // 如果是 combo 类型，追加子命令信息
  if (command.comboChildrenSummary) {
    text += ` ${command.comboChildrenSummary}`;
  }
  return text.toLowerCase();
}
```

其中 `comboChildrenSummary` 是在加载 combo 时预计算的子命令摘要（title + template 拼接），不会影响现有搜索逻辑的性能。

**搜索结果排序**：子命令匹配的权重比组合名直接匹配低，在 `scoreCommand` 中不需要特殊处理——因为匹配发生在 `preview` 或 `description` 级别的 searchText 中，自然就是低权重。

---

## 二、UI 设计

### 2.1 保存组合入口

**位置**：暂存区 footer 栏，在"清空"和"全部执行"按钮之间新增"保存组合"按钮

```
┌──────────────────────────────────────────────────┐
│  暂存队列 (3)                        拖拽排序提示  │
│ ┌──────────────────────────────────────────────┐  │
│ │ 1. npm run build              [×]             │  │
│ │ 2. scp dist/ user@host:/www   [×]             │  │
│ │ 3. ssh user@host "pm2 restart" [×]            │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│  [清空]   [💾 保存组合]   [▶ 全部执行]              │
└──────────────────────────────────────────────────┘
```

**按钮样式**：`btn-secondary`（次级按钮），与清空（`btn-muted`）和执行（`btn-primary`）形成三级层次

**按钮状态**：
- 暂存区为空时禁用
- 暂存区有命令时可点击

### 2.2 保存组合弹层

点击"保存组合"后，弹出一个轻量对话框（复用 ParamOverlay 的交互模式）：

```
┌───────────────────────────────────────┐
│  保存为组合                            │
│                                       │
│  组合名称                              │
│  ┌─────────────────────────────────┐  │
│  │ 部署前端                        │  │
│  └─────────────────────────────────┘  │
│                                       │
│  包含 3 条命令：                       │
│  · npm run build                      │
│  · scp dist/ user@host:/www           │
│  · ssh user@host "pm2 restart"        │
│                                       │
│  [取消]              [保存]            │
└───────────────────────────────────────┘
```

**交互规则**：
- 输入框自动 focus
- 名称为空时"保存"按钮禁用
- Enter 键触发保存
- Esc 键关闭弹层
- 保存成功后关闭弹层，显示短暂 toast 提示「组合已保存」
- 如果名称与已有组合重复，提示「该名称已存在，是否覆盖？」

### 2.3 搜索结果中的 Combo 展示

Combo 在搜索结果中的显示样式与普通命令略有区别：

```
┌──────────────────────────────────────────────────┐
│  🔗 部署前端                          #custom     │
│  3 条命令组合                                     │
│  npm run build → scp dist/... → ssh user@...     │
└──────────────────────────────────────────────────┘
```

**区别**：
- 标题前有组合图标（🔗 或类似图标，用 CSS 实现，不用 emoji）
- description 显示「N 条命令组合」
- preview 显示子命令摘要（用 ` → ` 连接，截断过长部分）
- 标签固定为 `#custom`

### 2.4 加载 Combo 的行为

用户在搜索结果中选中 Combo，按 Enter 或右箭头：
- **Enter**：将 Combo 中的所有命令加载到暂存区，并自动展开暂存区
- **Right Arrow**：同 Enter 行为（因为 combo 本身就是进暂存区的）

加载后：
- 暂存区显示所有子命令，保留保存时的参数默认值
- 用户可以在暂存区修改参数、调整顺序、删除某条
- 搜索框自动清空

### 2.5 Settings 中的 Combo 管理

在 Settings → Commands 页面，新增"组合"分组/筛选：

```
筛选: [全部 ▾]  [来源: 全部 ▾]  [搜索...          ]
       ↑ 新增 "组合" 筛选选项

┌──────────────────────────────────────────────────┐
│  📦 组合 (2)                                      │
│ ┌──────────────────────────────────────────────┐  │
│ │  🔗 部署前端           3 条命令    [重命名] [删除] │
│ │  🔗 日常清理           2 条命令    [重命名] [删除] │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│  📦 内置命令 (209)                                 │
│  ...                                               │
└──────────────────────────────────────────────────┘
```

---

## 三、开发设计

### 3.1 数据模型

#### Combo 存储格式 (`~/.zapcmd/combos.json`)

```typescript
interface ComboCommand {
  commandId: string;        // 引用的命令 ID
  argValues?: Record<string, string>;  // 保存时的参数值（作为默认值）
}

interface Combo {
  id: string;               // UUID，唯一标识
  name: string;             // 用户自定义名称
  commands: ComboCommand[]; // 子命令列表（有序）
  createdAt: string;        // ISO 8601 创建时间
  updatedAt: string;        // ISO 8601 更新时间
}

interface CombosFile {
  version: 1;               // schema 版本号，预留未来迁移
  combos: Combo[];
}
```

#### Combo 转 CommandTemplate（搜索用）

```typescript
// Combo 加载后会被映射为 CommandTemplate 参与搜索
// 映射规则：
{
  id: `combo:${combo.id}`,              // 前缀区分
  title: combo.name,
  description: `${combo.commands.length} 条命令组合`,
  preview: childCommands.map(c => c.title).join(' → '),
  folder: 'combo',
  category: 'custom',
  needsArgs: false,                      // combo 不需要额外参数
  comboChildrenSummary: childTitlesAndTemplates, // 搜索扩展文本
  isCombo: true,                         // 标记为 combo 类型
  comboId: combo.id,                     // 关联原始 combo ID
}
```

### 3.2 架构分层

```
┌─────────────────────────────────────────────────────┐
│  UI Layer                                            │
│  LauncherStagingPanel.vue  (保存按钮)                 │
│  ComboSaveOverlay.vue      (保存弹层, 新增)           │
│  LauncherSearchPanel.vue   (搜索结果展示 combo)       │
│  SettingsCommandsSection.vue (combo 管理)            │
├─────────────────────────────────────────────────────┤
│  Composable Layer                                    │
│  useComboManager.ts         (核心：CRUD + 加载逻辑)   │
│  useLauncherSearch.ts       (扩展：combo 参与搜索)    │
│  useCommandCatalog.ts       (扩展：合并 combo 结果)   │
│  useStagingQueue/           (扩展：combo 加载到暂存)   │
├─────────────────────────────────────────────────────┤
│  Service Layer                                       │
│  tauriBridge.ts             (扩展：combo 文件读写)    │
├─────────────────────────────────────────────────────┤
│  Rust Backend                                        │
│  combo_catalog.rs           (新增：combo 文件读写)    │
│  lib.rs                     (注册新 invoke handler)  │
└─────────────────────────────────────────────────────┘
```

### 3.3 Rust 后端新增

#### 新增 `src-tauri/src/combo_catalog.rs`

```rust
// 两个 invoke handler：

#[tauri::command]
fn read_combos(app: AppHandle) -> Result<String, String>
// 读取 ~/.zapcmd/combos.json，不存在则返回 {"version":1,"combos":[]}

#[tauri::command]
fn write_combos(app: AppHandle, content: String) -> Result<(), String>
// 写入 ~/.zapcmd/combos.json，前端负责序列化
```

#### lib.rs 注册

```rust
.invoke_handler(tauri::generate_handler![
    // ... 现有 handlers ...
    combo_catalog::read_combos,
    combo_catalog::write_combos,
])
```

### 3.4 前端核心逻辑

#### `src/composables/launcher/useComboManager.ts`（新增）

```typescript
export function useComboManager(deps: {
  commandSource: Ref<CommandTemplate[]>;
  locale: Ref<string>;
}) {
  const combos = ref<Combo[]>([]);
  const comboTemplates = computed<CommandTemplate[]>(() =>
    // 将 combos 映射为 CommandTemplate[]
    // 包含 comboChildrenSummary 用于搜索
  );

  async function loadCombos(): Promise<void> { /* IPC 读取 */ }
  async function saveCombo(name: string, commands: StagedCommand[]): Promise<void> { /* IPC 写入 */ }
  async function deleteCombo(id: string): Promise<void> { /* 删除后写入 */ }
  async function renameCombo(id: string, newName: string): Promise<void> { /* 改名后写入 */ }

  function loadComboToStaging(comboId: string): StagedCommand[] {
    // 将 combo 中的子命令转化为 StagedCommand[]
    // 解析 commandId 引用，填充默认参数值
  }

  return { combos, comboTemplates, loadCombos, saveCombo, deleteCombo, renameCombo, loadComboToStaging };
}
```

#### `useLauncherSearch.ts`（修改）

```typescript
// 修改 commandSource 的来源，合并 combo 结果
// 在 useCommandCatalog 层合并：[...builtinCommands, ...userCommands, ...comboTemplates]
```

#### `useCommandCatalog.ts`（修改）

```typescript
// 合并 comboTemplates 到 allCommands
const allCommands = computed(() => [
  ...catalogCommands.value,
  ...comboManager.comboTemplates.value,
]);
```

### 3.5 i18n 新增键

```typescript
// messages.ts 新增
{
  launcher: {
    saveCombo: '保存组合 / Save Combo',
    comboName: '组合名称 / Combo Name',
    comboNamePlaceholder: '输入组合名称... / Enter combo name...',
    comboSaved: '组合已保存 / Combo saved',
    comboNameExists: '该名称已存在，是否覆盖？ / Name already exists, overwrite?',
    comboContains: '{count} 条命令组合 / {count} command combo',
    comboLoaded: '已加载组合到暂存区 / Combo loaded to staging',
  },
  settings: {
    combosSection: '组合 / Combos',
    comboRename: '重命名 / Rename',
    comboDelete: '删除组合 / Delete Combo',
    comboDeleteConfirm: '确定删除组合 "{name}" 吗？/ Delete combo "{name}"?',
  }
}
```

---

## 四、代码改动清单

### 4.1 新增文件

| # | 文件 | 说明 |
|---|------|------|
| 1 | `src-tauri/src/combo_catalog.rs` | Rust 后端 combo 文件读写 |
| 2 | `src/composables/launcher/useComboManager.ts` | 前端 combo 核心逻辑 |
| 3 | `src/components/launcher/parts/ComboSaveOverlay.vue` | 保存组合弹层 UI |
| 4 | `src/composables/launcher/__tests__/useComboManager.test.ts` | combo 单元测试 |

### 4.2 修改文件

| # | 文件 | 改动 |
|---|------|------|
| 5 | `src-tauri/src/lib.rs` | 注册 `read_combos` / `write_combos` handler |
| 6 | `src/services/tauriBridge.ts` | 新增 `readCombos()` / `writeCombos()` IPC 调用 |
| 7 | `src/features/commands/types.ts` | 扩展 `CommandTemplate` 添加 combo 相关可选字段 |
| 8 | `src/composables/launcher/useCommandCatalog.ts` | 合并 comboTemplates 到命令源 |
| 9 | `src/composables/launcher/useLauncherSearch.ts` | `getSearchText` 支持 comboChildrenSummary |
| 10 | `src/composables/app/useAppCompositionRoot/context.ts` | 创建和注入 comboManager |
| 11 | `src/composables/app/useAppCompositionRoot/runtime.ts` | 注册 combo 加载逻辑 |
| 12 | `src/composables/app/useAppCompositionRoot/viewModel.ts` | 暴露 combo 相关方法给模板 |
| 13 | `src/components/launcher/parts/LauncherStagingPanel.vue` | 添加"保存组合"按钮 |
| 14 | `src/components/launcher/LauncherWindow.vue` | 引入 ComboSaveOverlay |
| 15 | `src/components/launcher/types.ts` | 扩展 props 类型 |
| 16 | `src/components/settings/parts/SettingsCommandsSection.vue` | combo 管理 UI |
| 17 | `src/i18n/messages.ts` | 新增 combo 相关 i18n 键 |
| 18 | `src-tauri/capabilities/default.json` | 如需额外权限则更新 |
| 19 | `assets/runtime_templates/combos.json` | 更新模板为带 version 的格式 |

### 4.3 文档更新

| # | 文件 | 改动 |
|---|------|------|
| 20 | `README.md` | Feature Highlights 新增 Combo 功能描述 |
| 21 | `README.zh-CN.md` | 同步中文说明 |
| 22 | `CHANGELOG.md` | 新增 v1.1.0 [Unreleased] 记录 |

---

## 五、官网功能介绍文案（待补充到 README）

### English

```markdown
### Command Combos

Save frequently used command sequences as named combos for instant replay:

1. Stage your commands in the queue (search → ArrowRight to stage)
2. Click **Save Combo** in the staging panel footer
3. Give it a name (e.g., "Deploy Frontend")
4. Next time, just search the combo name — it appears with a `#custom` tag
5. Select it to load all commands back into the staging queue with saved defaults

Combos are stored locally at `~/.zapcmd/combos.json`. Manage (rename/delete) in Settings → Commands.
```

### 中文

```markdown
### 命令组合

将常用命令序列保存为命名组合，一键复用：

1. 在暂存队列中添加命令（搜索 → 右箭头暂存）
2. 点击暂存面板底部的 **保存组合**
3. 输入名称（如「部署前端」）
4. 下次搜索组合名即可找到，带有 `#custom` 标签
5. 选中后自动将所有命令加载到暂存队列，保留默认参数

组合数据保存在 `~/.zapcmd/combos.json`，可在 设置 → 命令管理 中管理（重命名/删除）。
```

---

## 六、测试计划

### 单元测试

- [ ] `useComboManager`: 创建/删除/重命名/加载 combo
- [ ] `useComboManager`: combo → CommandTemplate 映射正确
- [ ] `useComboManager`: 名称重复检测
- [ ] `useComboManager`: 子命令引用的 commandId 不存在时的优雅处理
- [ ] `useLauncherSearch`: combo 通过名称搜索命中
- [ ] `useLauncherSearch`: combo 通过子命令关键词搜索命中（验证 childrenSummary）
- [ ] `useLauncherSearch`: combo 搜索权重低于直接名称匹配
- [ ] `useCommandCatalog`: combo 正确合并到命令源
- [ ] `combo_catalog.rs`: 读取不存在文件返回空结构
- [ ] `combo_catalog.rs`: 写入和读取一致性

### 手动回归

- [ ] 暂存区有命令时"保存组合"按钮可用
- [ ] 暂存区为空时按钮禁用
- [ ] 保存弹层键盘交互（Enter 保存、Esc 关闭）
- [ ] 重复名称提示覆盖
- [ ] 搜索 combo 名称能命中
- [ ] 搜索 combo 子命令关键词能命中
- [ ] 加载 combo 到暂存区，子命令和参数正确
- [ ] Settings 中能看到 combo 列表
- [ ] Settings 中删除 combo 后搜索不再命中
- [ ] 应用重启后 combo 仍然存在

---

## 七、开发分支策略

```
main (v1.0.0)
  └── feat/custom-combo
        ├── combo-backend    (Rust read/write)
        ├── combo-manager    (composable + 测试)
        ├── combo-ui         (overlay + staging button + settings)
        ├── combo-search     (搜索集成)
        └── combo-docs       (README + CHANGELOG)
```

完成后 PR 合入 main，打 tag v1.1.0 发版。
