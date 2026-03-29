# 受控 Visual Runner 设计

> 日期：2026-03-28
> 状态：设计已确认，待规划
> 范围：将 Windows visual regression 从“依赖开发机本地浏览器与字体”改为“由受控 runner 产出 blocking 结果”，并保留本机 compare 作为诊断口径
>
> 关联：
> - `docs/plan/2026-03-28_05-windows-visual-regression-cross-device-instability.md`
> - `docs/plan/2026-03-28_06-windows-visual-regression-stability-implementation-plan.md`
> - `scripts/e2e/visual-regression.cjs`
> - `scripts/e2e/visual-regression-lib.cjs`
> - `scripts/e2e/visual-regression-runner.cjs`
> - `src/AppVisual.vue`

---

## 1. 背景

当前视觉回归虽然已经补齐了：

1. Windows / WSL / Linux 三种运行口径
2. `environment.json` / `browser.log` 诊断产物
3. visual harness 的 SVG icon 与稳定字体作用域

但这条链路仍把 blocking baseline 建立在“开发机自己的 Edge + 系统字体栈”上。
设备1 可以通过，设备2 在同一提交、fresh build 下仍稳定出现 7 项 mismatch；最新诊断已经确认设备2 的运行环境为：

1. Edge `146.0.3856.84`
2. 缺少 `Fira Code` / `JetBrains Mono`
3. 存在 `Noto Sans SC` / `Microsoft YaHei`

这说明当前问题已经不是脚本缺陷，而是 baseline 继续暴露在“本机浏览器版本 + 本机字体栅格化”的漂移面上。

如果继续要求每一台 Windows 开发机都跑出同一组 blocking baseline，后续设备3、设备4 仍会重复同样的问题。
因此，本轮不再追求“每台本机都必须过同一 baseline”，而是把 blocking gate 收口到单一受控环境。

---

## 2. 方案选择

评估 3 种做法后，采用 **方案 A：受控 runner 产出 blocking baseline，本机 compare 退为诊断口径**。

| 方案 | 思路 | 结论 |
|---|---|---|
| A. 受控 runner | blocking 只认固定浏览器 + 受控字体的 runner；开发机继续本地 compare，但不作为最终 gate | **采用** |
| B. 本机全受控 | 让每台开发机都下载同一浏览器和字体，本地也跑最终 baseline | 否决，接入/维护成本高，设备漂移仍会反复出现 |
| C. 只固定浏览器 | 浏览器统一，字体仍走系统回退 | 否决，无法真正解决文本栅格化漂移 |

本设计后续所有规划都以方案 A 为唯一基线。

---

## 3. 设计目标

本轮设计目标是：

1. 将真正 blocking 的视觉回归限定在单一受控 runner 上执行，而不是要求任意开发机本地都与 baseline 完全一致。
2. 为 blocking 模式固定浏览器版本与视觉字体资源，收掉当前最主要的跨设备漂移源。
3. 保留 `windows-edge` / `wsl-windows-edge` / `linux-chromium` 这些本地模式，但重新定义为“诊断 / smoke / 对照”，不再混同为最终 baseline。
4. 让 visual harness 的受控字体只作用于截图链路，不污染真实产品 UI 运行时。
5. 在文档、脚本和本地 gate 中明确区分：
   - 哪条命令是 blocking
   - 哪条命令只是本机 compare
   - mismatch 应该如何解释

---

## 4. 非目标

本轮明确不做：

1. 不再继续要求设备2、设备3 去对齐 canonical Windows 机器的 Edge 版本。
2. 不把真实产品窗口的运行时字体统一替换成仓库字体。
3. 不把 Linux smoke baseline 升级成最终 Windows blocking baseline。
4. 不在本轮引入“自动更新 baseline”的高权限流水线。
5. 不把视觉回归改造成 Playwright/E2E 大框架迁移；现有 `visual.html + headless screenshot` 路线继续沿用。

---

## 5. 总体设计

### 5.1 运行模式重定义

当前模式保留，但职责重分：

1. `windows-edge`
   - 继续可在本机运行
   - 结果只用于诊断“当前机器与 blocking baseline 差多少”
   - 不作为最终 gate
2. `wsl-windows-edge`
   - 继续作为桥接诊断口径
   - 主要用于验证 WSL 与 Windows 的路径 / 启动链路
   - 不作为最终 gate
3. `linux-chromium`
   - 继续作为开发期 smoke
   - 不参与 Windows blocking baseline 判定
4. 新增 `controlled-runner`
   - 只在专用 runner/CI 环境执行
   - 使用固定 Chromium 可执行文件和仓库内置字体
   - 这是唯一 blocking visual gate

### 5.2 baseline 目录分层

baseline 不再由“平台”决定，而是由“是否受控”决定。

建议目录：

```text
scripts/e2e/visual-baselines/controlled-runner/
scripts/e2e/visual-baselines/linux-chromium/
```

原有 Windows baseline 要迁移或明确标记为 legacy，不再继续作为默认 blocking 目录。

### 5.3 命令分层

命令入口需要明确分开：

1. `npm run test:visual:ui`
   - 改为本机 compare / diagnose 默认入口
   - 保留当前平台自动判断逻辑
2. `npm run test:visual:ui:runner`
   - 只给受控 runner 用
   - 明确要求受控浏览器、受控字体、受控 baseline
3. `npm run verify:local`
   - 本地默认不再因为 `test:visual:ui` mismatch 阻断
   - 仍可执行本地 compare，并输出 artifact 路径
4. CI / 专用 runner
   - 新增唯一 blocking visual job
   - 执行 `npm run test:visual:ui:runner`

---

## 6. 受控浏览器设计

### 6.1 浏览器来源

`controlled-runner` 不再依赖系统安装的 Edge。
改为由仓库脚本明确指向固定版本的 Chromium-family 二进制。

优先级：

1. 受控 runner 预装固定浏览器，并通过环境变量注入绝对路径
2. 若后续需要，再补仓库脚本下载/校验缓存，但这不是第一阶段前提

设计要求：

1. `environment.json` 必须记录固定浏览器版本
2. blocking 模式下若浏览器版本不匹配，直接报错退出，而不是继续截图
3. `windows-edge` / `wsl-windows-edge` 继续允许读取系统 Edge，用于诊断

### 6.2 现有 screenshot runner 复用

不重写现有 screenshot 逻辑。
继续复用：

1. headless 启动参数
2. 静态服务器
3. `--screenshot`
4. visual diff 流程

变化只在于 `resolveBrowserRuntime()` 会为 `controlled-runner` 返回固定浏览器路径与严格版本约束。

---

## 7. 受控字体设计

### 7.1 字体策略

阻断级视觉回归不能再依赖系统字体回退。
`controlled-runner` 必须只使用仓库内受控字体资源。

约束：

1. 仅限 visual harness 使用
2. 不覆盖真实产品运行时字体
3. sans 与 mono 都必须受控

### 7.2 作用域

新的字体只挂在 `visual.html` / `AppVisual.vue` 根作用域。

大致形态：

```css
.visual-regression-root {
  font-family: var(--ui-font-visual-sans-controlled);
  --ui-font-mono: var(--ui-font-visual-mono-controlled);
}
```

### 7.3 字体来源要求

第一阶段不追求“完整产品字体资产”，只追求“足够覆盖当前 visual harness 文案”。

因此设计上允许：

1. mono 直接使用轻量的开源字体文件
2. sans 使用受控的 CJK 子集字体
3. 资源只放到 `public/fonts/visual-regression/`

关键原则：

1. 必须合法可分发
2. 体积要可控
3. 优先子集化，避免把完整大字体直接塞进仓库

---

## 8. visual harness 改造边界

### 8.1 保持业务 UI 不变

真实产品窗口不改。
只改：

1. `visual.html`
2. `AppVisual.vue`
3. visual 字体 CSS 入口

### 8.2 visual 专用 CSS 入口

建议新增独立的 visual 字体样式文件，例如：

```text
src/styles/visual-fonts.css
```

它只负责：

1. `@font-face`
2. visual controlled font token
3. 不参与真实窗口样式入口

这样可避免后续把测试字体误扩散到产品运行时。

---

## 9. 本地 compare 与 blocking gate 的职责边界

### 9.1 本地 compare

本地机器运行视觉回归时，目标是回答：

1. 我本机现在渲染成什么样
2. 与 blocking baseline 差多少
3. 差异更像是环境问题还是代码问题

所以本地 compare 继续保留：

1. `actual.png`
2. `diff.json`
3. `browser.log`
4. `environment.json`

但文档与脚本输出必须明确说明：

> 本地 mismatch 不等价于最终 visual gate 失败。

### 9.2 blocking gate

最终 gate 只回答一件事：

> 在受控浏览器 + 受控字体环境下，当前提交是否改变了 UI 像素结果。

这样一来，设备2、设备3 的本机环境差异不会再直接把团队卡死。

---

## 10. verify-local 与 CI 口径

### 10.1 `verify:local`

本地验证口径改成：

1. `check:all`
2. 可选或非阻断的本地 visual compare

即：

1. 本机 mismatch 可以提示
2. 但默认不把它作为 release gate

### 10.2 CI / Runner

新增单独 blocking job：

1. 安装或提供固定浏览器
2. 使用受控字体资源
3. 运行 `npm run test:visual:ui:runner`
4. 失败时上传：
   - `actual`
   - `diff`
   - `environment.json`
   - `browser.log`

---

## 11. 文档与沟通口径

脚本说明、README 和 active context 需要统一成以下事实：

1. Windows 本机 visual compare 不再等价于 blocking baseline
2. blocking baseline 只来自 `controlled-runner`
3. 任何开发机 mismatch 先看 `environment.json`，不要直接判定为 UI 回归
4. baseline 更新只能在 runner 对应受控环境中完成

---

## 12. 验收标准

本设计落地后，至少要满足以下结果：

1. 新增 `controlled-runner` 视觉回归模式，并成为唯一 blocking gate。
2. blocking 模式使用固定浏览器版本，不再依赖系统 Edge。
3. blocking 模式使用仓库内受控字体，不再依赖系统字体回退。
4. visual harness 的受控字体只作用于截图链路，不影响真实产品 UI。
5. `verify:local` 不再因为开发机本地 visual mismatch 直接阻断。
6. 文档明确区分“本机 compare”与“blocking gate”。
7. `environment.json` 仍保留完整事实，便于开发机与 runner 对照。

---

## 13. 设计结论

本轮最终结论不是“继续让所有设备对齐 canonical baseline”，而是把视觉回归重新定义为两层体系：

1. 开发机本地 compare：用于诊断，不负责定义最终真相
2. 受控 runner baseline：用于 blocking gate，才是唯一像素事实源

这条路线能直接消除“设备2 修好了，设备3 又坏了”的无限循环。
后续实现的核心不是继续微调系统字体栈，而是把 blocking 结果从本机环境中剥离出来。
