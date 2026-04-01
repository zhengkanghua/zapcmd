use std::env;
use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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

fn command_exists(command: &str) -> bool {
    #[cfg(target_os = "windows")]
    {
        return create_hidden_process("where")
            .arg(command)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);
    }

    #[cfg(not(target_os = "windows"))]
    {
        return Command::new("which")
            .arg(command)
            .output()
            .map(|output| output.status.success())
            .unwrap_or(false);
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

pub(crate) fn probe_prerequisite_with<B, E>(
    input: &PrerequisiteProbeInput,
    binary_exists: B,
    read_env: E,
) -> PrerequisiteProbeResult
where
    B: Fn(&str) -> bool,
    E: Fn(&str) -> Option<String>,
{
    let check = normalize_check_target(input);

    match input.r#type.as_str() {
        "binary" => {
            if binary_exists(check) {
                build_probe_result(input, true, "ok", "")
            } else {
                build_probe_result(
                    input,
                    false,
                    "missing-binary",
                    format!("required binary not found: {}", check),
                )
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
            } else if binary_exists(check) {
                build_probe_result(input, true, "ok", "")
            } else {
                build_probe_result(
                    input,
                    false,
                    "missing-shell",
                    format!("required shell not found: {}", check),
                )
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

#[tauri::command]
pub(crate) fn probe_command_prerequisites(
    prerequisites: Vec<PrerequisiteProbeInput>,
) -> Vec<PrerequisiteProbeResult> {
    prerequisites
        .iter()
        .map(|prerequisite| probe_prerequisite_with(prerequisite, command_exists, read_env_value))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{probe_prerequisite_with, PrerequisiteProbeInput};

    #[test]
    fn binary_prerequisite_reports_missing_binary() {
        let result = probe_prerequisite_with(
            &PrerequisiteProbeInput {
                id: "docker".to_string(),
                r#type: "binary".to_string(),
                required: true,
                check: "docker".to_string(),
            },
            |_| false,
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
            |_| true,
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
            |_| true,
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
            |command| command == "powershell",
            |_| None,
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
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
            |_| false,
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
            |command| command == "ipconfig",
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
            |_| true,
            |key| (key == "GITHUB_TOKEN").then(|| "token".to_string()),
        );

        assert!(result.ok);
        assert_eq!(result.code, "ok");
    }
}
