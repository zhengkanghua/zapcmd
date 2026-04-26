#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum ProbeBinaryStatus {
    Present,
    Missing,
    TimedOut,
}

#[derive(Clone, Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PrerequisiteProbeInput {
    pub id: String,
    #[serde(rename = "type")]
    pub r#type: String,
    pub required: bool,
    pub check: String,
}

#[derive(Clone, Debug, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PrerequisiteProbeResult {
    pub id: String,
    pub ok: bool,
    pub code: String,
    pub message: String,
    pub required: bool,
}

pub(super) fn build_probe_result(
    input: &PrerequisiteProbeInput,
    ok: bool,
    code: &str,
    message: impl Into<String>,
) -> PrerequisiteProbeResult {
    PrerequisiteProbeResult {
        id: input.id.clone(),
        ok,
        code: code.to_string(),
        message: message.into(),
        required: input.required,
    }
}

pub(super) fn normalize_check_target<'a>(input: &'a PrerequisiteProbeInput) -> &'a str {
    let check = input.check.trim();
    let Some((prefix, target)) = check.split_once(':') else {
        return check;
    };

    let normalized_target = target.trim();
    if normalized_target.is_empty() {
        return check;
    }

    if prefix.eq_ignore_ascii_case(input.r#type.as_str()) {
        return normalized_target;
    }

    check
}
