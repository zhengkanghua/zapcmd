use std::collections::HashMap;

use super::probe::probe_prerequisite_with;
use super::types::{PrerequisiteProbeInput, PrerequisiteProbeResult, ProbeBinaryStatus};

pub(super) fn probe_command_prerequisites_with<B, E>(
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
