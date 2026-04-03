# 短期记忆（2026-04-03）

- preflight feedback 已落地：displayName/resolutionHint 打通，兼容 installHint。
- preflightFeedback 统一三段式提示，系统级错误单独收口。
- fallback 命令先显示标题，再回退 id。
- builtin prerequisite metadata 补齐留待下一迭代。
- verification 收口：probe payload 失配改为 fail-closed；mixed queue system failure 按命令去重；check:all 已通过。
- 新设计确认：入队即做 preflight 并缓存；入队只给 total 小提示；Flow 面板按缓存显示单条提醒并支持刷新；队列执行不再因 prerequisite 阻断。
- 实现计划已写入：`plan/2026-04-03-queue-preflight-cache-and-panel-warning-implementation-plan.md`，下一阶段按 executing-plans 落地。
- 2026-04-03：队列 preflight 缓存、session 持久化、整队/单条刷新与 Flow 紧凑提醒已落地；执行队列不再二次 prerequisite 检测或阻断，`npm run check:all` 全绿。
- 2026-04-03：已确认 Launcher 搜索结果改为左键动作面板、右键入队；新增左右键映射设置、动作面板、复制入口与实时提示，下一阶段写实现计划。
- 2026-04-03：已补充 Launcher 左右键映射/动作面板/复制入口实现计划，拆成 settings schema、统一 intent/copy、command-action 双变体、两行提示与热键回归；下一阶段按 plan 执行。
- 2026-04-03：Launcher 左右键映射、动作面板、copy intent、两行提示与新热键已联调；Settings 鼠标映射已持久化，待跑最终门禁并收尾提交。
- 2026-04-03：补修 4 个回归并补防回归：无参动作面板动作会收口回搜索页；Settings Hotkeys 已暴露 openActionPanel/copySelected；Shift+Enter 打开动作面板后自动接管焦点且 Escape 只本地收口；搜索提示改为一级提示可换行、占满后再隐藏二级提示。关联定向回归 71 测试已通过。
