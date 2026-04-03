export const messages = {
  "zh-CN": {
    app: {
      launcherAriaLabel: "ZapCmd 启动器"
    },
    common: {
      cancel: "取消",
      close: "关闭",
      confirm: "确定",
      apply: "应用",
      save: "保存",
      copy: "复制",
      clear: "清空",
      remove: "移除",
      execute: "执行",
      refresh: "刷新",
      search: "搜索",
      copied: "已复制到剪贴板",
      copyFailed: "复制失败"
    },
    launcher: {
      searchPlaceholder: "输入命令关键词...",
      noResult: "没有匹配到命令。",
      noResultHint: "试试更短的关键词，或按 Esc 清空后重新搜索。",
      queueToggleAria: "切换队列，当前 {count} 条命令",
      queueTitle: "队列 {count}",
      queueEmpty: "队列为空。",
      queueEmptyHint: "队列里还没有待处理命令。",
      executeAll: "执行全部",
      executing: "执行中...",
      paramTitle: "填写参数",
      executeNow: "立即执行",
      stageToQueue: "加入队列",
      safetyDialogAria: "高风险命令确认",
      flowAdded: "已加入队列",
      flowRemoved: "已从队列移除",
      flowCleared: "已清空 {n} 条队列命令",
      executionStarted: "开始执行",
      queuePreflightIssueSummary: "{count} 条命令存在环境提示",
      queuePreflightRefreshDone: "已刷新检测",
      queuePreflightRefreshAll: "刷新检测",
      queuePreflightRefreshOne: "刷新此条",
      queuePreflightRefreshing: "检测中..."
    },
    commandPanel: {
      badge: {
        paramInput: "参数输入",
        dangerConfirm: "高危操作确认",
        dangerWithParam: "高危拦截与配置"
      },
      danger: {
        title: "危险操作提醒",
        description:
          "此命令将直接操作敏感系统资源，请确保你知道该命令的作用范围后再继续执行。",
        dismissToday: "今日不再针对此命令进行高危提示"
      },
      btn: {
        execute: "直接执行",
        confirmExecute: "确定执行",
        copy: "复制命令",
        addToFlow: "+ 加入队列",
        cancel: "取消"
      },
      hint: {
        escCancel: "按 Esc 取消返回"
      },
      preview: {
        label: "实际执行",
        expandScript: "展开脚本内容"
      }
    },
    settings: {
      title: "设置",
      saved: "已保存",
      unsavedDiscardTitle: "未保存的修改",
      unsavedDiscardConfirm: "当前有未保存的修改。确定放弃这些修改并关闭设置吗？",
      unsavedDiscardKeepEditing: "继续编辑",
      unsavedDiscardDiscard: "放弃并关闭",
      nav: {
        hotkeys: "快捷键",
        general: "通用",
        commands: "命令",
        appearance: "外观",
        about: "关于"
      },
      aria: {
        sections: "设置分区",
        content: "设置内容",
        commandsRegion: "命令管理区域",
        commandsToolbar: "命令管理工具栏",
        commandsTable: "命令管理表格",
        commandsIssues: "命令管理导入问题"
      },
      hotkeys: {
        hint: "点击任一快捷键项后，直接按键录制。录制过程中按 Esc 可取消。",
        sectionGlobal: "全局快捷键",
        sectionSearch: "搜索区快捷键",
        sectionMouse: "鼠标操作",
        sectionQueue: "队列快捷键",
        recording: "请按快捷键...",
        unset: "未设置",
        fields: {
          launcher: "唤起窗口",
          toggleQueue: "显示/隐藏队列",
          switchFocus: "切换焦点区域",
          navigateUp: "上移选择",
          navigateDown: "下移选择",
          executeSelected: "执行当前命令",
          stageSelected: "加入队列",
          openActionPanel: "打开动作面板",
          copySelected: "复制当前命令",
          escape: "返回/隐藏窗口",
          executeQueue: "运行队列",
          clearQueue: "清空队列",
          removeQueueItem: "移除当前节点",
          reorderUp: "节点上移",
          reorderDown: "节点下移"
        },
        mouse: {
          leftClick: "搜索结果左键",
          rightClick: "搜索结果右键"
        },
        pointerActionOptions: {
          "action-panel": "动作面板",
          execute: "执行",
          stage: "入队",
          copy: "复制"
        }
      },
      general: {
        title: "通用",
        sectionStartup: "启动",
        sectionTerminal: "终端",
        sectionInterface: "界面",
        defaultTerminal: "默认终端",
        currentTerminalPath: "当前终端路径（只读）",
        terminalDetecting: "正在检测终端...",
        terminalDetectingHint: "正在检测已安装终端，请稍候完成。",
        noTerminal: "无可用终端",
        terminalPathNotFound: "未检测到路径",
        language: "界面语言",
        terminalHint: "命令默认会发送到此终端；需要管理员权限时，将由系统拉起对应终端。",
        terminalReusePolicy: "终端复用策略",
        terminalReusePolicyHint: "控制 ZapCmd 是否复用最近一次打开的终端窗口。",
        terminalReusePolicyNever: "从不复用",
        terminalReusePolicyNeverHint: "每次执行都打开新的终端窗口，隔离最好。",
        terminalReusePolicyNormalOnly: "仅复用普通终端",
        terminalReusePolicyNormalOnlyHint: "普通终端可复用；管理员终端始终新开，避免权限串线。",
        terminalReusePolicyNormalAndElevated: "普通与管理员终端都复用",
        terminalReusePolicyNormalAndElevatedHint: "管理员终端也会复用；执行更快，但要注意权限上下文。",
        alwaysElevatedTerminal: "始终调用管理员权限终端",
        alwaysElevatedTerminalHint:
          "开启后，所有命令都会通过管理员终端运行；关闭时，仅在命令或队列需要管理员权限时才触发系统提权。",
        languageOptionZhCn: "简体中文",
        languageOptionEnUs: "English",
        autoCheckUpdate: "自动检查更新",
        autoCheckUpdateHint: "启动时自动检查 GitHub 上的新版本。",
        launchAtLogin: "开机自启",
        launchAtLoginHint: "系统启动时自动运行 ZapCmd。",
        commandPrompt: "命令提示符"
      },
      about: {
        title: "关于",
        infoTitle: "软件信息",
        version: "版本",
        platform: "运行平台",
        homepage: "项目主页",
        license: "开源许可",
        feedback: "问题反馈",
        checkUpdate: "检查更新",
        checking: "检查中...",
        checkingHint: "正在连接更新源并确认最新版本。",
        updateAvailable: "发现新版本 {version}",
        updateBody: "更新内容",
        downloadUpdate: "立即更新",
        downloading: "下载中... {progress}%",
        downloadingHint: "正在下载更新包，保持窗口打开即可。",
        installing: "安装中...",
        installingHint: "正在准备安装新版本，请稍候完成。",
        upToDate: "当前已是最新版本",
        updateFailed: "检查更新失败：{reason}",
        updateFailedCheck: "检查更新失败：{reason}",
        updateFailedDownload: "下载更新失败：{reason}",
        updateFailedInstall: "安装更新失败：{reason}",
        updateNextStepCheck: "下一步：请检查网络后重试“检查更新”。",
        updateNextStepPermission: "下一步：当前构建缺少更新权限，请联系开发者补充 updater 权限后重试。",
        updateNextStepDownload: "下一步：请重试下载更新。",
        updateNextStepInstall: "下一步：请稍后重试安装或手动安装新版本。",
        openHomepage: "打开项目主页"
      },
      commands: {
        title: "命令管理",
        summaryTotal: "共 {total}",
        summaryFiltered: "筛选 {filtered}",
        summaryEnabled: "已启用 {enabled}",
        summaryDisabled: "已禁用 {disabled}",
        summaryUserDefined: "用户 {userDefined}",
        summaryOverridden: "覆盖 {overridden}",
        toggleFilters: "筛选",
        queryLabel: "搜索（title / id / category / source）",
        queryPlaceholder: "输入关键词筛选命令",
        sourceFilter: "来源",
        statusFilter: "状态",
        overrideFilter: "冲突",
        issueFilter: "导入问题",
        fileFilter: "按文件筛选",
        moreFilters: "更多筛选",
        sortLabel: "排序",
        displayMode: "展示方式",
        displayListTitle: "平铺列表",
        displayListAria: "平铺列表",
        displayGroupedTitle: "按文件分组",
        displayGroupedAria: "按文件分组",
        enableFiltered: "启用当前结果（{count}）",
        disableFiltered: "禁用当前结果（{count}）",
        resetFilters: "重置筛选",
        loadIssuesTitle: "导入校验提示",
        loadIssuesHint: "这些提示只影响对应来源文件；修复后重新加载即可。",
        commandListTitle: "命令列表",
        tableHeaderCommand: "命令",
        tableHeaderCategory: "分类",
        tableHeaderSource: "来源",
        tableHeaderEnabled: "启用",
        allFiles: "全部文件",
        fileCount: "{count} 条",
        badgeOverride: "同 ID 覆盖内置",
        badgeIssue: "来源存在校验提示",
        sourceUser: "用户命令",
        sourceBuiltin: "内置命令",
        enabled: "已启用",
        disabled: "已禁用",
        groupCount: "{count} 条",
        unknownSourceFile: "未标注来源文件",
        overrideBadgeHint: "用户命令与内置命令 ID 相同，当前将优先使用用户命令。",
        issueBadgeHint: "该命令来源文件存在校验提示，请查看下方“导入校验提示”。",
        issueStageRead: "读取",
        issueStageParse: "解析",
        issueStageSchema: "校验",
        issueStageMerge: "合并",
        issueWithReason: "[{stage}] {summary}（原因：{reason}）",
        issueReadFailed: "读取命令来源失败：{sourceId}",
        issueInvalidJson: "文件 JSON 解析失败：{sourceId}",
        issueInvalidSchema: "文件结构不符合 schema：{sourceId}",
        issueDuplicateId: "命令 ID 冲突已跳过：{commandId}（来源 {sourceId}）"
      },
      appearance: {
        title: "外观",
        themeLabel: "主题",
        motionPresetLabel: "动画风格",
        motionPresetHint: "为 Launcher 和 Settings 统一切换整套动效节奏。",
        blurLabel: "毛玻璃效果",
        blurOn: "已开启",
        blurOff: "已关闭",
        blurHint: "关闭可降低 GPU 占用",
        opacityLabel: "窗口透明度",
        opacityHint: "调整主窗口的背景透明度，数值越小越通透。",
        opacityValue: "{value}%",
        preview: "效果预览",
        motionPresets: {
          expressive: {
            name: "Expressive",
            description: "保留当前偏弹性、偏氛围化的默认反馈。",
            badge: "当前默认"
          },
          "steady-tool": {
            name: "Steady Tool",
            description: "收紧回弹与位移，反馈更像稳态桌面工具。",
            badge: "更稳"
          }
        }
      },
      commandFilters: {
        sourceAll: "全部来源",
        sourceBuiltin: "仅内置",
        sourceUser: "仅用户",
        statusAll: "全部状态",
        statusEnabled: "仅已启用",
        statusDisabled: "仅已禁用",
        categoryAll: "全部分类",
        overrideAll: "全部冲突状态",
        overrideOnly: "仅覆盖内置",
        issueAll: "全部问题状态",
        issueOnly: "仅导入异常来源",
        sortDefault: "默认（禁用/冲突优先）",
        sortTitle: "按标题",
        sortCategory: "按分类",
        sortSource: "按来源",
        sortStatus: "按状态",
        displayList: "平铺列表",
        displayGroupedByFile: "按文件分组"
      },
      error: {
        emptyHotkey: "{label} 不能为空。",
        duplicateHotkey: "快捷键冲突：{hotkey} 同时用于 {labels}。",
        gotoRoute: "前往{route}",
        terminalUnavailable: "默认终端不可用，请重新选择。",
        updateLauncherHotkeyFailed: "更新唤起快捷键失败。",
        updateLaunchAtLoginFailed: "更新开机自启设置失败。",
        persistSettingsFailed: "保存设置到本地失败。",
        broadcastSettingsFailed: "同步设置失败。"
      }
    },
    hotkeyHints: {
      stagingFocus: "{switchFocus} 切焦点",
      keyboard:
        "{navigateUp}/{navigateDown} 选择 · {executeSelected} 执行 · {stageSelected} 入队 · {toggleQueue} 显隐 · {switchFocus} 切焦点",
      keys: {
        leftClick: "左键",
        rightClick: "右键"
      },
      actions: {
        navigate: "选择",
        execute: "执行",
        stage: "入队",
        actionPanel: "动作",
        copy: "复制",
        toggleQueue: "队列",
        switchFocus: "切焦点"
      }
    },
    runtime: {
      submitExecuteHint: "按 Enter 会立即执行此命令。",
      submitStageHint: "按 Enter 会将此命令加入队列。"
    },
    execution: {
      emptyCommand: "（空命令）",
      sentToTerminal: "命令已发送到终端（{command}），请在终端窗口查看输出。",
      desktopOnly: "Web 预览模式不支持执行命令，请使用桌面版 ZapCmd（Tauri）。",
      flowInProgress: "请先完成或取消当前流程。",
      failed: "执行失败：{reason}",
      failedWithNextStep: "执行失败：{reason}。下一步：{nextStep}",
      failedFallback: "请检查终端环境或命令参数。",
      elevationCancelled: "已取消管理员授权，本次未执行",
      elevationLaunchFailed: "管理员终端启动失败",
      terminalLaunchFailed: "终端启动失败",
      queueEmpty: "队列中没有可运行命令。",
      queueSuccess: "已在同一终端顺序执行 {count} 个节点（首个：{firstCommand}）。",
      queueFailed: "运行队列失败：{reason}",
      queueFailedWithNextStep: "运行队列失败：{reason}。下一步：{nextStep}",
      queueFailedFallback: "运行队列失败，请检查终端环境或命令参数。",
      blocked: "执行已拦截：{reason}",
      blockedWithNextStep: "执行已拦截：{reason}。下一步：{nextStep}",
      preflightBlockedSummary: "无法执行该命令。",
      preflightWarningSummary: "命令已发送到终端，但有一项可选依赖未满足。",
      preflightWarningSummaryMany: "命令已发送到终端，但有 {count} 项可选依赖未满足。",
      preflightBlockedWithNextStep: "执行前检查失败：{reason}。下一步：{nextStep}",
      preflightWarning: "预检告警：{reason}",
      preflightReasonMissingBinary: "未检测到 {subject}。",
      preflightReasonMissingShell: "当前环境缺少 {subject}。",
      preflightReasonMissingEnv: "缺少 {subject}（环境变量 {target}）。",
      preflightResolutionHint: "处理建议：{hint}。",
      preflightFallbackCommandTitle: "可改用“{commandTitle}”命令。",
      preflightInstallHint: "安装建议：{hint}",
      preflightFallbackCommand: "可改用命令：{commandId}",
      preflightProbeFailed: "执行前检查暂时失败，请重试或查看日志。",
      preflightProbeInvalidResponse: "执行前检查返回了无效结果，请重试或查看日志。",
      nextStepTerminalUnavailable: "检查并切换可用终端后重试。",
      nextStepInvalidParams: "检查必填参数与输入格式后重试。",
      nextStepPrerequisite: "补齐缺失依赖、环境变量或前置条件后重试。",
      nextStepBlocked: "移除高风险或注入片段后重试。",
      nextStepUnknown: "请重试；若仍失败请查看日志并反馈。",
      safetyQueueTitle: "确认运行高风险队列",
      safetyQueueDescription: "队列中有 {count} 个命令涉及高风险操作，请确认后执行。",
      safetySingleTitle: "确认执行高风险命令",
      safetySingleDescription: "当前命令可能影响系统状态，请确认后执行。"
    },
    safety: {
      reasons: {
        rmRf: "包含批量删除目录操作（rm -rf）",
        delForce: "包含强制删除操作（del /f）",
        formatDisk: "包含磁盘格式化操作（format）",
        shutdown: "包含系统关机/重启操作（shutdown）",
        taskkillForce: "包含强制结束进程操作（taskkill /f）",
        stopProcess: "包含进程终止操作（Stop-Process）",
        kill9: "包含强制结束进程操作（kill -9）",
        dangerousFlag: "命令模板标记为高危（dangerous=true）",
        adminRequired: "命令模板标记为需要管理员权限（adminRequired=true）"
      },
      validation: {
        required: "{label} 不能为空。",
        number: "{label} 需要是数字。",
        min: "{label} 不能小于 {min}。",
        max: "{label} 不能大于 {max}。",
        options: "{label} 不在允许选项中。",
        pattern: "{label} 不符合格式要求。",
        invalidPattern: "{label} 校验规则无效，请联系维护者修复命令模板。",
        injection: "{label} 包含潜在注入符号，已阻止执行。"
      },
      queueBlockedPrefix: "{title}：{reason}"
    },
    command: {
      argFallbackLabel: "参数"
    }
  },
  "en-US": {
    app: {
      launcherAriaLabel: "ZapCmd Launcher"
    },
    common: {
      cancel: "Cancel",
      close: "Close",
      confirm: "OK",
      apply: "Apply",
      save: "Save",
      copy: "Copy",
      clear: "Clear",
      remove: "Remove",
      execute: "Execute",
      refresh: "Refresh",
      search: "Search",
      copied: "Copied to clipboard",
      copyFailed: "Copy failed"
    },
    launcher: {
      searchPlaceholder: "Type command keywords...",
      noResult: "No matching command found.",
      noResultHint: "Try a shorter keyword, or press Esc to clear and search again.",
      queueToggleAria: "Toggle queue, currently {count} command(s)",
      queueTitle: "Queue {count}",
      queueEmpty: "Flow is empty.",
      queueEmptyHint: "No commands in the flow.",
      executeAll: "Run all",
      executing: "Running...",
      paramTitle: "Fill parameters",
      executeNow: "Run now",
      stageToQueue: "Add to flow",
      safetyDialogAria: "High-risk command confirmation",
      flowAdded: "Added to flow",
      flowRemoved: "Removed",
      flowCleared: "Cleared {n} node(s)",
      executionStarted: "Execution started",
      queuePreflightIssueSummary: "{count} queued command(s) have environment warnings",
      queuePreflightRefreshDone: "Checks refreshed",
      queuePreflightRefreshAll: "Refresh checks",
      queuePreflightRefreshOne: "Refresh this item",
      queuePreflightRefreshing: "Checking..."
    },
    commandPanel: {
      badge: {
        paramInput: "Parameter Input",
        dangerConfirm: "Danger Confirmation",
        dangerWithParam: "Danger Intercept"
      },
      danger: {
        title: "Danger Warning",
        description:
          "This command directly operates on sensitive system resources. Make sure you understand its scope before proceeding.",
        dismissToday: "Don't show danger warning for this command today"
      },
      btn: {
        execute: "Execute",
        confirmExecute: "Confirm Execute",
        addToFlow: "+ Add to Flow",
        cancel: "Cancel"
      },
      hint: {
        escCancel: "Press Esc to cancel"
      },
      preview: {
        label: "Actual Command",
        expandScript: "Expand script body"
      }
    },
    settings: {
      title: "Settings",
      saved: "Saved",
      unsavedDiscardTitle: "Unsaved changes",
      unsavedDiscardConfirm: "You have unsaved changes. Discard them and close Settings?",
      unsavedDiscardKeepEditing: "Keep editing",
      unsavedDiscardDiscard: "Discard & close",
      nav: {
        hotkeys: "Hotkeys",
        general: "General",
        commands: "Commands",
        appearance: "Appearance",
        about: "About"
      },
      aria: {
        sections: "Settings sections",
        content: "Settings content",
        commandsRegion: "Command management region",
        commandsToolbar: "Command management toolbar",
        commandsTable: "Command management table",
        commandsIssues: "Command import issues"
      },
      hotkeys: {
        hint:
          "Click any hotkey field and press keys to record. Press Esc while recording to cancel.",
        sectionGlobal: "Global Hotkeys",
        sectionSearch: "Search Area Hotkeys",
        sectionMouse: "Mouse Actions",
        sectionQueue: "Flow Hotkeys",
        recording: "Press hotkey...",
        unset: "Not set",
        fields: {
          launcher: "Open launcher",
          toggleQueue: "Show/Hide flow",
          switchFocus: "Switch focus zone",
          navigateUp: "Move selection up",
          navigateDown: "Move selection down",
          executeSelected: "Run selected command",
          stageSelected: "Add to flow",
          openActionPanel: "Open action panel",
          copySelected: "Copy selected command",
          escape: "Back/Hide window",
          executeQueue: "Run flow sequence",
          clearQueue: "Clear flow",
          removeQueueItem: "Remove flow node",
          reorderUp: "Move node up",
          reorderDown: "Move node down"
        },
        mouse: {
          leftClick: "Search result left click",
          rightClick: "Search result right click"
        },
        pointerActionOptions: {
          "action-panel": "Action panel",
          execute: "Execute",
          stage: "Stage",
          copy: "Copy"
        }
      },
      general: {
        title: "General",
        sectionStartup: "Startup",
        sectionTerminal: "Terminal",
        sectionInterface: "Interface",
        defaultTerminal: "Default terminal",
        currentTerminalPath: "Current terminal path (read-only)",
        terminalDetecting: "Detecting terminals...",
        terminalDetectingHint: "Detecting installed terminals. Please wait.",
        noTerminal: "No available terminal",
        terminalPathNotFound: "Path not detected",
        language: "Language",
        terminalHint:
          "Commands are sent to this terminal by default. When elevation is required, Windows opens the matching terminal with system elevation.",
        terminalReusePolicy: "Terminal reuse policy",
        terminalReusePolicyHint: "Controls whether ZapCmd reuses the most recently opened terminal window.",
        terminalReusePolicyNever: "Never reuse",
        terminalReusePolicyNeverHint: "Always open a fresh terminal window for the strongest isolation.",
        terminalReusePolicyNormalOnly: "Reuse normal terminals only",
        terminalReusePolicyNormalOnlyHint:
          "Normal terminals can be reused. Elevated terminals always open new to avoid privilege bleed.",
        terminalReusePolicyNormalAndElevated: "Reuse normal and elevated terminals",
        terminalReusePolicyNormalAndElevatedHint:
          "Elevated terminals can also be reused. Faster, but privilege context persists.",
        alwaysElevatedTerminal: "Always use elevated terminal",
        alwaysElevatedTerminalHint:
          "When enabled, every command runs in an elevated terminal. When disabled, elevation is requested only when a command or flow needs it.",
        languageOptionZhCn: "简体中文",
        languageOptionEnUs: "English",
        autoCheckUpdate: "Auto check for updates",
        autoCheckUpdateHint: "Automatically check for new versions on GitHub at startup.",
        launchAtLogin: "Launch at login",
        launchAtLoginHint: "Automatically start ZapCmd when the system boots.",
        commandPrompt: "Command Prompt"
      },
      about: {
        title: "About",
        infoTitle: "App Info",
        version: "Version",
        platform: "Platform",
        homepage: "Homepage",
        license: "License",
        feedback: "Feedback",
        checkUpdate: "Check for updates",
        checking: "Checking...",
        checkingHint: "Contacting the update source and checking the latest release.",
        updateAvailable: "New version {version} available",
        updateBody: "What's new",
        downloadUpdate: "Update now",
        downloading: "Downloading... {progress}%",
        downloadingHint: "Downloading the update package. Keep this window open.",
        installing: "Installing...",
        installingHint: "Preparing the new version for installation. Please wait.",
        upToDate: "You're up to date",
        updateFailed: "Update check failed: {reason}",
        updateFailedCheck: "Update check failed: {reason}",
        updateFailedDownload: "Update download failed: {reason}",
        updateFailedInstall: "Update install failed: {reason}",
        updateNextStepCheck: "Next step: verify network and retry Check for updates.",
        updateNextStepPermission:
          "Next step: this build is missing updater permission. Ask the maintainer to grant updater capability and retry.",
        updateNextStepDownload: "Next step: retry downloading the update.",
        updateNextStepInstall: "Next step: retry install later or install the release manually.",
        openHomepage: "Open homepage"
      },
      commands: {
        title: "Command Management",
        summaryTotal: "Total {total}",
        summaryFiltered: "Filtered {filtered}",
        summaryEnabled: "Enabled {enabled}",
        summaryDisabled: "Disabled {disabled}",
        summaryUserDefined: "User {userDefined}",
        summaryOverridden: "Overrides {overridden}",
        toggleFilters: "Filters",
        queryLabel: "Search (title / id / category / source)",
        queryPlaceholder: "Filter commands by keywords",
        sourceFilter: "Source",
        statusFilter: "Status",
        overrideFilter: "Conflict",
        issueFilter: "Import issues",
        fileFilter: "Filter by file",
        moreFilters: "More filters",
        sortLabel: "Sort",
        displayMode: "Display mode",
        displayListTitle: "Flat list",
        displayListAria: "Flat list",
        displayGroupedTitle: "Group by file",
        displayGroupedAria: "Group by file",
        enableFiltered: "Enable current results ({count})",
        disableFiltered: "Disable current results ({count})",
        resetFilters: "Reset filters",
        loadIssuesTitle: "Import validation",
        loadIssuesHint: "These warnings only affect the related source files. Fix them and reload commands.",
        commandListTitle: "Command list",
        tableHeaderCommand: "Command",
        tableHeaderCategory: "Category",
        tableHeaderSource: "Source",
        tableHeaderEnabled: "Enabled",
        allFiles: "All files",
        fileCount: "{count} items",
        badgeOverride: "Overrides built-in",
        badgeIssue: "Source warnings",
        sourceUser: "User command",
        sourceBuiltin: "Built-in command",
        enabled: "Enabled",
        disabled: "Disabled",
        groupCount: "{count} items",
        unknownSourceFile: "Source file not specified",
        overrideBadgeHint:
          "This user command has the same ID as a built-in command, so the user command takes precedence.",
        issueBadgeHint: "This command's source file has validation warnings. See \"Import validation\" below.",
        issueStageRead: "read",
        issueStageParse: "parse",
        issueStageSchema: "schema",
        issueStageMerge: "merge",
        issueWithReason: "[{stage}] {summary} (reason: {reason})",
        issueReadFailed: "Failed to read command source: {sourceId}",
        issueInvalidJson: "JSON parse failed: {sourceId}",
        issueInvalidSchema: "Schema validation failed: {sourceId}",
        issueDuplicateId: "Duplicate command ID skipped: {commandId} (source {sourceId})"
      },
      appearance: {
        title: "Appearance",
        themeLabel: "Theme",
        motionPresetLabel: "Motion style",
        motionPresetHint: "Switch one shared motion preset for Launcher and Settings.",
        blurLabel: "Glassmorphism",
        blurOn: "On",
        blurOff: "Off",
        blurHint: "Disable to reduce GPU usage",
        opacityLabel: "Window opacity",
        opacityHint: "Adjust the background opacity of the main window. Lower values are more transparent.",
        opacityValue: "{value}%",
        preview: "Preview",
        motionPresets: {
          expressive: {
            name: "Expressive",
            description: "Keeps the current elastic, atmospheric default feedback.",
            badge: "Default"
          },
          "steady-tool": {
            name: "Steady Tool",
            description: "Tightens bounce and travel for a steadier desktop-tool feel.",
            badge: "Steadier"
          }
        }
      },
      commandFilters: {
        sourceAll: "All sources",
        sourceBuiltin: "Built-in only",
        sourceUser: "User only",
        statusAll: "All statuses",
        statusEnabled: "Enabled only",
        statusDisabled: "Disabled only",
        categoryAll: "All categories",
        overrideAll: "All conflicts",
        overrideOnly: "Override built-ins only",
        issueAll: "All issue statuses",
        issueOnly: "Import issues only",
        sortDefault: "Default (disabled/conflicts first)",
        sortTitle: "By title",
        sortCategory: "By category",
        sortSource: "By source",
        sortStatus: "By status",
        displayList: "Flat list",
        displayGroupedByFile: "Group by file"
      },
      error: {
        emptyHotkey: "{label} cannot be empty.",
        duplicateHotkey: "Hotkey conflict: {hotkey} is used by {labels}.",
        gotoRoute: "Go to {route}",
        terminalUnavailable: "Default terminal is unavailable. Please choose another one.",
        updateLauncherHotkeyFailed: "Failed to update launcher hotkey.",
        updateLaunchAtLoginFailed: "Failed to update launch at login setting.",
        persistSettingsFailed: "Failed to persist settings.",
        broadcastSettingsFailed: "Failed to broadcast settings updates."
      }
    },
    hotkeyHints: {
      stagingFocus: "{switchFocus} focus",
      keyboard:
        "{navigateUp}/{navigateDown} navigate · {executeSelected} run · {stageSelected} stage · {toggleQueue} toggle queue · {switchFocus} switch focus",
      keys: {
        leftClick: "LMB",
        rightClick: "RMB"
      },
      actions: {
        navigate: "navigate",
        execute: "run",
        stage: "add to flow",
        toggleQueue: "flow",
        switchFocus: "focus"
      }
    },
    runtime: {
      submitExecuteHint: "Press Enter to run this command now.",
      submitStageHint: "Press Enter to add this command to the flow."
    },
    execution: {
      emptyCommand: "(empty command)",
      sentToTerminal: "Command sent to terminal ({command}). Check output in terminal window.",
      desktopOnly: "Web preview mode cannot run commands. Please use the desktop app (Tauri).",
      flowInProgress: "Please finish or cancel the current flow first.",
      failed: "Execution failed: {reason}",
      failedWithNextStep: "Execution failed: {reason}. Next step: {nextStep}",
      failedFallback: "Please check terminal environment or command arguments.",
      elevationCancelled: "Elevation was cancelled. Nothing was executed.",
      elevationLaunchFailed: "Failed to launch elevated terminal.",
      terminalLaunchFailed: "Failed to launch terminal.",
      queueEmpty: "No executable commands in the flow.",
      queueSuccess: "Executed {count} node(s) sequentially in the same terminal (first: {firstCommand}).",
      queueFailed: "Flow execution failed: {reason}",
      queueFailedWithNextStep: "Flow execution failed: {reason}. Next step: {nextStep}",
      queueFailedFallback: "Flow execution failed. Check terminal environment or command arguments.",
      blocked: "Execution blocked: {reason}",
      blockedWithNextStep: "Execution blocked: {reason}. Next step: {nextStep}",
      preflightBlockedSummary: "This command cannot run.",
      preflightWarningSummary:
        "The command was sent to the terminal, but one optional prerequisite is missing.",
      preflightWarningSummaryMany:
        "The command was sent to the terminal, but {count} optional prerequisites are missing.",
      preflightBlockedWithNextStep: "Preflight check failed: {reason}. Next step: {nextStep}",
      preflightWarning: "Preflight warning: {reason}",
      preflightReasonMissingBinary: "{subject} was not detected.",
      preflightReasonMissingShell: "The current environment is missing {subject}.",
      preflightReasonMissingEnv: "Missing {subject} (environment variable {target}).",
      preflightResolutionHint: "Suggested action: {hint}.",
      preflightFallbackCommandTitle: "Try the “{commandTitle}” command instead.",
      preflightInstallHint: "Install hint: {hint}",
      preflightFallbackCommand: "Try fallback command: {commandId}",
      preflightProbeFailed: "The preflight check is temporarily unavailable. Retry or check logs.",
      preflightProbeInvalidResponse:
        "Prerequisite probing returned an invalid response. Retry or check logs.",
      nextStepTerminalUnavailable: "Check available terminals and retry.",
      nextStepInvalidParams: "Fix required arguments or invalid input, then retry.",
      nextStepPrerequisite: "Install the missing dependency, env var, or prerequisite before retrying.",
      nextStepBlocked: "Remove risky or injection-like fragments, then retry.",
      nextStepUnknown: "Retry once; if it still fails, check logs and report.",
      safetyQueueTitle: "Confirm high-risk flow execution",
      safetyQueueDescription:
        "{count} node(s) in the flow involve high-risk operations. Confirm before execution.",
      safetySingleTitle: "Confirm high-risk command execution",
      safetySingleDescription: "This command may affect system state. Confirm before execution."
    },
    safety: {
      reasons: {
        rmRf: "Contains bulk directory deletion (rm -rf)",
        delForce: "Contains force-delete operation (del /f)",
        formatDisk: "Contains disk format operation (format)",
        shutdown: "Contains system shutdown/restart (shutdown)",
        taskkillForce: "Contains force process termination (taskkill /f)",
        stopProcess: "Contains process termination (Stop-Process)",
        kill9: "Contains force process termination (kill -9)",
        dangerousFlag: "Command template is marked dangerous (dangerous=true)",
        adminRequired: "Command template requires admin privilege (adminRequired=true)"
      },
      validation: {
        required: "{label} is required.",
        number: "{label} must be a number.",
        min: "{label} must be greater than or equal to {min}.",
        max: "{label} must be less than or equal to {max}.",
        options: "{label} is not in allowed options.",
        pattern: "{label} does not match required format.",
        invalidPattern: "{label} has invalid validation rule. Contact maintainer.",
        injection: "{label} contains potential injection symbols and is blocked."
      },
      queueBlockedPrefix: "{title}: {reason}"
    },
    command: {
      argFallbackLabel: "Argument"
    }
  }
} as const;

export type MessageKeyMap = typeof messages;
