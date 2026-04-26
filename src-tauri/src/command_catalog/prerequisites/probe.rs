use super::types::{
    build_probe_result, normalize_check_target, PrerequisiteProbeInput, PrerequisiteProbeResult,
    ProbeBinaryStatus,
};

fn probe_binary(
    input: &PrerequisiteProbeInput,
    check: &str,
    binary_exists: &mut impl FnMut(&str) -> ProbeBinaryStatus,
) -> PrerequisiteProbeResult {
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

fn probe_env(
    input: &PrerequisiteProbeInput,
    check: &str,
    read_env: &mut impl FnMut(&str) -> Option<String>,
) -> PrerequisiteProbeResult {
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

fn probe_shell(
    input: &PrerequisiteProbeInput,
    check: &str,
    binary_exists: &mut impl FnMut(&str) -> ProbeBinaryStatus,
) -> PrerequisiteProbeResult {
    if check.eq_ignore_ascii_case("shell") {
        return build_probe_result(input, true, "ok", "");
    }

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

pub(super) fn probe_prerequisite_with<B, E>(
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
        "binary" => probe_binary(input, check, &mut binary_exists),
        "env" => probe_env(input, check, &mut read_env),
        "shell" => probe_shell(input, check, &mut binary_exists),
        other => build_probe_result(
            input,
            false,
            "unsupported-prerequisite",
            format!("unsupported prerequisite type: {}", other),
        ),
    }
}
