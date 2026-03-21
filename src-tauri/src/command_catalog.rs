use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

mod prerequisites;

pub(crate) use prerequisites::probe_command_prerequisites;

#[derive(serde::Serialize)]
pub(crate) struct UserCommandFile {
    path: String,
    content: String,
    modified_ms: u64,
}

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
    fs::create_dir_all(&dir)
        .map_err(|err| format!("Failed to create user commands dir {}: {}", dir.display(), err))?;
    Ok(dir)
}

fn ensure_user_commands_dir() -> Result<PathBuf, String> {
    let home = resolve_home_dir().ok_or_else(|| "Failed to resolve user home directory.".to_string())?;
    ensure_user_commands_dir_with(&home)
}

fn is_json_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("json"))
        .unwrap_or(false)
}

fn collect_json_files_recursive(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut stack = vec![root.to_path_buf()];
    let mut files = Vec::<PathBuf>::new();

    while let Some(current) = stack.pop() {
        let entries = fs::read_dir(&current)
            .map_err(|err| format!("Failed to read dir {}: {}", current.display(), err))?;
        for entry in entries {
            let entry = entry.map_err(|err| format!("Failed to read dir entry: {}", err))?;
            let path = entry.path();
            let file_type = entry
                .file_type()
                .map_err(|err| format!("Failed to read file type for {}: {}", path.display(), err))?;
            if file_type.is_dir() {
                stack.push(path);
                continue;
            }
            if file_type.is_file() && is_json_file(&path) {
                files.push(path);
            }
        }
    }

    files.sort_by(|left, right| left.to_string_lossy().cmp(&right.to_string_lossy()));
    Ok(files)
}

fn read_single_user_command_file_with<R, M>(
    path: &Path,
    read_to_string: R,
    metadata: M,
) -> Result<UserCommandFile, String>
where
    R: for<'a> Fn(&'a Path) -> Result<String, std::io::Error>,
    M: for<'a> Fn(&'a Path) -> Result<std::fs::Metadata, std::io::Error>,
{
    let content = read_to_string(path)
        .map_err(|err| format!("Failed to read command file {}: {}", path.display(), err))?;

    let modified_ms = metadata(path)
        .ok()
        .and_then(|metadata| metadata.modified().ok())
        .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or(0);

    Ok(UserCommandFile {
        path: path.to_string_lossy().to_string(),
        content,
        modified_ms,
    })
}

fn read_single_user_command_file(path: &Path) -> Result<UserCommandFile, String> {
    read_single_user_command_file_with(
        path,
        |path| fs::read_to_string(path),
        |path| fs::metadata(path),
    )
}

#[tauri::command]
pub(crate) fn get_user_commands_dir() -> Result<String, String> {
    ensure_user_commands_dir().map(|path| path.to_string_lossy().to_string())
}

#[tauri::command]
pub(crate) fn read_user_command_files() -> Result<Vec<UserCommandFile>, String> {
    let dir = ensure_user_commands_dir()?;
    let files = collect_json_files_recursive(&dir)?;
    let mut payload = Vec::<UserCommandFile>::new();
    for file in files {
        payload.push(read_single_user_command_file(&file)?);
    }
    Ok(payload)
}

#[cfg(test)]
mod tests_io;
