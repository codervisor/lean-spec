//! Token counting for context economy

use once_cell::sync::Lazy;
use tiktoken_rs::{cl100k_base, CoreBPE};

static GLOBAL_TOKEN_COUNTER: Lazy<TokenCounter> = Lazy::new(TokenCounter::new);

/// Section token count (for h2 sections)
#[derive(Debug, Clone, Default)]
pub struct SectionTokenCount {
    /// Section heading
    pub heading: String,
    /// Token count for this section
    pub tokens: usize,
}

/// Detailed content breakdown
#[derive(Debug, Clone, Default)]
pub struct DetailedBreakdown {
    /// Tokens in code blocks
    pub code_blocks: usize,
    /// Tokens in checklists (- [ ] items)
    pub checklists: usize,
    /// Tokens in plain prose/text
    pub prose: usize,
    /// Tokens per h2 section
    pub sections: Vec<SectionTokenCount>,
}

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

    /// Detailed breakdown of content
    pub detailed: DetailedBreakdown,

    /// Status relative to thresholds
    pub status: TokenStatus,
}

/// Token count status relative to thresholds
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TokenStatus {
    #[default]
    Optimal, // < 2000 tokens
    Good,      // 2000-3500 tokens
    Warning,   // 3500-5000 tokens
    Excessive, // > 5000 tokens
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
        let (frontmatter_tokens, content_str, title_tokens) =
            if full_content.trim_start().starts_with("---") {
                if let Some(end_idx) = full_content[3..].find("\n---") {
                    let frontmatter = &full_content[..end_idx + 7]; // Include both ---
                    let content = &full_content[end_idx + 7..];

                    let fm_tokens = self.count(frontmatter);

                    // Extract title tokens
                    let title_tokens = content
                        .lines()
                        .find(|l| l.starts_with("# "))
                        .map(|l| self.count(l))
                        .unwrap_or(0);

                    (fm_tokens, content.to_string(), title_tokens)
                } else {
                    (0, full_content.to_string(), 0)
                }
            } else {
                (0, full_content.to_string(), 0)
            };

        let content_tokens = self.count(&content_str);

        // Compute detailed breakdown
        let detailed = self.analyze_content(&content_str);

        let status = self.determine_status(total);

        TokenCount {
            total,
            frontmatter: frontmatter_tokens,
            content: content_tokens,
            title: title_tokens,
            detailed,
            status,
        }
    }

    /// Analyze content for detailed token breakdown
    fn analyze_content(&self, content: &str) -> DetailedBreakdown {
        let mut code_blocks = 0usize;
        let mut checklists = 0usize;
        let mut prose = 0usize;
        let mut sections: Vec<SectionTokenCount> = Vec::new();

        // Track current section
        let mut current_section_heading = String::new();
        let mut current_section_lines: Vec<&str> = Vec::new();

        // Parse line by line
        let mut in_code_block = false;
        let mut code_block_lines: Vec<&str> = Vec::new();

        for line in content.lines() {
            // Code block detection
            if line.trim_start().starts_with("```") {
                if in_code_block {
                    // End of code block
                    code_block_lines.push(line);
                    let block_text = code_block_lines.join("\n");
                    code_blocks += self.count(&block_text);
                    code_block_lines.clear();
                    in_code_block = false;
                } else {
                    // Start of code block
                    in_code_block = true;
                    code_block_lines.push(line);
                }
                continue;
            }

            if in_code_block {
                code_block_lines.push(line);
                continue;
            }

            // H2 section detection
            if line.starts_with("## ") {
                // Save previous section if any
                if !current_section_heading.is_empty() {
                    let section_text = current_section_lines.join("\n");
                    let section_tokens = self.count(&section_text);
                    sections.push(SectionTokenCount {
                        heading: current_section_heading.clone(),
                        tokens: section_tokens,
                    });
                }
                current_section_heading = line[3..].trim().to_string();
                current_section_lines.clear();
                continue;
            }

            // Checklist detection
            let trimmed = line.trim_start();
            if trimmed.starts_with("- [ ]")
                || trimmed.starts_with("- [x]")
                || trimmed.starts_with("- [X]")
            {
                checklists += self.count(line);
            } else if !line.trim().is_empty() && !line.starts_with("# ") {
                // Regular prose (not title, not empty)
                prose += self.count(line);
            }

            // Add to current section
            if !current_section_heading.is_empty() {
                current_section_lines.push(line);
            }
        }

        // Save last section
        if !current_section_heading.is_empty() && !current_section_lines.is_empty() {
            let section_text = current_section_lines.join("\n");
            let section_tokens = self.count(&section_text);
            sections.push(SectionTokenCount {
                heading: current_section_heading,
                tokens: section_tokens,
            });
        }

        DetailedBreakdown {
            code_blocks,
            checklists,
            prose,
            sections,
        }
    }

    /// Count tokens for any file (generic text file, code, markdown, etc.)
    /// Returns a simple token count without spec-specific parsing
    pub fn count_file(&self, content: &str) -> TokenCount {
        let total = self.count(content);
        let status = self.determine_status(total);

        TokenCount {
            total,
            frontmatter: 0,
            content: total,
            title: 0,
            detailed: DetailedBreakdown::default(),
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
            TokenStatus::Warning => {
                Some("Consider splitting this spec into smaller, focused specs")
            }
            TokenStatus::Excessive => Some(
                "This spec is too large. Split into multiple specs to maintain context economy",
            ),
        }
    }
}

impl Default for TokenCounter {
    fn default() -> Self {
        Self::new()
    }
}

/// Global token counter instance (shared BPE encoder)
pub fn global_token_counter() -> &'static TokenCounter {
    &GLOBAL_TOKEN_COUNTER
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
