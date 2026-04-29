use super::{ExecutionSpec, TerminalExecutionError, TerminalExecutionStep};

const MAX_EXECUTION_STEPS: usize = 32;
const MAX_EXECUTION_FIELD_BYTES: usize = 8 * 1024;
const MAX_EXECUTION_TOTAL_BYTES: usize = 256 * 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum SanitizedExecutionSpec {
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
pub(super) struct SanitizedExecutionStep {
    pub(super) summary: String,
    pub(super) execution: SanitizedExecutionSpec,
}

pub(crate) fn sanitize_command(command: &str) -> Result<String, TerminalExecutionError> {
    let trimmed = command.trim();
    if trimmed.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Command cannot be empty.",
        ));
    }
    Ok(trimmed.to_string())
}

fn reject_oversized_field(value: &str) -> Result<(), TerminalExecutionError> {
    if value.len() > MAX_EXECUTION_FIELD_BYTES {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            format!(
                "Execution field exceeds maximum size of {} bytes.",
                MAX_EXECUTION_FIELD_BYTES
            ),
        ));
    }
    Ok(())
}

fn accumulate_request_bytes(total: &mut usize, value: &str) -> Result<(), TerminalExecutionError> {
    reject_oversized_field(value)?;
    *total = total.saturating_add(value.len());
    if *total > MAX_EXECUTION_TOTAL_BYTES {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            format!(
                "Execution request exceeds maximum size of {} bytes.",
                MAX_EXECUTION_TOTAL_BYTES
            ),
        ));
    }
    Ok(())
}

fn sanitize_summary(summary: &str) -> Result<String, TerminalExecutionError> {
    let trimmed = summary.trim();
    if trimmed.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Command summary cannot be empty.",
        ));
    }
    reject_oversized_field(trimmed)?;
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

pub(super) fn sanitize_steps(
    steps: &[TerminalExecutionStep],
) -> Result<Vec<SanitizedExecutionStep>, TerminalExecutionError> {
    if steps.is_empty() {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            "Execution steps cannot be empty.",
        ));
    }
    if steps.len() > MAX_EXECUTION_STEPS {
        return Err(TerminalExecutionError::new(
            "invalid-request",
            format!("Execution steps cannot exceed {}.", MAX_EXECUTION_STEPS),
        ));
    }

    let mut total_bytes = 0usize;
    steps
        .iter()
        .map(|step| {
            let summary = sanitize_summary(step.summary.as_str())?;
            accumulate_request_bytes(&mut total_bytes, summary.as_str())?;
            let execution = match &step.execution {
                ExecutionSpec::Exec {
                    program,
                    args,
                    stdin,
                    ..
                } => {
                    let program = sanitize_command(program.as_str())?;
                    accumulate_request_bytes(&mut total_bytes, program.as_str())?;
                    let args = args
                        .iter()
                        .map(|arg| {
                            accumulate_request_bytes(&mut total_bytes, arg.as_str())?;
                            Ok(arg.clone())
                        })
                        .collect::<Result<Vec<_>, TerminalExecutionError>>()?;
                    let stdin = stdin.as_ref().filter(|value| !value.is_empty()).cloned();
                    if let Some(value) = stdin.as_ref() {
                        accumulate_request_bytes(&mut total_bytes, value.as_str())?;
                    }
                    SanitizedExecutionSpec::Exec {
                        program,
                        args,
                        stdin,
                    }
                }
                ExecutionSpec::Script { runner, command } => {
                    let runner = sanitize_runner(runner.as_str())?;
                    let command = sanitize_command(command.as_str())?;
                    accumulate_request_bytes(&mut total_bytes, runner.as_str())?;
                    accumulate_request_bytes(&mut total_bytes, command.as_str())?;
                    SanitizedExecutionSpec::Script { runner, command }
                }
            };

            Ok(SanitizedExecutionStep { summary, execution })
        })
        .collect()
}

pub(super) fn build_run_marker(index: usize, total: usize, summary: &str) -> String {
    if total > 1 {
        format!("[zapcmd][run][{}/{}] {}", index + 1, total, summary)
    } else {
        format!("[zapcmd][run] {}", summary)
    }
}

pub(super) fn build_failed_marker(index: usize, total: usize, summary: &str) -> String {
    if total > 1 {
        format!("[zapcmd][failed][{}/{}] {}", index + 1, total, summary)
    } else {
        format!("[zapcmd][failed] {}", summary)
    }
}
