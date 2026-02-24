//! Search module for spec discovery.
//!
//! Supports boolean operators, field filters, date ranges, quoted phrases,
//! fuzzy matching, and weighted relevance scoring.

mod filters;
mod fuzzy;
mod query;
mod scorer;

use crate::SpecInfo;
use query::ParsedQuery;
pub use query::{parse_query, parse_query_terms, validate_search_query, SearchQueryError};
use scorer::{matches_query, score_spec};
use serde::Serialize;

/// A search result with relevance score.
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

/// Search options for customizing search behavior.
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

/// Search specs using advanced query grammar.
///
/// Invalid queries return an empty result set. Use `validate_search_query`
/// for explicit query error reporting in UI layers.
pub fn search_specs(specs: &[SpecInfo], query: &str, limit: usize) -> Vec<SearchResult> {
    search_specs_with_options(specs, query, SearchOptions::new().with_limit(limit))
}

/// Search specs with custom options.
pub fn search_specs_with_options(
    specs: &[SpecInfo],
    query: &str,
    options: SearchOptions,
) -> Vec<SearchResult> {
    let parsed = match parse_query(query) {
        Ok(parsed) => parsed,
        Err(_) => return Vec::new(),
    };

    search_specs_parsed(specs, &parsed, options)
}

fn search_specs_parsed(
    specs: &[SpecInfo],
    parsed: &ParsedQuery,
    options: SearchOptions,
) -> Vec<SearchResult> {
    if parsed.clauses.is_empty() {
        return Vec::new();
    }

    let min_score = options.min_score.unwrap_or(0.0);
    let limit = options.limit.unwrap_or(usize::MAX);

    let mut results: Vec<SearchResult> = specs
        .iter()
        .filter_map(|spec| {
            if !matches_query(spec, parsed) {
                return None;
            }

            let score = score_spec(spec, parsed);
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

    results.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    results.truncate(limit);
    results
}

/// Find a content snippet containing one of the search terms.
pub fn find_content_snippet(content: &str, terms: &[String], max_len: usize) -> Option<String> {
    let content_lower = content.to_lowercase();

    for term in terms {
        if let Some(pos) = content_lower.find(term) {
            let start = content[..pos].rfind('\n').map(|p| p + 1).unwrap_or(0);
            let line_end = content[pos..]
                .find('\n')
                .map(|p| pos + p)
                .unwrap_or(content.len());
            let line = &content[start..line_end];

            if line.len() > max_len {
                return Some(format!("{}...", line[..max_len].trim()));
            }

            return Some(format!("\"{}\"", line.trim()));
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecPriority, SpecStatus};
    use std::path::PathBuf;

    fn create_test_spec(
        path: &str,
        title: &str,
        tags: &[&str],
        content: &str,
        status: SpecStatus,
        priority: Option<SpecPriority>,
        created: &str,
    ) -> SpecInfo {
        SpecInfo {
            path: path.to_string(),
            title: title.to_string(),
            content: content.to_string(),
            file_path: PathBuf::from(format!("specs/{}/README.md", path)),
            is_sub_spec: false,
            parent_spec: None,
            frontmatter: SpecFrontmatter {
                status,
                created: created.to_string(),
                priority,
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

    fn test_specs() -> Vec<SpecInfo> {
        vec![
            create_test_spec(
                "001-auth-system",
                "User Authentication",
                &["security", "api"],
                "Implements login and token refresh.",
                SpecStatus::InProgress,
                Some(SpecPriority::High),
                "2025-11-03",
            ),
            create_test_spec(
                "002-cli-refactor",
                "CLI Command Refactor",
                &["cli"],
                "Improve command parsing and help output.",
                SpecStatus::Planned,
                Some(SpecPriority::Medium),
                "2025-10-12",
            ),
            create_test_spec(
                "003-frontend-polish",
                "Frontend UX Improvements",
                &["ui", "frontend"],
                "Navigation and responsive layout updates.",
                SpecStatus::Complete,
                Some(SpecPriority::Low),
                "2025-09-22",
            ),
        ]
    }

    #[test]
    fn test_boolean_and_or_not() {
        let specs = test_specs();

        let and_results = search_specs(&specs, "auth AND security", 10);
        assert_eq!(and_results.len(), 1);
        assert_eq!(and_results[0].path, "001-auth-system");

        let or_results = search_specs(&specs, "frontend OR cli", 10);
        assert_eq!(or_results.len(), 2);

        let not_results = search_specs(&specs, "auth NOT cli", 10);
        assert_eq!(not_results.len(), 1);
        assert_eq!(not_results[0].path, "001-auth-system");
    }

    #[test]
    fn test_field_filters() {
        let specs = test_specs();

        assert_eq!(search_specs(&specs, "status:in-progress", 10).len(), 1);
        assert_eq!(search_specs(&specs, "tag:cli", 10).len(), 1);
        assert_eq!(search_specs(&specs, "priority:high", 10).len(), 1);
        assert_eq!(search_specs(&specs, "title:refactor", 10).len(), 1);
    }

    #[test]
    fn test_date_filters() {
        let specs = test_specs();

        let results = search_specs(&specs, "created:>2025-10", 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "001-auth-system");

        let results = search_specs(&specs, "created:<=2025-10-12", 10);
        assert_eq!(results.len(), 2);
    }

    #[test]
    fn test_phrase_and_fuzzy() {
        let specs = test_specs();

        let phrase_results = search_specs(&specs, "\"token refresh\"", 10);
        assert_eq!(phrase_results.len(), 1);

        let fuzzy_results = search_specs(&specs, "authetication~", 10);
        assert_eq!(fuzzy_results.len(), 1);
        assert_eq!(fuzzy_results[0].path, "001-auth-system");
    }

    #[test]
    fn test_backward_compatibility_multi_term_and() {
        let specs = test_specs();

        let results = search_specs(&specs, "user auth", 10);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "001-auth-system");
    }

    #[test]
    fn test_invalid_query_returns_empty_from_search() {
        let specs = test_specs();
        assert!(search_specs(&specs, "auth AND", 10).is_empty());
        assert!(validate_search_query("auth AND").is_err());
    }

    #[test]
    fn test_parse_query_terms_excludes_fields_and_operators() {
        let terms = parse_query_terms("tag:api status:planned \"token refresh\" auth");
        assert_eq!(terms, vec!["token refresh".to_string(), "auth".to_string()]);
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
    fn test_query_parse_errors_are_clear() {
        let err = parse_query("tag:").unwrap_err();
        assert!(err.to_string().contains("Missing value"));

        let err = parse_query("foo:bar").unwrap_err();
        assert!(err.to_string().contains("Unknown field"));

        let err = parse_query("\"unterminated").unwrap_err();
        assert!(err.to_string().contains("Unterminated quote"));
    }

    #[test]
    fn test_search_result_scoring_sorts_desc() {
        let specs = test_specs();
        let results = search_specs(&specs, "auth", 10);
        assert!(!results.is_empty());
        for i in 1..results.len() {
            assert!(results[i - 1].score >= results[i].score);
        }
    }

    #[test]
    fn test_query_error_type_is_publicly_usable() {
        let err: SearchQueryError = parse_query("AND")
            .err()
            .expect("Expected parse error for operator-only query");
        assert!(err.to_string().contains("Unexpected operator"));
    }
}
