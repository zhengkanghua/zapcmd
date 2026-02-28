# 产品截图规范

本目录用于存放 `README.md` 和 `README.zh-CN.md` 对外展示的截图素材。

## 截图策略（先少后多）

1. `README` 层面建议先只放 **4 张核心截图**（覆盖主流程即可），其余截图作为 Release/推广素材按需补齐，不需要一次性做完。
2. 一张图尽量只表达一个交互点：可读性优先，避免把多个页面硬拼成一张导致字号过小。
3. 需要“前后状态证明”（会话恢复/安全确认）时，优先用 **两张独立截图**（见下方双图对照清单）。只有做营销长图/海报时才考虑拼图，并保留原图。

## 必需截图

1. `launcher-search.png`（主窗口搜索态）
2. `param-dialog.png`（参数填写弹层）
3. `queue-batch-run.png`（队列与批量执行）
4. `settings-command-management.png`（设置页命令管理）

### 每张必需截图的内容建议

1. `launcher-search.png`
   - 搜索框有输入（建议 1～2 个关键词），结果列表至少可见 6 条。
   - 能看出 “命令名称 + 简要描述/预览 + 标签/分类”（只要 UI 已呈现即可）。
2. `param-dialog.png`
   - 展示一个带参数的命令：至少 2 个参数（含必填/可选的差异更好）。
   - 若有校验/提示（占位符、默认值、错误提示），尽量让它在截图里可见。
3. `queue-batch-run.png`
   - 队列里至少有 2 条暂存命令，并能看到“批量执行入口”（按钮/快捷提示等）。
   - 如需展示“终端执行结果”，建议额外拍一张独立图（例如 `queue-batch-run-terminal.png`），避免拼图导致信息太小。
4. `settings-command-management.png`
   - 能看见命令列表、启停开关（或等价控件）、来源筛选/搜索（若有）。
   - 最好包含“覆盖标记”（用户命令覆盖内置命令）或禁用状态之一，体现管理能力。

## 推荐补充截图（推广页 / Release 可用）

1. `settings-general-hotkeys.png`（热键配置 + 终端下拉）
2. `dangerous-command-confirm-single.png`（单条危险命令确认）
3. `dangerous-command-confirm-queue.png`（队列危险命令确认）
4. `search-highlight-multitoken.png`（分词 AND 搜索 + 高亮）
5. `command-override-marker.png`（用户命令覆盖内置命令标记）
6. `session-restore-before-after-a.png`（重启前：队列已暂存）
7. `session-restore-before-after-b.png`（重启后：队列被恢复）

## 建议规格

- 格式：PNG
- 比例：`16:10`（优先）或 `16:9`
- 建议尺寸：`1920x1200` 或 `1600x900`
- 语言建议：
  - 如果只维护一套截图：选择一种语言保持一致即可。
  - 如果要同时维护中英两套截图：建议使用子目录分别存放，且文件名保持一致：
    - `docs/img/showcase/en/launcher-search.png`
    - `docs/img/showcase/zh-CN/launcher-search.png`
- 隐私要求：
  - 隐去机器名/用户名
  - 如有敏感路径，避免暴露绝对路径
  - 隐去 token、密钥、内网信息

## 拍摄建议

- 主窗口保持完整、居中、无遮挡。
- 使用真实命令内容（避免占位文本）。
- 一张图聚焦一个核心交互。
- 桌面背景尽量简洁，减少干扰。

## 双图对照清单（前后状态证明）

1. 会话恢复：
   - `session-restore-before-after-a.png`：关闭应用前，队列至少有 2 条暂存命令。
   - `session-restore-before-after-b.png`：重开应用后，队列仍被恢复。
2. 安全确认：
   - `dangerous-command-confirm-single.png`：单条危险命令确认弹层。
   - `dangerous-command-confirm-queue.png`：队列级危险确认列表与原因。
3. 搜索行为：
   - `launcher-search.png`：常规搜索态。
   - `search-highlight-multitoken.png`：多词查询 AND 匹配与高亮。

## 截图状态要求

1. 使用内置命令目录中的真实命令（如 git/docker/system）。
2. 至少一张图展示参数输入弹层（`param-dialog.png`）。
3. 至少一张图展示命令来源/覆盖标记（`command-override-marker.png`）。
4. 队列截图需展示至少 2 条命令，并能看到批量执行入口。
