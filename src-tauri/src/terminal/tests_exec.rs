use super::{sanitize_command, spawn_and_forget, ProcessCommand, TerminalExecutionError};

#[cfg(not(target_os = "windows"))]
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};

#[cfg(target_os = "windows")]
fn exec_step(summary: &str, program: &str, args: &[&str]) -> super::TerminalExecutionStep {
    super::TerminalExecutionStep {
        summary: summary.to_string(),
        execution: super::ExecutionSpec::Exec {
            program: program.to_string(),
            args: args.iter().map(|arg| (*arg).to_string()).collect(),
            stdin_arg_key: None,
            stdin: None,
        },
    }
}

fn script_step(summary: &str, runner: &str, command: &str) -> super::TerminalExecutionStep {
    super::TerminalExecutionStep {
        summary: summary.to_string(),
        execution: super::ExecutionSpec::Script {
            runner: runner.to_string(),
            command: command.to_string(),
        },
    }
}

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

#[cfg(not(target_os = "windows"))]
#[test]
fn spawn_with_reaper_invokes_reaper_after_spawn() {
    let reaped = Arc::new(AtomicBool::new(false));
    let reaped_flag = Arc::clone(&reaped);
    let mut cmd = ProcessCommand::new("sh");
    cmd.args(["-c", "exit 0"]);

    super::spawn_with_reaper(&mut cmd, move |mut child| {
        let _ = child.wait();
        reaped_flag.store(true, Ordering::SeqCst);
    })
    .expect("spawn with reaper should succeed");

    assert!(reaped.load(Ordering::SeqCst));
}

#[cfg(target_os = "windows")]
mod windows {
    use crate::terminal::{
        build_windows_host_command,
        join_windows_arguments,
        map_windows_launch_error,
        resolve_windows_terminal_program_from_options,
        resolve_windows_launch_mode,
        to_wide,
        windows_routing::{
            decide_windows_route,
            ResolvedTerminalProgram,
            TerminalReusePolicy,
            WindowsReusableSessionState,
            WindowsRoutingInput,
            WindowsSessionKind,
            ZAPCMD_WT_ADMIN_WINDOW_ID,
            ZAPCMD_WT_WINDOW_ID,
            update_windows_reusable_session_state,
        },
        WindowsLaunchMode,
        TerminalExecutionError,
        TerminalOption,
    };
    use std::path::PathBuf;
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

    fn resolved_terminal_program(id: &str) -> ResolvedTerminalProgram {
        ResolvedTerminalProgram {
            id: id.to_string(),
            executable_path: PathBuf::from(format!(r"C:\terminal\{}.exe", id)),
            supports_reuse: id == "wt",
        }
    }

    #[test]
    fn never_policy_does_not_reuse_previous_elevated_lane_for_normal_command() {
        let reusable_session_state = WindowsReusableSessionState {
            normal: None,
            elevated: Some("wt".to_string()),
        };
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            terminal_reuse_policy: TerminalReusePolicy::Never,
            reusable_session_state: &reusable_session_state,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Normal);
        assert_eq!(decision.launch_plan.program, PathBuf::from(r"C:\terminal\wt.exe"));
        assert_eq!(decision.launch_plan.args[1], "new");
    }

    #[test]
    fn normal_only_policy_never_reuses_elevated_lane() {
        let reusable_session_state = WindowsReusableSessionState {
            normal: None,
            elevated: Some("wt".to_string()),
        };
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            terminal_reuse_policy: TerminalReusePolicy::NormalOnly,
            reusable_session_state: &reusable_session_state,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Normal);
        assert_eq!(decision.launch_plan.args[1], ZAPCMD_WT_WINDOW_ID);
    }

    #[test]
    fn normal_and_elevated_policy_can_reuse_wt_admin_lane() {
        let reusable_session_state = WindowsReusableSessionState {
            normal: None,
            elevated: Some("wt".to_string()),
        };
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
            terminal_reuse_policy: TerminalReusePolicy::NormalAndElevated,
            reusable_session_state: &reusable_session_state,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
        assert_eq!(decision.launch_plan.args[1], ZAPCMD_WT_ADMIN_WINDOW_ID);
        assert_eq!(
            resolve_windows_launch_mode(&decision, &reusable_session_state),
            WindowsLaunchMode::Direct
        );
    }

    #[test]
    fn unknown_terminal_id_returns_invalid_request() {
        let options = vec![TerminalOption {
            id: "wt".to_string(),
            label: "Windows Terminal".to_string(),
            path: r"C:\terminal\wt.exe".to_string(),
        }];

        assert_eq!(
            resolve_windows_terminal_program_from_options("ghost", options.as_slice()).unwrap_err(),
            TerminalExecutionError::new("invalid-request", "Unknown terminal id: ghost")
        );
    }

    #[test]
    fn only_success_updates_windows_reusable_session_state() {
        let mut reusable_session_state = WindowsReusableSessionState::default();
        let ok = Ok(());
        let error = Err(TerminalExecutionError::new(
            "elevation-launch-failed",
            "failed"
        ));

        update_windows_reusable_session_state(
            &mut reusable_session_state,
            WindowsSessionKind::Elevated,
            "wt",
            &ok,
        );
        assert_eq!(reusable_session_state.elevated.as_deref(), Some("wt"));

        update_windows_reusable_session_state(
            &mut reusable_session_state,
            WindowsSessionKind::Normal,
            "pwsh",
            &error,
        );
        assert_eq!(reusable_session_state.normal, None);
        assert_eq!(reusable_session_state.elevated.as_deref(), Some("wt"));
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
    fn wt_exec_step_preserves_program_args_and_queue_markers() {
        let command = build_windows_host_command(
            "wt",
            &[
                super::exec_step("git status", "git", &["status"]),
                super::exec_step("git branch", "git", &["branch"]),
            ],
        )
        .expect("windows host command should build");

        assert!(command.contains("[zapcmd][run][1/2] git status"));
        assert!(command.contains("[zapcmd][run][2/2] git branch"));
        assert!(command.contains(r#""git" status"#));
        assert!(command.contains("[zapcmd][failed][2/2] git branch"));
    }

    #[test]
    fn wt_script_step_routes_to_requested_powershell_runner() {
        let command = build_windows_host_command(
            "wt",
            &[super::script_step(
                "sync logs",
                "powershell",
                "Write-Host 'sync'",
            )],
        )
        .expect("windows host command should build");

        assert!(command.contains("powershell"));
        assert!(command.contains("-NoProfile"));
        assert!(command.contains("-Command"));
        assert!(command.contains("Write-Host 'sync'"));
    }

    #[test]
    fn cmd_script_step_keeps_cmd_control_shell() {
        let command = build_windows_host_command(
            "cmd",
            &[super::script_step("dir", "cmd", "dir /b")],
        )
        .expect("windows host command should build");

        assert!(command.contains("[zapcmd][run] dir"));
        assert!(command.contains("dir /b"));
        assert!(command.contains(r#"set "zapcmdCode=!ERRORLEVEL!""#));
    }

}

#[cfg(target_os = "macos")]
mod macos {
    use super::assert_command;
    use crate::terminal::{build_command_macos, build_posix_host_command};

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

    #[test]
    fn macos_script_runner_keeps_requested_shell() {
        let command = build_posix_host_command(&[
            super::script_step("brew", "bash", "echo brew"),
            super::script_step("sh-check", "sh", "echo sh"),
        ])
        .expect("posix host command should build");

        assert!(command.contains("[zapcmd][run][1/2] brew"));
        assert!(command.contains("bash -lc 'echo brew'"));
        assert!(command.contains("sh -c 'echo sh'"));
        assert!(command.contains("[zapcmd][failed][2/2] sh-check"));
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
mod linux {
    use super::{assert_command, command_args};
    use crate::terminal::{build_command_linux, build_posix_host_command};

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

    #[test]
    fn build_linux_posix_host_command_keeps_requested_runners_and_step_markers() {
        let command = build_posix_host_command(&[
            super::script_step("bash step", "bash", "echo bash"),
            super::script_step("sh step", "sh", "echo sh"),
        ])
        .expect("posix host command should build");

        assert!(command.contains("[zapcmd][run][1/2] bash step"));
        assert!(command.contains("bash -lc 'echo bash'"));
        assert!(command.contains("sh -c 'echo sh'"));
        assert!(command.contains("[zapcmd][failed][2/2] sh step"));
    }
}
