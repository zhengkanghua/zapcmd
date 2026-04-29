use std::path::PathBuf;

const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize)]
pub(crate) enum WindowsSessionKind {
    Normal,
    Elevated,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ResolvedTerminalProgram {
    pub id: String,
    pub executable_path: PathBuf,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WindowsLaunchPlan {
    pub program: PathBuf,
    pub args: Vec<String>,
    pub creation_flags: u32,
}

pub(crate) struct WindowsRoutingInput<'a> {
    pub terminal_program: &'a ResolvedTerminalProgram,
    pub command: &'a str,
    pub requires_elevation: bool,
    pub always_elevated: bool,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WindowsRoutingDecision {
    pub target_session_kind: WindowsSessionKind,
    pub launch_plan: WindowsLaunchPlan,
    pub terminal_program_id: String,
}

fn resolve_target_session_kind(input: &WindowsRoutingInput<'_>) -> WindowsSessionKind {
    if input.requires_elevation || input.always_elevated {
        return WindowsSessionKind::Elevated;
    }

    // 普通命令永远默认走普通车道。
    // 即使历史上记录过 elevated 会话，也没有“当前仍存活且上下文安全”的证据，
    // 不能据此把一次普通执行静默升级到管理员终端。
    WindowsSessionKind::Normal
}

pub(crate) fn build_windows_launch_plan(
    terminal_program: &ResolvedTerminalProgram,
    command: &str,
    _session_kind: WindowsSessionKind,
) -> WindowsLaunchPlan {
    match terminal_program.id.as_str() {
        "wt" => WindowsLaunchPlan {
            program: terminal_program.executable_path.clone(),
            args: vec![
                "-w".to_string(),
                "new".to_string(),
                "new-tab".to_string(),
                "cmd".to_string(),
                "/V:ON".to_string(),
                "/K".to_string(),
                command.to_string(),
            ],
            creation_flags: 0,
        },
        "cmd" => WindowsLaunchPlan {
            program: terminal_program.executable_path.clone(),
            args: vec!["/V:ON".to_string(), "/K".to_string(), command.to_string()],
            creation_flags: CREATE_NEW_CONSOLE,
        },
        "pwsh" => WindowsLaunchPlan {
            program: terminal_program.executable_path.clone(),
            args: vec![
                "-NoExit".to_string(),
                "-Command".to_string(),
                command.to_string(),
            ],
            creation_flags: CREATE_NEW_CONSOLE,
        },
        _ => WindowsLaunchPlan {
            program: terminal_program.executable_path.clone(),
            args: vec![
                "-NoExit".to_string(),
                "-Command".to_string(),
                command.to_string(),
            ],
            creation_flags: CREATE_NEW_CONSOLE,
        },
    }
}

pub(crate) fn decide_windows_route(input: WindowsRoutingInput<'_>) -> WindowsRoutingDecision {
    let target_session_kind = resolve_target_session_kind(&input);

    WindowsRoutingDecision {
        target_session_kind,
        launch_plan: build_windows_launch_plan(
            input.terminal_program,
            input.command,
            target_session_kind,
        ),
        terminal_program_id: input.terminal_program.id.clone(),
    }
}
