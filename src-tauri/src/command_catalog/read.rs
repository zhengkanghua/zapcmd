use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use super::UserCommandFile;

pub(super) fn metadata_to_modified_ms(metadata: &fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0)
}

pub(super) fn read_user_command_file_with<R, M>(
    path: &Path,
    read_to_string: R,
    metadata: M,
) -> Result<UserCommandFile, String>
where
    R: for<'a> Fn(&'a Path) -> Result<String, std::io::Error>,
    M: for<'a> Fn(&'a Path) -> Result<fs::Metadata, std::io::Error>,
{
    let content = read_to_string(path)
        .map_err(|err| format!("Failed to read command file {}: {}", path.display(), err))?;

    let (modified_ms, size) = match metadata(path) {
        Ok(metadata) => (metadata_to_modified_ms(&metadata), metadata.len()),
        Err(_) => (0, 0),
    };

    Ok(UserCommandFile {
        path: path.to_string_lossy().to_string(),
        content,
        modified_ms,
        size,
    })
}

pub(super) fn read_user_command_file(path: &Path) -> Result<UserCommandFile, String> {
    read_user_command_file_with(
        path,
        |path| fs::read_to_string(path),
        |path| fs::metadata(path),
    )
}
