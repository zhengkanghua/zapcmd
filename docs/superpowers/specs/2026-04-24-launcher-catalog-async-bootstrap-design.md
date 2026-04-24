# Launcher Catalog Async Bootstrap Design

## 背景

当前 Launcher 在进入运行时装配时，会同步构建 builtin command catalog，并在 Tauri 环境下于 mounted 后继续刷新 user command files。这样虽然最终命令会全部进入内存，但首屏可见性仍然被同步 catalog 构建拖住，且搜索区在 catalog 未完成时缺少明确的加载反馈。

## 目标

1. 首屏 UI 先可见，不再要求命令目录同步完成后才进入可交互状态。
2. 仍保持“启动后全量命令最终加载进内存”的产品约束，不做按需命令详情加载。
3. 在目录尚未 ready 时，搜索框允许输入并保留 query；结果区显示“命令仍在加载”，ready 后自动按当前 query 出结果。
4. 顺手收口启动路径中重复的 settings storage 读取 / hydrate。

## 方案

### 1. Command catalog 改为显式状态机

在 `useCommandCatalog` 中把当前二值 `catalogReady` 扩展为显式加载状态：

- `idle`
- `loading`
- `ready`
- `error`

保留 `catalogReady` 作为兼容只读派生值，避免一次性改穿所有调用点。

### 2. builtin command 改为启动后异步全量加载

初始化阶段不再同步构建 builtin templates。catalog state 先以空模板进入 `idle`，mounted 后立刻进入 `loading`：

1. 解析 runtime platform
2. 异步全量构建 builtin templates
3. 若为 Tauri，再继续 scan/read user command files 并合并
4. 完成后进入 `ready`

这样依旧满足“启动后全量命令进入内存”，只是把构建放到 UI 已挂载之后执行。

### 3. 搜索区新增加载反馈

搜索区新增 props：

- `catalogLoading`
- `catalogReady`

行为定义：

- query 为空时，保持当前空闲外观；
- query 非空且 `catalogLoading=true` 时，drawer 显示加载态，不显示“无结果”；
- `catalogReady=true` 后，现有 `filteredResults` 逻辑自动生效；
- 若加载失败且 query 非空，仍显示现有空结果态，错误细节继续走 Settings Commands 的 load issues。

### 4. 启动链路去重 hydrate

`main.ts` / `main-settings.ts` 只负责读取一次 snapshot 用于 locale/bootstrap。
进入 composition root 后不再重复 `hydrateFromStorage()`；改为让入口把初始 snapshot 注入 store，或由入口统一完成 hydrate，后续场景层只消费现成 state。

## 风险与控制

- 现有测试依赖 `catalogReady`：保留兼容字段，并新增状态测试。
- 搜索结果初次为空可能影响旧断言：新增“加载态优先于空结果态”的 UI 回归。
- locale remap 与 user command cache 不能退化：定向保留 `useCommandCatalog` 现有缓存/locale 回归。
