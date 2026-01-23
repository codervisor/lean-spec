use crate::ai::worker::{AiWorker, AiWorkerError};

pub struct AiWorkerManager {
    worker: Option<AiWorker>,
    disabled_reason: Option<String>,
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
