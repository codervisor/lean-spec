//! Token counting for context economy

use tiktoken_rs::{cl100k_base, CoreBPE};

/// Token count result
#[derive(Debug, Clone, Default)]
pub struct TokenCount {
    /// Total token count
    pub total: usize,
    
    /// Frontmatter tokens
    pub frontmatter: usize,
    
    /// Content tokens (excluding frontmatter)
    pub content: usize,
    
    /// Title tokens
    pub title: usize,
    
    /// Status relative to thresholds
    pub status: TokenStatus,
}

/// Token count status relative to thresholds
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TokenStatus {
    #[default]
    Optimal,     // < 2000 tokens
    Good,        // 2000-3500 tokens
    Warning,     // 3500-5000 tokens
    Excessive,   // > 5000 tokens
}

impl std::fmt::Display for TokenStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenStatus::Optimal => write!(f, "✅ Optimal"),
            TokenStatus::Good => write!(f, "✅ Good"),
            TokenStatus::Warning => write!(f, "⚠️ Consider splitting"),
            TokenStatus::Excessive => write!(f, "🔴 Must split"),
        }
    }
}

/// Options for token counting
#[derive(Debug, Clone)]
pub struct TokenCounterOptions {
    /// Optimal threshold (default: 2000)
    pub optimal_threshold: usize,
    
    /// Good threshold (default: 3500)
    pub good_threshold: usize,
    
    /// Warning threshold (default: 5000)
    pub warning_threshold: usize,
}

impl Default for TokenCounterOptions {
    fn default() -> Self {
        Self {
            optimal_threshold: 2000,
            good_threshold: 3500,
            warning_threshold: 5000,
        }
    }
}

/// Token counter for spec content
pub struct TokenCounter {
    options: TokenCounterOptions,
    bpe: CoreBPE,
}

impl TokenCounter {
    /// Create a new token counter with default options
    pub fn new() -> Self {
        Self {
            options: TokenCounterOptions::default(),
            bpe: cl100k_base().expect("Failed to load tiktoken encoder"),
        }
    }
    
    /// Create a token counter with custom options
    pub fn with_options(options: TokenCounterOptions) -> Self {
        Self {
            options,
            bpe: cl100k_base().expect("Failed to load tiktoken encoder"),
        }
    }
    
    /// Count tokens in a string
    pub fn count(&self, text: &str) -> usize {
        self.bpe.encode_with_special_tokens(text).len()
    }
    
    /// Count tokens for a spec (full markdown content)
    pub fn count_spec(&self, full_content: &str) -> TokenCount {
        let total = self.count(full_content);
        
        // Try to split frontmatter and content
        let (frontmatter_tokens, content_tokens, title_tokens) = 
            if full_content.trim_start().starts_with("---") {
                if let Some(end_idx) = full_content[3..].find("\n---") {
                    let frontmatter = &full_content[..end_idx + 7]; // Include both ---
                    let content = &full_content[end_idx + 7..];
                    
                    let fm_tokens = self.count(frontmatter);
                    let content_tokens = self.count(content);
                    
                    // Extract title tokens
                    let title_tokens = content.lines()
                        .find(|l| l.starts_with("# "))
                        .map(|l| self.count(l))
                        .unwrap_or(0);
                    
                    (fm_tokens, content_tokens, title_tokens)
                } else {
                    (0, total, 0)
                }
            } else {
                (0, total, 0)
            };
        
        let status = self.determine_status(total);
        
        TokenCount {
            total,
            frontmatter: frontmatter_tokens,
            content: content_tokens,
            title: title_tokens,
            status,
        }
    }
    
    /// Determine token status based on thresholds
    fn determine_status(&self, total: usize) -> TokenStatus {
        if total <= self.options.optimal_threshold {
            TokenStatus::Optimal
        } else if total <= self.options.good_threshold {
            TokenStatus::Good
        } else if total <= self.options.warning_threshold {
            TokenStatus::Warning
        } else {
            TokenStatus::Excessive
        }
    }
    
    /// Get the status emoji for a token count
    pub fn status_emoji(&self, total: usize) -> &'static str {
        match self.determine_status(total) {
            TokenStatus::Optimal => "✅",
            TokenStatus::Good => "✅",
            TokenStatus::Warning => "⚠️",
            TokenStatus::Excessive => "🔴",
        }
    }
    
    /// Get a recommendation based on token count
    pub fn recommendation(&self, total: usize) -> Option<&'static str> {
        match self.determine_status(total) {
            TokenStatus::Optimal => None,
            TokenStatus::Good => None,
            TokenStatus::Warning => Some("Consider splitting this spec into smaller, focused specs"),
            TokenStatus::Excessive => Some("This spec is too large. Split into multiple specs to maintain context economy"),
        }
    }
}

impl Default for TokenCounter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_count_simple() {
        let counter = TokenCounter::new();
        let count = counter.count("Hello, world!");
        assert!(count > 0);
    }
    
    #[test]
    fn test_count_spec() {
        let content = r#"---
status: planned
created: '2025-01-01'
tags:
  - feature
---

# Test Spec

This is a test spec with some content.

## Overview

The overview section.

## Plan

- [ ] Step 1
- [ ] Step 2
"#;
        
        let counter = TokenCounter::new();
        let result = counter.count_spec(content);
        
        assert!(result.total > 0);
        assert!(result.frontmatter > 0);
        assert!(result.content > 0);
        assert_eq!(result.status, TokenStatus::Optimal);
    }
    
    #[test]
    fn test_status_thresholds() {
        let counter = TokenCounter::new();
        
        assert_eq!(counter.determine_status(500), TokenStatus::Optimal);
        assert_eq!(counter.determine_status(2500), TokenStatus::Good);
        assert_eq!(counter.determine_status(4000), TokenStatus::Warning);
        assert_eq!(counter.determine_status(6000), TokenStatus::Excessive);
    }
}
