use std::path::PathBuf;

use super::TerminalExecutionError;

const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

pub(crate) const ZAPCMD_WT_WINDOW_ID: &str = "zapcmd-main-terminal";

pub(crate) const ZAPCMD_WT_ADMIN_WINDOW_ID: &str = "zapcmd-main-terminal-admin";

#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize)]
pub(crate) enum WindowsSessionKind {
    Normal,
    Elevated,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum TerminalReusePolicy {
    Never,
    NormalOnly,
    NormalAndElevated,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct ResolvedTerminalProgram {
    pub id: String,
    pub executable_path: PathBuf,
    pub supports_reuse: bool,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct WindowsReusableSessionState {
    // 这里只记录“已知存在且可复用”的会话车道归属。
    // 它不是终端程序探测结果，也不是“历史上曾成功提权一次”的审计日志。
    pub normal: Option<String>,
    pub elevated: Option<String>,
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
    pub terminal_reuse_policy: TerminalReusePolicy,
    pub reusable_session_state: &'a WindowsReusableSessionState,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WindowsRoutingDecision {
    pub target_session_kind: WindowsSessionKind,
    pub launch_plan: WindowsLaunchPlan,
    pub terminal_program_id: String,
    pub reuse_existing_session: bool,
    pub track_session_state: bool,
}

fn lane_matches(recorded_program: Option<&str>, terminal_program: &ResolvedTerminalProgram) -> bool {
    recorded_program == Some(terminal_program.id.as_str())
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

fn should_use_reusable_lane(
    input: &WindowsRoutingInput<'_>,
    target_session_kind: WindowsSessionKind,
) -> bool {
    if !input.terminal_program.supports_reuse {
        return false;
    }

    match target_session_kind {
        WindowsSessionKind::Normal => {
            !matches!(input.terminal_reuse_policy, TerminalReusePolicy::Never)
        }
        WindowsSessionKind::Elevated => matches!(
            input.terminal_reuse_policy,
            TerminalReusePolicy::NormalAndElevated
        ),
    }
}

fn resolve_reuse_existing_session(
    input: &WindowsRoutingInput<'_>,
    target_session_kind: WindowsSessionKind,
    uses_reusable_lane: bool,
) -> bool {
    if !uses_reusable_lane {
        return false;
    }

    match target_session_kind {
        WindowsSessionKind::Normal => lane_matches(
            input.reusable_session_state.normal.as_deref(),
            input.terminal_program,
        ),
        WindowsSessionKind::Elevated => lane_matches(
            input.reusable_session_state.elevated.as_deref(),
            input.terminal_program,
        ),
    }
}

fn should_track_session_state(
    terminal_program: &ResolvedTerminalProgram,
    uses_reusable_lane: bool,
) -> bool {
    // 只有真正支持复用、且本次实际走了复用车道的终端，才允许写入可复用会话状态。
    // 否则会把“历史成功启动”误记成“当前可复用会话存在”。
    terminal_program.supports_reuse && uses_reusable_lane
}

pub(crate) fn build_windows_launch_plan(
    terminal_program: &ResolvedTerminalProgram,
    command: &str,
    session_kind: WindowsSessionKind,
    uses_reusable_lane: bool,
) -> WindowsLaunchPlan {
    match terminal_program.id.as_str() {
        "wt" => {
            let window_id = if uses_reusable_lane {
                match session_kind {
                    WindowsSessionKind::Normal => ZAPCMD_WT_WINDOW_ID,
                    WindowsSessionKind::Elevated => ZAPCMD_WT_ADMIN_WINDOW_ID,
                }
            } else {
                "new"
            };
            WindowsLaunchPlan {
                program: terminal_program.executable_path.clone(),
                args: vec![
                    "-w".to_string(),
                    window_id.to_string(),
                    "new-tab".to_string(),
                    "cmd".to_string(),
                    "/V:ON".to_string(),
                    "/K".to_string(),
                    command.to_string(),
                ],
                creation_flags: 0,
            }
        }
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
    let uses_reusable_lane = should_use_reusable_lane(&input, target_session_kind);
    let reuse_existing_session =
        resolve_reuse_existing_session(&input, target_session_kind, uses_reusable_lane);

    WindowsRoutingDecision {
        target_session_kind,
        launch_plan: build_windows_launch_plan(
            input.terminal_program,
            input.command,
            target_session_kind,
            uses_reusable_lane,
        ),
        terminal_program_id: input.terminal_program.id.clone(),
        reuse_existing_session,
        track_session_state: should_track_session_state(
            input.terminal_program,
            uses_reusable_lane,
        ),
    }
}

pub(crate) fn should_track_windows_reusable_session(
    decision: &WindowsRoutingDecision,
) -> bool {
    decision.track_session_state
}

pub(crate) fn update_windows_reusable_session_state(
    reusable_session_state: &mut WindowsReusableSessionState,
    session_kind: WindowsSessionKind,
    terminal_program_id: &str,
    result: &Result<(), TerminalExecutionError>,
) {
    if result.is_err() {
        return;
    }

    match session_kind {
        WindowsSessionKind::Normal => {
            reusable_session_state.normal = Some(terminal_program_id.to_string())
        }
        WindowsSessionKind::Elevated => {
            reusable_session_state.elevated = Some(terminal_program_id.to_string())
        }
    }
}
