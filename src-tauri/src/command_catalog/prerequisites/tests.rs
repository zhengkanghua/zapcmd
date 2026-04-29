use super::cache::{probe_command_prerequisites_with, validate_probe_request};
use super::probe::probe_prerequisite_with;
use super::types::{PrerequisiteProbeInput, ProbeBinaryStatus};

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

    let results = probe_command_prerequisites_with(
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
fn validate_probe_request_rejects_excessive_prerequisite_count() {
    let prerequisites = (0..65)
        .map(|index| PrerequisiteProbeInput {
            id: format!("binary-{index}"),
            r#type: "binary".to_string(),
            required: true,
            check: "docker".to_string(),
        })
        .collect::<Vec<_>>();

    assert_eq!(
        validate_probe_request(prerequisites.as_slice()).unwrap_err(),
        "Prerequisite probe count cannot exceed 64."
    );
}

#[test]
fn validate_probe_request_rejects_oversized_probe_field() {
    let prerequisites = vec![PrerequisiteProbeInput {
        id: "oversized".to_string(),
        r#type: "binary".to_string(),
        required: true,
        check: "a".repeat(513),
    }];

    assert_eq!(
        validate_probe_request(prerequisites.as_slice()).unwrap_err(),
        "Prerequisite probe field exceeds maximum size of 512 bytes."
    );
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
