use super::*;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

fn create_temp_dir(prefix: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();

    let mut dir = std::env::temp_dir();
    dir.push(format!(
        "zapcmd-tests-{}-{}-{}",
        prefix,
        std::process::id(),
        nanos
    ));
    fs::create_dir_all(&dir).unwrap();
    dir
}

fn write_file(path: &Path, content: &str) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).unwrap();
    }
    fs::write(path, content).unwrap();
}

#[cfg(target_os = "windows")]
mod windows {
    use super::*;
    use std::ffi::OsString;
    use std::path::PathBuf;

    #[test]
    fn resolve_home_dir_with_prefers_userprofile() {
        let home = resolve_home_dir_with(|key| match key {
            "USERPROFILE" => Some(OsString::from(r"C:\Users\Alice")),
            "HOMEDRIVE" => Some(OsString::from("C:")),
            "HOMEPATH" => Some(OsString::from(r"\Users\Bob")),
            _ => None,
        });

        assert_eq!(home, Some(PathBuf::from(r"C:\Users\Alice")));
    }

    #[test]
    fn resolve_home_dir_with_falls_back_to_homedrive_homepath() {
        let home = resolve_home_dir_with(|key| match key {
            "HOMEDRIVE" => Some(OsString::from("C:")),
            "HOMEPATH" => Some(OsString::from(r"\Users\Bob")),
            _ => None,
        })
        .unwrap();

        let mut expected = PathBuf::from("C:");
        expected.push(r"\Users\Bob");
        assert_eq!(home, expected);
    }

    #[test]
    fn resolve_home_dir_with_returns_none_when_all_missing() {
        let home = resolve_home_dir_with(|_| None);
        assert_eq!(home, None);
    }
}

#[test]
fn resolve_user_commands_dir_path_in_appends_dotzapcmd_commands() {
    let home = create_temp_dir("home-path");
    let dir = resolve_user_commands_dir_path_in(&home);

    let expected = home.join(".zapcmd").join("commands");
    assert_eq!(dir, expected);

    let _ = fs::remove_dir_all(&home);
}

#[test]
fn ensure_user_commands_dir_with_creates_when_missing() {
    let home = create_temp_dir("home-ensure");
    let expected = home.join(".zapcmd").join("commands");
    assert!(!expected.exists());

    let dir = ensure_user_commands_dir_with(&home).unwrap();
    assert_eq!(dir, expected);
    assert!(dir.is_dir());

    let _ = fs::remove_dir_all(&home);
}

#[test]
fn collect_json_files_recursive_recurses_filters_and_sorts() {
    let root = create_temp_dir("scan");

    let a = root.join("a.json");
    let b = root.join("b.JSON");
    let ignore = root.join("ignore.txt");
    let c = root.join("nested").join("c.json");

    write_file(&a, r#"{"id":"a"}"#);
    write_file(&b, r#"{"id":"b"}"#);
    write_file(&ignore, "ignore");
    write_file(&c, r#"{"id":"c"}"#);

    let files = super::scan::collect_json_files_recursive(&root).unwrap();

    let mut expected = vec![a, b, c];
    expected.sort_by(|left, right| left.to_string_lossy().cmp(&right.to_string_lossy()));
    assert_eq!(files, expected);

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn collect_json_files_recursive_returns_empty_for_empty_dir() {
    let root = create_temp_dir("empty");
    let files = super::scan::collect_json_files_recursive(&root).unwrap();
    assert!(files.is_empty());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn collect_json_files_recursive_returns_err_with_path_fragment_on_missing_root() {
    let root = create_temp_dir("missing-root");
    let missing = root.join("does-not-exist");

    let err = super::scan::collect_json_files_recursive(&missing).unwrap_err();
    let fragment = missing.display().to_string();
    assert!(err.contains(&fragment));

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn read_single_user_command_file_with_falls_back_modified_ms_to_zero_when_metadata_fails() {
    let result = super::read::read_user_command_file_with(
        Path::new("example.json"),
        |_| Ok(r#"{"id":"x"}"#.to_string()),
        |_| {
            Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "metadata boom",
            ))
        },
    )
    .unwrap();

    assert_eq!(result.content, r#"{"id":"x"}"#);
    assert_eq!(result.modified_ms, 0);
    assert_eq!(result.size, 0);
}

#[test]
fn scan_user_command_files_collects_nonfatal_scan_issues_and_keeps_good_json_files() {
    let root = create_temp_dir("scan-issues");
    let good = root.join("good.json");
    let also_good = root.join("nested").join("also-good.json");
    let broken = root.join("broken.json");

    write_file(&good, r#"{"id":"good"}"#);
    write_file(&also_good, r#"{"id":"also-good"}"#);
    write_file(&broken, r#"{"id":"broken"}"#);

    let broken_path = broken.clone();
    let scan = super::scan::scan_user_command_files_in_with_metadata(&root, move |path| {
        if path == broken_path {
            return Err(std::io::Error::new(
                std::io::ErrorKind::Other,
                "metadata boom",
            ));
        }
        fs::metadata(path)
    })
    .unwrap();

    assert_eq!(
        scan.files
            .iter()
            .map(|entry| entry.path.clone())
            .collect::<Vec<_>>(),
        vec![
            good.to_string_lossy().to_string(),
            also_good.to_string_lossy().to_string()
        ]
    );
    assert_eq!(scan.issues.len(), 1);
    assert_eq!(scan.issues[0].path, broken.to_string_lossy().to_string());
    assert!(scan.issues[0].reason.contains("metadata boom"));
    assert_eq!(scan.files[0].size, fs::metadata(&good).unwrap().len());
    assert_eq!(scan.files[1].size, fs::metadata(&also_good).unwrap().len());

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn scan_user_command_files_collects_nonfatal_nested_read_dir_issues() {
    let root = create_temp_dir("scan-read-dir-issues");
    let good = root.join("good.json");
    let blocked_dir = root.join("blocked");

    write_file(&good, r#"{"id":"good"}"#);

    let scan = super::scan::scan_user_command_files_in_with(
        &root,
        |dir: &Path| {
            if dir == root {
                return Ok(vec![
                    super::scan::ScanDirEntry::File(good.clone()),
                    super::scan::ScanDirEntry::Dir(blocked_dir.clone()),
                ]);
            }
            if dir == blocked_dir {
                return Err(format!("Failed to read dir {}: permission denied", blocked_dir.display()));
            }
            Ok(vec![])
        },
        |path| fs::metadata(path),
    )
    .unwrap();

    assert_eq!(
        scan.files
            .iter()
            .map(|entry| entry.path.clone())
            .collect::<Vec<_>>(),
        vec![good.to_string_lossy().to_string()]
    );
    assert_eq!(scan.issues.len(), 1);
    assert_eq!(scan.issues[0].path, blocked_dir.to_string_lossy().to_string());
    assert!(scan.issues[0].reason.contains("permission denied"));

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn read_user_command_file_returns_single_file_payload_without_touching_other_entries() {
    let root = create_temp_dir("read-one");
    let target = root.join("target.json");
    let other = root.join("other.json");
    let target_content = r#"{"id":"target"}"#;
    let other_content = r#"{"id":"other"}"#;

    write_file(&target, target_content);
    write_file(&other, other_content);

    let payload = super::read::read_user_command_file(&target).unwrap();

    assert_eq!(payload.path, target.to_string_lossy().to_string());
    assert_eq!(payload.content, target_content);
    assert!(payload.modified_ms > 0);
    assert_eq!(payload.size, fs::metadata(&target).unwrap().len());
    assert_eq!(fs::read_to_string(&other).unwrap(), other_content);

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn read_user_command_file_rejects_paths_outside_user_commands_dir() {
    let home = create_temp_dir("read-scope");
    let commands_dir = ensure_user_commands_dir_with(&home).unwrap();
    let outside = home.join("outside.json");

    write_file(&outside, r#"{"id":"outside"}"#);

    let err =
        read_user_command_file_in(&commands_dir, outside.to_string_lossy().to_string()).unwrap_err();

    assert!(err.contains("outside user commands dir"));

    let _ = fs::remove_dir_all(&home);
}

#[test]
fn read_user_command_file_rejects_non_json_paths_inside_user_commands_dir() {
    let home = create_temp_dir("read-scope-non-json");
    let commands_dir = ensure_user_commands_dir_with(&home).unwrap();
    let note = commands_dir.join("note.txt");

    write_file(&note, "not json");

    let err = read_user_command_file_in(&commands_dir, note.to_string_lossy().to_string()).unwrap_err();

    assert!(err.contains("must be a JSON file"));

    let _ = fs::remove_dir_all(&home);
}
