# 短期记忆（2026-03-05）

## 补充（2026-03-29｜Launcher Flow 首帧扩窗）

- 已修复“仅搜索胶囊”打开 Flow 时先出面板、后扩窗的两段式时序：Flow 会话首帧先预抬继承高度，让 Rust `animate_main_window_size` 与 opening 同步启动；同时过滤空态无效 0 高度量测，避免 settled 后误缩回搜索高度。相关 controller / panelMeasurement / app failure tests 全绿。

## 补充（2026-03-29｜Launcher 搜索胶囊高度回归）

- 已确认回归根因是 queue pill 升到 44px 后，SearchPanel 仍保留 `p-[12px]`，实际胶囊高度被抬到 68px，导致 Flow 打开补高卡顿与少量结果也出现滚动；现改为 `px-[12px] py-[9px]` 并补契约测试锁定。
- 已补跑 visual：`linux-chromium` baseline 已按修复后 Launcher 画面刷新并 compare 回绿；`wsl-windows-edge` 桥接可运行，但当前仍整体 mismatch，属桥接口径对 controlled-runner baseline 的 compare 差异，不是桥接基础设施失败。

## 补充（2026-03-29｜UI 审查遗留项计划）

- 已落盘非性能遗留项修复计划：Launcher queue pill / Flow close 的 36px 命中区，以及 Flow 参数值编辑缺少按钮语义；见 `docs/plan/2026-03-29_02-ui-audit-non-performance-remediation-plan.md`。

## 补充（2026-03-29｜UI 非性能遗留项收口）

- 已将 LauncherQueueSummaryPill 与 Flow close 命中区提升到 44px；Flow 参数值入口改为 button 语义并支持 Enter/Space 进入编辑；focused tests、coverage 与 `npm run check:all` 全绿。

## 补充（2026-03-29｜UI 性能收口）

- 已完成 Launcher 搜索抽屉分批渲染（首屏 60 条，滚动/键盘增量扩容），并收口搜索高亮、命令管理归一化开销；focused tests、coverage、build 与 `npm run check:all` 全绿。

## 补充（2026-03-29｜visual bridge + linux baseline）

- 已修 WSL visual cleanup 的 PowerShell 传参与 Windows system probe 超时，manifest `fontScope` 统一为 `visual-harness-controlled`；Linux baselines 已按当前受控字体口径刷新，`test:visual:ui:linux` 通过，WSL compare 继续保留 mismatch 供诊断。

## 补充（2026-03-28｜visual cleanup scope refine）

- 已移除 Windows visual 主流程的可见 Edge sweep；runner 改为仅首轮 cleanup 使用 broad pid heuristic，后续 post-exit/grace 只按 child/profile 精确清理；runner 单测补成受控 mock，避免真实 Edge 进程污染。`test:visual:ui` 7/7 与 `check:all` 全绿。

## 补充（2026-03-29｜Windows visual Edge 残留二次收口）

- 已确认 Windows `msedge --version` 探针会打开现有浏览器会话并泄漏 renderer；env probe 改优先走 PowerShell `VersionInfo`。runner 追加 child-tree pid 追踪与成功 exit 后 cleanup 收口，实测 `test:visual:ui` 结束后无新增 Edge PID，`check:all` 全绿。

## 补充（2026-03-28｜visual env probe timeout）

- 已修复 `test:visual:ui` 在 `outputDir` 后偶发卡住的问题：`collectVisualEnvironment()` 的同步外部探针现统一带短超时并保持 best-effort，focused env tests 已补齐并通过。

## 补充（2026-03-28｜Windows visual 漏窗收口）

- 已确认 Windows `test:visual:ui` 的可见 Edge 漏窗不是 `.tmp` 测试 profile 残留，而是默认个人 Edge 会话被接管。runner 已补 screenshot/post-exit 竞态清理，主流程再按“本次新增可见 Edge 窗口”做 run 级 sweep；visual focused tests 32 通过，实测不再新增可见窗口，旧漏窗已清掉。

## 补充（2026-03-28｜WSL visual cleanup）

- 已补 WSL 桥接的 Edge 清理链路：`runBrowserScreenshot` 现可复用 Windows `pwsh.exe` 按 `profileDir` 查询并清理 `msedge.exe`，覆盖 `/mnt/c/.../msedge.exe + \\wsl.localhost\\...` 场景；新增回归测试，防止视觉回归残留多个 Edge 进程。

## 补充（2026-03-28｜Windows stray Edge cleanup）

- 继续修复 Windows 视觉回归偶发弹出可见 Edge 且不关闭的问题：runner 现会在截图前快照已有 `msedge.exe` PID，并在 cleanup 时额外清理本次 run 新增的 Edge 进程，不再只依赖 `profileDir` 命中。

## 补充（2026-03-28｜Crashpad pipe crash）

- 已定位 Windows 视觉回归首张图偶发 `2147483651` 根因：失败 run 生成的 dump 包含 `CreateNamedPipe` Crashpad 致命错误，说明子进程继承/复用的 Crashpad 管道环境导致 Edge 启动即崩。runner 现显式清空 `EDGE_CRASHPAD_PIPE_NAME`/`CHROME_CRASHPAD_PIPE_NAME`，并为每次 visual run 使用唯一 profile 子目录。

## 补充（2026-03-28｜controlled-runner 自动关窗竞态修复）

- 已确认“Edge 不自动关”根因是 `exit=0` 可能早于截图文件落盘，导致 cleanup 被跳过；runner 现改为成功退出后短等截图文件并执行 post-exit cleanup，且按 `profileDir` 补充清理，实机 `test:visual:ui:runner` 后不再残留 runner 临时 profile 进程。

## 补充（2026-03-28｜controlled-runner 绿灯修复）

- 已为 visual runner 增加“截图落盘后主动 cleanup 浏览器进程树”，并把 launcher motion 场景在 visual harness 内静态化；`npm run test:visual:ui:update:runner` 与 `npm run test:visual:ui:runner` 已全绿。

## 补充（2026-03-28｜controlled-runner 实施收口）

- 已切换 `controlled-runner` 为唯一 blocking visual gate；`verify:local` 默认 visual compare 非阻断；visual harness 改走受控字体入口；focused tests 与 `check:all` 全绿。当前仅剩 `launcher-motion-surfaces-*` 在 runner compare 下跨次截图仍漂移，需后续单独稳定化。

## 补充（2026-03-28｜受控 visual runner 设计定稿）

- 已确认方案2：blocking visual gate 不再依赖开发机本地 Edge/系统字体，改由受控 runner 执行固定浏览器+受控字体；本机 `test:visual:ui` 保留 compare/诊断口径，下一步写 `controlled-runner` 实施计划。
- 已落盘 `docs/superpowers/plans/2026-03-28-controlled-visual-regression-runner.md`：按 mode/baseline 契约、runner 断言、visual-only 字体、verify/workflow/baseline 收口拆成 4 个 chunk。

## 补充（2026-03-28｜Windows visual 设备2复测）

- 已补 visual harness 的 `Microsoft YaHei` CJK fallback 与 env probe 的 `Noto Sans SC/Microsoft YaHei/Edge file-version fallback`；设备2 Windows visual diff 略降但仍 7 项 mismatch，当前环境 Edge=`146.0.3856.84`，残余更像浏览器/字体栅格化漂移。

## 补充（2026-03-28｜Windows visual Task C）

- 已给 `AppVisual.vue` 增加 visual-only 稳定字体作用域，并在 `tokens.css` 新增 `--ui-font-visual-*`；focused tests、lint、typecheck、build、`test:visual:ui:linux` 全绿，待原生 Windows 双机复测 residual diff。

## 补充（2026-03-28｜Windows env probe 修正）

- 已修 Windows 原生 visual 环境探针：字体 PowerShell 脚本不再报 ParserError，浏览器版本增加 stderr/file-version fallback；待 Windows 复跑确认真实字体与 diff 面。

## 补充（2026-03-28｜Windows visual Task A+B）

- 已完成环境清单 `environment.json` 落盘与 Settings 顶部导航 SVG icon 收口；scripts/settings focused 29 测试、`lint`、`typecheck`、`build`、`test:visual:ui:linux` 全绿。WSL 仍属 Windows baseline 口径。

## 补充（2026-03-28｜Windows visual 稳定性实施计划）

- 已新增 `docs/plan/2026-03-28_06-windows-visual-regression-stability-implementation-plan.md`：先做环境日志+canonical baseline 口径，再做 SVG icon 收口与 visual harness 稳定字体；本轮只出计划，不改实现。

## 补充（2026-03-28｜Windows visual 跨设备不稳定归档）

- 已确认 7 个 Windows visual mismatch 高概率属于跨设备字体/Unicode icon/Edge/系统渲染漂移，不是旧 dist 或 bridge 故障；问题已落盘 `docs/plan/2026-03-28_05-windows-visual-regression-cross-device-instability.md`。

## 补充（2026-03-28｜review remediation P2 收口）

- 已修 Settings 剩余 3 个 36px 命中区与同步 appearance bootstrap；Linux/Windows visual baseline 已按预期更新并回绿，`check:all` 全绿。

## 补充（2026-03-28｜review remediation 收口）

- 已修 Escape ownership、Dropdown/Flow A11y、36px 命中区、Commands 首帧限额渲染与共享 appearance bootstrap；739 tests、`check:all` 全绿，Windows visual 仍是既有 7 项 baseline mismatch，Linux visual 全绿。

## 补充（2026-03-28｜全局 motion preset 落地）

- 已完成 `appearance.motionPreset`：默认 `expressive` 保持基线，`steady-tool` 接入 Launcher/Settings；store/runtime/UI/motion contract 与 `check:all` 全绿，visual 场景已补，`test:visual:ui` 在当前 Linux 环境按脚本规则跳过。
- 已补齐视觉回归跨平台：WSL 默认桥接 Windows Edge/Pwsh，可完整跑 `test:visual:ui` 并暴露现有 Windows baseline 差异；新增 `test:visual:ui:linux` 与 `linux-chromium` baselines，本机已全绿。
- `.ai/AGENTS.md` 已补 WSL/Windows 视觉回归约束：Windows 仍是最终 baseline，WSL 桥接只允许操作当前 repo 的 `.tmp/e2e/visual-regression/**` 与 `scripts/e2e/visual-baselines/**`。

## 补充（2026-03-28｜全局 motion preset 实施计划）

- 已落盘 `docs/superpowers/plans/2026-03-28-global-motion-preset.md`：按 store/migration → bootstrap/runtime → Settings UI → motion token 热点 → visual/check:all 拆 5 任务，含 reduced-motion 与迁移策略。

## 补充（2026-03-28｜全局多套动画 preset 设计）

- 已确认后续采用全局 `appearance.motionPreset`：默认 `expressive` 保留当前动效，新增 `steady-tool` 可选；通过 `motionRegistry + useMotionPreset + data-motion-preset + --motion-*` 统一驱动 Launcher/Settings，拒绝组件内双份 class 分叉。

## 补充（2026-03-28｜review 整改收口）

- 已完成 Task 4/5/6：Settings 只保留 `settings.html -> main-settings.ts -> AppSettings.vue`；新增浅色 `linen` 主题与主题驱动 `color-scheme`/启动期 bootstrap；`feat/review-remediation` 待 push。
- 已修复 Launcher 顶部/Command/Flow/Staging 拖拽区“只有拖拽光标但无法拖窗”：根 capture 层显式 `startDragging()`，并补 `allow-start-dragging` 权限与回归测试；`check:all` 全绿。
- 已补仓库根 `AGENTS.md`：若 Agent 运行在 WSL 而用户在 Windows，预览/可视化地址不得直接给 `localhost`，必须先确认宿主环境并提供用户可达地址。

## 补充（2026-03-28｜review 整改分支与文档）

- 已创建 `feat/review-remediation`；本轮先做 1/2/3/4/6，保留当前轻微弹性动画；双动画预设仅记入整改设计与实施计划，后续单独开发。

## 补充（2026-03-27｜UI 多主题与效果策略）

- `.impeccable.md` 已从“单一深色风格描述”改为“桌面工具稳定原则 + 多主题策略 + 受控效果策略”；当前 `obsidian` 仅是默认基线，后续允许多主题与局部 glow/gradient/blur，但必须服务可读性、层级、状态与效率。

## 补充（2026-03-27｜UI Design Context 与 Playbook）

- 已新增 `.impeccable.md` 作为 ZapCmd UI 设计事实源；`.ai/AGENTS.md` 已补成可执行 Playbook：先看 `.impeccable.md`，新界面走 `frontend-design`，现有界面优化走 `critique/polish/optimize`，系统约束再补 `ui-ux-pro-max`。

## 补充（2026-03-27｜impeccable 命名空间与 gsd 退场）

- `impeccable` skills 已从 `.codex/skills` 根目录收口到 `.codex/skills/impeccable`；当前桌面 UI 规则统一引用 impeccable 技能组。`.codex/get-shit-done` 与 `gsd-file-manifest.json` 已退场，活跃入口不再使用 `gsd-*`。

## 补充（2026-03-27｜桌面 UI 技能收口）

- 已删除 `frontend-skill`；桌面产品 UI 默认走 `ui-ux-pro-max` + impeccable，首次设计/大改优先 `frontend-design`，缺少 `.impeccable.md` 时先 `teach-impeccable`。

## 补充（2026-03-27｜前端 UI 技能路由）

- 项目 `.codex/skills` 已补装 `frontend-skill` 与 impeccable 技能集；`.ai/AGENTS.md` 现规定：UI 首次生成优先 `frontend-skill`，UI 修改/优化优先 impeccable，也可结合 `ui-ux-pro-max`。
- 此条已被上方“桌面 UI 技能收口”取代；`frontend-skill` 已卸载，不再作为默认 UI skill。

## 补充（2026-03-27｜主滚动容器细滚动条精修）

- 新增 `.scrollbar-subtle` utility；Settings 主内容区、Launcher CommandPanel、FlowPanel 空态 body 与列表区、StagingPanel 列表区已显式挂载；运行时代码已清除旧隐藏滚动条类。

## 补充（2026-03-27｜FlowPanel 交互失活修复）

- 移除 `tailwind.css` 中 `[data-tauri-drag-region]` 的 `app-region/-webkit-app-region` 注入，仅保留视觉提示；避免 Windows/WebView2 吞掉 FlowPanel 点击、滚动与拖拽交互，并新增样式契约防回归。
- 进一步确认真实根因是 `LauncherFlowPanel` overlay 在 open/opening 态同时挂了 `pointer-events-none` 与 `pointer-events-auto`，实际计算结果为 `none`，导致执行流内容层被下方 search layer 抢走事件；已改为按状态单一控制并补齐组件回归。

## 补充（2026-03-23｜Tailwind 原语迁移规划）

- 开发分支试验 Tailwind（C：页面消费原语），保留 `themes/* + tokens.css` 多主题；Roadmap：`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration.md`（含 Phase1/2/3 拆分）。
- Phase 1 已完成：接入 Tailwind 工具链（preflight 禁用；`src/styles/index.css` 末尾引入 `tailwind.css`）；新增 focused Vitest scripts：`test:flow:launcher`/`test:flow:settings`/`test:contract:styles`；`npm run check:all` 全绿。
- Phase 2 已推进：新增共享 `UiButton/UiIconButton` 原语（复用旧 `.btn-*`，含 characterization tests，并暴露 `focus()`），迁移 About/SafetyOverlay/StagingPanel 改为消费原语；focused tests 已通过。
- Phase 3 已推进：Tailwind theme 映射 `--ui-*`；`UiButton/UiIconButton` 内部 Tailwind 化并移除 `btn-*`；删除 `shared.css` 旧按钮样式；新增 `style-guard` 并接入 `check:all`（全绿）。
- Phase 3 补丁：FlowPanel 关闭按钮改为 `UiIconButton`；按钮圆角统一为 `rounded-control`（`--ui-radius-control`），避免直角回退且与执行按钮一致。
- Phase 3B：新增控件 hover tokens（`--ui-control-muted-hover-*`/`--ui-bg-rgb`），按钮原语去除硬编码 rgba；`style-guard` 增加 `rgba()` 门禁（仅允许 `rgba(var(--ui-...))`，排除测试，`.vue` `<style>` 暂不扫此规则）；`UiButton` size 组合确定化。
- Phase 3B 补丁 2：抽取 `buttonPrimitives` 复用按钮 variant classes，统一 disabled 视觉（含 muted/danger），并新增门禁禁止组件脚本层直接消费 `--theme-*`。
- Phase 4（进行中）：新增截图级视觉回归门禁 `npm run test:visual:ui`（`visual.html` harness + `scripts/e2e/visual-regression.cjs` + baselines `scripts/e2e/visual-baselines/*`，Windows CI/local gate 均接入）；Settings `SDropdown` 已 Tailwind 化并保留 `--ui-*` tokens，`npm run check:all` 全绿。
- Phase 4 设计稿已落盘：Settings 小组件 Tailwind 化 + 视觉回归扩展（范围含 `SToggle/SSegmentNav/SSlider` 等；验收含 `check:all` + `test:visual:ui`）。
- Phase 4 实施计划已落盘：`docs/superpowers/plans/2026-03-23-tailwind-primitives-migration-phase-4-settings-ui-tailwindization-and-visual-regression.md`（先扩展视觉场景+baseline，再逐个组件 Tailwind 化并过门禁）。
- Phase 4 进展（2026-03-24）：Settings reuse-policy、SToggle、SSegmentNav（含样式契约）Tailwind 化，SSlider Hybrid 完成；视觉回归新增 slider 场景，`check:all` + `test:visual:ui` 全绿。
- 补充（2026-03-24）：SHotkeyRecorder+3个Settings section 去 scoped 并 Tailwind 化；visual 新增 `settings-ui-hotkey-recorder`（Windows 待补 baseline）；限定 Tailwind 扫描源后 LightningCSS warning 已消失；Linux Rust 依赖走本地 sysroot。
- 补充（2026-03-24）：Windows 已生成并提交 `settings-ui-hotkey-recorder` baseline，并同步更新 `settings-ui-overview`/`settings-ui-slider` baseline。
- 补充（2026-03-25）：新增“全量 Tailwind 化（极简 CSS 例外）”设计稿与 Phase 6 计划：清理 `shared/settings/launcher/animations`，最终只保留 `reset/themes/tokens/tailwind/index`。
- 补充（2026-03-25｜Phase 6）：SettingsWindow/SettingSection/Item/Commands/Hotkeys 全量 Tailwind 化，删除 `src/styles/settings.css` 并从 `src/styles/index.css` 移除导入；`npm run check:all` 全绿（checkpoint=`ba93040`）。
- 补充（2026-03-25｜Phase 6）：Launcher contract test 改为组件 Tailwind 类契约；SafetyOverlay 样式已迁到 Tailwind（checkpoint=`89f7d86`/`b4d6342`）。
- 补充（2026-03-25｜Phase 6）：Launcher 全量 Tailwind 化，`launcher.css`/`animations.css` 已删除；keyframes/reduced-motion 收敛到 `tailwind.css`；`index.css` 仅导入白名单；style-guard 禁 Vue `<style>`（仅 `SSlider` 例外）。
- 补充（2026-03-25）：新增 Tailwind 语义化（动画/布局）+ 全局 CSS 瘦身设计稿，先做动画语义化与 Transition 去全局，再收口关键 layout arbitrary。
- 补充（2026-03-25）：已根据 spec review 补齐动画迁移对照表、`nav-slide` 零差异落地策略与 `tailwind.css` DoD（白名单/禁止项/rg 门禁）。
- 补充（2026-03-26）：已落盘 Tailwind 语义化+全局 CSS 瘦身实施计划（`docs/superpowers/plans/2026-03-26-tailwind-semantics-and-thin-global-css.md`），先做动画 `animate-launcher-*` + 删除 `tailwind.css` keyframes/nav-slide，再收口关键 `grid-rows/place-items` 并更新样式契约测试。
- 补充（2026-03-26）：已完成执行：动画改为 `tailwind.config.cjs` 语义类 `animate-launcher-*`，`tailwind.css` 已无 `@keyframes/nav-slide`；`nav-slide` 过渡改为显式 Transition classes；关键 `grid-rows` 命名化并更新契约测试，`npm run check:all` 全绿。
- 补充（2026-03-26）：Tailwind 扫描源排除 `src/**/__tests__`；新增 `ui/*`、`settings/*` 语义 theme keys（含 `ui-search-hl`）并批量替换高频 `var(--ui-*)` arbitrary（text/bg/border、rounded 10/14、zIndex），`npm run check:all` 全绿。
- 补充（2026-03-26）：alpha 色收口：在 `tailwind.config.cjs` 增加 `ui` 可带 `/opacity` 语义色（含 `bg-rgb/text/brand/search-hl/black/success/danger`），并替换 Launcher/Settings 高频 `rgba(var(--ui-*-rgb),alpha)` arbitrary；门禁全绿。
- 补充（2026-03-26）：修复 `ui` alpha 语义色因 RGB token 逗号分隔导致的 `rgb(... / a)` 非法输出，改为 `rgba(var(--ui-*-rgb), <alpha-value>)`，避免 Windows 样式丢失；门禁全绿。
- 补充（2026-03-26）：补齐 Tailwind `@config` 加载 `tailwind.config.cjs`；并修复 config 顶部注释包含 `*/` 导致解析失败，恢复 `bg-ui-*`/`settings-*` 等语义类生成，Windows 视觉回归待复测。
- 补充（2026-03-27）：Tailwind 治理收口：theme-layer 契约改为“默认 token + 实际消费 utility”；新增治理契约限制高风险 arbitrary 与 `var(--ui-*)` 预算（36→12）；提炼 `ui-keycap`/`ui-glass-toast`，`check:all` 全绿。
- 补充（2026-03-27）：Tailwind 契约继续加固：预算统计覆盖 `src/components/**/*.ts` 且排除 `__tests__`；theme-layer 新增 `shadow-settings-focus` 等语义 utility 编译校验；`check:all` 全绿。
- 补充（2026-03-27）：组件模板里剩余 12 个 `var(--ui-*)` arbitrary 已清零；新增 launcher-shell/top-align/backdrop/window-shell/slider/checker/accent 语义类；`check:all` 全绿，Windows 视觉基线可按需复测。
- 补充（2026-03-27）：Windows 视觉回归复测确认当前 Settings UI 为新基线形态，不是样式丢失；已用最新 `actual` 刷新 4 张 settings baselines，待 Windows 再跑 `npm run test:visual:ui` 复核。
- 补充（2026-03-27）：继续收口 Tailwind 治理：新增 `ease-settings-emphasized`、`transition-settings-*`、`shadow-settings-toolbar`、`shadow/bg/backdrop-blur-launcher-*` 语义 utility，替换 Settings/Launcher 里高重复 transition 与高成本 glow/shadow/gradient arbitrary；`style-guard` 同步禁止旧写法回流，`npm run check:all` 全绿。
- 补充（2026-03-27）：Tailwind 收口完成：Settings/Launcher 组件目录已无 `<style>`；SSlider 例外移除、theme preview 改为 token 单一事实源、Launcher transition/easing 语义化；`npm run check:all` 全绿。

## 补充（2026-03-21｜执行链与 Settings 分阶段加固计划包）

- 已进入 `writing-plans` 并按子系统拆出 5 份执行计划：`terminal-routing-and-effective-terminal-hardening`、`command-schema-runtime-contract-hardening`、`settings-window-contract-and-hotkey-unification`、`adapter-boundary-and-window-cache-hardening`、`docs-and-coverage-drift-alignment`。推荐顺序：先终端执行链，再命令 contract，再 Settings 契约，再 adapter/窗口缓存，最后文档与 coverage。

## 补充（2026-03-21｜执行链与 Settings 分阶段加固设计）

- 已落盘总 spec `docs/superpowers/specs/2026-03-21-execution-contract-settings-hardening-design.md`；确认采用“方案 1：分阶段治理”，先收紧 Windows 终端复用/权限边界、schema/runtime contract、SettingsWindow 契约、默认终端自愈持久化，再进入 adapter 拆分与文档/coverage 对齐。Tailwind 仅记录为延期架构议题，本轮不改样式栈。

## 补充（2026-03-21｜终端路由与有效终端加固）

- 计划 1 已完成：`terminalReusePolicy` 已接入 Settings、执行链与 Rust Windows 路由；默认终端在设置加载、终端列表刷新和执行前都会走统一 `resolveEffectiveTerminal()` 自愈，并在回退后立即持久化和广播。
- Windows 终端路由已改成显式三挡策略：未知 `terminal_id` 直接返回 `invalid-request`；`wt` 普通/管理员 lane 分离；最近可复用状态改为单一 `WindowsReusableSessionState`，普通命令不再被“最近一次管理员会话”污染。

## 补充（2026-03-21｜命令 schema 与 preflight contract 加固）

- 计划 2 已完成：`CommandArg` / `CommandTemplate` 已补齐 `min/max/prerequisites`，`runtimeMapper` 不再丢字段，`StagedCommand` 也开始携带 prerequisites，schema-only contract 已收口到真实运行时模型。
- `commandSafety` 已对 `number` 参数执行 `min/max` 运行时校验；前端新增 `commandPreflight` service，Rust 新增 prerequisite probe，当前支持 `binary/env`，其余类型统一返回结构化 `unsupported-prerequisite`。
- `useCommandExecution` 已在单条与队列执行前接入 prerequisite preflight：required 失败会阻断，optional 失败会在成功反馈后追加预检告警；队列 preflight 抽取为独立 helper，但单条路径保留原时序，避免无谓 async turn 漂移。
- 计划差异：真实内置 runtime JSON 已普遍携带 `prerequisites`，导致 app 级执行回归在浏览器预览态下会被 preflight 提前阻断；为与“桌面端真实执行链”对齐，补充了 `app.core-path-regression` / `app.hotkeys` / `app.failure-events` 的 Tauri mock 夹具，仅保留“执行被阻断时队列保留”用例继续跑 `isTauri=false`。
- 计划 2 最终验证已通过：`runtimeMapper` / `commandSafety` / `commandPreflight` / `useCommandExecution` focused tests、Rust prerequisite tests 与 `npm run check:all` 全绿。

## 补充（2026-03-21｜SettingsWindow 契约与热键录制统一）

- 计划 3 当前已完成三块收口：`App.vue` / `viewModel.ts` / `SettingsWindow` 壳层死契约已删除；窗口级 hotkey recording state 已从 `useSettingsWindow`、`windowKeydownHandlers`、生命周期桥接和主窗口壳层中移除；Settings Escape 现在只负责关闭窗口。
- `SHotkeyRecorder` 已确认仍是唯一真实录制路径：录制、`Escape` 取消、`blur` 提交、冲突提示与 app 级持久化回归都继续通过，`SettingsHotkeysSection` 保持只消费 `update:modelValue`。
- 计划差异 1：真实代码里 `cancelHotkeyRecording` 还残留在 `useAppLifecycle` / `useAppLifecycleBridge` / `useMainWindowShell` 这条壳层链路；为避免 Task 2 后留下类型断裂，本轮一并做了最小收口。
- 计划差异 2：`SHotkeyRecorder.vue` 与 `SettingsHotkeysSection.vue` 的生产实现实际上已先于计划满足目标 contract，因此 Task 3 无需改业务代码，只补强组件级与应用级回归来锁定这条真实路径。

## 补充（2026-03-21｜Adapter 边界与窗口缓存加固）

- 计划 4 已完成：`viewModel.ts` 已收口成 `launcherVm / settingsVm / appShellVm` 三段边界，`App.vue` 根部只消费这三个 VM；三个 VM 统一改走 `proxyRefs`，避免模板消费 nested ref 时再把 `Ref/ComputedRef` 直接透传给子组件。
- `useWindowSizing/controller.ts` 已继续下沉为高层编排器：窗口同步样式与 fallback resize 进入 `windowSync.ts`，Flow 观察期 timer 进入 `flowObservation.ts`，panel session 协调进入 `sessionCoordinator.ts`；controller 对外 contract 保持不变，focused Vitest 与 lint 已通过。
- `LauncherFlowPanel.vue` 已把高度观察、抓手重排、内联参数编辑拆到独立 composable，主文件只保留 DOM 组合与少量 glue code；`App.vue` 额外保留了 `availableTerminals / terminalLoading / submitParamInput` 三个顶层兼容入口，避免既有 app 级回归与 setupState harness 因壳层边界收口而失效。
- Rust 侧已新增 `src-tauri/src/animation/size_cache.rs`，`AnimationController.current_size` 不再直接暴露 `Mutex<(f64, f64)>`；`animation/mod.rs` 与 `windowing.rs` 已统一改走 `WindowSizeCache::read_or_recover / write_or_recover`，poisoned mutex 下仍可安全读写。
- 计划差异 1：Task 2 原文要求先加“主文件缩身约束”再把当前基线跑绿，但真实 `LauncherFlowPanel.vue` 在提取前仍直接持有三套状态机；本轮按最小必要调整为先补 emits contract 作为 baseline，再在提取完成后补源码缩身约束。
- 计划差异 2：Task 3 文案写“先写失败测试”，但 Step 2 同时要求当前基线 PASS；实际执行时将其视为 characterization test，先锁住 controller 公开 API 与“不暴露 observation timer 状态”的 contract，再基于该基线做结构拆分。
- 计划差异 3：Task 1 计划只写了“拆三段 VM 边界”，但真实 `App.vue` 模板和 app 级回归仍依赖顶层 setupState 自动解包/直访；最终通过 `proxyRefs + 顶层兼容别名` 做最小收口，保持边界目标不变，同时让 `vue-tsc` 与历史回归夹具继续成立。
- 计划 4 最终验证已通过：`useAppCompositionViewModel`、`LauncherFlowPanel`、`useWindowSizing` focused tests、Rust `animation::tests_logic` 与 `npm run check:all` 全绿。

## 补充（2026-03-21｜文档事实与 coverage 口径对齐）

- 计划 5 已完成：README / 中文 README / `docs/README.md` / `docs/command_sources/README.md` 已统一为“内置命令生成产物必须提交”，明确 `assets/runtime_templates/commands/builtin` 与 `docs/builtin_commands.generated.md` 都受 CI gate 约束；样式入口、Tailwind 现状、搜索字段与 GitHub workflow 引用也都改到当前真实实现。
- `vitest.config.js` 已把前端 coverage include 扩到 `src/components/**/*.vue`，并同步更新 `README.md`、`README.zh-CN.md`、`docs/architecture_plan.md`、`docs/project_constitution.md` 的覆盖率口径：前端 JS coverage 覆盖组件层与核心逻辑，Rust 继续单独由 `check:rust` / `cargo test` / smoke gate 描述，不再写成“全仓单一 90%+”。
- 计划差异 1：Task 1/2 原计划使用的 `rg` 会命中历史计划文档与上下文记录里的旧词，实际执行时补充了“只针对目标文档”的二次 `rg`，避免把历史设计稿误判成当前公开文档漂移。
- 计划差异 2：Task 3 原文假设“前面各计划新增的组件测试足够吃下新 coverage include”，但真实 `npm run test:coverage` 在纳入 `src/components/**/*.vue` 后先跌到 branches / functions 未达标；因此在本计划内补写了 `LauncherStagingPanel`、`LauncherSafetyOverlay`、`SettingsCommandsSection`、`SettingsGeneralSection`、`SettingsAboutSection`、`SettingsWindow` 壳层与 `SDropdown/SSegmentNav/SSlider/SToggle` 的 focused tests，以最小范围把门禁拉回 90%。
- 计划 5 最终验证已通过：文档 drift 搜索验证通过，`npm run test:coverage` 达到 `lines 93.88 / branches 90.2 / functions 91.72 / statements 93.88`，`npm run check:all` 全绿。

## 补充（2026-03-21｜项目总审查）

- 已落盘总审查文档 `docs/plan/2026-03-21_01-project-elegance-robustness-review.md`；P0 聚焦 Windows 执行链安全/权限语义、命令 schema 契约漂移、SettingsWindow stale contract 与默认终端有效性闭环。

## 补充（2026-03-21｜管理员终端 review fix）

- 已修复 `wt` 管理员终端复用语义：已有管理员窗口时不再重复 UAC；Windows 提权切到 `ShellExecuteExW`，`elevation-cancelled` 映射稳定；管理员终端开关仅 Windows 可见。
- 继续补强 review fix：`wt` 只有在“上一次也是 `wt` 管理员会话”时才允许跳过 `runas` 直连复用；主窗口设置页里的管理员终端开关改为随 `runtimePlatform` 异步结果响应显示。

## 补充（2026-03-21｜Windows 管理员终端路由实现）

- 已完成 `alwaysElevatedTerminal + requiresElevation` 全链路；Windows 新增普通/管理员双 `wt` 窗口 ID、最近权限态与 UAC 取消结构化错误。Task 5/6 checkpoint=`3030c75`，待跑最终门禁与手工 smoke。

## 补充（2026-03-21｜终端失败优先实现完成）

- `useTerminalExecution` 已切到 failure-first；PowerShell 先判 `$?` 再读可选 `$LASTEXITCODE`，`cmd/wt` 队列按失败数输出 `[queue][done]` / `[queue][failed]`。

## 补充（2026-03-21｜终端失败优先实现计划）

- 已产出 failure-first 实现计划：只改 `useTerminalExecution` 与相关 TS 回归；PowerShell 用 `$?` + 可选 `$LASTEXITCODE`，`cmd/wt` 用 `ERRORLEVEL` 统计失败；队列尾标按 failed count 输出 `done/failed`。

## 补充（2026-03-21｜终端失败优先提示设计）

- 已确认下一轮终端文案改为“失败优先、人话优先、code 可选”：单条成功静默、失败输出 `[failed]`；批量队列尾标改按失败条数汇总，不再复用最后一步状态。

## 补充（2026-03-21｜终端输出状态与辨识根修复）

- 真实 Windows smoke 证实 `cmd /K` 需进程级 `/V:ON` 才能展开 `!ERRORLEVEL!`；现已为 `cmd/wt` 启动参数补 `/V:ON`，保留前端 `run / exit N` payload，`check:all` 全绿。

## 补充（2026-03-21｜终端输出状态与辨识实现）

- 已在隔离 worktree 完成 Windows 终端提示收口：单条/批量统一为 `run / exit N`；`cmd/wt` 用 delayed expansion 输出真实退出码；launcher 与 App 回归已对齐。

## 补充（2026-03-21｜终端输出状态与辨识设计）

- 已确认新终端提示 contract：统一为 `run / exit N`，单条与批量都带轻量命令摘要；保留原始 stdout/stderr，不包装或改写命令自身报错；重点修复 `cmd/wt` 失败后仍显示 `finished` 的误导语义。

## 补充（2026-03-21｜终端输出状态与辨识计划）

- 已落盘实现计划 `docs/superpowers/plans/2026-03-21-terminal-output-status-clarity.md`：只改 `useTerminalExecution` 的 Windows 提示 contract；`cmd/wt` 用 delayed expansion 输出真实退出码；补齐 launcher 与 App 回归，并要求手工验证原始报错正文仍保留。

## 补充（2026-03-21｜Windows 终端会话策略实现）

- 已完成实现：Rust 新增 Windows launch plan，`wt` 固定窗口 `zapcmd-main-terminal` 复用，`powershell/pwsh/cmd` 强制新开独立控制台；前端补齐默认终端透传回归；本轮仍不做 `adminRequired` 的真实 UAC 提权。

## 补充（2026-03-21｜Windows 终端会话策略设计）

- 已确认新规：执行始终跟随 Settings 默认终端；`wt` 复用 ZapCmd 固定窗口，`powershell/pwsh/cmd` 强制新开独立控制台；`tauri:dev` 也必须脱离 VSCode 宿主控制台；本轮不做 UAC 提权。

## 补充（2026-03-21｜Windows 终端会话策略计划）

- 已落盘实现计划 `docs/superpowers/plans/2026-03-21-windows-terminal-session-strategy.md`：Rust 端新增 Windows launch plan；`wt` 固定窗口复用；`powershell/pwsh/cmd` 强制新开控制台；前端仅补 contract 回归；本轮不做 UAC。

## 补充（2026-03-21｜Codex 子代理只读护栏）

- 已将仓库规则修正为：`Codex` 子代理允许做“只读/检索/审查/分析”与“限定文件范围的无命令改动”；凡遇到提权、审批、git、安装、构建、测试、删除或其他副作用动作，子代理必须停下并把命令/原因上报主代理，由主代理向用户发起审批并亲自执行。

## 补充（2026-03-21｜Codex 子代理审批护栏）

- Codex 子代理若触发 `Approval needed`（已见实例：删除 `node_modules`），主会话会长期 `Waiting for <agent>`；仓库规则已改为：审批型危险命令不得直接下发给子代理，统一回退主代理先征得用户确认。

## 补充（2026-03-20｜Flow 短时观察补高）

- Flow 改为 settled 后短时观察前两项真实高度变化，只允许向上补高，稳定后冻结；Search/Command 关闭恢复语义保持不变。

## 补充（2026-03-21｜Flow 两卡轻微滚动修正）

- Flow 最小高度补计 `.flow-panel` 外框上下 border，修复 2 卡片刚好铺满时仍能轻微竖向滚动的问题。
- 在保持语义高度口径不变的前提下，Flow list 额外吸收至多 8px 的微小纵向滚动残差，避免 DPI / 小数像素 / 嵌套滚动带来的 1px 级残留；明显更大的滚动量仍不计入最小高度。

## 补充（2026-03-20｜launcher 高度 contract 计划）

- 已完成计划 `docs/superpowers/plans/2026-03-20-launcher-command-flow-height-contract-correction.md`，并通过 3 个 chunk reviewer。
- 关键决策：仅共享 `panelMaxHeight`；Search 去 floor；Command/Flow 分离 inherited/locked，并拆成规则层、测量层、会话层执行。

## 补充（2026-03-20｜launcher search effective height 合并计划）

- 新增计划 `docs/superpowers/plans/2026-03-20-launcher-search-effective-height-inheritance-and-panel-contract.md`，覆盖 `searchPanelEffectiveHeight/sharedPanelMaxHeight`、Search→Command 去 breathing 继承，并 supersede 旧的 2026-03-20 高度 contract 计划。

## 补充（2026-03-20｜launcher 高度 contract 收口）

- Task 6 已删 Search floor/filler 与 Flow 列表高度职责，补齐 App→LauncherWindow→Flow settled 接线；`npm run check:all` 全绿，残留仅 VTU Transition warn。

## 补充（2026-03-20｜launcher search effective height Task 6）

- docs/superpowers/plans/2026-03-20-launcher-search-effective-height-inheritance-and-panel-contract.md：breathing token；替代2026-03-20-launcher-command-flow-height-contract-correction.md；`check:all`绿。

## 补充（2026-03-20｜launcher search shell chrome 回归修复）

- 修复 Search 总窗口高度遗漏 shell top/bottom chrome 的回归；继承高度仍不带 breathing，restore/lock/style 同步统一减完整 chrome；`check:all`绿。

## 补充（2026-03-20｜Flow over Command 高度样式同步修复）

- 修复 Command 上打开/关闭 Flow 时 `--launcher-frame-height` 误吃旧 DOM 高度，改为在 Flow 活跃或刚关闭时按目标窗口高度同步；新增 Search/Command 恢复回归，`check:all` 绿。

## 补充（2026-03-18｜settings 通用/命令页深色精修执行）

- Windows settings 标题栏显式切到 dark；General 已切到 `SettingSection/SettingItem/SDropdown/SToggle`，旧终端 dropdown 外部状态链路已删除。
- Commands 已改为 sticky 搜索工具栏、4 个首排 ghost 筛选、“更多筛选”收纳和轻量表格；`SSelect`/`SFilterChip` 已移除。

## 补充（2026-03-18｜settings bugfix 收口）

- Hotkeys 分组标题改为卡片外 muted 小标题；Commands 工具栏新增 underlap sticky，上滚时会向上藏入顶部。
- FlowPanel 抓手重排改为 `window mousemove + elementFromPoint`，并关闭重排期 move/transform 动画；settings 新建窗口后立即 `show/focus`，修复托盘首次点击无响应。

## 补充（2026-03-19｜FlowPanel 跟手性二次修复）

- 抓手重排期间暂停 launcher session 持久化，并拦截原生 `dragstart`，继续压低 FlowPanel 主线程阻塞与事件竞争；Hotkeys 各分组间距同步加大，靠近 General 路由节奏。

## 补充（2026-03-18｜settings 深色精修设计）

- 已完成设计稿 `docs/superpowers/specs/2026-03-18-settings-general-commands-dark-polish-design.md`。
- 关键决策：系统标题栏仅用于原生暗色融合；WebView 内容区全部走 settings theme token。
- `General/Appearance/About` 去掉重复页标题；`General` 重组为启动/终端/界面。
- `Commands` 改为 sticky 搜索 + 首排精简筛选 + “更多筛选”收纳 + 轻量数据列表。
- `SSelect` 与 `SFilterChip` 计划收口为统一 `SDropdown`，并配套精修 `SToggle`。

## 补充（2026-03-18｜settings 深色精修计划）

- 已完成实现计划 `docs/superpowers/plans/2026-03-18-settings-general-commands-dark-polish.md`。
- 执行顺序：先收口壳体与重复标题，再建 `SDropdown/SettingItem` 并清理旧终端下拉状态，最后重构 Commands 的 sticky toolbar 与轻量表格。
- 计划包含 focused Vitest、`npm run check:all` 与 Windows 手动 smoke。

- 完成 Phase 10：补齐 desktop-smoke 的跨平台探测基础；最终口径已由 Phase 12 更正为 Windows 继续阻断、macOS 仅保留 experimental / non-blocking probe。
- `verify:local` 当前默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 手动探测。
- CI Gate / Release 当前只对 Windows desktop smoke 设阻断；macOS/Linux 保留在 cross-platform smoke / bundle 路径。
- Roadmap/State/Requirements 与 Phase 10 / Phase 12 evidence 已同步；剩余仅为 `E2E-02` full-matrix 的 v2 deferred tech debt。

## 补充（2026-03-05）

- macOS runner 上 `tauri-driver + safaridriver` 会话不稳定，已回退为实验能力，不再阻断 CI/Release。
- `verify:local` 默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 试验。
- 文档与工作流已统一：CI Gate 阻断项为 Windows quality + Windows desktop smoke + cross-platform smoke（macOS/Linux build+test）。

## 补充（流程文档分层）

- 贡献者共用节奏已沉淀到 `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`：日常开发、PR 门禁、触发矩阵统一口径。
- 维护者发布节奏集中到 `docs/.maintainer/work/release_runbook.md`：先 Dry Run 构建，再真实 Mac 人工冒烟，最后打 tag 正式发布。

## 补充（2026-03-05｜Phase 06 规划）

- 已完成 `06-CONTEXT.md` + `06-RESEARCH.md`，锁定安全回归口径：确认/取消/绕过、注入允许/拦截/边界、双语提示与不吞错。
- 新增 `06-01-PLAN.md`、`06-02-PLAN.md`（同属 Wave 1 并行），分别覆盖逻辑层与 App 热键交互层回归。

## 补充（2026-03-06｜Phase 08 规划）

- 已完成 `08-RESEARCH.md` 与 `08-01/02/03-PLAN.md`，覆盖 ARC-01/ARC-02。
- 规划为两条并行主线（组合根解耦、settingsStore 拆分）+ 一条收敛验收（回归矩阵 + `check:all` + 架构文档）。

## 补充（2026-03-06｜Phase 08 执行完成）

- 已完成 `08-01/02/03` 全部执行与 `08-VERIFICATION.md`，状态 `passed`，ARC-01/ARC-02 均已达成。
- 关键落地：组合根新增 `ports/policies` 边界，`settingsStore` 拆为 `defaults/normalization/migration/storageAdapter/store`。
- 回归结果：定向测试通过，`npm run check:all` 全绿（含 test:coverage、build、check:rust、test:rust）。
- 文档与追踪已同步：`ROADMAP.md`（Phase 8=3/3 Complete）、`STATE.md`（推进到 Phase 9）、`REQUIREMENTS.md`（ARC-01/02=Complete）。

## 补充（2026-03-06｜更新检查修复）

- `src-tauri/capabilities/default.json` 补充 `updater:default`，修复 `updater.check not allowed`。

## 补充（2026-03-06｜里程碑补缺起步）

- `v1.0` 审计结果为 `gaps_found`，已新增 Phase 11/12，分别处理 Phase 2/9 verification 缺口与 Phase 10 macOS gate 口径收敛。

## 补充（2026-03-06｜Phase 11 完成）

- 已补齐 `02-VERIFICATION.md`、`09-VERIFICATION.md` 与 Phase 9 summary frontmatter，`COV-01/02`、`UX-01/02` 的 orphaned 审计缺口已关闭。
- 当前唯一剩余 blocker 是 Phase 12：收敛 macOS desktop smoke 的本地、CI、Release 与文档口径。
- 关于页更新失败提示新增“权限缺失”分支，不再把权限问题误导为网络问题；新增 3 条组件测试覆盖该路径。
## 补充（2026-03-06｜Phase 09 讨论完成）
- 已创建 `09-CONTEXT.md`：锁定启动器键盘流与状态反馈。`Esc` 分层后退、主界面有查询时先清空；`Tab` 继续开关队列；设置保存成功/失败统一顶部 Toast；空态为“一句话+下一步”；功能错误留在各区，加载反馈更明显。

## 补充（2026-03-06｜Phase 09 规划完成）
- 已创建 `09-RESEARCH.md` 与 `09-01/02/03-PLAN.md`：分成键盘/焦点、状态反馈/层级、收敛验收三块，Phase 9 现已可直接进入 execute-phase。

## 补充（2026-03-06｜Phase 09 执行完成）
- 已完成 Phase 09：补了启动器与设置页高频焦点样式，锁定 `Esc` 层级回归；无结果空态增加下一步提示；设置保存失败改为顶部 Toast；终端检测与更新流程 loading 更明显；Phase 9 相关回归矩阵与 `check:all` 全绿。

## 补充（2026-03-06｜Phase 09 settings 再增强）
- settings 新增三点：1）快捷键冲突时，冲突字段标红，最后修改的冲突项高亮更强；2）跨路由保存错误会标红对应导航，并提供“前往对应路由”按钮；3）取消现在会在有未保存修改时弹确认，确认后恢复到打开设置时的基线值，确定仍是保存并关闭。

## 补充（2026-03-06｜settings 确定/取消语义修正）
- 关闭 settings 现在分成两条路径：取消/`Esc` 走“请求关闭”，有未保存修改时先确认再决定是否丢弃；确定走“先保存，成功后直接关闭”，不再复用取消路径，避免出现点确定却无反应。

## 补充（2026-03-06｜Phase 12 口径收敛）
- 已统一公开文档与 Phase 10 evidence：Windows desktop smoke 仍是唯一 blocking gate；macOS 仅保留 experimental / non-blocking probe。剩余 tech debt 仅为等待上游稳定性变化。

## 补充（2026-03-06｜v1.0 里程碑归档）

## 补充（2026-03-07｜UI 评审）
- 已完成主窗口与 settings 截图评审：当前问题不在技术栈上，而在视觉系统与信息架构；后续优先收敛为更克制的深色专业风，弱化绿色品牌色，重做暂存区布局与 settings 卡片化层级。

## 补充（2026-03-07｜UI 重构文档工作区）
- 已新增 `docs/ui-redesign/`：包含重构背景、现状审计、方案对比、设计系统、代码影响图、Gemini Canvas Prompt 与执行路线；当前推荐主方向为“Search / Review 两态”，待外部 Demo 比较后再进入正式 phase。
## 补充（2026-03-07｜UI 方案锁定 B4）
- 已正式收敛界面大重构主方案为 `B4 = Overlay Review Mode with Floor Height Protection`：搜索态保持动态高度；Review 态在内部 shell 中右侧滑出；结果不足时使用左侧抽屉 floor height（= 4 条结果高度 + 搜索框高度，计算值）与 filler 补高；遮罩只作用于内部圆角 shell，不做整窗遮罩；若实时 resize 抖动则退回单次 resize + 内部动画。
## 补充（2026-03-07｜B4 交互与状态机文档）

- 已新增 `docs/ui-redesign/08-b4-interaction-state-machine.md`：明确 B4 的窗口/搜索/Review/Param/Safety 四维状态模型、层级优先级、键盘规则、焦点恢复策略，以及 `toggleQueue` / `switchFocus` 在兼容期的目标语义。
## 补充（2026-03-07｜B4 热键迁移表）
- 已新增 `docs/ui-redesign/09-b4-hotkey-migration-map.md`：明确 `toggleQueue` / `switchFocus` 在 B4 第一阶段的兼容语义、Review 态下 `Tab` 回归标准焦点循环的规则，以及热键文案/测试/设置模型的收口建议。
## 补充（2026-03-07｜B4 组件/视觉/验收文档）
- 已补齐 `docs/ui-redesign/10-b4-component-architecture.md`、`11-b4-visual-spec.md`、`12-b4-acceptance-matrix.md`：分别覆盖组件拆分与状态归属、主窗口/Review/Settings 视觉规格，以及 Demo 评审/手动验收/自动化测试优先级；当前 `docs/ui-redesign/` 已可作为进入正式 phase 前的完整前置方案包。
## 补充（2026-03-07｜范围再次收窄）
- 已在 `docs/ui-redesign/` 中明确写死：本轮只做 launcher 主窗口；`settings` 继续保持独立窗口，不并入 launcher，也不纳入本轮重构范围。后续若要做 settings 升级，另开独立专题。

## 补充（2026-03-07｜v2.0 里程碑启动）

## 补充（2026-03-07｜Git hooks 修复）
- pre-commit hooks 改为平台目录：Windows=`.githooks/windows`（PowerShell），macOS/Linux=`.githooks/posix`（sh），规避 `sh.exe couldn't create signal pipe (Win32 error 5)`。

## 补充（2026-03-07｜Phase 13 讨论完成）
- Phase 13 已生成 CONTEXT（`.planning/phases/13-b4-layout-sizing-foundation/13-CONTEXT.md`）：floor 仅“打开 Review 前”触发（0~3 结果），floor height 由“4 条结果高度 + 搜索框高度”计算，content height 只排除顶端 drag strip，并要求 P0 单测锁定“无假结果 DOM”。

## 补充（2026-03-07｜Phase 13 规划完成）

## 补充（2026-03-08｜Phase 13 执行完成）

## 补充（2026-03-08｜Phase 14 讨论完成）

## 补充（2026-03-09｜Phase 14 执行进展）
- 已完成 14-01：搜索态单列 + 队列 pill 入口；入队/会话恢复不再自动打开 Review；Review 宽度口径 `2/3 + clamp(420~480)` 通过 CSS 变量集中管理。

## 补充（2026-03-09｜Phase 14-03 回归迁移）
- 自动化回归迁移到 pill + Review overlay；新增 Review 组件级单测；`npm run check:all` 全绿，为 Phase 15 键盘/焦点收口提供稳定基线。

## 补充（2026-03-09｜Phase 14 UI 对齐）
- 队列 pill 移入搜索框右侧同排；Review overlay 的遮罩从搜索框下方覆盖结果抽屉区域（仅暗结果区）。
- Review 展开时：结果抽屉 inert/aria-hidden 锁定；点击搜索框关闭 Review，队列 pill 可切换；关闭后焦点回到搜索框。

## 补充（2026-03-09｜Phase 15 计划完成）

## 补充（2026-03-09｜Phase 15 执行完成待复验）
- Phase 15 已落地：Tab/Ctrl+Tab 打开 Review、Review 内 Tab trap、Esc 先关 Review；但本容器无法跑 vitest（esbuild spawn EPERM），需本地 `npm run check:all` + 键盘 smoke（见 `.planning/phases/15-keyboard-focus-close-semantics/15-VERIFICATION.md`）。

## 补充（2026-03-09｜Phase 15 门禁已通过）
- 已在沙盒外跑通 `npm run check:all`（含回归/coverage/build/rust）；Phase 15 验证已更新为 `passed`，可推进 Phase 16（动画/视觉系统）。

## 补充（2026-03-09｜Phase 16 讨论完成）
- 视觉基线选 Beta Graphite Cyan；交互激活态统一用品牌色（不再用绿色做品牌）；success 色值先留给执行者。Review 动效：dim→滑入、滑出→去 dim，约 200ms；默认 opacity 调到 0.96（范围仍 0.2~1.0）、壁纸弱化、Review 层级高一阶；Windows 若 resize 抖动明显则降级“一次性 resize + 内部动画”。

## 补充（2026-03-10｜Phase 16 规划完成）

## 补充（2026-03-10｜Phase 16 研究完成）
- 已生成 `.planning/phases/16-animation-visual-system/16-RESEARCH.md`：覆盖 `SIZE-03`/`VIS-01`/`VIS-02`，梳理动效/令牌/Windows resize 降级落点与相关代码路径。

## 补充（2026-03-10｜Phase 16-01 执行完成）
- 主窗口完成 brand/success 分离：引入 `--ui-brand(#4CC9F0)` / `--ui-success(#2DD4BF)`；Queue pill、结果选中/聚焦、主按钮、focus ring、staged feedback 动画统一使用 brand；执行成功反馈仅使用 success。回归：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-02 执行完成）
- Review overlay 开合动效落地：opening dim 先出现再滑入；closing 先滑出再去 dim；总时长约 200ms，仅 `opacity/transform`。
- `STAGING_TRANSITION_MS=200` 并同步 staging-panel 动画时长；回归：`npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-03 执行完成）
- 默认透明度提升至 0.96（范围仍 0.2~1.0），同步 CSS `--ui-opacity` 与回归断言，并跑通 `npm run check:all`。

## 补充（2026-03-10｜Phase 16 验证）
- 已生成 `.planning/phases/16-animation-visual-system/16-VERIFICATION.md`（status=`human_needed`，score=3/3）；需在 Windows 手动确认 Review 开合动效与 resize 体感，以及透明度/品牌色观感基线。

## 补充（2026-03-10｜Review 打开背景修复）
- 修复“Review 打开但 query 为空时左侧背景塌陷、看起来像右侧独立抽屉”的观感问题：在 `reviewOpen && !drawerOpen` 时渲染左侧 floor 占位，并在 `stagingExpanded=true` 下始终提供 `drawerFloorViewportHeight`；定向单测已通过。
- 同步修复 Review 列表布局：移除列表 `minHeight`（避免卡片被拉伸出现大空隙），review 面板改为 3 行 grid 并补齐 `min-height: 0`，footer 按钮不再溢出。

## 补充（2026-03-10｜Phase 17 设计落盘）
- 已落盘“面板内 2/3 覆盖抽屉（搜索框下方三层：结果→遮罩→抽屉；点击遮罩关闭并回焦搜索框）”设计稿，并追加到 v2.0 Roadmap：见 `docs/superpowers/specs/2026-03-10-launcher-review-drawer-overlay-design.md` 与 `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-CONTEXT.md`。

## 补充（2026-03-10｜Phase 17 规划完成）

## 补充（2026-03-10｜Phase 17 执行完成）
- Review 已回归为“面板内容区内 2/3 overlay 抽屉”，并切断“打开导致窗口变宽”的链路；回归护栏已补齐且 `npm run check:all` 全绿。已生成 `17-VERIFICATION.md`（status=`human_needed`）待 Windows smoke。

## 补充（2026-03-10｜Review 体验微调）
- Review 体验微调（已回滚）：不再强制加深遮罩/增加 preopening 门控/调整 search-main floor 布局。

## 补充（2026-03-11｜Phase 16/17 Windows 验证通过）
- 透明度规则修正：窗口根背景永远保持透明；设置里的“窗口透明度”仅影响 UI 样式（`--ui-opacity` → `--ui-bg` 等），不改变窗口本身透明性。
# 短期记忆（2026-03-05）

- 完成 Phase 10：补齐 desktop-smoke 的跨平台探测基础；最终口径已由 Phase 12 更正为 Windows 继续阻断、macOS 仅保留 experimental / non-blocking probe。
- `verify:local` 当前默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 手动探测。
- CI Gate / Release 当前只对 Windows desktop smoke 设阻断；macOS/Linux 保留在 cross-platform smoke / bundle 路径。
- Roadmap/State/Requirements 与 Phase 10 / Phase 12 evidence 已同步；剩余仅为 `E2E-02` full-matrix 的 v2 deferred tech debt。

## 补充（2026-03-05）

- macOS runner 上 `tauri-driver + safaridriver` 会话不稳定，已回退为实验能力，不再阻断 CI/Release。
- `verify:local` 默认策略：Windows=质量门禁+桌面冒烟（自动补驱动），macOS=仅质量门禁；可加 `--macos-desktop-e2e-experimental` 试验。
- 文档与工作流已统一：CI Gate 阻断项为 Windows quality + Windows desktop smoke + cross-platform smoke（macOS/Linux build+test）。

## 补充（流程文档分层）

- 贡献者共用节奏已沉淀到 `CONTRIBUTING.md` / `CONTRIBUTING.zh-CN.md`：日常开发、PR 门禁、触发矩阵统一口径。
- 维护者发布节奏集中到 `docs/.maintainer/work/release_runbook.md`：先 Dry Run 构建，再真实 Mac 人工冒烟，最后打 tag 正式发布。

## 补充（2026-03-05｜Phase 06 规划）

- 已完成 `06-CONTEXT.md` + `06-RESEARCH.md`，锁定安全回归口径：确认/取消/绕过、注入允许/拦截/边界、双语提示与不吞错。
- 新增 `06-01-PLAN.md`、`06-02-PLAN.md`（同属 Wave 1 并行），分别覆盖逻辑层与 App 热键交互层回归。

## 补充（2026-03-06｜Phase 08 规划）

- 已完成 `08-RESEARCH.md` 与 `08-01/02/03-PLAN.md`，覆盖 ARC-01/ARC-02。
- 规划为两条并行主线（组合根解耦、settingsStore 拆分）+ 一条收敛验收（回归矩阵 + `check:all` + 架构文档）。

## 补充（2026-03-06｜Phase 08 执行完成）

- 已完成 `08-01/02/03` 全部执行与 `08-VERIFICATION.md`，状态 `passed`，ARC-01/ARC-02 均已达成。
- 关键落地：组合根新增 `ports/policies` 边界，`settingsStore` 拆为 `defaults/normalization/migration/storageAdapter/store`。
- 回归结果：定向测试通过，`npm run check:all` 全绿（含 test:coverage、build、check:rust、test:rust）。
- 文档与追踪已同步：`ROADMAP.md`（Phase 8=3/3 Complete）、`STATE.md`（推进到 Phase 9）、`REQUIREMENTS.md`（ARC-01/02=Complete）。

## 补充（2026-03-06｜更新检查修复）

- `src-tauri/capabilities/default.json` 补充 `updater:default`，修复 `updater.check not allowed`。

## 补充（2026-03-06｜里程碑补缺起步）

- `v1.0` 审计结果为 `gaps_found`，已新增 Phase 11/12，分别处理 Phase 2/9 verification 缺口与 Phase 10 macOS gate 口径收敛。

## 补充（2026-03-06｜Phase 11 完成）

- 已补齐 `02-VERIFICATION.md`、`09-VERIFICATION.md` 与 Phase 9 summary frontmatter，`COV-01/02`、`UX-01/02` 的 orphaned 审计缺口已关闭。
- 当前唯一剩余 blocker 是 Phase 12：收敛 macOS desktop smoke 的本地、CI、Release 与文档口径。
- 关于页更新失败提示新增“权限缺失”分支，不再把权限问题误导为网络问题；新增 3 条组件测试覆盖该路径。
## 补充（2026-03-06｜Phase 09 讨论完成）
- 已创建 `09-CONTEXT.md`：锁定启动器键盘流与状态反馈。`Esc` 分层后退、主界面有查询时先清空；`Tab` 继续开关队列；设置保存成功/失败统一顶部 Toast；空态为“一句话+下一步”；功能错误留在各区，加载反馈更明显。

## 补充（2026-03-06｜Phase 09 规划完成）
- 已创建 `09-RESEARCH.md` 与 `09-01/02/03-PLAN.md`：分成键盘/焦点、状态反馈/层级、收敛验收三块，Phase 9 现已可直接进入 execute-phase。

## 补充（2026-03-06｜Phase 09 执行完成）
- 已完成 Phase 09：补了启动器与设置页高频焦点样式，锁定 `Esc` 层级回归；无结果空态增加下一步提示；设置保存失败改为顶部 Toast；终端检测与更新流程 loading 更明显；Phase 9 相关回归矩阵与 `check:all` 全绿。

## 补充（2026-03-06｜Phase 09 settings 再增强）
- settings 新增三点：1）快捷键冲突时，冲突字段标红，最后修改的冲突项高亮更强；2）跨路由保存错误会标红对应导航，并提供“前往对应路由”按钮；3）取消现在会在有未保存修改时弹确认，确认后恢复到打开设置时的基线值，确定仍是保存并关闭。

## 补充（2026-03-06｜settings 确定/取消语义修正）
- 关闭 settings 现在分成两条路径：取消/`Esc` 走“请求关闭”，有未保存修改时先确认再决定是否丢弃；确定走“先保存，成功后直接关闭”，不再复用取消路径，避免出现点确定却无反应。

## 补充（2026-03-06｜Phase 12 口径收敛）
- 已统一公开文档与 Phase 10 evidence：Windows desktop smoke 仍是唯一 blocking gate；macOS 仅保留 experimental / non-blocking probe。剩余 tech debt 仅为等待上游稳定性变化。

## 补充（2026-03-06｜v1.0 里程碑归档）

## 补充（2026-03-07｜UI 评审）
- 已完成主窗口与 settings 截图评审：当前问题不在技术栈上，而在视觉系统与信息架构；后续优先收敛为更克制的深色专业风，弱化绿色品牌色，重做暂存区布局与 settings 卡片化层级。

## 补充（2026-03-07｜UI 重构文档工作区）
- 已新增 `docs/ui-redesign/`：包含重构背景、现状审计、方案对比、设计系统、代码影响图、Gemini Canvas Prompt 与执行路线；当前推荐主方向为“Search / Review 两态”，待外部 Demo 比较后再进入正式 phase。
## 补充（2026-03-07｜UI 方案锁定 B4）
- 已正式收敛界面大重构主方案为 `B4 = Overlay Review Mode with Floor Height Protection`：搜索态保持动态高度；Review 态在内部 shell 中右侧滑出；结果不足时使用左侧抽屉 floor height（= 4 条结果高度 + 搜索框高度，计算值）与 filler 补高；遮罩只作用于内部圆角 shell，不做整窗遮罩；若实时 resize 抖动则退回单次 resize + 内部动画。
## 补充（2026-03-07｜B4 交互与状态机文档）
- 已新增 `docs/ui-redesign/08-b4-interaction-state-machine.md`：明确 B4 的窗口/搜索/Review/Param/Safety 四维状态模型、层级优先级、键盘规则、焦点恢复策略，以及 `toggleQueue` / `switchFocus` 在兼容期的目标语义。
## 补充（2026-03-07｜B4 热键迁移表）
- 已新增 `docs/ui-redesign/09-b4-hotkey-migration-map.md`：明确 `toggleQueue` / `switchFocus` 在 B4 第一阶段的兼容语义、Review 态下 `Tab` 回归标准焦点循环的规则，以及热键文案/测试/设置模型的收口建议。
## 补充（2026-03-07｜B4 组件/视觉/验收文档）
- 已补齐 `docs/ui-redesign/10-b4-component-architecture.md`、`11-b4-visual-spec.md`、`12-b4-acceptance-matrix.md`：分别覆盖组件拆分与状态归属、主窗口/Review/Settings 视觉规格，以及 Demo 评审/手动验收/自动化测试优先级；当前 `docs/ui-redesign/` 已可作为进入正式 phase 前的完整前置方案包。
## 补充（2026-03-07｜范围再次收窄）
- 已在 `docs/ui-redesign/` 中明确写死：本轮只做 launcher 主窗口；`settings` 继续保持独立窗口，不并入 launcher，也不纳入本轮重构范围。后续若要做 settings 升级，另开独立专题。

## 补充（2026-03-07｜v2.0 里程碑启动）

## 补充（2026-03-07｜Git hooks 修复）
- pre-commit hooks 改为平台目录：Windows=`.githooks/windows`（PowerShell），macOS/Linux=`.githooks/posix`（sh），规避 `sh.exe couldn't create signal pipe (Win32 error 5)`。

## 补充（2026-03-07｜Phase 13 讨论完成）
- Phase 13 已生成 CONTEXT（`.planning/phases/13-b4-layout-sizing-foundation/13-CONTEXT.md`）：floor 仅“打开 Review 前”触发（0~3 结果），floor height 由“4 条结果高度 + 搜索框高度”计算，content height 只排除顶端 drag strip，并要求 P0 单测锁定“无假结果 DOM”。

## 补充（2026-03-07｜Phase 13 规划完成）

## 补充（2026-03-08｜Phase 13 执行完成）

## 补充（2026-03-08｜Phase 14 讨论完成）

## 补充（2026-03-09｜Phase 14 执行进展）
- 已完成 14-01：搜索态单列 + 队列 pill 入口；入队/会话恢复不再自动打开 Review；Review 宽度口径 `2/3 + clamp(420~480)` 通过 CSS 变量集中管理。

## 补充（2026-03-09｜Phase 14-03 回归迁移）
- 自动化回归迁移到 pill + Review overlay；新增 Review 组件级单测；`npm run check:all` 全绿，为 Phase 15 键盘/焦点收口提供稳定基线。

## 补充（2026-03-09｜Phase 14 UI 对齐）
- 队列 pill 移入搜索框右侧同排；Review overlay 的遮罩从搜索框下方覆盖结果抽屉区域（仅暗结果区）。
- Review 展开时：结果抽屉 inert/aria-hidden 锁定；点击搜索框关闭 Review，队列 pill 可切换；关闭后焦点回到搜索框。

## 补充（2026-03-09｜Phase 15 计划完成）

## 补充（2026-03-09｜Phase 15 执行完成待复验）
- Phase 15 已落地：Tab/Ctrl+Tab 打开 Review、Review 内 Tab trap、Esc 先关 Review；但本容器无法跑 vitest（esbuild spawn EPERM），需本地 `npm run check:all` + 键盘 smoke（见 `.planning/phases/15-keyboard-focus-close-semantics/15-VERIFICATION.md`）。

## 补充（2026-03-09｜Phase 15 门禁已通过）
- 已在沙盒外跑通 `npm run check:all`（含回归/coverage/build/rust）；Phase 15 验证已更新为 `passed`，可推进 Phase 16（动画/视觉系统）。

## 补充（2026-03-09｜Phase 16 讨论完成）
- 视觉基线选 Beta Graphite Cyan；交互激活态统一用品牌色（不再用绿色做品牌）；success 色值先留给执行者。Review 动效：dim→滑入、滑出→去 dim，约 200ms；默认 opacity 调到 0.96（范围仍 0.2~1.0）、壁纸弱化、Review 层级高一阶；Windows 若 resize 抖动明显则降级“一次性 resize + 内部动画”。

## 补充（2026-03-10｜Phase 16 规划完成）

## 补充（2026-03-10｜Phase 16 研究完成）
- 已生成 `.planning/phases/16-animation-visual-system/16-RESEARCH.md`：覆盖 `SIZE-03`/`VIS-01`/`VIS-02`，梳理动效/令牌/Windows resize 降级落点与相关代码路径。

## 补充（2026-03-10｜Phase 16-01 执行完成）
- 主窗口完成 brand/success 分离：引入 `--ui-brand(#4CC9F0)` / `--ui-success(#2DD4BF)`；Queue pill、结果选中/聚焦、主按钮、focus ring、staged feedback 动画统一使用 brand；执行成功反馈仅使用 success。回归：`npm run test:run -- src/components/launcher/parts/__tests__/LauncherReviewOverlay.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-02 执行完成）
- Review overlay 开合动效落地：opening dim 先出现再滑入；closing 先滑出再去 dim；总时长约 200ms，仅 `opacity/transform`。
- `STAGING_TRANSITION_MS=200` 并同步 staging-panel 动画时长；回归：`npm run test:run -- src/composables/__tests__/launcher/useLauncherWatchers.test.ts` 通过。

## 补充（2026-03-10｜Phase 16-03 执行完成）
- 默认透明度提升至 0.96（范围仍 0.2~1.0），同步 CSS `--ui-opacity` 与回归断言，并跑通 `npm run check:all`。

## 补充（2026-03-10｜Phase 16 验证）
- 已生成 `.planning/phases/16-animation-visual-system/16-VERIFICATION.md`（status=`human_needed`，score=3/3）；需在 Windows 手动确认 Review 开合动效与 resize 体感，以及透明度/品牌色观感基线。

## 补充（2026-03-10｜Review 打开背景修复）
- 修复“Review 打开但 query 为空时左侧背景塌陷、看起来像右侧独立抽屉”的观感问题：在 `reviewOpen && !drawerOpen` 时渲染左侧 floor 占位，并在 `stagingExpanded=true` 下始终提供 `drawerFloorViewportHeight`；定向单测已通过。
- 同步修复 Review 列表布局：移除列表 `minHeight`（避免卡片被拉伸出现大空隙），review 面板改为 3 行 grid 并补齐 `min-height: 0`，footer 按钮不再溢出。

## 补充（2026-03-10｜Phase 17 设计落盘）
- 已落盘“面板内 2/3 覆盖抽屉（搜索框下方三层：结果→遮罩→抽屉；点击遮罩关闭并回焦搜索框）”设计稿，并追加到 v2.0 Roadmap：见 `docs/superpowers/specs/2026-03-10-launcher-review-drawer-overlay-design.md` 与 `.planning/phases/17-2-3-in-panel-2-3-review-drawer-overlay/17-CONTEXT.md`。

## 补充（2026-03-10｜Phase 17 规划完成）

## 补充（2026-03-10｜Phase 17 执行完成）
- Review 已回归为“面板内容区内 2/3 overlay 抽屉”，并切断“打开导致窗口变宽”的链路；回归护栏已补齐且 `npm run check:all` 全绿。已生成 `17-VERIFICATION.md`（status=`human_needed`）待 Windows smoke。

## 补充（2026-03-10｜Review 体验微调）
- Review 体验微调（已回滚）：不再强制加深遮罩/增加 preopening 门控/调整 search-main floor 布局。

## 补充（2026-03-11｜Phase 16/17 Windows 验证通过）
- 透明度规则修正：窗口根背景永远保持透明；设置里的“窗口透明度”仅影响 UI 样式（`--ui-opacity` → `--ui-bg` 等），不改变窗口本身透明性。
- 仅移除主窗外圈蓝色描边：删除 `.search-main:focus-within` 的蓝色 `border-color`；`npm run check:all` 全绿。
- 去蓝色主题：`--ui-brand` 改为灰色；搜索匹配高亮单独用 `--ui-search-hl` 保持蓝色。

## 补充（2026-03-11｜UI 微调：队列/暂存区图标按钮）
- 启动器队列入口改为图标按钮，非空显示数量徽标；Review Overlay 的关闭/复制/移除/清空改为纯图标，头部队列信息改为紧凑 Tab 并置于热键提示前。

## 补充（2026-03-11｜UI 设计与操作体验审查）
- 基于对主界面架构白盒审计的细节推导，出具涵盖产品（快捷热键提升、流式编排心智）、设计（高级毛玻璃质感、贝塞尔微动效）、前端技术（结构抽象、焦点管理）视角的综合审查文档，成果存放于 `plan/ui_design_review.md`。

## 补充（2026-03-11｜UI 设计规范一期落地）
- 根据新版对齐 Raycast/Alfred 的紧凑极客风格与系统原生要求，向 `src/styles.css` 大量注入改造代码：
  - **组件质感**：Review 遮罩启用 `backdrop-filter: blur(8px)` 取代纯色，危险按钮采用亮红半透明；
  - **动效弹簧化**：全部主要进入/退出机制及悬停交互 (`.result-item`, `.review-panel`, `.staging-panel`) 剥离默认 ease，切换至 `cubic-bezier(0.175, 0.885, 0.32, 1.15)`；
  - **等宽强约束**：通过 `--ui-font-mono` 强制约束所有的代码片、命令行、参数，并缩小 `padding` 与 `.staging-card` 高度以追求极致的紧凑高频信息密度。
  - **焦点发光**：抛弃灰色高光，启用高饱和 `--ui-search-hl` 色与外发光（`box-shadow`）。

## 补充（2026-03-11｜UI 设计规范二期落地）
- **按键徽标化**：将以往的纯文本拼接（如 `Enter 执行 · Tab 加入队列`）重构为了支持原生的 `<kbd>` 实体按键 UI。完成了 `messages.ts` 与 `useHotkeyBindings.ts` 的结构化对象升级，并打通至 `LauncherSearchPanel.vue`。
- **编排语义升级**：将原本受 Git 影响的“暂存区/队列（Queue）”产品语义全面提升至“执行流/流式编排（Flow）”概念，调整全部中英文本地化文案，为未来的组合技能释放空间。
## 补充（2026-03-11｜UI 设计规范三期落地）
- **动效与反馈强化**：为了达到更加细腻的弹簧交互质感，将原本的 Ease 过渡全面切换为 `cubic-bezier(0.175, 0.885, 0.32, 1.15)` 曲线。
- **毛玻璃悬浮栈 (Glassmorphism Modal)**：彻底重构了 `param-overlay` (参数模态框)、`safety-overlay` (安全拦截确认框) 以及顶部 `execution-toast` (执行反馈通知) 等组件的背景层级，注入 `backdrop-filter: blur` 搭配高半透黑色遮罩，从视觉上削弱了生硬感，强化了层级间的物理隐喻。
- **结构剥离适配 Tauri 窗口边界**：修复因为使用 `fixed` 而导致遮罩漫出圆角边界的渲染隐患，利用 `.launcher-overlays` 限定区域的同时保留了弹窗自身向上下溢出的堆叠感。

## 补充（2026-03-11｜UI 设计规范四期落地）
- **极客密度排版 (Information Density)**：大幅压缩了主搜索结果列表 (`.result-item` 高度从 `52px` 降至 `44px`) 和执行卡片 (`.staging-card` 高度降至 `56px`)，有效提升了单屏指令容纳量与效率感。
- **状态引导情感化 (Empty State Experience)**：彻底解决因 Tauri 固定高度策略导致的空态信息截断问题，把空面板文案改构为极致紧凑的单行 Flex 对齐（附加 `<kbd>Esc</kbd>` 徽标），确保在最极端的情况下也能完美渲染反馈。
- **弹性折叠消除卡片溢出**：放弃了陈腐的“一参一行” Grid 写法，将 `.staging-card__args` 变构为动态水平延伸的 `flex-wrap: wrap` 弹性流布局。如果暂存卡片存在多个参数（如多个路径或 User / Host 等），它们将横向并排贴合；同时解锁了 `.review-panel` 的绝对防截断 (`overflow-y: auto`)，告别长卡片被硬切的 Bug。
- **危险操作高可见性**：重塑了 `.btn-danger` 垃圾桶等毁灭性操作的视觉表达，改用 `bg-red/10` 辅以高饱和红色字号，消灭了深色模式下旧版暗红的黏滞感。

## 补充（2026-03-11｜暂存区 UI 三项修复）
- 多语言补全：`messages.ts` 新增 `common.copied`/`common.copyFailed`/`launcher.queueEmptyHint` 中英文 key，去除组件中硬编码 fallback。
- 卡片高度截断修复：`STAGING_CARD_EST_HEIGHT` 从 96→140，让 `maxHeight` 计算为多参数卡片预留更多空间。
- 参数弹窗加深：`.param-dialog` 背景 0.7→0.92，`.param-overlay` 加半透明遮罩 `rgba(0,0,0,0.35)`。
- 参数弹窗遮罩修复：`LauncherParamOverlay` 移入 `.search-shell` 内，`.param-overlay` 从 `fixed` 改为 `absolute` + `blur(8px)` + `border-radius`，遮罩不再溢出到窗口透明区域；`.param-dialog` 加 `max-height + overflow-y: auto` 溢出保护。

## 补充（2026-03-12｜弹窗替换为双抽屉导航栈设计稿）

- Launcher：参数/高危从弹窗改为左侧 Flow 抽屉导航栈（左进右出），可与右侧 Review 抽屉并存；单抽屉 2/3、双抽屉 1/2+1/2。设计稿：`docs/superpowers/specs/2026-03-12-launcher-flow-drawer-nav-stack-design.md`。

## 补充（2026-03-12｜安装 superpowers skills）

- 已按 superpowers 安装文档完成：克隆到 `~/.codex/superpowers`，并在 `~/.agents/skills/superpowers` 建立 junction 指向 `skills/`；需重启 Codex 以发现技能。

## 补充（2026-03-12｜superpowers 改为项目内生效）

- 已将 superpowers 克隆到 `D:/own_projects/zapcmd/.codex/superpowers`，并把其 skills 以 junction 挂入 `D:/own_projects/zapcmd/.codex/skills/`（同名 `brainstorming` 已跳过，保留项目定制版）。

## 补充（2026-03-12｜收敛 superpowers skills 命名空间）

- 已移除项目 `D:/own_projects/zapcmd/.codex/skills/` 下 13 个摊平的 superpowers skills junction，仅保留 `D:/own_projects/zapcmd/.codex/skills/superpowers` 入口；项目自带 `brainstorming` 未改动。

## 补充（2026-03-12｜superpowers 入口改为相对 symlink）

- 已将 `D:/own_projects/zapcmd/.codex/skills/superpowers` 从 junction 改为目录符号链接（symlink），Target 为相对路径 `../superpowers/skills`，提升跨设备/跨路径迁移的可用性（仍需确保仓库目录一并迁移）。

## 补充（2026-03-12｜superpowers 前置边界加载）

- 已新增项目覆盖 skill：`.codex/skills/using-superpowers`，用于在任何 superpowers 工作流（含自动/子代理）前强制读取 `AGENTS.md` / `CLAUDE.md` / `.ai/*` 规则。

## 补充（2026-03-12｜Launcher Flow 抽屉落地）

- 参数/高危确认改为左侧 Flow 抽屉（左进右出），与 Review 同开均分；Flow 打开禁用搜索输入，点 Search Capsule=Esc 回退；两抽屉共用 floor-height（最小 6 行：`LAUNCHER_DRAWER_FLOOR_ROWS`）与最大展示行数（10 行：`LAUNCHER_DRAWER_MAX_ROWS`），同款 scrim（滚动条隐藏）。
- 修复 Windows 下 Vite/Vitest 配置加载：`dev/build/preview` 用 `--configLoader native`，测试用 `vitest.config.js` + no-spawn 插件。

## 补充（2026-03-13｜收尾与回归）

- Settings 未保存关闭从 `window.confirm` 改为内置确认层；Flow 抽屉确认右退动效更明显；Flow 设计稿已补充“已实现”标注。

## 补充（2026-03-13｜Flow 动效与UI细化设计稿）

- 新增 `docs/superpowers/specs/2026-03-13-launcher-flow-drawer-motion-ux-polish-design.md`：改用状态类+keyframes，关闭先退场后 emit；提示统一 `.keyboard-hint`。

## 补充（2026-03-13｜UI/UX 审查 v3 执行完成）

- 已完成 6 项 UI/UX 精修：搜索框左侧搜索图标、result-drawer/staging-list 细滚动条（4px）、空状态图标+加粗标题、入队热键改为 CmdOrCtrl+Enter（含 CmdOrCtrl 跨平台支持）、Tab 释放（toggleQueue 默认值清空，合并到 switchFocus/Ctrl+Tab）、Review 关闭按钮增大（32×32）。
- hotkeys.ts 新增 CmdOrCtrl 修饰符支持（normalize/matches/formatHint 三处）；handleMainGlobalHotkeys 中 executeQueue 加碰撞守卫避免与 stageSelected 冲突。
- settings 验证允许 toggleQueue 为空（HotkeyFieldDefinition 新增 optional 标记）。
- 全部 428 测试通过，`npm run check:all` 全绿。

## 补充（2026-03-13｜窗口 Rust 缓动动画设计完成）

- 完成窗口尺寸调整优化的 brainstorming 阶段，设计已通过 spec review。
- 方案：Rust 端帧步进缓动动画（ease_out_cubic，120ms），智能防抖（扩展即时、收缩延迟 300ms），tokio::time::sleep 驱动。
- 设计文档：`docs/superpowers/specs/2026-03-13-window-resize-rust-animation-design.md`
- 下一步：新会话中执行 `/superpowers:executing-plans` 以主代理串行实现计划；`Codex` 下实现型子代理当前默认不用，仅保留只读/审查型子代理与“限定文件范围的无命令改动”子代理。

## 补充（2026-03-13｜窗口 Rust 缓动动画实现计划完成）

- 完成 writing-plans 阶段，实现计划已通过 3 轮 chunk 审查并修复所有 Critical/Important 反馈。
- 计划文档：`docs/superpowers/plans/2026-03-13-window-resize-rust-animation.md`
- 3 Chunks / 18 Tasks：Rust 动画引擎（Task 1-5）→ 前端改造（Task 6-12）→ 测试回归+验证（Task 13-18）
- 关键设计决策：AtomicU64 代纪计数器替代 AtomicBool 取消令牌；syncWindowSizeCore 策略模式复用双路径。
- 下一步：新会话中执行实现计划。

## 补充（2026-03-13｜窗口 Rust 缓动动画实现完成）

- 已在 `feat/window-resize-rust-animation` 分支完成全部 18 Tasks（3 Chunks），`npm run check:all` 全绿。
- Rust 端：`animation.rs` 新增 AnimationController + ease_out_cubic + 帧循环 + 智能防抖（扩展即时/收缩延迟 300ms）。
- 前端：controller.ts 移除 72ms debounce，拆分 animate/immediate 双路径；watchers 移除 staging guard。
- 测试：5 项 Rust 单元测试 + 全部 TS 测试回归通过（含 P0/P1/P2）。
- 下一步：Windows 手动验收（平滑扩展/收缩/动画中断/DPI 缩放），然后合并到 main。

## 补充（2026-03-14｜启动器 UX 三项修复）

- 已完成启动器 UX 三项修复并合并到 main：搜索面板水平居中（`place-items: start center`）、搜索框防缩频闪（`flex-shrink:0 + min-height`）、操作完成后保留搜索结果并全选聚焦（`appendToStaging` 不再清空搜索，`scheduleSearchInputFocus(true)` 全选）。
- `npm run check:all` 全绿，18/18 测试通过。
- 待手动验证：紧凑状态打开执行流不频闪、搜索面板居中、stage/执行后搜索结果保留+全选、Esc 取消参数输入焦点回搜索框（不全选）。

## 补充（2026-03-14｜黑曜石主题系统 brainstorming 完成）

- 完成 UI 大重构 brainstorming 阶段，设计已通过 spec review（2 轮）。
- 方案：移除 Tailwind → CSS 按功能模块拆分（7 文件） → 双层变量（`--theme-*` + `--ui-*`） → `data-theme` 属性切换 → 黑曜石沉浸风首发 → 多主题架构就绪。
- 关键设计：RGB 三元组保留 `rgba()` 兼容、`--ui-opacity` 联动保留、毛玻璃 `data-blur` 可选开关、`index.html` 防闪烁脚本。
- 设计文档：`docs/superpowers/specs/2026-03-14-obsidian-theme-system-design.md`
- 下一步：新会话中执行 `/superpowers:writing-plans` 创建实现计划。

## 补充（2026-03-14｜黑曜石主题系统实现计划完成）

- 完成 writing-plans 阶段，实现计划已通过 2 轮审查并修复全部 3 Critical + 6 Important 反馈。
- 计划文档：`docs/superpowers/plans/2026-03-14-obsidian-theme-system.md`
- 4 Chunks / 15 Tasks：Wave 1 架构准备（Task 1-6）→ Wave 2 主题基础设施（Task 7-10）→ Wave 3 视觉切换（Task 11-13）→ Wave 4 设置 UI + 收尾（Task 14-15）
- 关键：双层变量（`--theme-*` → `--ui-*`）、`data-theme` 属性切换、防闪烁 localStorage 脚本、跨窗口同步复用现有 settingsSyncChannel。

## 补充（2026-03-15｜黑曜石主题系统实现完成）

- 15 个 Task 全部落地并合并到 main，435 测试全绿（lint + typecheck + test）。
- CSS 模块化：2615 行 styles.css → 7 模块（reset/tokens/themes/shared/launcher/settings/animations）。
- 双层变量架构：`--theme-*`（主题层） → `--ui-*`（语义层），`data-theme` 属性切换。
- 新增文件：themeRegistry.ts / useTheme.ts / obsidian.css / tokens.css / reset.css 等。
- settingsStore 扩展 theme + blurEnabled；防闪烁脚本 + context.ts 集成。
- 设置页新增主题选择器 + 毛玻璃开关；硬编码色值迁移到语义变量（40+ 处）。
- 移除 Tailwind CSS 依赖（tailwindcss/autoprefixer/postcss）。
- 待手动验证：`npm run tauri:dev` 下主题切换、跨窗口同步、毛玻璃降级效果。
- ✅ 手动验证通过（2026-03-15）。黑曜石主题系统完整交付。

## 补充（2026-03-15｜执行流面板重构 brainstorming + writing-plans 完成）

- 完成 brainstorming + writing-plans 两个阶段，设计文档和实现计划均通过 spec/plan review。
- 设计文档：`docs/superpowers/specs/2026-03-15-flow-panel-toast-redesign-design.md`
- 实现计划：`docs/superpowers/plans/2026-03-15-flow-panel-toast-redesign.md`
- 方案概要：ReviewOverlay → FlowPanel（覆盖 search-main 全高）+ 卡片紧凑参数标签 + 4 项新 toast + 主题审计
- 3 Chunks / 14 Tasks，下一步：新会话中执行实现计划。

## 补充（2026-03-15｜执行流面板重构实现完成）

- 14 Task / 13 commits 全部落地并合并到 main，445 测试全绿（lint + typecheck + test + build + check:rust）。
- Toast 补全：4 个 i18n key + 5 个触发点（入队/删除/清空/单执行/队列执行）。
- 主题审计：修复 1 处硬编码色值（`#ececf1` → `var(--ui-text)`）。
- FlowPanel 重构：ReviewOverlay → FlowPanel（git mv + DOM 提升到 search-main 全高覆盖）+ CSS 全面重命名 `.review-*` → `.flow-panel*`。
- 三段式布局：标题栏（拖拽区+计数徽标+清空/关闭）/ 可滚动卡片列表 / 底部执行按钮。
- 卡片紧凑参数：`key: value` 标签 + 点击内联编辑 + 命令预览 + mousedown 150ms 拖拽门控。
- Toast 双渲染槽：FlowPanel 开时 toast 在面板内，关时在搜索框内。
- 新增 10 项组件级测试。
- 待手动验证：`npm run tauri:dev` 下 FlowPanel 全高覆盖、紧凑参数编辑、拖拽排序、toast 反馈。
- 修复遗留：FlowPanel 右侧未贴边（overlay 下 margin 冲突）+ 拖拽排序不生效（drag 事件绑定回 `li`）；`npm run check:all` 全绿。
- 修复遗留：FlowPanel 在部分环境原生 drag 不触发，新增「抓手 mousedown + hover」重排兜底（不依赖 HTML5 drag），并补充回归测试；`npm run check:all` 全绿。
- FlowPanel 拖拽体验优化：队列重排增加 move 动画（TransitionGroup）+ 拖拽中/目标卡片高亮（`staging-card--dragging/--drag-over`）；`npm run check:all` 全绿。
- 修复抓手兜底拖拽在卡片边界处抖动：由 `mouseover` 改为 `mousemove`，并按目标卡片上下半区阈值触发重排，避免两卡片来回交换；测试覆盖，`npm run check:all` 全绿。

## 补充（2026-03-15｜参数面板重构 brainstorming + writing-plans 进行中）

- 完成 brainstorming：参数填写/高危确认从左侧抽屉改为 Raycast 风格页面推入。
- 设计文档：`docs/superpowers/specs/2026-03-15-command-panel-nav-stack-design.md`（已通过 2 轮 spec review）
- 关键决策：导航栈架构、三场景合一 CommandPanel、24h 免提示、FlowPanel 保持独立右侧抽屉、Esc LIFO。
- 实现计划初稿：`docs/superpowers/plans/2026-03-15-command-panel-nav-stack.md`（4 Chunks / 18 Tasks）
- **计划待修复 9C+16I**：navStack 应在 runtime.ts 创建；App.vue/viewModel.ts 遗漏；safetyDialog 队列渲染缺失；useI18n→useI18nText；测试路径。
- 下一步：新会话中修复计划审查反馈，通过后执行。

## 补充（2026-03-15｜参数面板重构实现完成）

- needsPanel→navStack 推 CommandPanel；dangerDismiss 24h 免提示；单命令高危确认内嵌面板，队列安全确认保留 SafetyOverlay。
- 热键改 `commandPanelOpen`；删除旧 FlowDrawer/ParamOverlay；回归测试适配完成；`npm run check:all` 全绿。
- 合并前对齐：dangerDismiss 读取即清理过期+启动时清理；CommandPanel 高危 stage 按钮也为红色；队列按钮 aria-count 修正；清理空判断；`npm run check:all` 全绿。

## 补充（2026-03-16｜LauncherFrame 外框统一修复设计）

- 确认：保留 drag-strip；drag-strip 下引入统一 LauncherFrame（Search/Command/Flow/Safety 统一圆角/边框/裁剪）；最大高度按搜索最大行数口径统一；进入 CommandPanel 不缩小仅按需增高，超出内部滚动；修复点击即隐藏。

## 补充（2026-03-16｜LauncherFrame 外框统一 writing-plans 完成）

- 已产出可执行实现计划：`docs/superpowers/plans/2026-03-16-launcher-frame-height-unification.md`（命中/窗口 sizing/overlay 去重/外框对齐与测试验收点齐全）。

## 补充（2026-03-16｜LauncherFrame 高度/拖拽 bugfix）

- 修复：进入参数面板不缩小（floor 取进入前高度，仍受 designCap 上限）；CommandPanel 高度估算忽略搜索 drawerHeight，且 pendingCommand 禁用 layout measured height 防止误拉满；同步 `--launcher-frame-height` 让外框随窗口填充。参数面板开 FlowPanel 保持最小高度；FlowPanel 去除常驻 transform 并补 drag-region。验收：`npm run check:all`。
- 修复补充：参数面板增高时外框底部圆角裁切（frame 高度改为基于 DOM 视口计算）；从参数面板返回后搜索框聚焦增加重试；`npm run check:all` 全绿。

## 补充（2026-03-17｜Settings 面板重构进展）

- 完成独立入口（`settings.html`/`src/main-settings.ts`/`src/AppSettings.vue`）与 Vite 多入口；Rust settings 窗口改指 `settings.html`（`.decorations(false)`）。新增 `SToggle/SSegmentNav/SSelect/SSlider` 及单测，`npm run check:all` 全绿。
- 已完成 Task 11（即时保存 persistence）：重写 `useSettingsWindow/persistence` 为即时保存链路（含写入失败回滚），更新 `index.ts` 接线与单测；`npm run test:run -- src/composables/__tests__/settings/` 通过。

## 补充（2026-03-17｜Settings Task 15）

- 外观/关于页改为卡片布局；外观用 `SToggle` + `SSlider`（0.2-1.0，百分比显示）并保留预览；关于页新增品牌头部（⚡占位）+ 信息/操作卡片；组件单测已更新并通过。

## 补充（2026-03-18｜Settings UI 精修）

- SSegmentNav：激活态改为白色高亮（`rgba(255,255,255,0.12)` 背景 + 亮白文字），对比度显著提升，更接近 Raycast 风格。
- settings.css 全面重写：卡片改为无内边距+行内分隔线布局；`settings-card__label` 改为亮白（`rgba(255,255,255,0.88)`）；行高从 `8px 0` 升至 `13px 16px`；拖拽栏改为交通灯圆点按钮。
- SettingsWindow.vue：窗口控制按钮改为 macOS 风格圆点（关/最小/最大化顺序），`toggleMaximize`/`isMaximized` 加防御性判断。
- capabilities/default.json：补充 `allow-toggle-maximize`/`allow-minimize`/`allow-is-maximized` 权限，修复最大化按钮无效问题。
- 全部 35 条 settings 回归测试通过。

## 补充（2026-03-17｜内置命令 P0）

- 修正内置命令跨平台差异（SHA256/时间戳/ZIP/端口探测），补齐 Windows 日志查看（tail/head/wc），新增 Redis 内置命令源 `_database.md`，并将 `speed-test` 标记为高危。

## 补充（2026-03-18｜Settings UI 精修 brainstorming 定稿）

- 设计已确认：Settings 改为原生窗控稳定版；放弃“窗控与 Tab 同一物理行”，改为原生标题栏 + 独立 topbar 的物理分层，但视觉保持同一窗口头部；中性深色、accent 克制使用；响应式采用有上限布局，普通页 720px、Commands 1120px。

## 补充（2026-03-18｜Settings UI 精修 writing-plans 完成）

- 已产出执行计划：`docs/superpowers/plans/2026-03-18-settings-ui-refinement-stable.md`。先用 contract test 锁定原生窗口壳体与 capability 收口，再做 shell 样式、5 个子页面精修与全量验证。
## 补充（2026-03-18｜Settings UI 精修稳定版完成）

- 已完成原生标题栏 + 应用 topbar 的稳定版 Settings 精修并合入 main；focused settings 55/55、`npm run check:all` 全绿。剩余仅为完整 Windows GUI 人工验收。
## 补充（2026-03-18｜Settings 二次精修设计确认）
- 已确认仅修 settings 视觉呈现，不动业务逻辑；方向为内容区单滚动、Hotkeys 间距/录制器收紧、Select 紧凑化、终端下拉去路径。设计稿待进入 writing-plans。
## 补充（2026-03-18｜Settings 二次精修 writing-plans 完成）
- 已产出执行计划：`docs/superpowers/plans/2026-03-18-settings-scroll-spacing-select-polish.md`，仅覆盖 settings.css / SSelect / General / Hotkeys 与相关回归，不改业务逻辑。

## 补充（2026-03-18｜Settings 二次精修收口）
- 已完成单滚动、终端下拉 label-only、Hotkeys 双区收口，并补上 SSelect 长列表键盘滚动守卫；focused settings 47 条与 `check:all` 全绿，待 Windows GUI 手验。

## 补充（2026-03-19｜Settings 商业化审查 spec）
- 已完成审查稿 `docs/superpowers/specs/2026-03-19-settings-window-commercial-review-design.md`：结论为架构基础达标，但白闪、拖拽模型不一致、Commands 视图态即时持久化仍未达商业化完成态；下一步应进入 P0/P1 修复计划。

## 补充（2026-03-19｜Settings 商业化 P0/P1 实施计划）
- 已产出计划 `docs/superpowers/plans/2026-03-19-settings-window-commercial-p0-p1.md`：P0=首帧 bootstrap+延迟显示；P1=Commands 视图态改瞬态、topbar 收口为原生标题栏下的导航壳体。

## 补充（2026-03-19｜Settings 商业化 P0/P1 实现完成）
- 已完成 settings 首帧深色 bootstrap + ready-show、Commands 视图态瞬态化不落盘、topbar 收口为 nav shell；focused tests 与 `npm run check:all` 已跑通，Windows GUI 手验待人工执行。

## 补充（2026-03-19｜Settings 顶部/热键/滚动精修设计）
- 已确认新设计稿：移除 topbar 外层卡片壳，改强层叠头部；Hotkeys 录制器按内容自适应；内容区滚动条隐藏且左右留白区滚轮也可滚动。
## 补充（2026-03-19｜Settings 顶部/热键/滚动 writing-plans 完成）
- 已产出计划 `plan/2026-03-19-settings-topbar-hotkeys-scroll-polish-implementation-plan.md`：覆盖 topbar 去壳、全宽滚动宿主、Hotkeys 录制器自适应与相关回归，不改业务逻辑。

## 补充（2026-03-19｜Settings 顶部/热键/滚动 executing 完成）
- 已完成 topbar 去 nav-shell、全宽 scroll host、Hotkeys 录制器内容自适应；focused settings 与 `npm run check:all` 全绿，业务逻辑未改。

## 补充（2026-03-19｜Settings 顶部 Tab 视觉修正）
- 用户复测后补修顶部中线与 tab 胶囊形态：改为仅保留底部分隔线，tab 对齐 Raycast 风格圆角矩形，并拉开按钮间距与底部留白。
## 补充（2026-03-19｜Settings 顶部 Tab 默认态去框）
- 用户二次复测更正：tab 默认态必须无按钮框感；hover/active 仅通过背景加深与文字提亮表达状态，不再使用可见边框或阴影。
## 补充（2026-03-19｜Launcher 返回高度恢复 spec）
- 已确认方案：参数面板返回搜索页走统一退出链路，先锁住当前高度，待搜索页稳定后一次平滑回落到最终搜索高度；所有返回入口共用同一逻辑。

## 补充（2026-03-19｜Launcher 返回高度恢复计划）
- 已产出计划 `docs/superpowers/plans/2026-03-19-launcher-command-return-height-restore.md`：返回按钮与 Esc 收口到 `requestCommandPanelExit()`，sizing 新增退出锁高协调器，下一步执行并做 Tauri 手验。

## 补充（2026-03-19｜Launcher 返回高度恢复实现完成）
- 已收口 `requestCommandPanelExit + search-page-settled`，新增 exit lock/单次回落协调器；`npm run check:all` 全绿，用户手验确认返回搜索页高度抖动已修复。
- 已合并到 `main`，`feature/launcher-command-return-height-restore` 分支与 worktree 已清理。

## 补充（2026-03-19｜Launcher 统一高度 contract 设计）
- 已确认 Search/Command/Flow 共享同一最大高度 cap；CommandPanel 改为 header/content/footer 三段式，成功提交返回也并入统一锁高退出链路。

## 补充（2026-03-19｜Launcher 统一高度 contract 实现计划）
- 已产出计划 `docs/superpowers/plans/2026-03-19-launcher-unified-panel-height-contract.md`：先锁共享 cap/结构测试，再落地样式与 sizing，最后收口 submit 成功返回链路并完成 Tauri 手验。

## 补充（2026-03-19｜Launcher 统一高度 contract 执行完成）
- 已完成外框水平居中、共享 panel max-height、CommandPanel footer 内收；参数提交改为显式成功返回，成功后由 App 触发统一退出锁高。`npm run check:all` 全绿。

## 补充（2026-03-19｜Launcher 参数页残留空白修正）
- 已定位为 `nav-slide out-in` 时序问题：参数页未挂载时误读旧搜索高度。现改为缺席 `.command-panel` 时不采旧 shell 高度，并在参数页 after-enter 后补一次 sizing sync；`npm run check:all` 全绿。

## 补充（2026-03-19｜Launcher 参数页锁高 contract 更正设计）
- 已新增更正规格：参数页进入先继承搜索页实际高度，首次 settled 后按完整盒子高度一次锁定；footer 必须计入总高度，参数页生命周期内不再回缩或再增高，仅 content 内滚动。
## 补充（2026-03-19｜Launcher 参数页锁高更正规划完成）
- 已产出实现计划 `docs/superpowers/plans/2026-03-19-launcher-command-panel-height-lock.md`：拆分 `entrySearchFrameHeight/commandPanelLockedFrameHeight`，新增完整盒子测量 helper，保留现有退出锁高恢复链路。
## 补充（2026-03-20｜Launcher 面板高度 contract brainstorming 完成）
- 已确认设计稿 `docs/superpowers/specs/2026-03-20-launcher-command-flow-height-contract-correction-design.md`：全局只统一最高高度；Search 最低=搜索框；Command/Flow 各自独立最小高度并首次锁高；Command 完整盒子含 footer；Flow 最低按空态或前 2 张异高卡片实时测量。重点风险已写入设计并要求在 planning/实现中显式处理。
## 补充（2026-03-20｜Launcher 搜索有效高度继承设计）
- 已确认新规：搜索有效高度仅=搜索框+结果区，不含拖拽区/底部呼吸留白；Command 进入先继承该有效高度，不够再补高；三面板共享最高高度仍取搜索页最大结果态。见 `docs/superpowers/specs/2026-03-20-launcher-search-effective-height-inheritance-design.md`。
## 补充（2026-03-27｜主滚动容器细滚动条 brainstorming 完成）
- 已确认 A 向细滚动条 + 方案 2：在 `tailwind.css` 新增 `.scrollbar-subtle`，替换 Settings 的 `.scrollbar-none`，覆盖 Settings 主内容区与 Launcher 主列表/主面板滚动容器。
## 补充（2026-03-27｜主滚动容器细滚动条 writing-plans 完成）
- 已产出计划 `docs/superpowers/plans/2026-03-27-main-scrollbar-subtle-polish.md`：按 TDD 先锁 utility/contract，再迁移 Settings 与 Launcher 主滚动容器，并在执行末尾完成 Windows 手验。
