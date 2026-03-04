use super::{parse_first_non_empty_line, TerminalOption};
use std::collections::HashSet;

fn collect_ids(options: &[TerminalOption]) -> HashSet<String> {
    options.iter().map(|option| option.id.clone()).collect()
}

fn expected_ids(ids: &[&str]) -> HashSet<String> {
    ids.iter().map(|id| (*id).to_string()).collect()
}

#[test]
fn parse_first_non_empty_line_picks_first_trimmed_line() {
    let raw = "\n \n\t  foo  \r\nbar\n";
    assert_eq!(parse_first_non_empty_line(raw), Some("foo".to_string()));
}

#[test]
fn parse_first_non_empty_line_returns_none_when_all_blank() {
    assert_eq!(parse_first_non_empty_line(" \n\t\r\n"), None);
}

#[cfg(target_os = "windows")]
mod windows {
    use super::{collect_ids, expected_ids};
    use crate::terminal::resolve_windows_terminals;

    #[test]
    fn resolve_windows_terminals_contains_all_ids_when_all_exist() {
        let options = resolve_windows_terminals(
            |cmd| matches!(cmd, "powershell" | "pwsh" | "wt" | "cmd"),
            |cmd| Some(format!("{cmd}-path")),
        );

        assert_eq!(
            collect_ids(&options),
            expected_ids(&["powershell", "pwsh", "wt", "cmd"])
        );

        for option in options {
            assert!(!option.path.is_empty());
        }
    }

    #[test]
    fn resolve_windows_terminals_falls_back_to_powershell() {
        let options = resolve_windows_terminals(|_| false, |_| {
            panic!("fallback path 不应依赖 where/which 解析结果");
        });

        assert!(!options.is_empty());
        assert!(options.iter().any(|option| option.id == "powershell"));
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::{collect_ids, expected_ids};
    use crate::terminal::resolve_macos_terminals;

    #[test]
    fn resolve_macos_terminals_includes_terminal_and_optionally_iterm2() {
        let with_iterm = resolve_macos_terminals(|path| {
            matches!(path, "/Applications/iTerm.app" | "/Applications/iTerm2.app")
        });

        let without_iterm = resolve_macos_terminals(|_| false);

        assert_eq!(collect_ids(&with_iterm), expected_ids(&["terminal", "iterm2"]));
        assert_eq!(collect_ids(&without_iterm), expected_ids(&["terminal"]));
    }
}

#[cfg(all(unix, not(target_os = "macos")))]
mod linux {
    use super::{collect_ids, expected_ids};
    use crate::terminal::resolve_linux_terminals;

    #[test]
    fn resolve_linux_terminals_contains_existing_terminal() {
        let options = resolve_linux_terminals(
            |cmd| cmd == "gnome-terminal",
            |_| Some("/usr/bin/gnome-terminal".to_string()),
        );

        assert_eq!(collect_ids(&options), expected_ids(&["gnome-terminal"]));
    }

    #[test]
    fn resolve_linux_terminals_falls_back_to_x_terminal_emulator() {
        let options = resolve_linux_terminals(|_| false, |_| {
            panic!("fallback path 不应依赖 which 解析结果");
        });

        assert!(!options.is_empty());
        assert!(options.iter().any(|option| option.id == "x-terminal-emulator"));
    }
}

