use super::{sanitize_command, spawn_and_forget, ProcessCommand, TerminalExecutionError};

#[cfg(not(target_os = "windows"))]
fn command_program(cmd: &ProcessCommand) -> String {
    cmd.get_program().to_string_lossy().into_owned()
}

#[cfg(not(target_os = "windows"))]
fn command_args(cmd: &ProcessCommand) -> Vec<String> {
    cmd.get_args()
        .map(|arg| arg.to_string_lossy().into_owned())
        .collect()
}

#[cfg(not(target_os = "windows"))]
fn assert_command(cmd: &ProcessCommand, expected_program: &str, expected_args: &[&str]) {
    assert_eq!(command_program(cmd), expected_program);
    assert_eq!(
        command_args(cmd),
        expected_args
            .iter()
            .map(|arg| (*arg).to_string())
            .collect::<Vec<_>>()
    );
}

#[test]
fn sanitize_command_trims() {
    assert_eq!(sanitize_command("   echo 1  ").unwrap(), "echo 1");
}

#[test]
fn sanitize_command_rejects_all_whitespace() {
    assert!(sanitize_command(" \n\t ").is_err());
}

#[test]
fn sanitize_command_keeps_structured_invalid_request_error() {
    assert_eq!(
        sanitize_command("   ").unwrap_err(),
        TerminalExecutionError::new("invalid-request", "Command cannot be empty.")
    );
}

#[test]
fn spawn_and_forget_propagates_spawn_error() {
    let mut cmd = ProcessCommand::new("definitely-not-a-real-binary-xyz");
    assert!(spawn_and_forget(&mut cmd).is_err());
}

#[cfg(target_os = "windows")]
mod windows {
    use crate::terminal::{
        join_windows_arguments,
        map_windows_launch_error,
        resolve_windows_launch_mode,
        should_update_last_session_kind,
        to_wide,
        windows_routing::{
            decide_windows_route,
            WindowsRoutingInput,
            WindowsSessionKind,
            ZAPCMD_WT_ADMIN_WINDOW_ID,
            ZAPCMD_WT_WINDOW_ID,
        },
        WindowsLaunchMode,
        TerminalExecutionError,
    };
    use std::slice;
    use windows_sys::Win32::Foundation::LocalFree;
    use windows_sys::Win32::UI::Shell::CommandLineToArgvW;

    fn wide_ptr_to_string(pointer: *mut u16) -> String {
        let mut length = 0usize;
        unsafe {
            while *pointer.add(length) != 0 {
                length += 1;
            }
            String::from_utf16_lossy(slice::from_raw_parts(pointer, length))
        }
    }

    fn parse_windows_arguments(command_line: &str) -> Vec<String> {
        let raw = to_wide(command_line);
        let mut argument_count = 0i32;
        let arguments = unsafe { CommandLineToArgvW(raw.as_ptr(), &mut argument_count) };
        assert!(!arguments.is_null(), "CommandLineToArgvW should parse the command line");

        let parsed = unsafe { slice::from_raw_parts(arguments, argument_count as usize) }
            .iter()
            .map(|pointer| wide_ptr_to_string(*pointer))
            .collect::<Vec<_>>();

        unsafe {
            let _ = LocalFree(arguments.cast());
        }

        parsed
    }

    fn assert_windows_arguments_roundtrip(arguments: &[&str]) {
        let encoded = join_windows_arguments(
            &arguments
                .iter()
                .map(|argument| (*argument).to_string())
                .collect::<Vec<_>>(),
        );
        let parsed = parse_windows_arguments(format!("placeholder.exe {}", encoded).as_str());
        assert_eq!(
            parsed.into_iter().skip(1).collect::<Vec<_>>(),
            arguments
                .iter()
                .map(|argument| (*argument).to_string())
                .collect::<Vec<_>>()
        );
    }

    #[test]
    fn follow_latest_without_history_keeps_normal_session_for_normal_command() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "wt",
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            last_session_kind: None,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Normal);
        assert_eq!(decision.launch_plan.args[1], ZAPCMD_WT_WINDOW_ID);
    }

    #[test]
    fn follow_latest_promotes_to_elevated_when_command_requires_elevation() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "pwsh",
            command: "ipconfig /flushdns",
            requires_elevation: true,
            always_elevated: false,
            last_session_kind: Some(WindowsSessionKind::Normal),
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
        assert_eq!(decision.launch_plan.program, "pwsh");
    }

    #[test]
    fn follow_latest_keeps_latest_elevated_session_for_normal_command() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "powershell",
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            last_session_kind: Some(WindowsSessionKind::Elevated),
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
        assert_eq!(decision.launch_plan.program, "powershell");
    }

    #[test]
    fn always_elevated_forces_elevated_session_even_for_normal_command() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "cmd",
            command: "echo 1",
            requires_elevation: false,
            always_elevated: true,
            last_session_kind: Some(WindowsSessionKind::Normal),
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
        assert_eq!(decision.launch_plan.program, "cmd");
    }

    #[test]
    fn wt_elevated_route_uses_admin_window_id() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "wt",
            command: "ipconfig /flushdns",
            requires_elevation: true,
            always_elevated: false,
            last_session_kind: Some(WindowsSessionKind::Normal),
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
        assert_eq!(decision.launch_plan.args[1], ZAPCMD_WT_ADMIN_WINDOW_ID);
    }

    #[test]
    fn wt_existing_elevated_session_reuses_admin_window_without_new_uac() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "wt",
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            last_session_kind: Some(WindowsSessionKind::Elevated),
        });

        assert_eq!(
            resolve_windows_launch_mode(
                &decision,
                Some(WindowsSessionKind::Elevated),
                Some("wt"),
                true
            ),
            WindowsLaunchMode::Direct
        );
    }

    #[test]
    fn wt_does_not_skip_runas_when_previous_elevated_session_was_not_wt() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "wt",
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            last_session_kind: Some(WindowsSessionKind::Elevated),
        });

        assert_eq!(
            resolve_windows_launch_mode(
                &decision,
                Some(WindowsSessionKind::Elevated),
                Some("pwsh"),
                true
            ),
            WindowsLaunchMode::ElevatedViaRunas
        );
    }

    #[test]
    fn wt_first_elevated_session_still_requires_runas() {
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_id: "wt",
            command: "ipconfig /flushdns",
            requires_elevation: true,
            always_elevated: false,
            last_session_kind: Some(WindowsSessionKind::Normal),
        });

        assert_eq!(
            resolve_windows_launch_mode(
                &decision,
                Some(WindowsSessionKind::Normal),
                Some("wt"),
                false
            ),
            WindowsLaunchMode::ElevatedViaRunas
        );
    }

    #[test]
    fn error_cancelled_maps_to_elevation_cancelled_code() {
        assert_eq!(
            map_windows_launch_error(1223),
            TerminalExecutionError::new("elevation-cancelled", "user cancelled elevation")
        );
    }

    #[test]
    fn windows_argument_join_roundtrips_backslashes_in_spaced_paths() {
        assert_windows_arguments_roundtrip(&[
            "-NoExit",
            "-Command",
            r#"Write-Output C:\Program Files\Git\bin"#,
        ]);
    }

    #[test]
    fn windows_argument_join_roundtrips_embedded_quotes_and_trailing_backslashes() {
        assert_windows_arguments_roundtrip(&[
            "/V:ON",
            "/K",
            r#"echo "C:\Program Files\ZapCmd\\""#,
        ]);
    }

    #[test]
    fn only_success_updates_last_session_kind() {
        assert!(should_update_last_session_kind(&Ok(())));
        assert!(!should_update_last_session_kind(&Err(TerminalExecutionError::new(
            "elevation-launch-failed",
            "failed"
        ))));
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::assert_command;
    use crate::terminal::build_command_macos;

    #[test]
    fn build_macos_terminal_script_escape_contract() {
        let cmd = build_command_macos("terminal", r#"echo "a\b""#);
        assert_command(
            &cmd,
            "osascript",
            &[
                "-e",
                r#"tell application "Terminal" to do script "echo \"a\\b\"""#,
            ],
        );
    }

    #[test]
    fn build_macos_iterm2_script_escape_contract() {
        let cmd = build_command_macos("iterm2", r#"echo "a\b""#);
        assert_command(
            &cmd,
            "osascript",
            &[
                "-e",
                r#"tell application "iTerm" to create window with default profile command "echo \"a\\b\"""#,
            ],
        );
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
mod linux {
    use super::{assert_command, command_args};
    use crate::terminal::build_command_linux;

    #[test]
    fn build_linux_gnome_terminal_bash_lc_contract() {
        let cmd = build_command_linux("gnome-terminal", "echo 1");
        assert_command(&cmd, "gnome-terminal", &["--", "bash", "-lc", "echo 1"]);
        assert_eq!(command_args(&cmd).iter().filter(|arg| *arg == "echo 1").count(), 1);
    }

    #[test]
    fn build_linux_konsole_bash_lc_contract() {
        let cmd = build_command_linux("konsole", "echo 1");
        assert_command(&cmd, "konsole", &["-e", "bash", "-lc", "echo 1"]);
        assert_eq!(command_args(&cmd).iter().filter(|arg| *arg == "echo 1").count(), 1);
    }

    #[test]
    fn build_linux_alacritty_bash_lc_contract() {
        let cmd = build_command_linux("alacritty", "echo 1");
        assert_command(&cmd, "alacritty", &["-e", "bash", "-lc", "echo 1"]);
        assert_eq!(command_args(&cmd).iter().filter(|arg| *arg == "echo 1").count(), 1);
    }

    #[test]
    fn build_linux_default_bash_lc_contract() {
        let cmd = build_command_linux("something-else", "echo 1");
        assert_command(&cmd, "x-terminal-emulator", &["-e", "bash", "-lc", "echo 1"]);
        assert_eq!(command_args(&cmd).iter().filter(|arg| *arg == "echo 1").count(), 1);
    }
}
