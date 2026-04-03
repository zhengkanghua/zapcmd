# 短期记忆（2026-04-03）

- preflight feedback 已落地：displayName/resolutionHint 打通，兼容 installHint。
- preflightFeedback 统一三段式提示，系统级错误单独收口。
- fallback 命令先显示标题，再回退 id。
- builtin prerequisite metadata 补齐留待下一迭代。
- verification 收口：probe payload 失配改为 fail-closed；mixed queue system failure 按命令去重；check:all 已通过。
- 新设计确认：入队即做 preflight 并缓存；入队只给 total 小提示；Flow 面板按缓存显示单条提醒并支持刷新；队列执行不再因 prerequisite 阻断。
- 实现计划已写入：`plan/2026-04-03-queue-preflight-cache-and-panel-warning-implementation-plan.md`，下一阶段按 executing-plans 落地。
- 2026-04-03：队列 preflight 缓存、session 持久化、整队/单条刷新与 Flow 紧凑提醒已落地；执行队列不再二次 prerequisite 检测或阻断，`npm run check:all` 全绿。
