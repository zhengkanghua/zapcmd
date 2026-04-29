use std::collections::HashMap;

use super::probe::probe_prerequisite_with;
use super::types::{
    build_probe_result, PrerequisiteProbeInput, PrerequisiteProbeResult, ProbeBinaryStatus,
};

const MAX_PROBE_PREREQUISITES: usize = 64;
const MAX_PROBE_FIELD_BYTES: usize = 512;

pub(super) fn validate_probe_request(
    prerequisites: &[PrerequisiteProbeInput],
) -> Result<(), String> {
    if prerequisites.len() > MAX_PROBE_PREREQUISITES {
        return Err(format!(
            "Prerequisite probe count cannot exceed {}.",
            MAX_PROBE_PREREQUISITES
        ));
    }

    for prerequisite in prerequisites {
        for value in [&prerequisite.id, &prerequisite.r#type, &prerequisite.check] {
            if value.len() > MAX_PROBE_FIELD_BYTES {
                return Err(format!(
                    "Prerequisite probe field exceeds maximum size of {} bytes.",
                    MAX_PROBE_FIELD_BYTES
                ));
            }
        }
    }

    Ok(())
}

pub(super) fn probe_command_prerequisites_with<B, E>(
    prerequisites: &[PrerequisiteProbeInput],
    mut binary_exists: B,
    mut read_env: E,
) -> Vec<PrerequisiteProbeResult>
where
    B: FnMut(&str) -> ProbeBinaryStatus,
    E: FnMut(&str) -> Option<String>,
{
    if let Err(reason) = validate_probe_request(prerequisites) {
        return prerequisites
            .iter()
            .map(|prerequisite| {
                build_probe_result(
                    prerequisite,
                    false,
                    "invalid-probe-request",
                    reason.as_str(),
                )
            })
            .collect();
    }

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
