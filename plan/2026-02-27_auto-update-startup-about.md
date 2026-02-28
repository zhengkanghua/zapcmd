# ZapCmd 功能增强计划：检测更新 & 开机自启 & 关于页面

> **创建日期**：2026-02-27
> **更新日期**：2026-02-27（v2：改名 ZapCmd + 集中配置方案）
> **状态**：待审批
> **涉及范围**：Rust 后端 / Vue 前端 / Tauri 配置 / CI/CD 工作流 / Settings Store
> **前置依赖**：项目改名 Zap → ZapCmd 完成后再实施

---

## 一、需求总览

| # | 功能 | 简述 |
|---|------|------|
| 1 | **检测更新 & 自动更新** | 通过 GitHub Releases 检测新版本，支持下载并安装更新；Settings 中提供配置开关 |
| 2 | **开机自启** | 系统启动时自动运行 ZapCmd；Settings 中提供配置开关 |
| 3 | **关于页面** | 新增 Settings 路由，展示版本号 / 构建信息 / 项目链接，提供手动检测更新按钮 |

---

## 二、集中配置方案（新增）

### 2.0.1 问题

公钥、GitHub 仓库地址、更新端点等配置如果分散在 `tauri.conf.json`、`vite.config.ts`、Vue 组件中，难以维护。

### 2.0.2 方案：`.env.keys` + `scripts/sync-keys.mjs`

**项目根目录新增 `.env.keys`**：

```ini
# ZapCmd 项目密钥与环境配置
# =============================
# 此文件集中管理需要在多处引用的配置值。
# 构建脚本 (scripts/sync-keys.mjs) 读取此文件并同步到各配置文件。
#
# ⚠️ 仅含公钥（公开信息），不含私钥。
#    私钥仅存于 GitHub Secrets 和本地 ~/.tauri/zapcmd.key。

# Tauri Updater 公钥（验证更新包签名）
TAURI_UPDATER_PUBKEY=在这里粘贴你的公钥

# GitHub 仓库信息
GITHUB_OWNER=zhengkanghua
GITHUB_REPO=zapcmd

# 更新检测端点
UPDATER_ENDPOINT=https://github.com/zhengkanghua/zapcmd/releases/latest/download/latest.json
```

**新增同步脚本 `scripts/sync-keys.mjs`**：

读取 `.env.keys`，写入以下目标：

| 配置项 | 目标文件 | 目标路径 |
|--------|----------|----------|
| `TAURI_UPDATER_PUBKEY` | `src-tauri/tauri.conf.json` | `plugins.updater.pubkey` |
| `UPDATER_ENDPOINT` | `src-tauri/tauri.conf.json` | `plugins.updater.endpoints[0]` |
| `GITHUB_OWNER` | 供 `vite.config.ts` 读取 | `define.__GITHUB_OWNER__` |
| `GITHUB_REPO` | 供 `vite.config.ts` 读取 | `define.__GITHUB_REPO__` |

**集成到构建链**：

```jsonc
// package.json scripts
{
  "keys:sync": "node scripts/sync-keys.mjs",
  "tauri:dev": "npm run version:sync && npm run keys:sync && tauri dev",
  "tauri:build": "npm run version:sync && npm run keys:sync && tauri build --bundles msi"
}
```

**前端使用方式**：

```typescript
// vite.config.ts
import { readFileSync } from "node:fs";

function readEnvKeys(): Record<string, string> {
  const content = readFileSync(".env.keys", "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...valueParts] = trimmed.split("=");
    result[key.trim()] = valueParts.join("=").trim();
  }
  return result;
}

const envKeys = readEnvKeys();

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GITHUB_OWNER__: JSON.stringify(envKeys.GITHUB_OWNER ?? ""),
    __GITHUB_REPO__: JSON.stringify(envKeys.GITHUB_REPO ?? ""),
  },
  // ...
});
```

```typescript
// src/env.d.ts
declare const __APP_VERSION__: string;
declare const __GITHUB_OWNER__: string;
declare const __GITHUB_REPO__: string;
```

这样关于页面的 GitHub 链接就可以用：
```typescript
const homepageUrl = `https://github.com/${__GITHUB_OWNER__}/${__GITHUB_REPO__}`;
const issuesUrl = `${homepageUrl}/issues`;
```

修改仓库名只需改 `.env.keys` 一处，运行 `npm run keys:sync` 全部同步。

### 2.0.3 `.env.keys` 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.env.keys` | **新增** | 集中配置文件（提交到仓库） |
| `.env.keys.local` | 约定 | 本地覆盖文件（加入 `.gitignore`） |
| `scripts/sync-keys.mjs` | **新增** | 同步脚本 |
| `.gitignore` | 修改 | 添加 `.env.keys.local` |

---

## 三、技术方案详述

### 3.1 检测更新 & 自动更新

#### 3.1.1 技术选型

采用 **Tauri 2 官方 Updater 插件** (`tauri-plugin-updater`)，这是 Tauri 生态的标准方案：

- **Rust 端**：`tauri-plugin-updater = "2"` — 负责请求检测端点、下载安装包、执行安装
- **JS 端**：`@tauri-apps/plugin-updater` — 提供前端 API 供 Vue 层调用
- **更新端点**：GitHub Releases（免费、开源友好、已有 CI 流水线）

#### 3.1.2 更新流程

```
应用启动 ──→ (若 autoCheckUpdate = true 且距上次检查 > 24h)
                │
                ▼
         调用 check() 查询 GitHub endpoint
                │
          ┌─────┴──────┐
          │ 有新版本？  │
          └─────┬──────┘
        是 ↙         ↘ 否
 显示更新通知        静默结束
 (版本号 + 更新日志)
        │
 用户点击"立即更新"
        │
 下载 + 安装 + 重启
```

#### 3.1.3 后端改动（Rust）

**文件：`src-tauri/Cargo.toml`**
```diff
[dependencies]
+ tauri-plugin-updater = "2"
```

**文件：`src-tauri/tauri.conf.json`**（由 `sync-keys.mjs` 自动注入）
```diff
{
  "app": { ... },
+ "plugins": {
+   "updater": {
+     "endpoints": [
+       "https://github.com/zhengkanghua/zapcmd/releases/latest/download/latest.json"
+     ],
+     "pubkey": "（由 .env.keys 同步注入）"
+   }
+ }
}
```

> **签名要求**：Tauri updater 强制要求更新包签名。详见 `plan/2026-02-27_operations-guide.md` 第一节。
> 公钥集中管理在 `.env.keys`，通过 `scripts/sync-keys.mjs` 同步到 `tauri.conf.json`。

**文件：`src-tauri/src/lib.rs`**
- 注册 updater 插件：`.plugin(tauri_plugin_updater::Builder::new().build())`

**文件：`src-tauri/tauri.conf.json` — CSP 更新**
- `connect-src` 中追加 `https://github.com https://*.github.com https://*.githubusercontent.com`，允许前端发起更新请求

#### 3.1.4 前端改动

**新增依赖：`package.json`**
```diff
"dependencies": {
+   "@tauri-apps/plugin-updater": "^2"
}
```

**新增服务层：`src/services/updateService.ts`**

封装更新相关逻辑，职责：
- `checkForUpdate()` — 调用 `@tauri-apps/plugin-updater` 的 `check()` API，返回 `{ available: boolean, version?: string, body?: string }`
- `downloadAndInstall()` — 调用 `update.downloadAndInstall()`，支持进度回调
- 错误处理：网络失败、签名校验失败等场景

**Settings Store 改动：`src/stores/settingsStore.ts`**

`PersistedSettingsSnapshot` 中 `general` 扩展：
```typescript
general: {
  defaultTerminal: string;
  language: AppLocale;
  autoCheckUpdate: boolean;  // 新增：启动时自动检查更新，默认 true
};
```

- `SETTINGS_SCHEMA_VERSION` 升级为 `3`
- 添加 migration 函数：版本 2 → 3 时为 `autoCheckUpdate` 填充默认值 `true`
- 新增 action：`setAutoCheckUpdate(value: boolean)`

**General Section UI 改动：`src/components/settings/parts/SettingsGeneralSection.vue`**

在现有「界面语言」下方增加一个 toggle 开关：
- 标签：`自动检查更新` / `Auto check for updates`
- 控件：开关 (toggle switch)
- 说明文字：`启动时自动检查 GitHub 上的新版本。` / `Automatically check for new versions on GitHub at startup.`

#### 3.1.5 CI/CD 改动

**文件：`.github/workflows/release-build.yml`**

`bundle` job 中增加：
1. 设置环境变量（来自 GitHub Secrets）：
   ```yaml
   env:
     TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
     TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
   ```
2. Tauri 构建时会自动对安装包签名并生成 `.sig` 签名文件
3. 在 `publish-release` job 中，额外收集并上传 `latest.json`（Tauri 构建自动生成）

**`Collect release files` 步骤更新**：
```diff
  mapfile -t files < <(find release-assets -type f \( \
    -name "*.msi" -o \
    -name "*.exe" -o \
    -name "*.dmg" -o \
    -name "*.deb" -o \
    -name "*.rpm" -o \
    -name "*.AppImage" -o \
-   -name "*.appimage" \
+   -name "*.appimage" -o \
+   -name "*.sig" -o \
+   -name "latest.json" \
  \) | sort)
```

#### 3.1.6 签名密钥

详见 **`plan/2026-02-27_operations-guide.md`** 第一节 + 第四节。

摘要：
1. 本地生成密钥对：`npx @tauri-apps/cli signer generate -w ~/.tauri/zapcmd.key`
2. 公钥写入 `.env.keys` → `sync-keys.mjs` 同步到 `tauri.conf.json`
3. 私钥 + 密码存入 GitHub Secrets

---

### 3.2 开机自启

#### 3.2.1 技术选型

采用 **Tauri 2 官方 Autostart 插件** (`tauri-plugin-autostart`)：

- **Rust 端**：`tauri-plugin-autostart = "2"` — 跨平台注册/注销开机启动项
  - Windows：写入注册表 `HKCU\SOFTWARE\Microsoft\Windows\CurrentVersion\Run`
  - macOS：写入 `~/Library/LaunchAgents/`
  - Linux：写入 `~/.config/autostart/` (XDG)
- **JS 端**：`@tauri-apps/plugin-autostart` — 前端 API

#### 3.2.2 后端改动（Rust）

**文件：`src-tauri/Cargo.toml`**
```diff
[dependencies]
+ tauri-plugin-autostart = { version = "2", features = ["serde"] }
```

**文件：`src-tauri/src/lib.rs`**
```diff
+ use tauri_plugin_autostart::MacosLauncher;

pub fn run() {
    tauri::Builder::default()
+       .plugin(tauri_plugin_autostart::init(
+           MacosLauncher::LaunchAgent,
+           None  // 无额外启动参数
+       ))
        .setup(|app| { ... })
        ...
}
```

**新增 Tauri 命令（建议放在新文件 `src-tauri/src/autostart.rs`）**：
- `get_autostart_enabled()` — 查询当前开机自启状态
- `set_autostart_enabled(enabled: bool)` — 启用/禁用开机自启

> `tauri-plugin-autostart` 提供了 `enable()` / `disable()` / `is_enabled()` 方法，Tauri 命令封装后暴露给前端。

#### 3.2.3 前端改动

**新增依赖：`package.json`**
```diff
"dependencies": {
+   "@tauri-apps/plugin-autostart": "^2"
}
```

**Tauri Bridge 扩展：`src/services/tauriBridge.ts`**
```typescript
export async function readAutoStartEnabled(): Promise<boolean> { ... }
export async function writeAutoStartEnabled(enabled: boolean): Promise<void> { ... }
```

**Settings Store 改动：`src/stores/settingsStore.ts`**

`PersistedSettingsSnapshot.general` 扩展：
```typescript
general: {
  defaultTerminal: string;
  language: AppLocale;
  autoCheckUpdate: boolean;
  launchAtLogin: boolean;  // 新增：开机自启，默认 false
};
```

- migration：版本 2 → 3 时为 `launchAtLogin` 填充默认值 `false`
- 新增 action：`setLaunchAtLogin(value: boolean)`
- `apply`/`confirm` 时若 `launchAtLogin` 变化，调用 Tauri Bridge 写入系统

> **重要设计决策**：开机自启是系统级配置，不仅仅是 localStorage 持久化。Settings 应用时需同时调用 Tauri 命令写入系统注册表/启动项。初始化时也需从系统读取真实状态来同步 UI。

**General Section UI 改动：`src/components/settings/parts/SettingsGeneralSection.vue`**

在「自动检查更新」下方增加一个 toggle 开关：
- 标签：`开机自启` / `Launch at login`
- 控件：开关 (toggle switch)
- 说明文字：`系统启动时自动运行 ZapCmd。` / `Automatically start ZapCmd when the system boots.`

---

### 3.3 关于页面

#### 3.3.1 路由扩展

**文件：`src/features/settings/types.ts`**
```diff
- export type SettingsRoute = "hotkeys" | "general" | "commands" | "appearance";
+ export type SettingsRoute = "hotkeys" | "general" | "commands" | "appearance" | "about";
```

**文件：`src/composables/settings/useSettingsWindow/model.ts`**

`tryResolveRouteFromHash` 函数中增加 `"about"` 分支。

#### 3.3.2 导航栏更新

**文件：`src/composables/settings/useSettingsWindow/viewModel.ts`**（或 `route.ts`，视导航项注册位置）

在 `settingsNavItems` 数组末尾追加：
```typescript
{ route: "about", label: t("settings.nav.about") }
```

#### 3.3.3 新增组件

**文件：`src/components/settings/parts/SettingsAboutSection.vue`**

展示内容：

| 字段 | 来源 | 说明 |
|------|------|------|
| 应用名称 | 硬编码 `"ZapCmd"` | 产品名 |
| 版本号 | `__APP_VERSION__` | Vite define 注入，来源 `package.json` |
| 构建平台 | Tauri `get_runtime_platform` 命令 | 已有命令 |
| 项目主页 | `` `https://github.com/${__GITHUB_OWNER__}/${__GITHUB_REPO__}` `` | 来自 `.env.keys` |
| 开源许可 | MIT | 链接到 LICENSE 文件 |
| 问题反馈 | `` `https://github.com/${__GITHUB_OWNER__}/${__GITHUB_REPO__}/issues` `` | 来自 `.env.keys` |

**操作按钮**：

1. **「检查更新」按钮**
   - 点击后调用 `checkForUpdate()`
   - 三种状态：
     - 检查中：按钮显示 loading spinner + "检查中..."
     - 有更新：显示新版本号 + 更新日志摘要 + "立即更新"按钮
     - 已是最新：显示 "当前已是最新版本"
   - 更新下载中：显示进度条

2. **「打开项目主页」按钮**
   - 调用 Tauri shell open（`@tauri-apps/plugin-shell`）在默认浏览器中打开 GitHub 仓库页面
   - 需要额外添加 `tauri-plugin-shell` 依赖

#### 3.3.4 版本号 & 仓库信息注入

**文件：`vite.config.ts`**
```typescript
import pkg from "./package.json";
// readEnvKeys() 读取 .env.keys

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GITHUB_OWNER__: JSON.stringify(envKeys.GITHUB_OWNER ?? ""),
    __GITHUB_REPO__: JSON.stringify(envKeys.GITHUB_REPO ?? ""),
  },
  // ...
});
```

**文件：`src/env.d.ts`**
```typescript
declare const __APP_VERSION__: string;
declare const __GITHUB_OWNER__: string;
declare const __GITHUB_REPO__: string;
```

#### 3.3.5 Settings Window 改动

**文件：`src/components/settings/SettingsWindow.vue`**

在 `<section class="settings-content">` 的 v-if/v-else-if 链末尾增加：
```vue
<SettingsAboutSection
  v-else-if="props.settingsRoute === 'about'"
  :app-version="props.appVersion"
  :runtime-platform="props.runtimePlatform"
  :update-status="props.updateStatus"
  @check-update="emit('check-update')"
  @download-update="emit('download-update')"
  @open-homepage="emit('open-homepage')"
/>
```

#### 3.3.6 Shell 插件（用于打开浏览器）

**文件：`src-tauri/Cargo.toml`**
```diff
[dependencies]
+ tauri-plugin-shell = "2"
```

**文件：`package.json`**
```diff
"dependencies": {
+   "@tauri-apps/plugin-shell": "^2"
}
```

**文件：`src-tauri/src/lib.rs`**
```diff
+       .plugin(tauri_plugin_shell::init())
```

---

### 3.4 i18n 文案补充

**文件：`src/i18n/messages.ts`**

zh-CN 新增：
```typescript
settings: {
  nav: {
    about: "关于"           // 新增
  },
  general: {
    // 已有字段保持不变...
    autoCheckUpdate: "自动检查更新",
    autoCheckUpdateHint: "启动时自动检查 GitHub 上的新版本。",
    launchAtLogin: "开机自启",
    launchAtLoginHint: "系统启动时自动运行 ZapCmd。"
  },
  about: {
    title: "关于",
    version: "版本",
    platform: "运行平台",
    homepage: "项目主页",
    license: "开源许可",
    feedback: "问题反馈",
    checkUpdate: "检查更新",
    checking: "检查中...",
    updateAvailable: "发现新版本 {version}",
    updateBody: "更新内容",
    downloadUpdate: "立即更新",
    downloading: "下载中... {progress}%",
    installing: "安装中...",
    upToDate: "当前已是最新版本",
    updateFailed: "检查更新失败：{reason}",
    openHomepage: "打开项目主页"
  }
}
```

en-US 新增：
```typescript
settings: {
  nav: {
    about: "About"          // 新增
  },
  general: {
    // 已有字段保持不变...
    autoCheckUpdate: "Auto check for updates",
    autoCheckUpdateHint: "Automatically check for new versions on GitHub at startup.",
    launchAtLogin: "Launch at login",
    launchAtLoginHint: "Automatically start ZapCmd when the system boots."
  },
  about: {
    title: "About",
    version: "Version",
    platform: "Platform",
    homepage: "Homepage",
    license: "License",
    feedback: "Feedback",
    checkUpdate: "Check for updates",
    checking: "Checking...",
    updateAvailable: "New version {version} available",
    updateBody: "What's new",
    downloadUpdate: "Update now",
    downloading: "Downloading... {progress}%",
    installing: "Installing...",
    upToDate: "You're up to date",
    updateFailed: "Update check failed: {reason}",
    openHomepage: "Open homepage"
  }
}
```

---

### 3.5 Settings Schema 迁移

`SETTINGS_SCHEMA_VERSION` 从 `2` 升级为 `3`。

迁移逻辑（`migrateSettingsPayload` 函数新增分支）：
```
版本 2 → 3:
  - general.autoCheckUpdate = true  (默认开启)
  - general.launchAtLogin = false   (默认关闭)
```

> 注意：项目尚未上线开源，无需兼容旧 schema。直接使用 v3 作为初始 schema。
> 但保留 migration 函数骨架，方便后续版本升级时复用。

---

## 四、完整文件变更清单

### Rust 后端
| 文件 | 操作 | 内容 |
|------|------|------|
| `src-tauri/Cargo.toml` | 修改 | 添加 `tauri-plugin-updater`、`tauri-plugin-autostart`、`tauri-plugin-shell` 依赖 |
| `src-tauri/tauri.conf.json` | 修改 | 添加 updater 插件配置（由 sync-keys 注入）、更新 CSP |
| `src-tauri/src/lib.rs` | 修改 | 注册 updater / autostart / shell 插件，注册新命令 |
| `src-tauri/src/autostart.rs` | **新增** | 开机自启 Tauri 命令封装 |

### Vue 前端
| 文件 | 操作 | 内容 |
|------|------|------|
| `package.json` | 修改 | 添加 `@tauri-apps/plugin-updater`、`@tauri-apps/plugin-autostart`、`@tauri-apps/plugin-shell` |
| `vite.config.ts` | 修改 | 注入 `__APP_VERSION__` / `__GITHUB_OWNER__` / `__GITHUB_REPO__`；读取 `.env.keys` |
| `src/env.d.ts` | 修改 | 声明全局常量类型 |
| `src/services/updateService.ts` | **新增** | 更新检测/下载/安装封装 |
| `src/services/tauriBridge.ts` | 修改 | 添加 autostart 相关 bridge 函数 |
| `src/stores/settingsStore.ts` | 修改 | schema v3 迁移、新增字段/action |
| `src/features/settings/types.ts` | 修改 | `SettingsRoute` 添加 `"about"` |
| `src/i18n/messages.ts` | 修改 | 中英文新增 about / general 文案 |
| `src/components/settings/types.ts` | 修改 | 新增 `SettingsAboutProps` 接口 |
| `src/components/settings/parts/SettingsAboutSection.vue` | **新增** | 关于页面组件 |
| `src/components/settings/parts/SettingsGeneralSection.vue` | 修改 | 增加 autoCheckUpdate / launchAtLogin 开关 |
| `src/components/settings/SettingsWindow.vue` | 修改 | 增加 about 路由渲染分支 + 新事件 |
| `src/composables/settings/useSettingsWindow/model.ts` | 修改 | 路由解析支持 `"about"` |
| `src/composables/settings/useSettingsWindow/viewModel.ts` | 修改 | 导航项追加 about |

### 集中配置
| 文件 | 操作 | 内容 |
|------|------|------|
| `.env.keys` | **新增** | 集中配置文件（公钥 / 仓库信息 / 端点） |
| `scripts/sync-keys.mjs` | **新增** | 配置同步脚本 |
| `.gitignore` | 修改 | 添加 `.env.keys.local` |

### CI/CD
| 文件 | 操作 | 内容 |
|------|------|------|
| `.github/workflows/release-build.yml` | 修改 | 注入签名密钥、收集 `latest.json` + `.sig` 文件 |

---

## 五、实施步骤（推荐顺序）

> **前提**：项目改名（Zap → ZapCmd）已完成。

### 阶段一：基础设施 & 配置

1. **集中配置**：创建 `.env.keys` + `scripts/sync-keys.mjs` + 集成到构建链
2. **生成 Tauri 签名密钥对**（你手动操作，见操作指南）
3. **公钥写入 `.env.keys`**（你手动操作）
4. **Settings Schema v3 迁移**：升级 store、添加 `autoCheckUpdate` / `launchAtLogin`、编写迁移函数
5. **Vite 配置更新**：注入 `__APP_VERSION__` / `__GITHUB_OWNER__` / `__GITHUB_REPO__` + `env.d.ts`
6. **i18n 文案补充**：中英文双语

### 阶段二：开机自启

7. **Rust 端**：添加 `tauri-plugin-autostart` 依赖 + 插件注册 + 命令封装
8. **前端**：Tauri Bridge 扩展 + General Section UI 添加 toggle

### 阶段三：检测更新 & 自动更新

9. **Rust 端**：添加 `tauri-plugin-updater` 依赖 + 插件注册 + `tauri.conf.json` updater 配置
10. **前端**：`updateService.ts` 封装 + General Section UI 添加 toggle
11. **CI/CD**：release 工作流适配签名 + `latest.json` 上传（你需配置 GitHub Secrets）

### 阶段四：关于页面

12. **Shell 插件**：添加 `tauri-plugin-shell` 依赖 + 注册
13. **路由扩展**：`SettingsRoute` 类型 + 路由解析 + 导航项
14. **SettingsAboutSection.vue** 组件开发
15. **SettingsWindow.vue** 接入 about 组件
16. **启动时自动检查更新逻辑**（条件触发 + 24h 节流）

### 阶段五：验证 & 发布

17. 单元测试：store 迁移、updateService、autostart 逻辑
18. 集成测试：settings 窗口新路由交互
19. `npm run check:all` 全绿
20. 手动测试：本地 `tauri:build` 构建安装包，验证签名、更新流程
21. GitHub dry-run 构建验证

---

## 六、关键设计决策 & 注意事项

### 6.1 更新安全性

- **签名校验**：Tauri updater 强制要求签名，安装包必须用私钥签名，客户端用公钥校验，防止中间人攻击
- **HTTPS Only**：更新端点使用 GitHub HTTPS，不接受 HTTP 降级
- **CSP 限制**：仅放行 `github.com` 和 `githubusercontent.com` 域名

### 6.2 开机自启的注册时机

- **不在应用启动时自动注册**，仅在用户在 Settings 中主动开启时写入系统
- Settings 初始化时从系统读取真实状态（`is_enabled()`），保证 UI 与系统状态同步
- 防止用户手动从系统中删除了启动项但 UI 仍显示"已启用"

### 6.3 更新检查的节流策略

- 启动时自动检查**最多每 24 小时一次**（在 localStorage 记录 `zapcmd.lastUpdateCheck` 时间戳）
- 关于页面中的「检查更新」按钮不受此限制（用户主动检查总是立即执行）

### 6.4 错误处理

- 更新检查失败（网络错误）：静默失败，不弹窗打扰用户（仅在关于页面手动检查时显示错误）
- 下载安装失败：在关于页面显示明确错误信息
- 开机自启设置失败（权限不足等）：在 Settings 中显示错误信息

### 6.5 集中配置的职责边界

- `.env.keys` 只存**公开信息**（公钥、仓库地址、端点 URL）
- 私钥**绝不**写入任何项目文件，只存于 GitHub Secrets 和本地 `~/.tauri/zapcmd.key`
- `sync-keys.mjs` 是**幂等**操作，多次运行结果一致

---

## 七、总工程师建议：免费开源工具可补充的功能

作为一款开源命令行启动器工具，以下功能建议纳入后续迭代规划：

### 高优先级（实用性强）

| 功能 | 说明 |
|------|------|
| **命令收藏 / 置顶** | 高频命令支持标记收藏，搜索时优先展示 |
| **执行历史** | 记录最近执行的命令，支持快速重新执行，按频率排序搜索结果 |
| **命令导入/导出** | 支持一键导出用户命令为 JSON 包，方便团队共享和机器迁移 |
| **命令仓库/社区** | 提供官方命令仓库（GitHub Repo），用户可一键订阅并同步社区贡献的命令集 |

### 中优先级（提升体验）

| 功能 | 说明 |
|------|------|
| **主题自定义** | 除透明度外，支持自定义主题色 / 暗色模式变体 |
| **命令别名** | 为长命令设置短别名，加速搜索 |
| **Snippet 模式** | 支持纯文本片段（非终端命令），复制到剪贴板，适用于常用代码片段 / 文本模板 |
| **插件系统** | 提供简易插件接口，允许社区扩展搜索源（如搜文件、搜书签、搜应用） |

### 低优先级（锦上添花）

| 功能 | 说明 |
|------|------|
| **数据备份/恢复** | 所有设置和命令的云端同步（GitHub Gist 或 WebDAV） |
| **命令执行统计** | 展示命令使用频率面板，帮助用户优化工作流 |
| **窗口主题跟随系统** | 自动跟随系统深色/浅色模式切换 |

---

## 八、风险评估

| 风险 | 等级 | 应对措施 |
|------|------|----------|
| Tauri updater 签名密钥泄漏 | **高** | 密钥仅存 GitHub Secrets，不进入代码仓库；`.env.keys` 仅存公钥 |
| GitHub API 限流影响更新检查 | **中** | 24 小时节流 + 使用 Releases 静态文件（`latest.json`）而非 API |
| 不同平台开机自启行为差异 | **低** | tauri-plugin-autostart 已封装跨平台逻辑 |
| Settings schema 迁移数据丢失 | **低** | 严格的 normalize 兜底 + 单元测试覆盖迁移路径 |
| `.env.keys` 被误填私钥 | **中** | 文件顶部注释警告 + CI 增加检查脚本（可选） |

---

## 九、验收标准

- [ ] `.env.keys` 配置文件正常工作，`sync-keys.mjs` 可正确同步到 `tauri.conf.json`
- [ ] Settings → General：「自动检查更新」开关可正常切换并持久化
- [ ] Settings → General：「开机自启」开关可正常切换，系统中可验证启动项注册/注销
- [ ] Settings → About：展示正确版本号（`__APP_VERSION__`）、平台信息、项目链接（`__GITHUB_OWNER__`/`__GITHUB_REPO__`）
- [ ] Settings → About：「检查更新」按钮可正常发起检测，展示结果
- [ ] Settings → About：有更新时可下载安装并重启
- [ ] Settings → About：「打开项目主页」可在默认浏览器中打开
- [ ] 应用启动时自动检查更新（在配置开启的情况下，24h 节流）
- [ ] Schema v2 → v3 迁移不丢失已有设置
- [ ] `npm run check:all` 全绿
- [ ] 中英文文案完整
- [ ] CI release 构建可正确签名并生成 `latest.json`

---

## 十、关联文档

| 文档 | 说明 |
|------|------|
| `plan/2026-02-27_rename-zap-to-zapcmd.md` | 项目改名计划（前置依赖） |
| `plan/2026-02-27_operations-guide.md` | 手动操作指南（密钥生成、GitHub Secrets、仓库 rename） |
