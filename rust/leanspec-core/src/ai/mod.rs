//! AI worker management

#![cfg(feature = "ai")]

pub mod manager;
pub mod protocol;
pub mod worker;

pub use manager::AiWorkerManager;
pub use protocol::{WorkerChatPayload, WorkerRequest, WorkerResponse};
pub use worker::{AiWorker, AiWorkerError};
