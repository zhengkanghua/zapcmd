use super::{spawn_and_forget, ProcessCommand, TerminalExecutionError};
use crate::terminal::execution_common::{
    build_cmd_safe_windows_process_command, build_powershell_step_failure_guard,
};
use crate::terminal::execution::sanitize_command;
use crate::terminal::execution_common::{sanitize_steps, validate_execution_safety_confirmation};

#[cfg(not(target_os = "windows"))]
use std::process::Child;
#[cfg(not(target_os = "windows"))]
use std::sync::mpsc;
#[cfg(not(target_os = "windows"))]
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
#[cfg(not(target_os = "windows"))]
use std::time::Duration;

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
fn macos_terminal_launch_passes_command_via_argv_instead_of_inlining_script_text() {
    let command = "printf 'hello\nworld' && echo \"quoted\"";
    let args = crate::terminal::launch_posix::build_macos_osascript_args("terminal", command);

    assert_eq!(args.last().map(String::as_str), Some(command));
    assert!(
        args.get(1).is_some_and(|script| !script.contains(command)),
        "AppleScript source must not inline the command payload"
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
fn sanitize_steps_rejects_excessive_step_count_at_ipc_boundary() {
    let steps = (0..33)
        .map(|index| script_step(&format!("step {index}"), "powershell", "Write-Host ok"))
        .collect::<Vec<_>>();

    assert_eq!(
        sanitize_steps(steps.as_slice()).unwrap_err(),
        TerminalExecutionError::new("invalid-request", "Execution steps cannot exceed 32.")
    );
}

#[test]
fn sanitize_steps_rejects_oversized_execution_field_at_ipc_boundary() {
    let oversized_program = "a".repeat(8193);
    let steps = vec![super::TerminalExecutionStep {
        summary: "oversized program".to_string(),
        execution: super::ExecutionSpec::Exec {
            program: oversized_program,
            args: vec![],
            stdin_arg_key: None,
            stdin: None,
        },
    }];

    assert_eq!(
        sanitize_steps(steps.as_slice()).unwrap_err(),
        TerminalExecutionError::new(
            "invalid-request",
            "Execution field exceeds maximum size of 8192 bytes."
        )
    );
}

#[test]
fn execution_safety_confirmation_rejects_risky_steps_without_confirmation() {
    let steps = vec![script_step("remove files", "bash", "rm -rf /tmp/zapcmd-risk")];

    assert_eq!(
        validate_execution_safety_confirmation(steps.as_slice(), false, false, false).unwrap_err(),
        TerminalExecutionError::new(
            "safety-confirmation-required",
            "Risky execution requires explicit safety confirmation."
        )
    );
}

#[test]
fn execution_safety_confirmation_rejects_elevation_without_confirmation() {
    let steps = vec![script_step("admin task", "powershell", "Write-Host admin")];

    assert_eq!(
        validate_execution_safety_confirmation(steps.as_slice(), true, false, false).unwrap_err(),
        TerminalExecutionError::new(
            "safety-confirmation-required",
            "Risky execution requires explicit safety confirmation."
        )
    );
}

#[test]
fn execution_safety_confirmation_allows_confirmed_risky_steps() {
    let steps = vec![script_step("kill task", "cmd", "taskkill /F /PID 1234")];

    assert!(validate_execution_safety_confirmation(steps.as_slice(), false, false, true).is_ok());
}

#[test]
fn spawn_and_forget_propagates_spawn_error() {
    let mut cmd = ProcessCommand::new("definitely-not-a-real-binary-xyz");
    assert!(spawn_and_forget(&mut cmd).is_err());
}

#[test]
fn cmd_safe_windows_process_command_quotes_spaced_program_and_arguments() {
    let command = build_cmd_safe_windows_process_command(
        r"C:\Program Files\Git\bin\git.exe",
        &[r"C:\repo with space".to_string(), "status".to_string()],
    );

    assert!(command.contains(r#""C:\Program Files\Git\bin\git.exe""#));
    assert!(command.contains(r#""C:\repo with space""#));
    assert!(command.ends_with(" status"));
}

#[test]
fn powershell_step_failure_guard_treats_native_exit_code_as_failure() {
    let guard = build_powershell_step_failure_guard("'[zapcmd][failed] native command'");

    assert!(guard.contains("-not $zapcmdSuccess"));
    assert!(guard.contains("$null -ne $zapcmdCode -and $zapcmdCode -ne 0"));
    assert!(guard.contains("-or"));
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

#[cfg(not(target_os = "windows"))]
#[test]
fn spawn_and_forget_reaps_short_lived_child_without_waiting_for_previous_long_lived_child() {
    use crate::terminal::spawn_with_reaper;

    let (tx, rx) = mpsc::channel::<()>();

    let mut long_lived = ProcessCommand::new("sh");
    long_lived.args(["-c", "sleep 0.3"]);
    spawn_with_reaper(&mut long_lived, move |child: Child| {
        std::thread::spawn(move || {
            let mut child = child;
            let _ = child.wait();
        });
    })
    .expect("long-lived child should spawn");

    let mut short_lived = ProcessCommand::new("sh");
    short_lived.args(["-c", "exit 0"]);
    spawn_with_reaper(&mut short_lived, move |child: Child| {
        let tx = tx.clone();
        std::thread::spawn(move || {
            let mut child = child;
            let _ = child.wait();
            let _ = tx.send(());
        });
    })
    .expect("short-lived child should spawn");

    assert!(
        rx.recv_timeout(Duration::from_millis(200)).is_ok(),
        "short-lived child reaper should not be blocked by previous long-lived child"
    );
}

#[cfg(not(target_os = "windows"))]
#[test]
fn spawn_and_forget_reuses_shared_reaper_worker() {
    use crate::terminal::launch_posix::{
        reaper_worker_start_count_for_test,
    };

    let before = reaper_worker_start_count_for_test();

    let mut first = ProcessCommand::new("sh");
    first.args(["-c", "exit 0"]);
    spawn_and_forget(&mut first).expect("first child should spawn");

    let mut second = ProcessCommand::new("sh");
    second.args(["-c", "exit 0"]);
    spawn_and_forget(&mut second).expect("second child should spawn");

    assert_eq!(
        reaper_worker_start_count_for_test(),
        if before == 0 { 1 } else { before },
        "spawn_and_forget should reuse one shared child reaper instead of creating one long-lived worker per child"
    );
}

#[cfg(not(target_os = "windows"))]
#[test]
fn spawn_and_forget_shared_reaper_does_not_block_short_lived_child_behind_long_lived_child() {
    use crate::terminal::launch_posix::{
        reaper_pending_child_count_for_test, wait_for_reaper_pending_child_count_for_test,
    };

    let mut long_lived = ProcessCommand::new("sh");
    long_lived.args(["-c", "sleep 0.3"]);
    spawn_and_forget(&mut long_lived).expect("long-lived child should spawn");

    let mut short_lived = ProcessCommand::new("sh");
    short_lived.args(["-c", "exit 0"]);
    spawn_and_forget(&mut short_lived).expect("short-lived child should spawn");

    assert!(
        wait_for_reaper_pending_child_count_for_test(1, Duration::from_millis(200)),
        "short-lived child should be reaped while the long-lived child is still running; pending={}",
        reaper_pending_child_count_for_test()
    );
}

#[cfg(target_os = "windows")]
mod windows {
    use crate::terminal::execution::build_windows_host_command;
    use crate::terminal::{
        join_windows_arguments, map_windows_launch_error, resolve_windows_launch_mode,
        resolve_windows_terminal_program_from_options, to_wide,
        windows_routing::{
            decide_windows_route, ResolvedTerminalProgram, WindowsRoutingInput, WindowsSessionKind,
        },
        ExecutionSpec, TerminalExecutionError, TerminalExecutionStep, TerminalOption,
        WindowsLaunchMode,
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
        assert!(
            !arguments.is_null(),
            "CommandLineToArgvW should parse the command line"
        );

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
        }
    }

    #[test]
    fn wt_normal_command_always_opens_new_window() {
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Normal);
        assert_eq!(
            decision.launch_plan.program,
            PathBuf::from(r"C:\terminal\wt.exe")
        );
        assert_eq!(decision.launch_plan.args[1], "new");
    }

    #[test]
    fn wt_elevated_command_always_uses_new_window_plan() {
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "net session",
            requires_elevation: true,
            always_elevated: false,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
        assert_eq!(decision.launch_plan.args[1], "new");
    }

    #[test]
    fn elevated_route_still_requires_runas_mode() {
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "net session",
            requires_elevation: true,
            always_elevated: false,
        });

        assert_eq!(
            resolve_windows_launch_mode(&decision),
            WindowsLaunchMode::ElevatedViaRunas
        );
    }

    #[test]
    fn normal_route_uses_direct_mode() {
        let terminal_program = resolved_terminal_program("pwsh");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Normal);
        assert_eq!(
            resolve_windows_launch_mode(&decision),
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
        assert_windows_arguments_roundtrip(&["/V:ON", "/K", r#"echo "C:\Program Files\ZapCmd\\""#]);
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
        assert!(command.contains(" & git status & ") || command.contains(r#" & "git" status & "#));
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
    fn wt_exec_step_with_stdin_uses_base64_instead_of_here_string() {
        let command = build_windows_host_command(
            "wt",
            &[TerminalExecutionStep {
                summary: "sqlite query".to_string(),
                execution: ExecutionSpec::Exec {
                    program: "sqlite3".to_string(),
                    args: vec!["data.db".to_string()],
                    stdin_arg_key: Some("sql".to_string()),
                    stdin: Some("'@\nWrite-Host pwned\n".to_string()),
                },
            }],
        )
        .expect("windows host command should build");

        assert!(command.contains("FromBase64String"));
        assert!(!command.contains("@'\n"));
        assert!(!command.contains("Write-Host pwned"));
    }

    #[test]
    fn cmd_script_step_keeps_cmd_control_shell() {
        let command =
            build_windows_host_command("cmd", &[super::script_step("dir", "cmd", "dir /b")])
                .expect("windows host command should build");

        assert!(command.contains("[zapcmd][run] dir"));
        assert!(command.contains("dir /b"));
        assert!(command.contains(r#"set "zapcmdCode=!ERRORLEVEL!""#));
        assert!(command.contains(r#"if not "!zapcmdCode!"=="0" (echo"#));
        assert!(command.contains(r#"exit /b !zapcmdCode!"#));
    }

    #[test]
    fn cmd_exec_step_escapes_cmd_control_metacharacters() {
        let command = build_windows_host_command(
            "cmd",
            &[super::exec_step(
                "safe echo",
                "echo",
                &["hello&calc", "literal|more", "%PATH%", "!TEMP!"],
            )],
        )
        .expect("windows host command should build");

        assert!(command.contains("echo hello^&calc literal^|more ^%PATH^% ^^!TEMP^^!"));
        assert!(!command.contains("hello&calc"));
        assert!(!command.contains("literal|more"));
    }

    #[test]
    fn cmd_exec_step_quotes_spaced_program_and_arguments() {
        let command = build_windows_host_command(
            "cmd",
            &[super::exec_step(
                "spaced path",
                r"C:\Program Files\Git\bin\git.exe",
                &[r"C:\repo with space", "status"],
            )],
        )
        .expect("windows host command should build");

        assert!(command.contains(r#""C:\Program Files\Git\bin\git.exe""#));
        assert!(command.contains(r#""C:\repo with space""#));
        assert!(command.contains(" status "));
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::assert_command;
    use crate::terminal::execution::build_posix_host_command;
    use crate::terminal::launch_posix::build_command_macos;

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
    use crate::terminal::execution::build_posix_host_command;
    use crate::terminal::launch_posix::build_command_linux;

    #[test]
    fn build_linux_gnome_terminal_bash_lc_contract() {
        let cmd = build_command_linux("gnome-terminal", "echo 1");
        assert_command(&cmd, "gnome-terminal", &["--", "bash", "-lc", "echo 1"]);
        assert_eq!(
            command_args(&cmd)
                .iter()
                .filter(|arg| *arg == "echo 1")
                .count(),
            1
        );
    }

    #[test]
    fn build_linux_konsole_bash_lc_contract() {
        let cmd = build_command_linux("konsole", "echo 1");
        assert_command(&cmd, "konsole", &["-e", "bash", "-lc", "echo 1"]);
        assert_eq!(
            command_args(&cmd)
                .iter()
                .filter(|arg| *arg == "echo 1")
                .count(),
            1
        );
    }

    #[test]
    fn build_linux_alacritty_bash_lc_contract() {
        let cmd = build_command_linux("alacritty", "echo 1");
        assert_command(&cmd, "alacritty", &["-e", "bash", "-lc", "echo 1"]);
        assert_eq!(
            command_args(&cmd)
                .iter()
                .filter(|arg| *arg == "echo 1")
                .count(),
            1
        );
    }

    #[test]
    fn build_linux_default_bash_lc_contract() {
        let cmd = build_command_linux("something-else", "echo 1");
        assert_command(
            &cmd,
            "x-terminal-emulator",
            &["-e", "bash", "-lc", "echo 1"],
        );
        assert_eq!(
            command_args(&cmd)
                .iter()
                .filter(|arg| *arg == "echo 1")
                .count(),
            1
        );
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
        assert!(command.contains("exit \"$zapcmd_code\""));
    }
}

#[cfg(not(target_os = "windows"))]
mod windows_routing_logic {
    use crate::terminal::windows_routing::{
        decide_windows_route, ResolvedTerminalProgram, WindowsRoutingInput, WindowsSessionKind,
    };
    use std::path::PathBuf;

    fn resolved_terminal_program(id: &str) -> ResolvedTerminalProgram {
        ResolvedTerminalProgram {
            id: id.to_string(),
            executable_path: PathBuf::from(format!(r"C:\terminal\{}.exe", id)),
        }
    }

    #[test]
    fn normal_commands_stay_on_normal_lane() {
        let terminal_program = resolved_terminal_program("pwsh");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "echo 1",
            requires_elevation: false,
            always_elevated: false,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Normal);
    }

    #[test]
    fn elevated_commands_stay_on_elevated_lane() {
        let terminal_program = resolved_terminal_program("wt");
        let decision = decide_windows_route(WindowsRoutingInput {
            terminal_program: &terminal_program,
            command: "net session",
            requires_elevation: true,
            always_elevated: false,
        });

        assert_eq!(decision.target_session_kind, WindowsSessionKind::Elevated);
    }
}
