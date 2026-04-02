#[cfg(target_os = "macos")]
use std::path::Path;
use std::process::Command as ProcessCommand;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
#[cfg(target_os = "windows")]
use std::path::PathBuf;
#[cfg(target_os = "windows")]
use tauri::Manager;

#[cfg(target_os = "windows")]
use crate::app_state::AppState;
#[cfg(target_os = "windows")]
use self::windows_launch::run_command_windows;

#[cfg(target_os = "windows")]
pub(crate) mod windows_routing;
#[cfg(target_os = "windows")]
pub(crate) mod windows_launch;
#[cfg(all(test, target_os = "windows"))]
pub(crate) use self::windows_launch::{
    join_windows_arguments,
    map_windows_launch_error,
    resolve_windows_launch_mode,
    to_wide,
    WindowsLaunchMode,
};

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Serialize)]
pub(crate) struct TerminalOption {
    id: String,
    label: String,
    path: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub(crate) struct TerminalExecutionError {
    code: String,
    message: String,
}

impl TerminalExecutionError {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.to_string(),
            message: message.into(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub(crate) enum ExecutionSpec {
    Exec {
        program: String,
        #[serde(default)]
        args: Vec<String>,
        #[serde(rename = "stdinArgKey")]
        stdin_arg_key: Option<String>,
        stdin: Option<String>,
    },
    Script {
        runner: String,
        command: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TerminalExecutionStep {
    pub summary: String,
    pub execution: ExecutionSpec,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum SanitizedExecutionSpec {
    Exec {
        program: String,
        args: Vec<String>,
        stdin: Option<String>,
    },
    Script {
        runner: String,
        command: String,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct SanitizedExecutionStep {
    summary: String,
    execution: SanitizedExecutionSpec,
}

fn sanitize_command(command: &str) -> Result<String, TerminalExecutionError> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Command cannot be empty.",
        ));
    }
    Ok(trimmed.to_string())
}

fn sanitize_summary(summary: &str) -> Result<String, TerminalExecutionError> {
    let trimmed = summary.trim();
    if trimmed.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Command summary cannot be empty.",
        ));
    }
    Ok(trimmed.to_string())
}

fn sanitize_runner(runner: &str) -> Result<String, TerminalExecutionError> {
    let normalized = runner.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "powershell" | "pwsh" | "cmd" | "bash" | "sh" => Ok(normalized),
        _ => Err(TerminalExecutionError::new(
            "invalid-request",
            format!("Unsupported script runner: {}", runner.trim()),
        )),
    }
}

fn sanitize_steps(
    steps: &[TerminalExecutionStep],
) -> Result<Vec<SanitizedExecutionStep>, TerminalExecutionError> {
    if steps.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Execution steps cannot be empty.",
        ));
    }

    steps
        .iter()
        .map(|step| {
            let summary = sanitize_summary(step.summary.as_str())?;
            let execution = match &step.execution {
                ExecutionSpec::Exec {
                    program,
                    args,
                    stdin,
                    ..
                } => SanitizedExecutionSpec::Exec {
                    program: sanitize_command(program.as_str())?,
                    args: args.clone(),
                    stdin: stdin
                        .as_ref()
                        .filter(|value| !value.is_empty())
                        .cloned(),
                },
                ExecutionSpec::Script { runner, command } => SanitizedExecutionSpec::Script {
                    runner: sanitize_runner(runner.as_str())?,
                    command: sanitize_command(command.as_str())?,
                },
            };

            Ok(SanitizedExecutionStep { summary, execution })
        })
        .collect()
}

fn build_run_marker(index: usize, total: usize, summary: &str) -> String {
    if total > 1 {
        format!("[zapcmd][run][{}/{}] {}", index + 1, total, summary)
    } else {
        format!("[zapcmd][run] {}", summary)
    }
}

fn build_failed_marker(index: usize, total: usize, summary: &str) -> String {
    if total > 1 {
        format!("[zapcmd][failed][{}/{}] {}", index + 1, total, summary)
    } else {
        format!("[zapcmd][failed] {}", summary)
    }
}

#[cfg(not(target_os = "windows"))]
fn escape_posix_single_quoted_literal(value: &str) -> String {
    value.replace('\'', r#"'"'"'"#)
}

#[cfg(not(target_os = "windows"))]
fn quote_posix_single_quoted(value: &str) -> String {
    format!("'{}'", escape_posix_single_quoted_literal(value))
}

#[cfg(not(target_os = "windows"))]
fn build_posix_process_command(program: &str, args: &[String]) -> String {
    let mut parts = Vec::with_capacity(args.len() + 1);
    parts.push(quote_posix_single_quoted(program));
    parts.extend(args.iter().map(|arg| quote_posix_single_quoted(arg.as_str())));
    parts.join(" ")
}

#[cfg(not(target_os = "windows"))]
fn build_posix_script_invocation(
    runner: &str,
    command: &str,
) -> Result<String, TerminalExecutionError> {
    let quoted_command = quote_posix_single_quoted(command);
    match runner {
        "bash" => Ok(format!("bash -lc {}", quoted_command)),
        "sh" => Ok(format!("sh -c {}", quoted_command)),
        "powershell" | "pwsh" => {
            Ok(format!("{} -NoProfile -Command {}", runner, quoted_command))
        }
        "cmd" => Ok(format!("cmd /C {}", quoted_command)),
        _ => Err(TerminalExecutionError::new(
            "invalid-request",
            format!("Unsupported script runner: {}", runner),
        )),
    }
}

#[cfg(not(target_os = "windows"))]
fn build_posix_step_command(
    step: &SanitizedExecutionStep,
) -> Result<String, TerminalExecutionError> {
    match &step.execution {
        SanitizedExecutionSpec::Exec {
            program,
            args,
            stdin,
        } => {
            let exec = build_posix_process_command(program.as_str(), args.as_slice());
            Ok(match stdin {
                Some(value) => {
                    format!("printf '%s' {} | {}", quote_posix_single_quoted(value), exec)
                }
                None => exec,
            })
        }
        SanitizedExecutionSpec::Script { runner, command } => {
            build_posix_script_invocation(runner.as_str(), command.as_str())
        }
    }
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn build_posix_host_command(
    steps: &[TerminalExecutionStep],
) -> Result<String, TerminalExecutionError> {
    let sanitized_steps = sanitize_steps(steps)?;
    let total = sanitized_steps.len();
    let mut parts = Vec::with_capacity(sanitized_steps.len() * 4);

    for (index, step) in sanitized_steps.iter().enumerate() {
        parts.push(format!(
            "printf '%s\\n' {}",
            quote_posix_single_quoted(build_run_marker(index, total, step.summary.as_str()).as_str())
        ));
        parts.push(build_posix_step_command(step)?);
        parts.push("zapcmd_code=$?".to_string());
        parts.push(format!(
            "if [ \"$zapcmd_code\" -ne 0 ]; then printf '%s\\n' {}; fi",
            quote_posix_single_quoted(
                build_failed_marker(index, total, step.summary.as_str()).as_str()
            )
        ));
    }

    Ok(parts.join("; "))
}

#[cfg(target_os = "windows")]
fn escape_cmd_echo_text(value: &str) -> String {
    value.chars()
        .map(|character| match character {
            '^' => "^^".to_string(),
            '&' => "^&".to_string(),
            '|' => "^|".to_string(),
            '<' => "^<".to_string(),
            '>' => "^>".to_string(),
            '(' => "^(".to_string(),
            ')' => "^)".to_string(),
            '%' => "%%".to_string(),
            '!' => "^^!".to_string(),
            _ => character.to_string(),
        })
        .collect::<Vec<_>>()
        .join("")
}

#[cfg(target_os = "windows")]
fn escape_powershell_single_quoted_literal(value: &str) -> String {
    value.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn quote_powershell_single_quoted(value: &str) -> String {
    format!("'{}'", escape_powershell_single_quoted_literal(value))
}

#[cfg(target_os = "windows")]
fn build_powershell_array_literal(args: &[String]) -> String {
    if args.is_empty() {
        "@()".to_string()
    } else {
        format!(
            "@({})",
            args.iter()
                .map(|arg| quote_powershell_single_quoted(arg.as_str()))
                .collect::<Vec<_>>()
                .join(", ")
        )
    }
}

#[cfg(target_os = "windows")]
fn build_powershell_exec_invocation(
    program: &str,
    args: &[String],
    stdin: Option<&str>,
) -> String {
    let program_literal = quote_powershell_single_quoted(program);
    let args_literal = build_powershell_array_literal(args);
    let call = if args.is_empty() {
        format!("& {}", program_literal)
    } else {
        format!(
            "$zapcmdArgs = {}; & {} @zapcmdArgs",
            args_literal, program_literal
        )
    };

    match stdin {
        Some(value) => format!(
            "$zapcmdInput = @'\n{}\n'@; $zapcmdInput | {}",
            value.replace("\r\n", "\n"),
            call
        ),
        None => call,
    }
}

#[cfg(target_os = "windows")]
fn build_windows_process_command(program: &str, args: &[String]) -> String {
    let mut argv = Vec::with_capacity(args.len() + 1);
    argv.push(program.to_string());
    argv.extend(args.iter().cloned());
    windows_launch::join_windows_arguments(argv.as_slice())
}

#[cfg(target_os = "windows")]
fn build_cmd_script_invocation(
    runner: &str,
    command: &str,
) -> Result<String, TerminalExecutionError> {
    match runner {
        "cmd" => Ok(command.to_string()),
        "powershell" | "pwsh" => Ok(build_windows_process_command(
            runner,
            &[
                "-NoProfile".to_string(),
                "-Command".to_string(),
                command.to_string(),
            ],
        )),
        "bash" => Ok(build_windows_process_command(
            "bash",
            &["-lc".to_string(), command.to_string()],
        )),
        "sh" => Ok(build_windows_process_command(
            "sh",
            &["-c".to_string(), command.to_string()],
        )),
        _ => Err(TerminalExecutionError::new(
            "invalid-request",
            format!("Unsupported script runner: {}", runner),
        )),
    }
}

#[cfg(target_os = "windows")]
fn build_cmd_step_command(
    step: &SanitizedExecutionStep,
) -> Result<String, TerminalExecutionError> {
    match &step.execution {
        SanitizedExecutionSpec::Exec {
            program,
            args,
            stdin,
        } => Ok(match stdin {
            Some(value) => build_windows_process_command(
                "powershell",
                &[
                    "-NoProfile".to_string(),
                    "-Command".to_string(),
                    build_powershell_exec_invocation(program.as_str(), args.as_slice(), Some(value)),
                ],
            ),
            None => build_windows_process_command(program.as_str(), args.as_slice()),
        }),
        SanitizedExecutionSpec::Script { runner, command } => {
            build_cmd_script_invocation(runner.as_str(), command.as_str())
        }
    }
}

#[cfg(target_os = "windows")]
fn build_powershell_script_invocation(
    host_terminal_id: &str,
    runner: &str,
    command: &str,
) -> Result<String, TerminalExecutionError> {
    if runner == host_terminal_id {
        return Ok(command.to_string());
    }

    match runner {
        "powershell" | "pwsh" => Ok(format!(
            "& {} @('-NoProfile', '-Command', {})",
            quote_powershell_single_quoted(runner),
            quote_powershell_single_quoted(command)
        )),
        "cmd" => Ok(format!(
            "& 'cmd' @('/C', {})",
            quote_powershell_single_quoted(command)
        )),
        "bash" => Ok(format!(
            "& 'bash' @('-lc', {})",
            quote_powershell_single_quoted(command)
        )),
        "sh" => Ok(format!(
            "& 'sh' @('-c', {})",
            quote_powershell_single_quoted(command)
        )),
        _ => Err(TerminalExecutionError::new(
            "invalid-request",
            format!("Unsupported script runner: {}", runner),
        )),
    }
}

#[cfg(target_os = "windows")]
fn build_powershell_step_command(
    host_terminal_id: &str,
    step: &SanitizedExecutionStep,
) -> Result<String, TerminalExecutionError> {
    match &step.execution {
        SanitizedExecutionSpec::Exec {
            program,
            args,
            stdin,
        } => Ok(build_powershell_exec_invocation(
            program.as_str(),
            args.as_slice(),
            stdin.as_deref(),
        )),
        SanitizedExecutionSpec::Script { runner, command } => build_powershell_script_invocation(
            host_terminal_id,
            runner.as_str(),
            command.as_str(),
        ),
    }
}

#[cfg(target_os = "windows")]
fn build_cmd_host_command(
    steps: &[SanitizedExecutionStep],
) -> Result<String, TerminalExecutionError> {
    let total = steps.len();
    let mut parts = vec!["setlocal EnableDelayedExpansion".to_string()];

    for (index, step) in steps.iter().enumerate() {
        parts.push(format!(
            "echo {}",
            escape_cmd_echo_text(build_run_marker(index, total, step.summary.as_str()).as_str())
        ));
        parts.push(build_cmd_step_command(step)?);
        parts.push(r#"set "zapcmdCode=!ERRORLEVEL!""#.to_string());
        parts.push(format!(
            r#"if not "!zapcmdCode!"=="0" echo {}"#,
            escape_cmd_echo_text(build_failed_marker(index, total, step.summary.as_str()).as_str())
        ));
    }

    Ok(parts.join(" & "))
}

#[cfg(target_os = "windows")]
fn build_powershell_host_command(
    terminal_id: &str,
    steps: &[SanitizedExecutionStep],
) -> Result<String, TerminalExecutionError> {
    let total = steps.len();
    let mut parts = Vec::with_capacity(steps.len() * 5);

    for (index, step) in steps.iter().enumerate() {
        parts.push(format!(
            "Write-Host {}",
            quote_powershell_single_quoted(
                build_run_marker(index, total, step.summary.as_str()).as_str()
            )
        ));
        parts.push("$LASTEXITCODE = $null".to_string());
        parts.push(build_powershell_step_command(terminal_id, step)?);
        parts.push("$zapcmdSuccess = $?".to_string());
        parts.push("$zapcmdCode = $LASTEXITCODE".to_string());
        parts.push(format!(
            "if (-not $zapcmdSuccess) {{ Write-Host {} }}",
            quote_powershell_single_quoted(
                build_failed_marker(index, total, step.summary.as_str()).as_str()
            )
        ));
    }

    Ok(parts.join("; "))
}

#[cfg(target_os = "windows")]
pub(crate) fn build_windows_host_command(
    terminal_id: &str,
    steps: &[TerminalExecutionStep],
) -> Result<String, TerminalExecutionError> {
    let sanitized_steps = sanitize_steps(steps)?;
    match terminal_id {
        "wt" | "cmd" => build_cmd_host_command(sanitized_steps.as_slice()),
        "powershell" | "pwsh" => {
            build_powershell_host_command(terminal_id, sanitized_steps.as_slice())
        }
        other => Err(TerminalExecutionError::new(
            "invalid-request",
            format!("Unknown terminal id: {}", other),
        )),
    }
}

fn spawn_and_forget(cmd: &mut ProcessCommand) -> Result<(), String> {
    cmd.spawn().map(|_| ()).map_err(|err| err.to_string())
}

pub(super) fn terminal_launch_failed(message: impl Into<String>) -> TerminalExecutionError {
    TerminalExecutionError::new("terminal-launch-failed", message)
}

fn parse_first_non_empty_line(raw: &str) -> Option<String> {
    raw.lines()
        .map(|line| line.trim())
        .find(|line| !line.is_empty())
        .map(|line| line.to_string())
}

#[cfg(target_os = "windows")]
fn command_exists(command: &str) -> bool {
    create_hidden_process("where")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(not(target_os = "windows"))]
fn command_exists(command: &str) -> bool {
    ProcessCommand::new("which")
        .arg(command)
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

#[cfg(target_os = "windows")]
fn command_path(command: &str) -> Option<String> {
    let output = create_hidden_process("where").arg(command).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    parse_first_non_empty_line(&raw)
}

#[cfg(not(target_os = "windows"))]
fn command_path(command: &str) -> Option<String> {
    let output = ProcessCommand::new("which").arg(command).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let raw = String::from_utf8_lossy(&output.stdout);
    parse_first_non_empty_line(&raw)
}

#[cfg(target_os = "windows")]
fn create_hidden_process(program: &str) -> ProcessCommand {
    let mut process = ProcessCommand::new(program);
    process.creation_flags(CREATE_NO_WINDOW);
    process
}

#[cfg(target_os = "macos")]
fn resolve_macos_terminals(path_exists: impl Fn(&str) -> bool) -> Vec<TerminalOption> {
    let mut options = Vec::<TerminalOption>::new();
    options.push(TerminalOption {
        id: "terminal".to_string(),
        label: "Terminal".to_string(),
        path: "/System/Applications/Utilities/Terminal.app".to_string(),
    });

    let iterm_candidates = ["/Applications/iTerm.app", "/Applications/iTerm2.app"];
    if let Some(path) = iterm_candidates
        .iter()
        .copied()
        .find(|candidate| path_exists(candidate))
    {
        options.push(TerminalOption {
            id: "iterm2".to_string(),
            label: "iTerm2".to_string(),
            path: path.to_string(),
        });
    }

    options
}

#[cfg(target_os = "windows")]
fn resolve_windows_terminals(
    exists: impl Fn(&str) -> bool,
    path: impl Fn(&str) -> Option<String>,
) -> Vec<TerminalOption> {
    let mut options = Vec::<TerminalOption>::new();
    if exists("powershell") {
        options.push(TerminalOption {
            id: "powershell".to_string(),
            label: "PowerShell".to_string(),
            path: path("powershell").unwrap_or_else(|| "powershell.exe".to_string()),
        });
    }
    if exists("pwsh") {
        options.push(TerminalOption {
            id: "pwsh".to_string(),
            label: "PowerShell 7".to_string(),
            path: path("pwsh").unwrap_or_else(|| "pwsh.exe".to_string()),
        });
    }
    if exists("wt") {
        options.push(TerminalOption {
            id: "wt".to_string(),
            label: "Windows Terminal".to_string(),
            path: path("wt").unwrap_or_else(|| "wt.exe".to_string()),
        });
    }
    if exists("cmd") {
        options.push(TerminalOption {
            id: "cmd".to_string(),
            label: "命令提示符 (CMD)".to_string(),
            path: path("cmd").unwrap_or_else(|| "cmd.exe".to_string()),
        });
    }
    if options.is_empty() {
        options.push(TerminalOption {
            id: "powershell".to_string(),
            label: "PowerShell".to_string(),
            path: "powershell.exe".to_string(),
        });
    }
    options
}

#[cfg(target_os = "windows")]
pub(crate) fn resolve_windows_terminal_program_from_options(
    terminal_id: &str,
    options: &[TerminalOption],
) -> Result<windows_routing::ResolvedTerminalProgram, TerminalExecutionError> {
    let option = options
        .iter()
        .find(|option| option.id == terminal_id)
        .ok_or_else(|| {
            TerminalExecutionError::new(
                "invalid-request",
                format!("Unknown terminal id: {}", terminal_id),
            )
        })?;

    Ok(windows_routing::ResolvedTerminalProgram {
        id: option.id.clone(),
        executable_path: PathBuf::from(option.path.as_str()),
        supports_reuse: option.id == "wt",
    })
}

#[cfg(target_os = "windows")]
fn resolve_windows_terminal_program(
    terminal_id: &str,
) -> Result<windows_routing::ResolvedTerminalProgram, TerminalExecutionError> {
    let options = resolve_windows_terminals(command_exists, command_path);
    resolve_windows_terminal_program_from_options(terminal_id, options.as_slice())
}

#[cfg(target_os = "windows")]
fn parse_terminal_reuse_policy(
    value: Option<&str>,
) -> windows_routing::TerminalReusePolicy {
    match value {
        Some("normal-only") => windows_routing::TerminalReusePolicy::NormalOnly,
        Some("normal-and-elevated") => {
            windows_routing::TerminalReusePolicy::NormalAndElevated
        }
        _ => windows_routing::TerminalReusePolicy::Never,
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
fn resolve_linux_terminals(
    exists: impl Fn(&str) -> bool,
    path: impl Fn(&str) -> Option<String>,
) -> Vec<TerminalOption> {
    let mut options = Vec::<TerminalOption>::new();
    if exists("x-terminal-emulator") {
        options.push(TerminalOption {
            id: "x-terminal-emulator".to_string(),
            label: "System Terminal".to_string(),
            path: path("x-terminal-emulator").unwrap_or_else(|| "x-terminal-emulator".to_string()),
        });
    }
    if exists("gnome-terminal") {
        options.push(TerminalOption {
            id: "gnome-terminal".to_string(),
            label: "GNOME Terminal".to_string(),
            path: path("gnome-terminal").unwrap_or_else(|| "gnome-terminal".to_string()),
        });
    }
    if exists("konsole") {
        options.push(TerminalOption {
            id: "konsole".to_string(),
            label: "Konsole".to_string(),
            path: path("konsole").unwrap_or_else(|| "konsole".to_string()),
        });
    }
    if exists("alacritty") {
        options.push(TerminalOption {
            id: "alacritty".to_string(),
            label: "Alacritty".to_string(),
            path: path("alacritty").unwrap_or_else(|| "alacritty".to_string()),
        });
    }
    if options.is_empty() {
        options.push(TerminalOption {
            id: "x-terminal-emulator".to_string(),
            label: "System Terminal".to_string(),
            path: "x-terminal-emulator".to_string(),
        });
    }
    options
}

#[tauri::command]
pub(crate) fn get_available_terminals() -> Result<Vec<TerminalOption>, String> {
    #[cfg(target_os = "windows")]
    {
        return Ok(resolve_windows_terminals(command_exists, command_path));
    }

    #[cfg(target_os = "macos")]
    {
        return Ok(resolve_macos_terminals(|path| Path::new(path).exists()));
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return Ok(resolve_linux_terminals(command_exists, command_path));
    }

    #[allow(unreachable_code)]
    Ok(vec![TerminalOption {
        id: "default".to_string(),
        label: "System Terminal".to_string(),
        path: "system-terminal".to_string(),
    }])
}

#[cfg(target_os = "macos")]
fn build_command_macos(terminal_id: &str, command: &str) -> ProcessCommand {
    let escaped = command.replace('\\', "\\\\").replace('\"', "\\\"");
    match terminal_id {
        "iterm2" => {
            let script = format!(
                "tell application \"iTerm\" to create window with default profile command \"{}\"",
                escaped
            );
            let mut process = ProcessCommand::new("osascript");
            process.args(["-e", &script]);
            process
        }
        _ => {
            let script = format!("tell application \"Terminal\" to do script \"{}\"", escaped);
            let mut process = ProcessCommand::new("osascript");
            process.args(["-e", &script]);
            process
        }
    }
}

#[cfg(target_os = "macos")]
fn run_command_macos(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_macos(terminal_id, command);
    spawn_and_forget(&mut cmd)
}

#[cfg(all(unix, not(target_os = "macos")))]
fn build_command_linux(terminal_id: &str, command: &str) -> ProcessCommand {
    match terminal_id {
        "gnome-terminal" => {
            let mut process = ProcessCommand::new("gnome-terminal");
            process.args(["--", "bash", "-lc", command]);
            process
        }
        "konsole" => {
            let mut process = ProcessCommand::new("konsole");
            process.args(["-e", "bash", "-lc", command]);
            process
        }
        "alacritty" => {
            let mut process = ProcessCommand::new("alacritty");
            process.args(["-e", "bash", "-lc", command]);
            process
        }
        _ => {
            let mut process = ProcessCommand::new("x-terminal-emulator");
            process.args(["-e", "bash", "-lc", command]);
            process
        }
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
fn run_command_linux(terminal_id: &str, command: &str) -> Result<(), String> {
    let mut cmd = build_command_linux(terminal_id, command);
    spawn_and_forget(&mut cmd)
}

#[tauri::command]
pub(crate) fn run_command_in_terminal(
    app: tauri::AppHandle,
    terminal_id: String,
    steps: Vec<TerminalExecutionStep>,
    requires_elevation: Option<bool>,
    always_elevated: Option<bool>,
    terminal_reuse_policy: Option<String>,
) -> Result<(), TerminalExecutionError> {
    #[cfg(target_os = "windows")]
    {
        let command = build_windows_host_command(terminal_id.as_str(), steps.as_slice())?;
        let state = app.state::<AppState>();
        let reusable_session_state = state
            .windows_reusable_session_state
            .lock()
            .map_err(|_| {
                TerminalExecutionError::new(
                    "state-unavailable",
                    "terminal session state lock failed",
                )
            })?
            .clone();
        let terminal_program = resolve_windows_terminal_program(terminal_id.as_str())?;
        let terminal_reuse_policy =
            parse_terminal_reuse_policy(terminal_reuse_policy.as_deref());
        let result = run_command_windows(
            reusable_session_state,
            terminal_program,
            command.as_str(),
            requires_elevation.unwrap_or(false),
            always_elevated.unwrap_or(false),
            terminal_reuse_policy,
        );
        if let Ok(decision) = &result {
            if windows_routing::should_track_windows_reusable_session(decision) {
                let mut reusable_session_state = state
                    .windows_reusable_session_state
                    .lock()
                    .map_err(|_| {
                        TerminalExecutionError::new(
                            "state-unavailable",
                            "terminal session state lock failed",
                        )
                    })?;
                let update_result: Result<(), TerminalExecutionError> = Ok(());
                windows_routing::update_windows_reusable_session_state(
                    &mut reusable_session_state,
                    decision.target_session_kind,
                    decision.terminal_program_id.as_str(),
                    &update_result,
                );
            }
            return Ok(());
        }
        return result.map(|_| ());
    }

    #[cfg(not(target_os = "windows"))]
    let _ = (
        app,
        requires_elevation,
        always_elevated,
        terminal_reuse_policy,
    );

    #[cfg(not(target_os = "windows"))]
    let command = build_posix_host_command(steps.as_slice())?;

    #[cfg(target_os = "macos")]
    {
        return run_command_macos(terminal_id.as_str(), command.as_str()).map_err(terminal_launch_failed);
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return run_command_linux(terminal_id.as_str(), command.as_str()).map_err(terminal_launch_failed);
    }

    #[allow(unreachable_code)]
    Err(TerminalExecutionError::new(
        "terminal-launch-failed",
        "Running commands is not supported on this platform.",
    ))
}

#[tauri::command]
pub(crate) fn get_runtime_platform() -> String {
    #[cfg(target_os = "windows")]
    {
        return "win".to_string();
    }

    #[cfg(target_os = "macos")]
    {
        return "mac".to_string();
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        return "linux".to_string();
    }

    #[allow(unreachable_code)]
    "all".to_string()
}

#[cfg(test)]
mod tests_exec;

#[cfg(test)]
mod tests_discovery;
