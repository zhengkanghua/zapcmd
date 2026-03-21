#[cfg(target_os = "windows")]
const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

#[cfg(target_os = "windows")]
pub(crate) const ZAPCMD_WT_WINDOW_ID: &str = "zapcmd-main-terminal";

#[cfg(target_os = "windows")]
pub(crate) const ZAPCMD_WT_ADMIN_WINDOW_ID: &str = "zapcmd-main-terminal-admin";

#[cfg(target_os = "windows")]
#[derive(Clone, Copy, Debug, PartialEq, Eq, serde::Serialize)]
pub(crate) enum WindowsSessionKind {
    Normal,
    Elevated,
}

#[cfg(target_os = "windows")]
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WindowsLaunchPlan {
    pub program: String,
    pub args: Vec<String>,
    pub creation_flags: u32,
}

#[cfg(target_os = "windows")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum WindowsRoutePolicy {
    FollowLatest,
    AlwaysElevated,
}

#[cfg(target_os = "windows")]
pub(crate) struct WindowsRoutingInput<'a> {
    pub terminal_id: &'a str,
    pub command: &'a str,
    pub requires_elevation: bool,
    pub always_elevated: bool,
    pub last_session_kind: Option<WindowsSessionKind>,
}

#[cfg(target_os = "windows")]
#[derive(Clone, Debug, PartialEq, Eq)]
pub(crate) struct WindowsRoutingDecision {
    pub target_session_kind: WindowsSessionKind,
    pub launch_plan: WindowsLaunchPlan,
}

#[cfg(target_os = "windows")]
fn resolve_windows_route_policy(always_elevated: bool) -> WindowsRoutePolicy {
    if always_elevated {
        WindowsRoutePolicy::AlwaysElevated
    } else {
        WindowsRoutePolicy::FollowLatest
    }
}

#[cfg(target_os = "windows")]
fn resolve_target_session_kind(input: &WindowsRoutingInput<'_>) -> WindowsSessionKind {
    match resolve_windows_route_policy(input.always_elevated) {
        WindowsRoutePolicy::AlwaysElevated => WindowsSessionKind::Elevated,
        WindowsRoutePolicy::FollowLatest => {
            if input.requires_elevation {
                WindowsSessionKind::Elevated
            } else {
                input.last_session_kind.unwrap_or(WindowsSessionKind::Normal)
            }
        }
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn build_windows_launch_plan(
    terminal_id: &str,
    command: &str,
    session_kind: WindowsSessionKind,
) -> WindowsLaunchPlan {
    match terminal_id {
        "wt" => {
            let window_id = match session_kind {
                WindowsSessionKind::Normal => ZAPCMD_WT_WINDOW_ID,
                WindowsSessionKind::Elevated => ZAPCMD_WT_ADMIN_WINDOW_ID,
            };
            WindowsLaunchPlan {
                program: "wt".to_string(),
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
            program: "cmd".to_string(),
            args: vec!["/V:ON".to_string(), "/K".to_string(), command.to_string()],
            creation_flags: CREATE_NEW_CONSOLE,
        },
        "pwsh" => WindowsLaunchPlan {
            program: "pwsh".to_string(),
            args: vec![
                "-NoExit".to_string(),
                "-Command".to_string(),
                command.to_string(),
            ],
            creation_flags: CREATE_NEW_CONSOLE,
        },
        _ => WindowsLaunchPlan {
            program: "powershell".to_string(),
            args: vec![
                "-NoExit".to_string(),
                "-Command".to_string(),
                command.to_string(),
            ],
            creation_flags: CREATE_NEW_CONSOLE,
        },
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn decide_windows_route(input: WindowsRoutingInput<'_>) -> WindowsRoutingDecision {
    let target_session_kind = resolve_target_session_kind(&input);
    WindowsRoutingDecision {
        target_session_kind,
        launch_plan: build_windows_launch_plan(
            input.terminal_id,
            input.command,
            target_session_kind,
        ),
    }
}
