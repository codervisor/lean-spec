use crate::ai::worker::{AiWorker, AiWorkerError};

pub struct AiWorkerManager {
    worker: Option<AiWorker>,
    disabled_reason: Option<String>,
}

impl Default for AiWorkerManager {
    fn default() -> Self {
        Self::new()
    }
}

impl AiWorkerManager {
    pub fn new() -> Self {
        Self {
            worker: None,
            disabled_reason: None,
        }
    }

    pub async fn get_or_spawn(&mut self) -> Result<&mut AiWorker, AiWorkerError> {
        if is_ai_disabled() {
            let reason = "LEANSPEC_NO_AI=1".to_string();
            self.disabled_reason = Some(reason.clone());
            return Err(AiWorkerError::Disabled(reason));
        }

        if let Some(reason) = &self.disabled_reason {
            return Err(AiWorkerError::Disabled(reason.clone()));
        }

        if self.worker.is_none() {
            match AiWorker::spawn().await {
                Ok(worker) => {
                    self.worker = Some(worker);
                }
                Err(e) => {
                    let reason = e.to_string();
                    tracing::error!("Failed to spawn AI worker: {}", reason);
                    self.disabled_reason = Some(reason.clone());
                    return Err(e);
                }
            }
        }

        Ok(self.worker.as_mut().expect("worker should exist"))
    }

    pub async fn reload_config(&mut self, config: serde_json::Value) -> Result<(), AiWorkerError> {
        if let Some(worker) = self.worker.as_mut() {
            worker.reload_config(config).await?;
        }
        Ok(())
    }
}

fn is_ai_disabled() -> bool {
    match std::env::var("LEANSPEC_NO_AI") {
        Ok(value) => matches!(value.as_str(), "1" | "true" | "TRUE" | "yes" | "YES"),
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // Static mutex to ensure tests don't run in parallel and interfere with env vars
    static ENV_LOCK: Mutex<()> = Mutex::new(());

    #[test]
    fn test_is_ai_disabled_true() {
        let _guard = ENV_LOCK.lock().unwrap();
        
        std::env::set_var("LEANSPEC_NO_AI", "1");
        assert!(is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "true");
        assert!(is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "TRUE");
        assert!(is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "yes");
        assert!(is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "YES");
        assert!(is_ai_disabled());

        std::env::remove_var("LEANSPEC_NO_AI");
    }

    #[test]
    fn test_is_ai_disabled_false() {
        let _guard = ENV_LOCK.lock().unwrap();
        
        std::env::set_var("LEANSPEC_NO_AI", "0");
        assert!(!is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "false");
        assert!(!is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "no");
        assert!(!is_ai_disabled());

        std::env::set_var("LEANSPEC_NO_AI", "NO");
        assert!(!is_ai_disabled());

        std::env::remove_var("LEANSPEC_NO_AI");
    }

    #[test]
    fn test_is_ai_disabled_unset() {
        let _guard = ENV_LOCK.lock().unwrap();
        
        // Ensure LEANSPEC_NO_AI is not set
        std::env::remove_var("LEANSPEC_NO_AI");
        assert!(!is_ai_disabled());
    }

    #[test]
    fn test_ai_worker_manager_new() {
        let manager = AiWorkerManager::new();
        assert!(manager.worker.is_none());
        assert!(manager.disabled_reason.is_none());
    }

    #[test]
    fn test_ai_worker_manager_default() {
        let manager: AiWorkerManager = Default::default();
        assert!(manager.worker.is_none());
        assert!(manager.disabled_reason.is_none());
    }
}
