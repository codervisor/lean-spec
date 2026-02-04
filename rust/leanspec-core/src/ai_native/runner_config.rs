//! Runner config resolution for AI sub-agent dispatch

use std::collections::HashMap;

use crate::ai_native::error::AiError;

#[derive(Debug, Clone)]
pub struct ResolvedRunnerConfig {
    pub id: String,
    pub name: Option<String>,
    pub command: Option<String>,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    pub runnable: bool,
}

#[cfg(feature = "sessions")]
pub fn resolve_runner_config(
    project_path: Option<&str>,
    requested_runner_id: Option<&str>,
) -> Result<Option<ResolvedRunnerConfig>, AiError> {
    use std::path::Path;

    use crate::sessions::RunnerRegistry;

    let Some(project_path) = project_path else {
        return Ok(None);
    };

    let registry = RunnerRegistry::load(Path::new(project_path))
        .map_err(|e| AiError::InvalidRequest(e.to_string()))?;

    let runner_id = requested_runner_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .or_else(|| registry.default())
        .ok_or_else(|| AiError::InvalidRequest("No default runner configured".to_string()))?;

    let runner = registry
        .get(runner_id)
        .ok_or_else(|| AiError::InvalidRequest(format!("Unknown runner: {runner_id}")))?;

    let mut extra_env = HashMap::new();
    extra_env.insert(
        "LEANSPEC_PROJECT_PATH".to_string(),
        project_path.to_string(),
    );

    let env = runner
        .resolve_env(&extra_env)
        .map_err(|e| AiError::InvalidRequest(e.to_string()))?;

    Ok(Some(ResolvedRunnerConfig {
        id: runner.id.clone(),
        name: runner.name.clone(),
        command: runner.command.clone(),
        args: runner.args.clone(),
        env,
        runnable: runner.is_runnable(),
    }))
}

#[cfg(not(feature = "sessions"))]
pub fn resolve_runner_config(
    _project_path: Option<&str>,
    _requested_runner_id: Option<&str>,
) -> Result<Option<ResolvedRunnerConfig>, AiError> {
    Ok(None)
}
