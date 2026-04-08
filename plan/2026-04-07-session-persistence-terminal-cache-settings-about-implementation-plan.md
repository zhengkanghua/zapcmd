# 2026-04-07 会话持久化 / 终端缓存 / About 动作反馈实现计划

## 目标

- 第 1 点：队列参数与 preflight 高频变化不再每次同步写本地存储，改为延迟写入；结构变化仍立即落盘。
- 第 2 点：终端探测改成 Rust 侧统一缓存，支持内存缓存 + 带过期时间的持久化缓存，并在缓存路径失效时自动清缓存后重探一次。
- 第 3 点：先不大重构，实现文档化的小步拆分路线。
- 第 4 点：把“打开项目主页”收敛成统一 service，返回结构化结果，并在 Settings About 区域给用户可见反馈。

## 范围与文件

- 前端会话持久化
  - 修改：`src/composables/launcher/useLauncherSessionState.ts`
  - 测试：`src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
- 终端发现缓存
  - 修改：`src-tauri/src/terminal.rs`
  - 新增：`src-tauri/src/terminal/discovery_cache.rs`
  - 新增：`src-tauri/src/terminal/tests_cache.rs`
  - 修改：`src-tauri/src/app_state.rs`
  - 修改：`src-tauri/src/startup.rs`
- About 外部打开反馈
  - 新增：`src/services/externalNavigator.ts`
  - 修改：`src/composables/app/useAppCompositionRoot/settingsScene.ts`
  - 修改：`src/composables/__tests__/app/settingsScene.test.ts`
  - 修改：`src/components/settings/types.ts`
  - 修改：`src/components/settings/SettingsWindow.vue`
  - 修改：`src/components/settings/parts/SettingsAboutSection.vue`
  - 修改：`src/components/settings/parts/__tests__/SettingsAboutSection.states-and-actions.test.ts`
  - 可能补充：`src/components/settings/__tests__/SettingsWindow.layout.test.ts`
- 文档
  - 新增：本计划
  - 修改：`docs/active_context.md`

## 执行顺序

### 任务 1：先补失败测试

1. `useLauncherSessionState.test.ts`
   - 写红灯用例：参数改动不会立即 `setItem`
   - 写红灯用例：debounce 到点后才写
   - 写红灯用例：队列增删 / 重排 / 展开状态变化立即写
   - 写红灯用例：scope stop 后不会残留延迟写入
2. `settingsScene.test.ts`
   - 写红灯用例：主页打开成功返回结构化成功
   - 写红灯用例：主页地址缺失返回结构化失败
   - 写红灯用例：底层打开抛错时返回结构化失败
3. `SettingsAboutSection.states-and-actions.test.ts`
   - 写红灯用例：主页动作失败时显示用户可见状态
4. `src-tauri/src/terminal/tests_cache.rs`
   - 写红灯用例：优先命中内存缓存
   - 写红灯用例：内存无值时命中未过期持久化缓存
   - 写红灯用例：缓存过期时触发重探
   - 写红灯用例：执行前路径失效会清缓存并允许重探

### 任务 2：最小实现让测试转绿

1. 会话持久化
   - 拆出“立即写”和“延迟写”两条路径
   - 对 `argValues` / `preflightCache` 等高频变更使用 debounce
   - 对队列结构变化与 `stagingExpanded` 变化立即写
   - 增加定时器清理与存储写入 `try/catch`
2. 终端发现缓存
   - Rust 后端新增缓存实体与 TTL 判断
   - 读取顺序：内存缓存 -> 持久化缓存 -> 实时探测
   - `run_command_in_terminal` 在终端路径失效时：清缓存 -> 重探一次 -> 再失败才报错
3. About 外部打开
   - 新建 service，统一返回 `{ ok, code, message }`
   - `settingsScene` 暴露结构化结果，不直接裸调 `ports.openExternalUrl`
   - About 区域显示简短成功/失败提示，先用局部状态，不引入全局通知系统

### 任务 3：文档补充

1. 记录第 3 点的小步拆分顺序
   - `useCommandExecution/actions.ts`
   - `useAppCompositionRoot/runtime.ts`
   - `src-tauri/src/terminal.rs`
2. 更新 `docs/active_context.md`
   - 只补充，不覆盖
   - 控制在 200 字以内

## 验证

- 前端定向：
  - `npm run test -- src/composables/__tests__/launcher/useLauncherSessionState.test.ts`
  - `npm run test -- src/composables/__tests__/app/settingsScene.test.ts src/components/settings/parts/__tests__/SettingsAboutSection.states-and-actions.test.ts`
- Rust 定向：
  - `cargo test --manifest-path src-tauri/Cargo.toml terminal`
- 最终门禁：
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:coverage`
  - `npm run build`
  - `npm run check:rust`
  - `npm run test:rust`

## 风险提示

- 第 2 点的真实收益在 Windows 更明显，但缓存逻辑应尽量写成跨平台公共层，避免后续再拆第二套。
- 第 4 点本轮先做局部用户提示，不顺手扩张成全局 toast 系统，避免把小修做成大改。
- 第 5 点本轮不改实现；等 1/2/3/4 收口后，再决定是否把非法 regex 校验前移到模板加载阶段并删除日志去重 `Set`。
