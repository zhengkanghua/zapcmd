use super::TerminalExecutionError;
use super::TerminalExecutionStep;
use super::execution_common::{
    SanitizedExecutionSpec,
    SanitizedExecutionStep,
    build_failed_marker,
    build_run_marker,
    sanitize_steps,
};

fn escape_posix_single_quoted_literal(value: &str) -> String {
    value.replace('\'', r#"'"'"'"#)
}

fn quote_posix_single_quoted(value: &str) -> String {
    format!("'{}'", escape_posix_single_quoted_literal(value))
}

fn build_posix_process_command(program: &str, args: &[String]) -> String {
    let mut parts = Vec::with_capacity(args.len() + 1);
    parts.push(quote_posix_single_quoted(program));
    parts.extend(args.iter().map(|arg| quote_posix_single_quoted(arg.as_str())));
    parts.join(" ")
}

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
            "if [ \"$zapcmd_code\" -ne 0 ]; then printf '%s\\n' {}; exit \"$zapcmd_code\"; fi",
            quote_posix_single_quoted(
                build_failed_marker(index, total, step.summary.as_str()).as_str()
            )
        ));
    }

    Ok(parts.join("; "))
}
