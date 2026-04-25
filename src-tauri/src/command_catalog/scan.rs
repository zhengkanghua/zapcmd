use std::fs;
use std::path::{Path, PathBuf};

use super::{
    is_json_file, read, UserCommandFileScanEntry, UserCommandFileScanIssue,
    UserCommandFileScanResult, USER_COMMAND_SOURCE_MAX_DEPTH,
    USER_COMMAND_SOURCE_MAX_FILES, USER_COMMAND_SOURCE_MAX_FILE_SIZE_BYTES,
    USER_COMMAND_SOURCE_MAX_TOTAL_BYTES,
};

pub(super) enum ScanDirEntry {
    Dir(PathBuf),
    File(PathBuf),
    Other,
    Issue(UserCommandFileScanIssue),
}

fn create_scan_issue(path: &Path, reason: String) -> UserCommandFileScanIssue {
    UserCommandFileScanIssue {
        path: path.to_string_lossy().to_string(),
        reason,
    }
}

fn read_dir_entries_from_fs(dir: &Path) -> Result<Vec<ScanDirEntry>, String> {
    let entries =
        fs::read_dir(dir).map_err(|err| format!("Failed to read dir {}: {}", dir.display(), err))?;
    let mut resolved = Vec::<ScanDirEntry>::new();

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(err) => {
                resolved.push(ScanDirEntry::Issue(create_scan_issue(
                    dir,
                    format!("Failed to read dir entry in {}: {}", dir.display(), err),
                )));
                continue;
            }
        };
        let path = entry.path();
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(err) => {
                resolved.push(ScanDirEntry::Issue(create_scan_issue(
                    &path,
                    format!("Failed to read file type for {}: {}", path.display(), err),
                )));
                continue;
            }
        };
        if file_type.is_dir() {
            resolved.push(ScanDirEntry::Dir(path));
            continue;
        }
        if file_type.is_file() {
            resolved.push(ScanDirEntry::File(path));
            continue;
        }
        resolved.push(ScanDirEntry::Other);
    }

    Ok(resolved)
}

fn collect_json_files_recursive_with_issues<R>(
    root: &Path,
    read_dir: R,
) -> Result<(Vec<PathBuf>, Vec<UserCommandFileScanIssue>), String>
where
    R: Fn(&Path) -> Result<Vec<ScanDirEntry>, String>,
{
    let mut stack = vec![(root.to_path_buf(), 0usize)];
    let mut files = Vec::<PathBuf>::new();
    let mut issues = Vec::<UserCommandFileScanIssue>::new();

    while let Some((current, depth)) = stack.pop() {
        let entries = match read_dir(&current) {
            Ok(entries) => entries,
            Err(err) => {
                if current == root {
                    return Err(err);
                }
                issues.push(create_scan_issue(&current, err));
                continue;
            }
        };
        for entry in entries {
            match entry {
                ScanDirEntry::Dir(path) => {
                    if depth >= USER_COMMAND_SOURCE_MAX_DEPTH {
                        issues.push(create_scan_issue(
                            &path,
                            format!(
                                "Maximum user command directory depth exceeded ({}).",
                                USER_COMMAND_SOURCE_MAX_DEPTH
                            ),
                        ));
                        continue;
                    }
                    stack.push((path, depth + 1));
                }
                ScanDirEntry::File(path) => {
                    if is_json_file(&path) {
                        files.push(path);
                    }
                }
                ScanDirEntry::Other => {}
                ScanDirEntry::Issue(issue) => issues.push(issue),
            }
        }
    }

    files.sort_by(|left, right| left.to_string_lossy().cmp(&right.to_string_lossy()));
    issues.sort_by(|left, right| {
        left.path
            .cmp(&right.path)
            .then(left.reason.cmp(&right.reason))
    });
    Ok((files, issues))
}

#[cfg(test)]
pub(super) fn collect_json_files_recursive(root: &Path) -> Result<Vec<PathBuf>, String> {
    let (files, _) = collect_json_files_recursive_with_issues(root, |dir| read_dir_entries_from_fs(dir))?;
    Ok(files)
}

pub(super) fn scan_user_command_files_in(root: &Path) -> Result<UserCommandFileScanResult, String> {
    scan_user_command_files_in_with(root, |dir| read_dir_entries_from_fs(dir), |path| {
        fs::metadata(path)
    })
}

#[cfg(test)]
pub(super) fn scan_user_command_files_in_with_metadata<M>(
    root: &Path,
    metadata: M,
) -> Result<UserCommandFileScanResult, String>
where
    M: for<'a> Fn(&'a Path) -> Result<fs::Metadata, std::io::Error>,
{
    scan_user_command_files_in_with(root, |dir| read_dir_entries_from_fs(dir), metadata)
}

pub(super) fn scan_user_command_files_in_with<R, M>(
    root: &Path,
    read_dir: R,
    metadata: M,
) -> Result<UserCommandFileScanResult, String>
where
    R: Fn(&Path) -> Result<Vec<ScanDirEntry>, String>,
    M: for<'a> Fn(&'a Path) -> Result<fs::Metadata, std::io::Error>,
{
    let (paths, mut issues) = collect_json_files_recursive_with_issues(root, read_dir)?;
    let mut files = Vec::<UserCommandFileScanEntry>::new();
    let mut total_size = 0u64;

    for path in paths {
        match metadata(&path) {
            Ok(file_metadata) => {
                let size = file_metadata.len();
                if files.len() >= USER_COMMAND_SOURCE_MAX_FILES {
                    issues.push(create_scan_issue(
                        &path,
                        format!(
                            "Maximum user command file count exceeded ({}).",
                            USER_COMMAND_SOURCE_MAX_FILES
                        ),
                    ));
                    continue;
                }
                if size > USER_COMMAND_SOURCE_MAX_FILE_SIZE_BYTES {
                    issues.push(create_scan_issue(
                        &path,
                        format!(
                            "Command file exceeds maximum size of {} bytes.",
                            USER_COMMAND_SOURCE_MAX_FILE_SIZE_BYTES
                        ),
                    ));
                    continue;
                }
                if total_size.saturating_add(size) > USER_COMMAND_SOURCE_MAX_TOTAL_BYTES {
                    issues.push(create_scan_issue(
                        &path,
                        format!(
                            "Maximum total user command bytes exceeded ({}).",
                            USER_COMMAND_SOURCE_MAX_TOTAL_BYTES
                        ),
                    ));
                    continue;
                }
                total_size += size;
                files.push(UserCommandFileScanEntry {
                    path: path.to_string_lossy().to_string(),
                    modified_ms: read::metadata_to_modified_ms(&file_metadata),
                    size,
                });
            }
            Err(err) => issues.push(create_scan_issue(
                &path,
                format!("Failed to read metadata for {}: {}", path.display(), err),
            )),
        }
    }

    files.sort_by(|left, right| left.path.cmp(&right.path));
    issues.sort_by(|left, right| {
        left.path
            .cmp(&right.path)
            .then(left.reason.cmp(&right.reason))
    });

    Ok(UserCommandFileScanResult { files, issues })
}
