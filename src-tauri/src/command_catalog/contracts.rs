#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub(crate) struct UserCommandFile {
    pub(crate) path: String,
    pub(crate) content: String,
    pub(crate) modified_ms: u64,
    pub(crate) size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub(crate) struct UserCommandFileScanEntry {
    pub(crate) path: String,
    pub(crate) modified_ms: u64,
    pub(crate) size: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub(crate) struct UserCommandFileScanIssue {
    pub(crate) path: String,
    pub(crate) reason: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub(crate) struct UserCommandFileScanResult {
    pub(crate) files: Vec<UserCommandFileScanEntry>,
    pub(crate) issues: Vec<UserCommandFileScanIssue>,
}
