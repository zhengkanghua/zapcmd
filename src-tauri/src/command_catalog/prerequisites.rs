use std::env;
use std::collections::HashMap;
use std::process::Command;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;
const PROBE_PROCESS_TIMEOUT_MS: u64 = 1_500;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum ProbeBinaryStatus {
    Present,
    Missing,
    TimedOut,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PrerequisiteProbeInput {
    pub id: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub required: bool,
    pub check: String,
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PrerequisiteProbeResult {
    pub id: String,
    pub ok: bool,
    pub code: String,
    pub message: String,
    pub required: bool,
}

#[cfg(target_os = "windows")]
fn create_hidden_process(program: &str) -> Command {
    let mut process = Command::new(program);
    process.creation_flags(CREATE_NO_WINDOW);
    process
}

fn command_exists(command: &str) -> ProbeBinaryStatus {
    #[cfg(target_os = "windows")]
    {
        return run_probe_process_with_timeout(create_hidden_process("where").arg(command));
    }

    #[cfg(not(target_os = "windows"))]
    {
        return run_probe_process_with_timeout(Command::new("which").arg(command));
    }
}

fn run_probe_process_with_timeout(command: &mut Command) -> ProbeBinaryStatus {
    let Ok(mut child) = command.spawn() else {
        return ProbeBinaryStatus::Missing;
    };
    let timeout = Duration::from_millis(PROBE_PROCESS_TIMEOUT_MS);
    let start = std::time::Instant::now();

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                return if status.success() {
                    ProbeBinaryStatus::Present
                } else {
                    ProbeBinaryStatus::Missing
                };
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return ProbeBinaryStatus::TimedOut;
                }
                std::thread::sleep(Duration::from_millis(20));
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                return ProbeBinaryStatus::TimedOut;
            }
        }
    }
}

fn read_env_value(key: &str) -> Option<String> {
    env::var_os(key).and_then(|value| {
        let normalized = value.to_string_lossy().trim().to_string();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized)
        }
    })
}

fn build_probe_result(
    input: &PrerequisiteProbeInput,
    ok: bool,
    code: &str,
    message: impl Into<String>,
) -> PrerequisiteProbeResult {
    PrerequisiteProbeResult {
        id: input.id.clone(),
        ok,
        code: code.to_string(),
        message: message.into(),
        required: input.required,
    }
}

fn normalize_check_target<'a>(input: &'a PrerequisiteProbeInput) -> &'a str {
    let check = input.check.trim();
    let Some((prefix, target)) = check.split_once(':') else {
        return check;
    };

    let normalized_target = target.trim();
    if normalized_target.is_empty() {
        return check;
    }

    if prefix.eq_ignore_ascii_case(input.r#type.as_str()) {
        return normalized_target;
    }

    check
}

fn probe_prerequisite_with<B, E>(
    input: &PrerequisiteProbeInput,
    mut binary_exists: B,
    mut read_env: E,
) -> PrerequisiteProbeResult
where
    B: FnMut(&str) -> ProbeBinaryStatus,
    E: FnMut(&str) -> Option<String>,
{
    let check = normalize_check_target(input);

    match input.r#type.as_str() {
        "binary" => {
            match binary_exists(check) {
                ProbeBinaryStatus::Present => build_probe_result(input, true, "ok", ""),
                ProbeBinaryStatus::Missing => build_probe_result(
                    input,
                    false,
                    "missing-binary",
                    format!("required binary not found: {}", check),
                ),
                ProbeBinaryStatus::TimedOut => build_probe_result(
                    input,
                    false,
                    "probe-timeout",
                    format!("prerequisite probe timed out: {}", check),
                ),
            }
        }
        "env" => {
            if read_env(check).is_some() {
                build_probe_result(input, true, "ok", "")
            } else {
                build_probe_result(
                    input,
                    false,
                    "missing-env",
                    format!("required environment variable not found: {}", check),
                )
            }
        }
        "shell" => {
            if check.eq_ignore_ascii_case("shell") {
                build_probe_result(input, true, "ok", "")
            } else {
                match binary_exists(check) {
                    ProbeBinaryStatus::Present => build_probe_result(input, true, "ok", ""),
                    ProbeBinaryStatus::Missing => build_probe_result(
                        input,
                        false,
                        "missing-shell",
                        format!("required shell not found: {}", check),
                    ),
                    ProbeBinaryStatus::TimedOut => build_probe_result(
                        input,
                        false,
                        "probe-timeout",
                        format!("prerequisite probe timed out: {}", check),
                    ),
                }
            }
        }
        other => build_probe_result(
            input,
            false,
            "unsupported-prerequisite",
            format!("unsupported prerequisite type: {}", other),
        ),
    }
}

fn probe_command_prerequisites_with<B, E>(
    prerequisites: &[PrerequisiteProbeInput],
    mut binary_exists: B,
    mut read_env: E,
) -> Vec<PrerequisiteProbeResult>
where
    B: FnMut(&str) -> ProbeBinaryStatus,
    E: FnMut(&str) -> Option<String>,
{
    let mut binary_cache = HashMap::<String, ProbeBinaryStatus>::new();
    let mut env_cache = HashMap::<String, Option<String>>::new();
    let mut results = Vec::with_capacity(prerequisites.len());

    for prerequisite in prerequisites {
        let result = probe_prerequisite_with(
            prerequisite,
            |command| {
                *binary_cache
                    .entry(command.to_string())
                    .or_insert_with(|| binary_exists(command))
            },
            |key| {
                env_cache
                    .entry(key.to_string())
                    .or_insert_with(|| read_env(key))
                    .clone()
            },
        );
        results.push(result);
    }

    results
}

#[tauri::command]
pub(crate) fn probe_command_prerequisites(
    prerequisites: Vec<PrerequisiteProbeInput>,
) -> Vec<PrerequisiteProbeResult> {
    probe_command_prerequisites_with(prerequisites.as_slice(), command_exists, read_env_value)
}

#[cfg(test)]
mod tests {
    use super::{probe_prerequisite_with, PrerequisiteProbeInput, ProbeBinaryStatus};

    #[test]
    fn binary_prerequisite_reports_missing_binary() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "docker".to_string(),
                r#type: "binary".to_string(),
                required: true,
                check: "docker".to_string(),
            },
            |_| ProbeBinaryStatus::Missing,
            |_| None,
        );

        assert!(!result.ok);
        assert_eq!(result.code, "missing-binary");
    }

    #[test]
    fn env_prerequisite_reports_missing_variable() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "github-token".to_string(),
                r#type: "env".to_string(),
                required: true,
                check: "GITHUB_TOKEN".to_string(),
            },
            |_| ProbeBinaryStatus::Present,
            |_| None,
        );

        assert!(!result.ok);
        assert_eq!(result.code, "missing-env");
    }

    #[test]
    fn unsupported_prerequisite_type_returns_unsupported() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "office-network".to_string(),
                r#type: "network".to_string(),
                required: true,
                check: "corp-vpn".to_string(),
            },
            |_| ProbeBinaryStatus::Present,
            |_| Some("pwsh".to_string()),
        );

        assert!(!result.ok);
        assert_eq!(result.code, "unsupported-prerequisite");
    }

    #[test]
    fn shell_prerequisite_accepts_prefixed_shell_value() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "powershell".to_string(),
                r#type: "shell".to_string(),
                required: true,
                check: "shell:powershell".to_string(),
            },
            |command| {
                if command == "powershell" {
                    ProbeBinaryStatus::Present
                } else {
                    ProbeBinaryStatus::Missing
                }
            },
            |_| None,
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
    }

    #[test]
    fn shell_prerequisite_accepts_pwsh_runner_value() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "pwsh".to_string(),
                r#type: "shell".to_string(),
                required: true,
                check: "shell:pwsh".to_string(),
            },
            |command| {
                if command == "pwsh" {
                    ProbeBinaryStatus::Present
                } else {
                    ProbeBinaryStatus::Missing
                }
            },
            |_| None,
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
    }

    #[test]
    fn shell_prerequisite_accepts_cmd_bash_and_sh_runner_values() {
        for runner in ["cmd", "bash", "sh"] {
            let result = probe_prerequisite_with(
                &PrerequisiteProbeInput {
                    id: runner.to_string(),
                    r#type: "shell".to_string(),
                    required: true,
                    check: format!("shell:{}", runner),
                },
                |command| {
                    if command == runner {
                        ProbeBinaryStatus::Present
                    } else {
                        ProbeBinaryStatus::Missing
                    }
                },
                |_| None,
            );

            assert!(result.ok, "runner {} should be accepted", runner);
            assert_eq!(result.code, "ok");
        }
    }

    #[test]
    fn shell_prerequisite_reports_missing_runner_binary() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "pwsh".to_string(),
                r#type: "shell".to_string(),
                required: true,
                check: "shell:pwsh".to_string(),
            },
            |_| ProbeBinaryStatus::Missing,
            |_| None,
        );

        assert!(!result.ok);
        assert_eq!(result.code, "missing-shell");
        assert!(result.message.contains("pwsh"));
    }

    #[test]
    fn generic_shell_prerequisite_is_satisfied() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "shell".to_string(),
                r#type: "shell".to_string(),
                required: true,
                check: "shell:shell".to_string(),
            },
            |_| ProbeBinaryStatus::Missing,
            |_| None,
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
    }

    #[test]
    fn binary_prerequisite_accepts_prefixed_check_value() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "ipconfig".to_string(),
                r#type: "binary".to_string(),
                required: true,
                check: "binary:ipconfig".to_string(),
            },
            |command| {
                if command == "ipconfig" {
                    ProbeBinaryStatus::Present
                } else {
                    ProbeBinaryStatus::Missing
                }
            },
            |_| None,
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
    }

    #[test]
    fn env_prerequisite_accepts_prefixed_check_value() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "github-token".to_string(),
                r#type: "env".to_string(),
                required: true,
                check: "env:GITHUB_TOKEN".to_string(),
            },
            |_| ProbeBinaryStatus::Present,
            |key| (key == "GITHUB_TOKEN").then(|| "token".to_string()),
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
    }

    #[test]
    fn probe_command_prerequisites_reuses_binary_probe_results() {
        let mut binary_calls = 0usize;
        let mut env_calls = 0usize;
        let prerequisites = vec![
            PrerequisiteProbeInput {
                id: "docker-a".to_string(),
                r#type: "binary".to_string(),
                required: true,
                check: "docker".to_string(),
            },
            PrerequisiteProbeInput {
                id: "docker-b".to_string(),
                r#type: "binary".to_string(),
                required: false,
                check: "binary:docker".to_string(),
            },
        ];

        let results = super::probe_command_prerequisites_with(
            prerequisites.as_slice(),
            |_| {
                binary_calls += 1;
                ProbeBinaryStatus::Present
            },
            |_| {
                env_calls += 1;
                None
            },
        );

        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|result| result.ok));
        assert_eq!(binary_calls, 1);
        assert_eq!(env_calls, 0);
    }

    #[test]
    fn binary_prerequisite_reports_probe_timeout() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "docker".to_string(),
                r#type: "binary".to_string(),
                required: true,
                check: "docker".to_string(),
            },
            |_| ProbeBinaryStatus::TimedOut,
            |_| None,
        );

        assert!(!result.ok);
        assert_eq!(result.code, "probe-timeout");
        assert!(result.message.contains("timed out"));
    }
}
