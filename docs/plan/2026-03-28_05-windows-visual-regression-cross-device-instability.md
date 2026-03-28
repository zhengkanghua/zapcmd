# Windows 视觉回归跨设备环境不稳定问题归档

> 创建日期：2026-03-28  
> 状态：进行中  
> 优先级：P1  
> 版本目标：v1.0.x

---

## 1. 背景与目标

1. 背景：
   当前仓库已经支持三种视觉回归口径：Windows 原生 `test:visual:ui`、WSL 桥接 Windows Edge `test:visual:ui`、Linux smoke `test:visual:ui:linux`。在同一提交 `261af33` 下，设备一 Windows 运行视觉回归通过，但设备二 Windows 在清理 `dist` 与 `.tmp/e2e/visual-regression`、重新 `npm run build` 后仍稳定出现 7 个 baseline mismatch，说明问题不是“旧产物未清理”导致。
2. 目标（用户价值）：
   将该问题明确归档为“跨 Windows 设备渲染环境不稳定”，沉淀排查口径、环境采集模板、canonical baseline machine 策略与后续治理方向，避免后续把环境漂移误判为 UI 逻辑回归。

## 2. 范围（In / Out）

### 2.1 In Scope

1. 归档当前 7 个 Windows baseline mismatch 的已观察现象、复现步骤与已排除项。
2. 固化与问题直接相关的代码证据，包括视觉回归脚本稳定化参数、字体 token、Unicode icon 渲染入口。
3. 定义后续排查必须采集的环境信息模板。
4. 定义短期治理口径，包括 canonical baseline machine、环境日志补充与组件层去系统依赖方向。

### 2.2 Out of Scope

1. 本文档不直接修改视觉回归脚本、UI 组件或 baseline 文件。
2. 本文档不把 Linux smoke 升级为最终 blocking baseline。
3. 本文档不直接裁定设备二 baseline 为新的 canonical baseline。

## 3. 用户故事

> 作为维护 ZapCmd 视觉回归门禁的开发者，我希望能区分“真实 UI 回归”和“不同 Windows 设备的渲染环境漂移”，这样我可以在更新 baseline、排查缺陷或解释 CI/本地差异时有一致口径，而不是反复猜测。

## 4. 交互与行为口径（Current vs Roadmap）

1. Current（当前已实现/本需求落地后立即生效的行为）：
   - Windows 仍是最终 blocking visual baseline。
   - WSL 桥接已打通，但桥接成功不等于与现有 Windows baseline 一致。
   - 设备一在提交 `261af33` 上可通过 Windows visual；设备二在同提交、fresh build 后仍出现以下 7 项 mismatch：
     - `settings-ui-overview`
     - `settings-ui-dropdown-open`
     - `settings-ui-slider`
     - `settings-ui-hotkey-recorder`
     - `settings-appearance-motion-preset`
     - `launcher-motion-surfaces-expressive`
     - `launcher-motion-surfaces-steady-tool`
2. Roadmap（明确标注为未来计划，不混写）：
   - 将视觉场景中的系统字体与 Unicode icon 依赖降到最低。
   - 为视觉回归补充环境日志，减少“只看到 diff，看不到环境”的诊断盲区。
   - 若需要跨多设备稳定通过，再评估仓库内置字体、SVG icon 或专用 visual harness 字体方案。

## 5. 数据与配置（如涉及）

1. 新增/变更数据文件（路径 + schema）：
   - 本次只新增问题归档文档：`docs/plan/2026-03-28_05-windows-visual-regression-cross-device-instability.md`
2. 设置项（key + 默认值 + 迁移策略）：
   - 本次不新增设置项。
3. 关键证据文件（必须基于仓库现状理解，不得猜测）：
   - 视觉回归运行器已固定多项稳定化参数：`scripts/e2e/visual-regression-runner.cjs`
   - 视觉回归模式说明：`scripts/README.md`
   - 视觉场景配置：`scripts/e2e/visual-regression-config.cjs`
   - 全局字体 token：`src/styles/tokens.css`
   - Settings 导航 icon 来源：`src/composables/settings/useSettingsWindow/viewModel.ts`
   - Visual harness icon 来源：`src/AppVisual.vue`
   - `SSegmentNav` 直接渲染 `icon: string`：`src/components/settings/ui/SSegmentNav.vue`

## 6. 验收标准（可验证）

1. 仓库内有一份正式文档，明确给出结论：当前问题本质上是视觉回归在不同 Windows 设备上的渲染环境不稳定，而不是当前代码逻辑故障。
2. 文档必须列出已排除项，至少包含：
   - 旧 `dist` / 旧 actual 产物污染
   - WSL 桥接基础设施失败
   - baseline 更新命令使用错误
3. 文档必须列出高概率根因，至少包含：
   - 系统字体栈与 fallback 差异
   - Unicode icon 文本渲染差异
   - Edge / Windows 版本差异带来的文字栅格化差异
4. 文档必须提供统一环境采集模板，供设备一、设备二后续对比使用。
5. `docs/active_context.md` 需补充一条不超过 200 字的短期记忆。

## 7. 测试计划

### 7.1 自动化测试（必须）

1. 本次仅修改文档，不新增自动化测试。
2. 最低验证：
   - `git diff --check`

### 7.2 人工回归（按需）

1. 设备对比时统一执行：
   - `git fetch origin`
   - `git checkout feat/review-remediation`
   - `git pull --ff-only origin feat/review-remediation`
   - `git rev-parse --short HEAD`
   - 清理 `dist` 与 `.tmp/e2e/visual-regression`
   - `npm run build`
   - `npm run test:visual:ui`
2. 若出现 mismatch，同步保留：
   - `.tmp/e2e/visual-regression/*.actual.png`
   - `.tmp/e2e/visual-regression/*.browser.log`
   - 命令完整输出

## 8. 文档同步清单

1. `docs/active_context.md`
2. 若后续开始代码治理，再同步：
   - `scripts/README.md`
   - `.ai/AGENTS.md`
   - 相关实施计划文档

## 9. 风险与回滚

1. 风险点：
   - 若继续把“设备二 mismatch”视为代码缺陷，容易误改 UI 或错误更新 baseline。
   - 若不记录环境差异，后续每次换机器都可能重复同一轮排查。
   - 若直接在现有组件中继续使用系统字体 + Unicode icon 作为关键视觉基线，跨设备不稳定会持续存在。
2. 回滚策略：
   - 本次只新增文档，无运行时回滚动作；若结论被新证据推翻，仅需更新本文档与 `docs/active_context.md`。

## 10. 任务拆解（可选）

1. 固化问题判断
   - 把设备一通过、设备二失败、同提交 fresh build 仍失败的事实写入仓库文档。
2. 统一排查口径
   - 后续凡出现跨设备 mismatch，先比对环境，再决定是否归因到代码。
3. 补环境采集模板
   - Windows 版本
   - Edge 实际路径与版本
   - 关键字体安装情况
   - 视觉回归 browser log
4. 确定 canonical baseline machine 策略
   - 明确哪台设备负责生成和更新 Windows baseline。
5. 规划后续治理
   - 优先级 1：给视觉回归输出补环境日志。
   - 优先级 2：把关键 Unicode icon 收口为 SVG 或受控 icon 组件。
   - 优先级 3：评估为 visual harness 或产品 UI 引入仓库内置字体，降低系统依赖。

## 11. 已观察事实与已排除项

### 11.1 已观察事实

1. 设备二在以下流程后仍出现 7 个 mismatch，说明不是“没拉到最新代码”：
   - `git checkout feat/review-remediation`
   - `git pull --ff-only origin feat/review-remediation`
   - `git rev-parse --short HEAD` 输出 `261af33`
2. 设备二在删除 `dist` 与 `.tmp/e2e/visual-regression` 后重新 `npm run build`、`npm run test:visual:ui`，仍出现 mismatch，说明不是简单的旧 `dist` 污染。
3. mismatch 主要集中在 Settings 导航、Settings visual harness、Launcher motion surface 两组场景，均包含大量文本、图标字符、系统字体参与的渲染。
4. 设备二环境信息已确认：
   - Windows 10 Pro，`OsBuildNumber=19045`
   - `Segoe UI` 存在
   - `Segoe UI Variable` 不存在
   - `Fira Code` / `JetBrains Mono` / `Noto Sans` 不存在

### 11.2 已排除项

1. 不是旧 actual 图导致的单次误判。
   - 用户已提供 fresh build 后的另一组 actual hash，说明不是第一次运行残留文件被重复比较。
2. 不是 WSL 桥接本身故障。
   - 当前失败发生在原生 Windows 设备执行 `npm run test:visual:ui` 时；截图能生成、diff 也能计算，属于“渲染不一致”而不是“基础设施失败”。
3. 不是视觉回归脚本未固定尺寸、DPI 或首帧时间。
   - `scripts/e2e/visual-regression-runner.cjs` 已固定 `--force-device-scale-factor=1`、`--window-size`、`--virtual-time-budget=2500`、`--disable-gpu`、`--run-all-compositor-stages-before-draw`。

## 12. 当前高概率根因

1. 系统字体栈差异
   - `src/styles/tokens.css` 把全局字体定义为 `"Segoe UI", "Helvetica Neue", "Noto Sans", sans-serif`，而设备二缺少 `Noto Sans`。
   - 等宽字体定义为 `"Fira Code", "JetBrains Mono", "SF Mono", Consolas, Monaco, monospace`，设备二缺少 `Fira Code` 与 `JetBrains Mono`。
   - 不同 fallback 会改变文字宽度、字重、hinting 与 anti-aliasing。
2. Unicode icon 文本差异
   - `src/composables/settings/useSettingsWindow/viewModel.ts` 使用 `⌨ / ⚙ / ☰ / ✦ / ℹ` 作为导航 icon。
   - `src/AppVisual.vue` 也直接使用 `⚙ / ✦ / ℹ`。
   - `src/components/settings/ui/SSegmentNav.vue` 把 `icon: string` 原样渲染为文本节点，不受控于统一 icon 字体或 SVG。
3. Edge / Windows 版本差异
   - 即使布局尺寸一致，不同 Edge / WebView2 / Windows build 组合仍可能在字形栅格化与 subpixel 处理上产生稳定 diff。

## 13. 环境采集模板

后续任何 Windows baseline mismatch 都按以下模板回传，避免信息不完整：

```powershell
git rev-parse --short HEAD

$edge = @(
  "${Env:ProgramFiles(x86)}\\Microsoft\\Edge\\Application\\msedge.exe",
  "$Env:ProgramFiles\\Microsoft\\Edge\\Application\\msedge.exe",
  (Get-Command msedge -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$edge
& $edge --version

Get-ComputerInfo |
  Select-Object WindowsProductName, WindowsVersion, OsBuildNumber, OsHardwareAbstractionLayer

Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts' |
  Select-Object `
    'Segoe UI (TrueType)',
    'Segoe UI Variable (TrueType)',
    'Consolas (TrueType)',
    'Fira Code (TrueType)',
    'JetBrains Mono (TrueType)',
    'Noto Sans (TrueType)'
```

同时附带：

1. `npm run build` 与 `npm run test:visual:ui` 的完整控制台输出
2. `.tmp/e2e/visual-regression/*.browser.log`
3. 若需人工比对，再补 `.actual.png` 与 baseline 截图

## 14. 建议决策

1. 短期决策：
   - 把当前问题统一定义为“跨 Windows 设备环境不稳定”，不是立即继续追 UI 逻辑 bug。
   - 设备一作为当前更接近 canonical baseline 的候选机器，设备二先作为对照样本，补齐环境采集后再决定是否需要双机收敛。
2. 中期治理：
   - 给视觉回归日志增加浏览器版本、Windows 版本、关键字体存在性输出。
   - 将关键截图中的 Unicode icon 收口为 SVG / 受控 icon 组件。
   - 为 visual harness 或关键 UI 场景引入仓库内可控字体资源，降低系统 fallback 差异。
3. 长期策略：
   - 若产品发布口径要求“任意 Windows 机器都应通过同一 baseline”，则需要系统性清理文本栅格化差异来源，而不是继续依赖“本机字体碰巧一致”。
