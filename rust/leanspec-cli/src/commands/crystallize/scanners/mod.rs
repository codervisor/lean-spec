//! Scanner pipeline. Each scanner returns a `Vec<Signal>` and is independent
//! of the others.

pub mod arch;
pub mod git;
pub mod naming;
pub mod specs;
pub mod tests;
