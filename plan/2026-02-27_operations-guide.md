# ZapCmd 手动操作指南

> **创建日期**：2026-02-27
> **适用范围**：项目改名 + 功能增强（检测更新 & 开机自启 & 关于页面）
> **操作人**：项目维护者（你）

本文档汇总了所有需要你手动执行的操作步骤。代码层面的改动由开发流程完成，这里只列出无法通过代码自动化的环境配置、密钥管理、平台操作。

---

## 一、Tauri Updater 签名密钥（必须）

### 1.1 生成密钥对

在本地终端执行：

```bash
npx @tauri-apps/cli signer generate -w ~/.tauri/zapcmd.key
```

执行后会提示你：
1. 输入密码（可选，但建议设置）— 记住这个密码
2. 生成两个产物：
   - **私钥文件**：`~/.tauri/zapcmd.key`（绝对不能泄漏、不能提交到仓库）
   - **公钥**：直接输出到终端（一段 Base64 字符串）

> **示例公钥格式**：`dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIH...`（很长的 Base64 字符串）

### 1.2 保存公钥到项目

将终端输出的公钥复制到项目集中配置文件 `.env.keys`（详见第四节）：

```ini
TAURI_UPDATER_PUBKEY=dW50cnVzdGVkIGNvbW1lbnQ6...你的完整公钥...
```

### 1.3 配置 GitHub Secrets

进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**：

| Secret 名称 | 值 | 来源 |
|-------------|-----|------|
| `TAURI_SIGNING_PRIVATE_KEY` | `~/.tauri/zapcmd.key` 文件的完整内容 | 用文本编辑器打开密钥文件，复制全部内容 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 你在 1.1 步设置的密码 | 如果没设密码则填空字符串 |

**操作步骤截图式说明**：

```
1. 打开 https://github.com/你的用户名/zapcmd/settings/secrets/actions
2. 点击 "New repository secret"
3. Name: TAURI_SIGNING_PRIVATE_KEY
4. Secret: (粘贴 ~/.tauri/zapcmd.key 的完整内容)
5. 点击 "Add secret"
6. 重复上述步骤添加 TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

### 1.4 验证方式

配置完成后，可通过以下方式验证：
- 推送一个 dry-run 构建（手动触发 `release-dry-run.yml` 工作流）
- 检查构建日志中是否出现 "Signing..." 步骤
- 检查构建产物中是否包含 `.sig` 签名文件

---

## 二、GitHub 仓库改名（必须）

### 2.1 Rename 仓库

```
1. 打开 https://github.com/zhengkanghua/zap/settings
2. 找到 "Repository name" 输入框
3. 将 "zap" 改为 "zapcmd"
4. 点击 "Rename"
```

> **GitHub 会自动为旧 URL 设置 301 重定向**，所以已有的外部链接不会立即失效。但建议尽快更新所有文档中的 URL。

### 2.2 更新本地 remote

仓库改名后，在本地执行：

```bash
git remote set-url origin https://github.com/zhengkanghua/zapcmd.git
```

验证：
```bash
git remote -v
# 应输出:
# origin  https://github.com/zhengkanghua/zapcmd.git (fetch)
# origin  https://github.com/zhengkanghua/zapcmd.git (push)
```

### 2.3 更新 Dependabot 配置

如果 `.github/dependabot.yml` 中有仓库引用，需要检查是否需要更新（通常 Dependabot 使用相对路径，不需要改）。

---

## 三、Cargo.lock 重新生成（必须）

在代码改名完成后（`Cargo.toml` 中 `name = "zapcmd"` 已生效），执行：

```bash
cd src-tauri
cargo generate-lockfile
```

或直接：

```bash
cd src-tauri
cargo build
```

Cargo 会自动更新 `Cargo.lock` 中的 crate 名称引用。

**不要手动编辑 `Cargo.lock`**。

---

## 四、集中配置文件 `.env.keys`（新建）

为了避免公钥等配置散落在多个文件中，项目新增集中配置文件 `.env.keys`。

### 4.1 文件位置与结构

项目根目录创建 `.env.keys`：

```ini
# ZapCmd 项目密钥与环境配置
# =============================
# 此文件用于集中管理需要在多处引用的配置值。
# 构建脚本 (scripts/sync-keys.mjs) 会读取此文件并同步到各配置文件。
#
# ⚠️ 此文件只包含公钥（公开信息），不包含私钥。
#    私钥仅存放在 GitHub Secrets 和本地 ~/.tauri/zapcmd.key 中。

# Tauri Updater 公钥（用于验证更新包签名）
# 生成方式: npx @tauri-apps/cli signer generate -w ~/.tauri/zapcmd.key
TAURI_UPDATER_PUBKEY=在这里粘贴你的公钥

# GitHub 仓库信息
GITHUB_OWNER=zhengkanghua
GITHUB_REPO=zapcmd

# 更新检测端点（基于 GitHub Releases）
UPDATER_ENDPOINT=https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download/latest.json
```

### 4.2 同步脚本 `scripts/sync-keys.mjs`

新增脚本，职责：读取 `.env.keys` 并将值注入到以下位置：

| 目标文件 | 注入内容 |
|----------|----------|
| `src-tauri/tauri.conf.json` | `plugins.updater.pubkey` ← `TAURI_UPDATER_PUBKEY` |
| `src-tauri/tauri.conf.json` | `plugins.updater.endpoints[0]` ← `UPDATER_ENDPOINT` |

**运行方式**：
```bash
node scripts/sync-keys.mjs
```

可集成到现有 `npm run version:sync` 或 `tauri:dev` / `tauri:build` 前置钩子中。

### 4.3 `.gitignore` 处理

`.env.keys` **应该提交到仓库**（因为只含公钥，是公开信息）。但添加注释提醒不要在此放私钥。

如果你有一个包含私钥的本地 override 文件，可以约定 `.env.keys.local` 被 `.gitignore` 忽略。

### 4.4 使用流程

```
1. 生成密钥对（一次性操作）
2. 将公钥粘贴到 .env.keys 的 TAURI_UPDATER_PUBKEY
3. 运行 node scripts/sync-keys.mjs（自动同步到 tauri.conf.json）
4. 将私钥配置到 GitHub Secrets（一次性操作）
5. 后续只需维护 .env.keys 这一个文件
```

---

## 五、品牌图片资源（可选）

需要目视检查以下文件：

| 文件 | 检查项 |
|------|--------|
| `docs/img/brand.png` | 是否包含 "Zap" 文字？如果有，需用设计工具改为 "ZapCmd" |
| `src-tauri/icons/*.png` / `*.ico` / `*.icns` | 图标中是否有文字？纯图形图标不需要改 |

如果图标中有文字需要更新，重新生成各尺寸：
```bash
npx @tauri-apps/cli icon path/to/your/new-icon.png
```

---

## 六、本地开发环境验证

### 6.1 全量检查

```bash
npm run check:all
```

预期：全绿通过。

### 6.2 开发模式启动

```bash
npm run tauri:dev
```

预期：
- 窗口标题显示 "ZapCmd"（Settings 窗口）
- 系统托盘 tooltip 显示 "ZapCmd"
- 搜索框功能正常

### 6.3 构建验证

```bash
npm run tauri:build
```

预期：生成 `ZapCmd_x.y.z_x64_en-US.msi`（产品名为 ZapCmd）。

---

## 七、操作清单（Checklist）

按顺序执行：

- [ ] **1. 生成签名密钥对** — `npx @tauri-apps/cli signer generate -w ~/.tauri/zapcmd.key`
- [ ] **2. 将公钥写入 `.env.keys`** — `TAURI_UPDATER_PUBKEY=...`
- [ ] **3. GitHub: 配置 Secrets** — `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- [ ] **4. GitHub: 仓库 Rename** — `zap` → `zapcmd`
- [ ] **5. 本地: 更新 remote URL** — `git remote set-url origin ...zapcmd.git`
- [ ] **6. 本地: 重新生成 Cargo.lock** — `cargo generate-lockfile`
- [ ] **7. 本地: 清理旧数据** — localStorage 中 `zap.*` 键 + `~/.zap/` 目录 + `src-tauri/target/`
- [ ] **8. 本地: 运行 check:all** — `npm run check:all`
- [ ] **9. 本地: 启动 tauri:dev 验证** — 窗口标题、托盘 tooltip 显示 "ZapCmd"
- [ ] **10. 本地: tauri:build 构建验证** — 安装包产品名包含 "ZapCmd"
- [ ] **11. 可选: 更新品牌图片** — 如果图标/品牌图中有 "Zap" 文字
- [ ] **12. GitHub: dry-run 构建验证** — 触发 release-dry-run 工作流

---

## 八、应急回滚

如果改名过程中出现严重问题：

```bash
# 回退所有未提交的改动
git checkout -- .

# 如果已 commit 但未 push
git reset --soft HEAD~1

# 如果 GitHub 仓库已 rename
# GitHub Settings → Repository name → 改回 "zap"
```
