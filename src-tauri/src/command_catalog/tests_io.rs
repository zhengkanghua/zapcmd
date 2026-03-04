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
    dir.push(format!("zapcmd-tests-{}-{}-{}", prefix, std::process::id(), nanos));
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

    let files = collect_json_files_recursive(&root).unwrap();

    let mut expected = vec![a, b, c];
    expected.sort_by(|left, right| left.to_string_lossy().cmp(&right.to_string_lossy()));
    assert_eq!(files, expected);

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn collect_json_files_recursive_returns_empty_for_empty_dir() {
    let root = create_temp_dir("empty");
    let files = collect_json_files_recursive(&root).unwrap();
    assert!(files.is_empty());
    let _ = fs::remove_dir_all(&root);
}

#[test]
fn collect_json_files_recursive_returns_err_with_path_fragment_on_missing_root() {
    let root = create_temp_dir("missing-root");
    let missing = root.join("does-not-exist");

    let err = collect_json_files_recursive(&missing).unwrap_err();
    let fragment = missing.display().to_string();
    assert!(err.contains(&fragment));

    let _ = fs::remove_dir_all(&root);
}

#[test]
fn read_single_user_command_file_with_falls_back_modified_ms_to_zero_when_metadata_fails() {
    let result = read_single_user_command_file_with(
        Path::new("example.json"),
        |_| Ok(r#"{"id":"x"}"#.to_string()),
        |_| Err(std::io::Error::new(std::io::ErrorKind::Other, "metadata boom")),
    )
    .unwrap();

    assert_eq!(result.content, r#"{"id":"x"}"#);
    assert_eq!(result.modified_ms, 0);
}
