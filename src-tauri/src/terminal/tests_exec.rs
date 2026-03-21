use super::{run_command_in_terminal, sanitize_command, spawn_and_forget, ProcessCommand};

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
fn run_command_in_terminal_keeps_rejecting_blank_input_after_strategy_refactor() {
    assert!(run_command_in_terminal("wt".to_string(), "   ".to_string()).is_err());
}

#[test]
fn spawn_and_forget_propagates_spawn_error() {
    let mut cmd = ProcessCommand::new("definitely-not-a-real-binary-xyz");
    assert!(spawn_and_forget(&mut cmd).is_err());
}

#[cfg(target_os = "windows")]
mod windows {
    use crate::terminal::{build_windows_launch_plan, ZAPCMD_WT_WINDOW_ID};

    const CREATE_NEW_CONSOLE: u32 = 0x0000_0010;

    #[test]
    fn build_windows_wt_launch_plan_reuses_managed_window() {
        let plan = build_windows_launch_plan("wt", "echo 1");
        assert_eq!(plan.program, "wt");
        assert_eq!(
            plan.args,
            vec![
                "-w".to_string(),
                ZAPCMD_WT_WINDOW_ID.to_string(),
                "new-tab".to_string(),
                "cmd".to_string(),
                "/V:ON".to_string(),
                "/K".to_string(),
                "echo 1".to_string(),
            ]
        );
        assert_eq!(plan.creation_flags, 0);
    }

    #[test]
    fn build_windows_cmd_launch_plan_forces_new_console() {
        let plan = build_windows_launch_plan("cmd", "echo 1");
        assert_eq!(plan.program, "cmd");
        assert_eq!(
            plan.args,
            vec!["/V:ON".to_string(), "/K".to_string(), "echo 1".to_string()]
        );
        assert_eq!(plan.creation_flags, CREATE_NEW_CONSOLE);
    }

    #[test]
    fn build_windows_pwsh_launch_plan_forces_new_console() {
        let plan = build_windows_launch_plan("pwsh", "echo 1");
        assert_eq!(plan.program, "pwsh");
        assert_eq!(
            plan.args,
            vec![
                "-NoExit".to_string(),
                "-Command".to_string(),
                "echo 1".to_string()
            ]
        );
        assert_eq!(plan.creation_flags, CREATE_NEW_CONSOLE);
    }

    #[test]
    fn build_windows_default_launch_plan_falls_back_to_powershell_new_console() {
        let plan = build_windows_launch_plan("something-else", "echo 1");
        assert_eq!(plan.program, "powershell");
        assert_eq!(
            plan.args,
            vec![
                "-NoExit".to_string(),
                "-Command".to_string(),
                "echo 1".to_string()
            ]
        );
        assert_eq!(plan.creation_flags, CREATE_NEW_CONSOLE);
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
