# 运行时安全与启动效率收口设计

> 日期：2026-04-24
> 状态：设计已确认，进入实现
> 范围：Unix/mac 终端子进程回收、`terminal.rs` 安全拆分、命令目录单一数据源、启动期重复加载治理

---

## 1. 背景

本轮不是泛泛“优化代码”，而是对仓库里已经确认的 4 个真实问题做保守收口：

1. `src-tauri/src/terminal.rs` 在 Unix/mac 分支启动终端后直接丢弃 `Child`，存在僵尸进程风险。
2. `src-tauri/src/terminal.rs` 文件体积与职责都明显超载，后续修改风险过高。
3. 命令目录当前不是单一数据源：模块级 builtin 常量与 `useCommandCatalog()` 同时存在。
4. 启动期存在 builtin 命令与静态运行时数据的重复加载，构建产物中常量包偏重。

当前产品主战场仍是 Windows，但代码已经包含 Unix/mac 分支。即使这些分支暂未作为正式产品面向用户，也不能保留确定性的资源泄漏风险。

---

## 2. 目标与非目标

### 2.1 目标

1. 修复 Unix/mac 终端子进程回收问题，不改变 Windows 现有行为。
2. 拆分 `terminal.rs`，但保持对外 command 入口、行为与现有测试契约不变。
3. 以“支持多语言的 runtime 命令版本”为命令目录唯一事实源。
4. 消除启动期重复 builtin 加载，先做保守缓存与边界收口，再考虑更激进懒加载。

### 2.2 非目标

1. 不在本轮改变终端执行产品行为。
2. 不做命令 schema 语义改版。
3. 不顺手改 UI 或设置页交互。
4. 不把性能优化扩大为整仓库拆包工程。

---

## 3. 总体策略

采用保守分阶段方案，按 4 个独立 Chunk 推进：

1. 先修资源泄漏。
2. 再拆 `terminal.rs`。
3. 再统一命令目录单一数据源。
4. 最后处理启动期重复加载。

每个 Chunk 都必须满足：

1. 先写失败测试，再改实现。
2. 只改本 Chunk 边界内代码。
3. 通过本 Chunk 定向验证后再 commit。
4. 进入下一个 Chunk 前不保留已知红灯。

---

## 4. Chunk 1：Unix/mac 子进程回收

### 4.1 问题

当前 `spawn_and_forget` 只是 `spawn()` 成功后立即丢弃句柄。  
Windows 上问题较轻，但 Unix/mac 上若子进程快速退出且父进程不 `wait`，会留下 zombie。

### 4.2 方案

引入平台区分的启动辅助：

1. Windows 保持现有 fire-and-forget 语义。
2. Unix/mac `spawn` 后立即把 `Child` 移交给后台回收逻辑，负责 `wait()`。
3. 失败语义保持不变，调用方仍只拿到 `Result<(), String>`。

### 4.3 风险控制

1. 不修改 Windows 路由与参数拼装。
2. 不修改上层 `run_command_*` 入口签名。
3. 先补失败测试，再改实现。

---

## 5. Chunk 2：`terminal.rs` 安全拆分

### 5.1 问题

当前 `terminal.rs` 同时承担：

1. execution sanitize
2. host command builder
3. terminal discovery
4. cache persistence
5. Tauri command entry
6. 平台 launch glue

这使得任何局部改动都需要重新理解整条链路。

### 5.2 方案

拆成职责明确的子模块，推荐至少包括：

1. `terminal/execution.rs`
2. `terminal/discovery.rs`
3. `terminal/cache.rs`
4. `terminal/launch_posix.rs`
5. `terminal/commands.rs`

`terminal.rs` 仅保留模块导出、共享类型与必要装配。

### 5.3 风险控制

1. 对外 command 名称与签名不变。
2. 现有 Rust 单测语义不变。
3. 先按纯函数边界拆，再移动命令入口。

---

## 6. Chunk 3：命令目录单一数据源

### 6.1 问题

当前既有：

1. 模块级 `commandTemplates = loadBuiltinCommandTemplates()`
2. `useCommandCatalog()` 内部再次加载 builtin commands

这会导致：

1. 启动期重复解析
2. 搜索链路存在隐藏默认源
3. 多语言 runtime 目录虽然已是正确版本，但仍未成为唯一事实源

### 6.2 方案

1. 以 `useCommandCatalog()` 产出的 runtime 命令目录为唯一事实源。
2. `useLauncherSearch()` 改为必须接收显式 `commandSource`。
3. 模块级 builtin 常量改成兼容过渡层后删除，最终不再承担运行时真实数据源职责。

### 6.3 风险控制

1. 优先保持外部组件调用不变，只在组合层注入依赖。
2. 通过现有 `useCommandCatalog`、搜索、多语言测试锁定行为。

---

## 7. Chunk 4：启动效率保守优化

### 7.1 问题

构建结果显示启动期常量包偏大，主要成本来自：

1. builtin commands eager glob
2. i18n messages 全量引入
3. 运行时重复 builtin 加载/映射

### 7.2 方案

本轮只做保守优化：

1. 先让 builtin commands 加载结果单例缓存，去掉重复初始化。
2. 保持多语言 runtime 行为不变。
3. 不在本轮强推 i18n 异步拆包，除非前两步做完后仍存在明显重复路径。

### 7.3 风险控制

1. 优先减少重复工作，不先引入异步加载复杂度。
2. 所有性能调整都要回归 locale 切换和 catalog ready 行为。

---

## 8. 验证策略

每个 Chunk 完成后至少执行本轮相关定向测试。全轮结束后执行：

```bash
npm run test:rust
npm run check:rust
npm run test:run
npm run typecheck
npm run build
```

如果某个 Chunk 只触及 Rust，则在本 Chunk 内至少跑：

```bash
npm run test:rust
npm run check:rust
```

如果某个 Chunk 触及前端命令目录，则在本 Chunk 内至少跑相关 Vitest 定向回归，再补 `typecheck` 与 `build`。

---

## 9. 决策摘要

1. 先修确定性的 Unix/mac 资源泄漏，再动结构。
2. `terminal.rs` 拆分以“行为不变”为硬边界。
3. 命令目录唯一真源是当前支持多语言的 runtime 版本。
4. 性能优化先去重，后懒加载，不做高风险一步到位重构。
