//! Native Rust AI integration using async-openai and anthropic

pub mod chat;
pub mod error;
pub mod providers;
pub mod streaming;
pub mod tools;
pub mod types;

pub use chat::{stream_chat, ChatRequestContext, StreamChatResult};
pub use error::AiError;
pub use streaming::{sse_done, StreamEvent};
pub use types::{MessageRole, UIMessage, UIMessagePart};
