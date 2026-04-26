mod cache;
mod probe;
mod process;
mod types;

use cache::probe_command_prerequisites_with;
use process::{command_exists, read_env_value};
use types::{PrerequisiteProbeInput, PrerequisiteProbeResult};

#[tauri::command]
pub(crate) fn probe_command_prerequisites(
    prerequisites: Vec<PrerequisiteProbeInput>,
) -> Vec<PrerequisiteProbeResult> {
    probe_command_prerequisites_with(prerequisites.as_slice(), command_exists, read_env_value)
}

#[cfg(test)]
mod tests;
