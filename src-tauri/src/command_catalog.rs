use std::env;
use std::fs;
use std::path::{Path, PathBuf};

mod contracts;
mod prerequisites;
mod read;
mod scan;

pub(super) const USER_COMMAND_SOURCE_MAX_FILES: usize = 1_000;
pub(super) const USER_COMMAND_SOURCE_MAX_FILE_SIZE_BYTES: u64 = 1_048_576;
pub(super) const USER_COMMAND_SOURCE_MAX_TOTAL_BYTES: u64 = 16 * 1_048_576;
pub(super) const USER_COMMAND_SOURCE_MAX_DEPTH: usize = 16;

pub(crate) use contracts::{
    UserCommandFile, UserCommandFileScanEntry, UserCommandFileScanIssue, UserCommandFileScanResult,
};
pub(crate) use prerequisites::probe_command_prerequisites;

fn resolve_home_dir_with<F>(get_env: F) -> Option<PathBuf>
where
    F: for<'a> Fn(&'a str) -> Option<std::ffi::OsString>,
{
    #[cfg(target_os = "windows")]
    {
        if let Some(profile) = get_env("USERPROFILE") {
            return Some(PathBuf::from(profile));
        }

        let home_drive = get_env("HOMEDRIVE");
        let home_path = get_env("HOMEPATH");
        if let (Some(drive), Some(path)) = (home_drive, home_path) {
            let mut combined = PathBuf::from(drive);
            combined.push(path);
            return Some(combined);
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Some(home) = get_env("HOME") {
            return Some(PathBuf::from(home));
        }
    }

    None
}

fn resolve_home_dir() -> Option<PathBuf> {
    resolve_home_dir_with(|key| env::var_os(key))
}

fn resolve_user_commands_dir_path_in(home: &Path) -> PathBuf {
    let mut dir = home.to_path_buf();
    dir.push(".zapcmd");
    dir.push("commands");
    dir
}

fn ensure_user_commands_dir_with(home: &Path) -> Result<PathBuf, String> {
    let dir = resolve_user_commands_dir_path_in(home);
    fs::create_dir_all(&dir).map_err(|err| {
        format!(
            "Failed to create user commands dir {}: {}",
            dir.display(),
            err
        )
    })?;
    Ok(dir)
}

fn ensure_user_commands_dir() -> Result<PathBuf, String> {
    let home =
        resolve_home_dir().ok_or_else(|| "Failed to resolve user home directory.".to_string())?;
    ensure_user_commands_dir_with(&home)
}

fn is_json_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("json"))
        .unwrap_or(false)
}

fn validate_user_command_file_path_in(user_commands_dir: &Path, path: &Path) -> Result<PathBuf, String> {
    let canonical_dir = fs::canonicalize(user_commands_dir).map_err(|err| {
        format!(
            "Failed to resolve user commands dir {}: {}",
            user_commands_dir.display(),
            err
        )
    })?;
    let canonical_path = fs::canonicalize(path)
        .map_err(|err| format!("Failed to resolve command file {}: {}", path.display(), err))?;

    if !canonical_path.starts_with(&canonical_dir) {
        return Err(format!(
            "Command file {} is outside user commands dir {}.",
            canonical_path.display(),
            canonical_dir.display()
        ));
    }
    if !is_json_file(&canonical_path) {
        return Err(format!(
            "Command file {} must be a JSON file.",
            canonical_path.display()
        ));
    }

    Ok(canonical_path)
}

fn read_user_command_file_in(user_commands_dir: &Path, path: String) -> Result<UserCommandFile, String> {
    let validated = validate_user_command_file_path_in(user_commands_dir, Path::new(&path))?;
    let metadata = fs::metadata(&validated)
        .map_err(|err| format!("Failed to read metadata for {}: {}", validated.display(), err))?;
    if metadata.len() > USER_COMMAND_SOURCE_MAX_FILE_SIZE_BYTES {
        return Err(format!(
            "Command file {} exceeds maximum size of {} bytes.",
            validated.display(),
            USER_COMMAND_SOURCE_MAX_FILE_SIZE_BYTES
        ));
    }
    read::read_user_command_file(&validated)
}

#[tauri::command]
pub(crate) fn get_user_commands_dir() -> Result<String, String> {
    ensure_user_commands_dir().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub(crate) fn scan_user_command_files() -> Result<UserCommandFileScanResult, String> {
    let dir = ensure_user_commands_dir()?;
    scan::scan_user_command_files_in(&dir)
}

#[tauri::command]
pub(crate) fn read_user_command_file(path: String) -> Result<UserCommandFile, String> {
    let dir = ensure_user_commands_dir()?;
    read_user_command_file_in(&dir, path)
}

#[cfg(test)]
mod tests_io;
