//! Native Rust AI integration using async-openai and anthropic

pub mod chat;
pub mod error;
pub mod providers;
pub mod runner_config;
pub mod streaming;
pub mod tools;
pub mod types;

pub use chat::{
    generate_text, stream_chat, ChatRequestContext, GenerateTextContext, GenerateTextResult,
    StreamChatResult,
};
pub use error::AiError;
pub use runner_config::{resolve_runner_config, ResolvedRunnerConfig};
pub use streaming::{sse_done, StreamEvent};
pub use types::{MessageRole, UIMessage, UIMessagePart};
