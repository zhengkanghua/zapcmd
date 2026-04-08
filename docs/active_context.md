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
- 2026-04-03：按最新交互反馈微调：动作面板补鼠标返回按钮、hover 阴影跟随和根节点无白框；搜索提示改回单行省略并用原生 title 展示完整内容，废弃两行提示显示。相关 55 条定向测试已通过。
- 2026-04-07：已落地 session 延迟写入、终端发现内存+24h缓存及失效重探、Settings About 主页结构化反馈；后续拆分路线见 `plan/2026-04-07-runtime-split-roadmap.md`。
- 2026-04-07：非法 regex 命令改为“可见但不可执行”：加载期标记 blockingIssue，Launcher 显示问题命令，执行/入队/复制统一拦截，Settings Commands 记录问题来源。
