use super::{ExecutionSpec, TerminalExecutionError, TerminalExecutionStep};

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

pub(super) fn sanitize_steps(
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
