use super::execution_common::{
    build_cmd_safe_windows_process_command, build_failed_marker,
    build_powershell_step_failure_guard, build_run_marker, sanitize_steps,
    SanitizedExecutionSpec, SanitizedExecutionStep,
};
use super::windows_launch;
use super::TerminalExecutionError;
use super::TerminalExecutionStep;

fn encode_base64_chunk(value: u8) -> char {
    const TABLE: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    TABLE[value as usize] as char
}

fn encode_utf8_to_base64(value: &str) -> String {
    let bytes = value.as_bytes();
    let mut encoded = String::with_capacity(((bytes.len() + 2) / 3) * 4);
    let mut index = 0usize;

    while index + 3 <= bytes.len() {
        let block = ((bytes[index] as u32) << 16)
            | ((bytes[index + 1] as u32) << 8)
            | bytes[index + 2] as u32;
        encoded.push(encode_base64_chunk(((block >> 18) & 0x3f) as u8));
        encoded.push(encode_base64_chunk(((block >> 12) & 0x3f) as u8));
        encoded.push(encode_base64_chunk(((block >> 6) & 0x3f) as u8));
        encoded.push(encode_base64_chunk((block & 0x3f) as u8));
        index += 3;
    }

    let remaining = bytes.len() - index;
    if remaining == 1 {
        let block = (bytes[index] as u32) << 16;
        encoded.push(encode_base64_chunk(((block >> 18) & 0x3f) as u8));
        encoded.push(encode_base64_chunk(((block >> 12) & 0x3f) as u8));
        encoded.push('=');
        encoded.push('=');
    } else if remaining == 2 {
        let block = ((bytes[index] as u32) << 16) | ((bytes[index + 1] as u32) << 8);
        encoded.push(encode_base64_chunk(((block >> 18) & 0x3f) as u8));
        encoded.push(encode_base64_chunk(((block >> 12) & 0x3f) as u8));
        encoded.push(encode_base64_chunk(((block >> 6) & 0x3f) as u8));
        encoded.push('=');
    }

    encoded
}

fn escape_cmd_echo_text(value: &str) -> String {
    value
        .chars()
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

fn escape_powershell_single_quoted_literal(value: &str) -> String {
    value.replace('\'', "''")
}

fn quote_powershell_single_quoted(value: &str) -> String {
    format!("'{}'", escape_powershell_single_quoted_literal(value))
}

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

fn build_powershell_exec_invocation(program: &str, args: &[String], stdin: Option<&str>) -> String {
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
            "$zapcmdInputBytes = [Convert]::FromBase64String({}); $zapcmdInput = [Text.Encoding]::UTF8.GetString($zapcmdInputBytes); $zapcmdInput | {}",
            quote_powershell_single_quoted(encode_utf8_to_base64(value.replace("\r\n", "\n").as_str()).as_str()),
            call
        ),
        None => call,
    }
}

fn build_windows_process_command(program: &str, args: &[String]) -> String {
    let mut argv = Vec::with_capacity(args.len() + 1);
    argv.push(program.to_string());
    argv.extend(args.iter().cloned());
    windows_launch::join_windows_arguments(argv.as_slice())
}

fn build_cmd_process_command(program: &str, args: &[String]) -> String {
    build_cmd_safe_windows_process_command(program, args)
}

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

fn build_cmd_step_command(step: &SanitizedExecutionStep) -> Result<String, TerminalExecutionError> {
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
                    build_powershell_exec_invocation(
                        program.as_str(),
                        args.as_slice(),
                        Some(value),
                    ),
                ],
            ),
            None => build_cmd_process_command(program.as_str(), args.as_slice()),
        }),
        SanitizedExecutionSpec::Script { runner, command } => {
            build_cmd_script_invocation(runner.as_str(), command.as_str())
        }
    }
}

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
        SanitizedExecutionSpec::Script { runner, command } => {
            build_powershell_script_invocation(host_terminal_id, runner.as_str(), command.as_str())
        }
    }
}

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
            r#"if not "!zapcmdCode!"=="0" (echo {} & exit /b !zapcmdCode!)"#,
            escape_cmd_echo_text(build_failed_marker(index, total, step.summary.as_str()).as_str())
        ));
    }

    Ok(parts.join(" & "))
}

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
        parts.push(build_powershell_step_failure_guard(
            quote_powershell_single_quoted(
                build_failed_marker(index, total, step.summary.as_str()).as_str()
            )
            .as_str(),
        ));
    }

    Ok(parts.join("; "))
}

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
