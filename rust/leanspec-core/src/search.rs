//! Search module for spec discovery
//!
//! Implements cross-field multi-term search with relevance scoring.
//! Each term in the query must appear somewhere in the spec (title, path, tags, or content).
//! Scoring is weighted: title > path > tags > content.
//!
//! # Example
//!
//! ```rust,no_run
//! use leanspec_core::{SpecLoader, search};
//!
//! let loader = SpecLoader::new("./specs");
//! let specs = loader.load_all().expect("Failed to load specs");
//!
//! let results = search::search_specs(&specs, "cli migration", 10);
//! for result in results {
//!     println!("{}: {} (score: {})", result.path, result.title, result.score);
//! }
//! ```

use crate::SpecInfo;
use serde::Serialize;

/// A search result with relevance score
#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    /// Spec path (e.g., "001-my-spec")
    pub path: String,
    /// Spec title
    pub title: String,
    /// Spec status as string
    pub status: String,
    /// Relevance score (higher = more relevant)
    pub score: f64,
    /// Spec tags
    pub tags: Vec<String>,
}

/// Search options for customizing search behavior
#[derive(Debug, Clone, Default)]
pub struct SearchOptions {
    /// Maximum number of results to return
    pub limit: Option<usize>,
    /// Minimum score threshold (results below this are excluded)
    pub min_score: Option<f64>,
}

impl SearchOptions {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = Some(limit);
        self
    }

    pub fn with_min_score(mut self, min_score: f64) -> Self {
        self.min_score = Some(min_score);
        self
    }
}

/// Search specs using cross-field multi-term matching
///
/// All terms in the query must appear somewhere in the spec (any field).
/// Scoring is weighted by field importance: title > path > tags > content.
///
/// # Arguments
/// * `specs` - Slice of specs to search
/// * `query` - Search query (space-separated terms)
/// * `limit` - Maximum number of results
///
/// # Returns
/// Vector of SearchResult sorted by score descending
pub fn search_specs(specs: &[SpecInfo], query: &str, limit: usize) -> Vec<SearchResult> {
    search_specs_with_options(specs, query, SearchOptions::new().with_limit(limit))
}

/// Search specs with custom options
pub fn search_specs_with_options(
    specs: &[SpecInfo],
    query: &str,
    options: SearchOptions,
) -> Vec<SearchResult> {
    // Split query into terms for multi-term matching
    let terms: Vec<String> = query
        .split_whitespace()
        .map(|t| t.to_lowercase())
        .filter(|t| !t.is_empty())
        .collect();

    if terms.is_empty() {
        return Vec::new();
    }

    let min_score = options.min_score.unwrap_or(0.0);
    let limit = options.limit.unwrap_or(usize::MAX);

    // Search and score specs using cross-field multi-term matching
    let mut results: Vec<SearchResult> = specs
        .iter()
        .filter_map(|spec| {
            let score = calculate_spec_score(spec, &terms)?;
            if score < min_score {
                return None;
            }
            Some(SearchResult {
                path: spec.path.clone(),
                title: spec.title.clone(),
                status: spec.frontmatter.status.to_string(),
                score,
                tags: spec.frontmatter.tags.clone(),
            })
        })
        .collect();

    // Sort by score descending
    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Limit results
    results.truncate(limit);

    results
}

/// Calculate relevance score for a spec given search terms
///
/// Returns None if not all terms are present in the spec.
/// Returns Some(score) if all terms match, with score based on field weights.
fn calculate_spec_score(spec: &SpecInfo, terms: &[String]) -> Option<f64> {
    let title_lower = spec.title.to_lowercase();
    let path_lower = spec.path.to_lowercase();
    let tags_lower: Vec<String> = spec
        .frontmatter
        .tags
        .iter()
        .map(|t| t.to_lowercase())
        .collect();
    let tags_text = tags_lower.join(" ");
    let content_lower = spec.content.to_lowercase();

    // Combine all searchable text for term presence check
    let all_text = format!(
        "{} {} {} {}",
        title_lower, path_lower, tags_text, content_lower
    );

    // All terms must be present somewhere in the spec
    let all_terms_present = terms.iter().all(|term| all_text.contains(term));
    if !all_terms_present {
        return None;
    }

    // Score based on where each term appears (weighted by field importance)
    let mut score = 0.0;

    for term in terms {
        // Title match (highest weight: 10 points per term)
        if title_lower.contains(term) {
            score += 10.0;
            // Exact word boundary bonus
            if title_lower.split_whitespace().any(|w| w == term) {
                score += 5.0;
            }
        }

        // Path match (8 points per term)
        if path_lower.contains(term) {
            score += 8.0;
        }

        // Tag match (6 points per term)
        if tags_lower.iter().any(|t| t.contains(term)) {
            score += 6.0;
            // Exact tag match bonus
            if tags_lower.iter().any(|t| t == term) {
                score += 3.0;
            }
        }

        // Content match (1 point per occurrence, capped at 5)
        let content_matches = content_lower.matches(term).count();
        if content_matches > 0 {
            score += (content_matches as f64).min(5.0);
        }
    }

    // Bonus for matching more terms in high-value fields
    let title_term_count = terms.iter().filter(|t| title_lower.contains(*t)).count();
    if title_term_count > 1 {
        score += (title_term_count as f64) * 2.0;
    }

    Some(score)
}

/// Find a content snippet containing one of the search terms
///
/// Returns the line containing the first matching term, truncated if needed.
pub fn find_content_snippet(content: &str, terms: &[String], max_len: usize) -> Option<String> {
    let content_lower = content.to_lowercase();

    // Find the first matching term in content
    for term in terms {
        if let Some(pos) = content_lower.find(term) {
            // Find start of line
            let start = content[..pos].rfind('\n').map(|p| p + 1).unwrap_or(0);

            // Get the line
            let line_end = content[pos..]
                .find('\n')
                .map(|p| pos + p)
                .unwrap_or(content.len());
            let line = &content[start..line_end];

            // Truncate if too long
            if line.len() > max_len {
                let truncated = &line[..max_len];
                return Some(format!("{}...", truncated.trim()));
            } else {
                return Some(format!("\"{}\"", line.trim()));
            }
        }
    }
    None
}

/// Parse query into lowercase terms
pub fn parse_query_terms(query: &str) -> Vec<String> {
    query
        .split_whitespace()
        .map(|t| t.to_lowercase())
        .filter(|t| !t.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecStatus};
    use std::path::PathBuf;

    fn create_test_spec(path: &str, title: &str, tags: &[&str], content: &str) -> SpecInfo {
        SpecInfo {
            path: path.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            file_path: PathBuf::from(format!("specs/{}/README.md", path)),
            is_sub_spec: false,
            parent_spec: None,
            frontmatter: SpecFrontmatter {
                status: SpecStatus::Planned,
                created: "2025-01-01".to_string(),
                priority: None,
                tags: tags.iter().map(|s| s.to_string()).collect(),
                depends_on: vec![],
                parent: None,
                assignee: None,
                reviewer: None,
                issue: None,
                pr: None,
                epic: None,
                breaking: None,
                due: None,
                updated: None,
                completed: None,
                created_at: None,
                updated_at: None,
                completed_at: None,
                transitions: vec![],
                custom: std::collections::HashMap::new(),
            },
        }
    }

    #[test]
    fn test_single_term_search() {
        let specs = vec![
            create_test_spec("001-auth", "Authentication", &["security"], "Login flow"),
            create_test_spec("002-database", "Database", &["storage"], "SQL queries"),
        ];

        let results = search_specs(&specs, "auth", 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "001-auth");
    }

    #[test]
    fn test_multi_term_cross_field() {
        let specs = vec![
            create_test_spec(
                "001-desktop-app",
                "Desktop Application",
                &["ui"],
                "Main window",
            ),
            create_test_spec("002-cli-tool", "CLI Tool", &["terminal"], "Commands"),
        ];

        // "desktop" in path, "app" in path - should match
        let results = search_specs(&specs, "desktop app", 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "001-desktop-app");
    }

    #[test]
    fn test_terms_in_different_fields() {
        let specs = vec![create_test_spec(
            "001-user-auth",
            "Authentication System",
            &["security"],
            "User login",
        )];

        // "user" in path, "security" in tags - should match
        let results = search_specs(&specs, "user security", 10);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_no_match_when_term_missing() {
        let specs = vec![create_test_spec(
            "001-cli",
            "CLI Tool",
            &["terminal"],
            "Commands",
        )];

        // "cli" exists but "webapp" does not
        let results = search_specs(&specs, "cli webapp", 10);
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_empty_query() {
        let specs = vec![create_test_spec("001-test", "Test", &[], "Content")];
        let results = search_specs(&specs, "", 10);
        assert_eq!(results.len(), 0);

        let results = search_specs(&specs, "   ", 10);
        assert_eq!(results.len(), 0);
    }

    #[test]
    fn test_case_insensitive() {
        let specs = vec![create_test_spec(
            "001-Auth",
            "AUTHENTICATION",
            &["Security"],
            "User LOGIN",
        )];

        let results = search_specs(&specs, "auth security login", 10);
        assert_eq!(results.len(), 1);
    }

    #[test]
    fn test_scoring_title_higher_than_content() {
        let specs = vec![
            create_test_spec("001-other", "CLI Tool", &[], "Some content"),
            create_test_spec("002-cli", "Other Title", &[], "cli mentioned here"),
        ];

        let results = search_specs(&specs, "cli", 10);
        assert_eq!(results.len(), 2);
        // First result should be the one with "cli" in title (higher score)
        assert_eq!(results[0].path, "001-other");
    }

    #[test]
    fn test_limit_results() {
        let specs = vec![
            create_test_spec("001-test", "Test 1", &["common"], "Content"),
            create_test_spec("002-test", "Test 2", &["common"], "Content"),
            create_test_spec("003-test", "Test 3", &["common"], "Content"),
        ];

        let results = search_specs(&specs, "test", 2);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_find_content_snippet() {
        let content = "First line\nSecond line with keyword here\nThird line";
        let terms = vec!["keyword".to_string()];

        let snippet = find_content_snippet(content, &terms, 100);
        assert!(snippet.is_some());
        assert!(snippet.unwrap().contains("keyword"));
    }

    #[test]
    fn test_find_content_snippet_truncate() {
        let content =
            "This is a very long line that contains the keyword somewhere in the middle of it";
        let terms = vec!["keyword".to_string()];

        let snippet = find_content_snippet(content, &terms, 30);
        assert!(snippet.is_some());
        assert!(snippet.unwrap().ends_with("..."));
    }
}
