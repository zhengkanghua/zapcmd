# ZapCmd 项目改名计划：Zap → ZapCmd

> **创建日期**：2026-02-27
> **状态**：待审批
> **说明**：项目尚未上线开源，无需兼容性迁移。直接全量替换。

---

## 一、命名规范映射

| 场景 | 旧值 | 新值 |
|------|------|------|
| **产品显示名** | `Zap` | `ZapCmd` |
| **npm 包名** | `zap` | `zapcmd` |
| **Rust crate 名** | `zap` | `zapcmd` |
| **Rust lib 名** | `zap_lib` | `zapcmd_lib` |
| **App Identifier** | `com.zap.desktop` | `com.zapcmd.desktop` |
| **localStorage 键** | `zap.settings` | `zapcmd.settings` |
| **Session 键** | `zap.session.launcher` | `zapcmd.session.launcher` |
| **用户数据目录** | `~/.zap/` | `~/.zapcmd/` |
| **BroadcastChannel** | `zap-settings-sync` | `zapcmd-settings-sync` |
| **HTML ID** | `zap-search-input` | `zapcmd-search-input` |
| **终端输出前缀** | `[zap]` | `[zapcmd]` |
| **CI artifact 名** | `zap-*-bundle` | `zapcmd-*-bundle` |
| **Author 元数据** | `zap-team` | `zapcmd-team` |
| **Schema URL** | `https://zap.dev/schemas/...` | `https://zapcmd.dev/schemas/...` |
| **品牌 CSS 变量** | `--zap-*` | `--zapcmd-*` |

---

## 二、完整文件变更清单

> 以下所有改动均为直接替换，无需兼容性逻辑。

### 2.1 配置文件（5 个）

| # | 文件 | 变更 |
|---|------|------|
| 1 | `package.json` | `"name": "zap"` → `"name": "zapcmd"` |
| 2 | `index.html` | `<title>Zap</title>` → `<title>ZapCmd</title>` |
| 3 | `src-tauri/Cargo.toml` | `name = "zap"` → `"zapcmd"`; `"zap_lib"` → `"zapcmd_lib"`; description; authors |
| 4 | `src-tauri/tauri.conf.json` | `productName` → `"ZapCmd"`; `identifier` → `"com.zapcmd.desktop"`; window `title` |
| 5 | `src-tauri/src/main.rs` | `zap_lib::run()` → `zapcmd_lib::run()` |

### 2.2 Rust 后端（3 个）

| # | 文件 | 变更 |
|---|------|------|
| 6 | `src-tauri/src/windowing.rs` | `.title("Zap Settings")` → `.title("ZapCmd Settings")` |
| 7 | `src-tauri/src/startup.rs` | `.tooltip("Zap")` → `.tooltip("ZapCmd")` |
| 8 | `src-tauri/src/command_catalog.rs` | `dir.push(".zap")` → `dir.push(".zapcmd")` |

### 2.3 前端源码（7 个）

| # | 文件 | 变更 |
|---|------|------|
| 9 | `src/stores/settingsStore.ts` | `"zap.settings"` → `"zapcmd.settings"`（三个常量直接改，不做回退读取） |
| 10 | `src/composables/app/useAppLifecycle.ts` | `"zap-settings-sync"` → `"zapcmd-settings-sync"` |
| 11 | `src/composables/launcher/useLauncherSessionState.ts` | `"zap.session.launcher"` → `"zapcmd.session.launcher"` |
| 12 | `src/composables/launcher/useTerminalExecution.ts` | 所有 `[zap]` → `[zapcmd]` |
| 13 | `src/i18n/messages.ts` | `"Zap 启动器"` → `"ZapCmd 启动器"`; `"Zap Launcher"` → `"ZapCmd Launcher"` |
| 14 | `src/components/settings/parts/SettingsAppearanceSection.vue` | 预览文字 `"Zap"` → `"ZapCmd"` |
| 15 | `src/components/launcher/parts/LauncherSearchPanel.vue` | `"zap-search-input"` → `"zapcmd-search-input"` |

### 2.4 CI/CD 工作流（2 个）

| # | 文件 | 变更 |
|---|------|------|
| 16 | `.github/workflows/release-build.yml` | artifact: `zap-*-bundle` → `zapcmd-*-bundle`; pattern 同步 |
| 17 | `.github/workflows/release-dry-run.yml` | artifact: `zap-dryrun-*-bundle` → `zapcmd-dryrun-*-bundle` |

### 2.5 内置命令 JSON + 示例（10 个）

| # | 文件 | 变更 |
|---|------|------|
| 18-25 | `assets/runtime_templates/commands/builtin/_*.json`（8 个） | `"author": "zap-team"` → `"zapcmd-team"` |
| 26 | `assets/runtime_templates/commands/my-commands.sample.json` | `"hello zap"` → `"hello zapcmd"` |
| 27 | `scripts/generate_builtin_commands.ps1` | `"zap-team"` → `"zapcmd-team"` |

### 2.6 测试文件（12 个）

| # | 文件 | 变更 |
|---|------|------|
| 28 | `src/__tests__/app.failure-events.test.ts` | `#zap-search-input` → `#zapcmd-search-input` |
| 29 | `src/__tests__/app.settings-hotkeys.test.ts` | `"zap.settings"` → `"zapcmd.settings"` |
| 30 | `src/__tests__/app.hotkeys.test.ts` | `#zap-search-input` → `#zapcmd-search-input` |
| 31 | `src/features/security/__tests__/commandSafety.test.ts` | 保持原样（`zap*` 是进程名通配符测试，与品牌无关） |
| 32 | `src/services/__tests__/tauriBridge.test.ts` | `.zap/commands` → `.zapcmd/commands` |
| 33 | `src/features/commands/__tests__/schemaGuard.test.ts` | `author: "zap"` → `author: "zapcmd"` |
| 34 | `src/features/commands/__tests__/runtimeLoader.test.ts` | `.zap/commands` → `.zapcmd/commands` |
| 35 | `src/composables/__tests__/settings/useCommandManagement.test.ts` | `.zap/commands` → `.zapcmd/commands` |
| 36 | `src/composables/__tests__/launcher/useTerminalExecution.test.ts` | `[zap]` → `[zapcmd]` |
| 37 | `src/composables/__tests__/launcher/useCommandCatalog.test.ts` | `.zap/commands` → `.zapcmd/commands` |
| 38 | `src/composables/__tests__/app/useAppLifecycle.test.ts` | `"zap.settings"` 等 → 新键名 |
| 39 | `src/composables/__tests__/app/useAppLifecycleBridge.test.ts` | `"zap.settings"` → `"zapcmd.settings"` |

### 2.7 Schema / 示例（3 个）

| # | 文件 | 变更 |
|---|------|------|
| 40 | `docs/schemas/command-file.schema.json` | `$id` URL + `title` + example author |
| 41 | `docs/schemas/examples/command-file.platform-split.json` | `"zap-team"` → `"zapcmd-team"` |
| 42 | `docs/schemas/examples/command-file.min.json` | `"zap-team"` + `"hello zap"` |

### 2.8 文档文件（~18 个）

| # | 文件 | 变更 |
|---|------|------|
| 43 | `AGENTS.md` | 标题 `Zap` → `ZapCmd` |
| 44 | `AGENTS_backup.md` | 标题 |
| 45 | `LICENSE` | `Zap Contributors` → `ZapCmd Contributors` |
| 46 | `CONTRIBUTING.md` | `Zap` → `ZapCmd` |
| 47 | `CONTRIBUTING.zh-CN.md` | 同上 |
| 48 | `SUPPORT.md` | 同上 |
| 49 | `SUPPORT.zh-CN.md` | 同上 |
| 50 | `README.md` | `Zap` → `ZapCmd`; `~/.zap/` → `~/.zapcmd/`; `zap.settings` → `zapcmd.settings`; GitHub URL |
| 51 | `README.zh-CN.md` | 同上 |
| 52 | `CHANGELOG.md` | 在 `[Unreleased]` 中记录改名 |
| 53 | `docs/.maintainer/requirements/branding.md` | 全面更新品牌名、CSS 变量、路径 |
| 54 | `docs/.maintainer/requirements/architecture_plan.md` | 存储键 / 路径 |
| 55 | `docs/.maintainer/requirements/m0_m4_task_breakdown.md` | 同上 |
| 56 | `docs/.maintainer/requirements/ui_design_spec.md` | 同上 |
| 57 | `docs/.maintainer/requirements/ui_product_contract.md` | 同上 |
| 58 | `docs/.maintainer/work/*.md`（6 个） | 标题、路径引用 |
| 59 | `docs/builtin_commands.md` | 标题 |
| 60 | `docs/schemas/README.md` | 路径引用 |

### 2.9 自动生成文件（不手动改）

| 文件 | 处理 |
|------|------|
| `src-tauri/Cargo.lock` | 改完 `Cargo.toml` 后 `cargo build` 自动更新 |
| `coverage/` | 自动生成，不需要改 |

---

## 三、你需要手动处理的事项

### 3.1 GitHub 仓库：新建 zapcmd（方案 C：干净起点）

我们不 rename 旧仓库，而是新建一个全新仓库作为开源初始版本。步骤如下：

#### 第 1 步：在 GitHub 上创建空仓库

```
1. 打开 https://github.com/new
2. Repository name: zapcmd
3. Description: Desktop command launcher focused on speed, safety, and repeatable workflows.
4. 选择 Public（开源）
5. ⚠️ 不要勾选 "Add a README file"
6. ⚠️ 不要勾选 "Add .gitignore"
7. ⚠️ 不要勾选 "Choose a license"
   （以上三项必须都不勾选，否则会产生冲突 commit）
8. 点击 "Create repository"
```

创建完成后你会看到一个空仓库页面，上面显示 push 命令，暂时不要操作。

#### 第 2 步：本地准备代码

确保所有改名改动已完成（我负责代码改动，你只需确认）。然后在项目目录下：

```bash
# 确认当前代码状态干净
git status

# 确认所有改动已 commit
# （如果有未 commit 的改动，先 commit）
```

#### 第 3 步：重建 git 历史（关键步骤）

```bash
# 1. 先备份旧的 .git（以防万一）
#    在 Windows 上:
ren .git .git_backup

# 2. 重新初始化仓库
git init

# 3. 添加所有文件
git add -A

# 4. 创建初始 commit
git commit -m "Initial release: ZapCmd v0.2.0"

# 5. 确保主分支名为 main
git branch -M main

# 6. 添加新的远程仓库
git remote add origin https://github.com/zhengkanghua/zapcmd.git

# 7. 推送到 GitHub
git push -u origin main
```

#### 第 4 步：验证推送成功

```
1. 打开 https://github.com/zhengkanghua/zapcmd
2. 确认能看到代码
3. 确认只有 1 个 commit
4. 确认 README 正常显示
```

#### 第 5 步：清理备份

推送成功后，删除旧的 git 备份：

```bash
# Windows 上删除 .git_backup 目录:
rmdir /s /q .git_backup
```

#### 第 6 步：处理旧仓库

旧的 `zhengkanghua/zap` 仓库你有两个选择：

**选项 A：直接删除**（推荐，如果确定不需要历史）
```
1. 打开 https://github.com/zhengkanghua/zap/settings
2. 滚动到最底部 "Danger Zone"
3. 点击 "Delete this repository"
4. 输入仓库名 "zhengkanghua/zap" 确认
5. 点击 "I understand the consequences, delete this repository"
```

**选项 B：归档（保留只读）**
```
1. 打开 https://github.com/zhengkanghua/zap/settings
2. 滚动到最底部 "Danger Zone"
3. 点击 "Archive this repository"
4. 仓库变为只读状态，不能再 push，但代码和历史可查看
```

#### 第 7 步：配置新仓库的 CI/Actions

新仓库需要重新配置以下内容：

**GitHub Actions 权限**：
```
1. 打开 https://github.com/zhengkanghua/zapcmd/settings/actions
2. 确认 "Actions permissions" 为 "Allow all actions and reusable workflows"
3. 打开 "Workflow permissions" 设为 "Read and write permissions"
```

**Branch 保护规则**（可选，推荐）：
```
1. 打开 https://github.com/zhengkanghua/zapcmd/settings/branches
2. 点击 "Add branch protection rule"
3. Branch name pattern: main
4. 勾选 "Require a pull request before merging"（可选）
5. 勾选 "Require status checks to pass before merging"（可选）
```

**Dependabot**：
```
如果项目中已有 .github/dependabot.yml，推送后会自动生效，不需要额外配置。
```

**CodeQL**：
```
如果项目中已有 .github/workflows/ 下的 CodeQL 工作流，推送后也会自动生效。
```

### 3.2 本地开发环境清理

改名代码完成后，执行以下清理（只需做一次）：

#### 清理 localStorage

```
1. 运行 npm run tauri:dev 启动应用
2. 在 main 窗口或 settings 窗口上按 F12 打开 DevTools
3. 切换到 Application 标签页
4. 左侧展开 Local Storage → http://127.0.0.1:5173
5. 找到并删除以下键（如果存在的话）：
   - zap.settings
   - zap.settings.hotkeys
   - zap.settings.general
   - zap.session.launcher
6. 关闭 DevTools，刷新页面
```

或者更简单的方式——在 DevTools Console 中执行：
```javascript
localStorage.removeItem("zap.settings");
localStorage.removeItem("zap.settings.hotkeys");
localStorage.removeItem("zap.settings.general");
localStorage.removeItem("zap.session.launcher");
```

#### 清理用户数据目录

```bash
# Windows PowerShell:
Remove-Item -Recurse -Force "$env:USERPROFILE\.zap"

# 或 CMD:
rmdir /s /q "%USERPROFILE%\.zap"
```

> 如果目录不存在会报错，忽略即可。

#### 清理 Rust 构建缓存

```bash
# 删除旧的编译缓存（旧 crate 名会残留）
rmdir /s /q src-tauri\target
```

然后重新构建：
```bash
npm run tauri:dev
```

首次构建会重新编译所有 Rust 依赖（包括新的 crate 名 `zapcmd`）。

### 3.3 品牌图片资源

需要你目视检查以下文件：

| 文件 | 检查项 |
|------|--------|
| `docs/img/brand.png` | 是否包含 "Zap" 文字？如果有，需要用设计工具改为 "ZapCmd" |
| `src-tauri/icons/*.png` / `*.ico` / `*.icns` | 图标中是否有文字？纯图形图标不需要改 |

如果图标中有文字需要更新，重新生成各尺寸：
```bash
npx @tauri-apps/cli icon path/to/your/new-icon.png
```

### 3.4 验证步骤

代码改名全部完成后，依次执行：

```bash
# 1. 全量检查
npm run check:all

# 2. 开发模式启动
npm run tauri:dev
#    验证：窗口标题、托盘 tooltip 显示 "ZapCmd"

# 3. 构建验证
npm run tauri:build
#    验证：生成的安装包文件名包含 "ZapCmd"
```

---

## 四、实施步骤

### 我执行（代码改动）

1. 配置文件改名（package.json / Cargo.toml / tauri.conf.json / main.rs / index.html）
2. Rust 后端改名（windowing / startup / command_catalog）
3. 前端源码改名（store / composables / i18n / components）
4. 测试文件更新
5. CI/CD 工作流更新
6. 内置命令 JSON + Schema + 示例更新
7. 文档文件更新
8. `cargo build` 重新生成 Cargo.lock

### 你执行（环境操作）

9. 清理本地开发环境（localStorage + `~/.zap/` + `src-tauri/target/`）
10. GitHub 创建新仓库 zapcmd（按 3.1 步骤）
11. 重建 git 历史 + 推送
12. 处理旧仓库（删除或归档）
13. 配置新仓库 Actions 权限
14. 检查品牌图片
15. 运行验证步骤
