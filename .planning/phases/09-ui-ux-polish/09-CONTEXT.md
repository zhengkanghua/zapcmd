# Phase 9: UI/UX 小幅精修 - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

本阶段只做“小幅精修”：统一启动器与设置页的键盘可达性、焦点行为和状态反馈，让高频操作更顺手、更可预期。
不改产品形态，不新增页面，不引入大规模视觉重做，也不借机扩展新能力。

</domain>

<decisions>
## Implementation Decisions

### 启动器键盘流
- `Esc` 采用“分层后退”语义：先关闭安全确认/参数弹层，再处理主界面层级；不要让不同界面出现互相冲突的退出规则。
- 当启动器已回到主界面且搜索框内有文本时，按一次 `Esc` 优先清空查询，而不是直接隐藏主窗。
- 只有在“无弹层、无待收起主层、查询已清空”的稳定空闲态下，`Esc` 才进入隐藏主窗这一步。
- `Tab` 继续承担 staging 队列的开关职责，不改成主界面的通用焦点遍历键。
- 焦点切换到队列区时，如果队列当前收起，则自动展开并定位到当前队列项，保持连续操作感。

### 状态反馈
- 启动器“无结果”空态保持轻量，不做大卡片；采用“一句话 + 下一步提示”的形式，明确告诉用户可以怎么继续。
- 设置页中的“保存成功 / 保存失败”统一走顶部 Toast 位置，减少用户在不同区域找反馈的成本。
- 命令加载失败、更新失败等功能性错误，保留在各自功能区内呈现，不额外提升为全局总览横幅。
- 区域内错误反馈必须同时包含：当前出了什么问题、影响到哪块功能、用户下一步能做什么。
- 终端检测、更新检查/下载等加载过程需要比现在更强的“正在进行中”感知，不能只靠弱文案一带而过。

### Claude's Discretion
- 顶部 Toast 的停留时长、动画强度、是否支持手动关闭，可在不改变上述信息层级的前提下由实现阶段决定。
- “无结果”提示里的具体文案和下一步建议，可按中英文语境分别润色，但必须保持轻量且可操作。
- 更强的加载感优先通过现有视觉语言增强，不引入与当前产品气质明显割裂的新型重组件。

</decisions>

<specifics>
## Specific Ideas

- 启动器仍然要保留“高频、顺手”的感觉，但按键语义必须能被用户快速学会，不能靠记忆猜测。
- 这次精修优先减少“意外感”和“找不到反馈”的情况，而不是追求明显换皮。

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/launcher/parts/LauncherSearchPanel.vue` 已有搜索输入、执行反馈 Toast、结果抽屉与无结果文案入口。
- `src/components/settings/SettingsWindow.vue` 已有顶部成功提示 `settings-ok` 和设置错误反馈入口，可作为统一反馈位置的现成基础。
- `src/components/settings/parts/SettingsCommandsSection.vue` 已有命令加载问题列表区，适合沿用“问题留在本区”的反馈策略。
- `src/components/settings/parts/SettingsAboutSection.vue` 与 `src/composables/update/useUpdateManager.ts` 已有更新状态与失败阶段模型，可直接承接更清晰的加载/错误反馈。
- `src/styles.css` 已集中维护暗色面板、按钮、Toast、列表与状态色，是本阶段统一视觉力度的主要复用面。

### Established Patterns
- 启动器主界面的键盘优先级已由 `src/features/hotkeys/windowKeydownHandlers/main.ts` 固化，尤其是 `Tab`、焦点切换热键与 `Esc` 行为。
- 设置页的 `Esc` 关闭优先级已由 `src/features/hotkeys/windowKeydownHandlers/settings.ts` 固化，体现“先关局部，再退全局”的现有方向。
- `src/__tests__/app.hotkeys.test.ts` 与 `src/__tests__/app.settings-hotkeys.test.ts` 已覆盖一批关键热键/焦点行为，是本阶段回归补齐的直接落点。
- `src/__tests__/app.failure-events.test.ts` 已覆盖部分失败提示与保存反馈，适合继续扩展 UI 反馈一致性断言。

### Integration Points
- 启动器键盘流入口：`src/composables/app/useAppWindowKeydown.ts`、`src/features/hotkeys/windowKeydownHandlers/main.ts`。
- 启动器焦点与搜索区联动：`src/composables/launcher/useSearchFocus.ts`、`src/composables/launcher/useStagingQueue/focus.ts`。
- 启动器状态反馈落点：`src/components/launcher/parts/LauncherSearchPanel.vue`。
- 设置页统一反馈落点：`src/components/settings/SettingsWindow.vue`。
- 设置页局部错误/加载状态：`src/components/settings/parts/SettingsCommandsSection.vue`、`src/components/settings/parts/SettingsAboutSection.vue`、`src/composables/update/useUpdateManager.ts`。

</code_context>

<deferred>
## Deferred Ideas

- 大规模 UI 改版、重新设计整个设置页信息架构，不属于本阶段。
- 新增 onboarding、命令推荐、引导式空态等新能力，不属于本阶段。
- 若要全面统一所有自定义下拉/选择控件为同一种交互模型，应拆到后续独立阶段处理。

</deferred>

---

*Phase: 09-ui-ux-polish*
*Context gathered: 2026-03-06*
