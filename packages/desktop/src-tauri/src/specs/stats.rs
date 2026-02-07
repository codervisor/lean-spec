//! Stats calculation for specs
//!
//! Provides statistics and analytics about specs in a project.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::specs::reader::Spec;

/// Statistics result for a project
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatsResult {
    pub total_projects: i32,
    pub total_specs: i32,
    pub specs_by_status: Vec<StatusCount>,
    pub specs_by_priority: Vec<PriorityCount>,
    pub completion_rate: f64,
    /// Additional metrics
    pub active_specs: i32,
    pub total_tags: i32,
    pub avg_tags_per_spec: f64,
    pub specs_with_dependencies: i32,
}

/// Count by status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusCount {
    pub status: String,
    pub count: i32,
}

/// Count by priority
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PriorityCount {
    pub priority: String,
    pub count: i32,
}

/// Calculate stats for a list of specs
pub fn calculate_stats(specs: &[Spec]) -> StatsResult {
    let total_specs = specs.len() as i32;
    
    // Count by status
    let mut status_counts: HashMap<String, i32> = HashMap::new();
    let mut priority_counts: HashMap<String, i32> = HashMap::new();
    let mut total_tags = 0;
    let mut specs_with_dependencies = 0;

    for spec in specs {
        *status_counts.entry(spec.status.clone()).or_insert(0) += 1;
        
        if let Some(priority) = &spec.priority {
            *priority_counts.entry(priority.clone()).or_insert(0) += 1;
        }
        
        total_tags += spec.tags.len();
        
        if !spec.depends_on.is_empty() {
            specs_with_dependencies += 1;
        }
    }

    let complete_count = status_counts.get("complete").copied().unwrap_or(0);
    let completion_rate = if total_specs > 0 {
        (complete_count as f64 / total_specs as f64) * 100.0
    } else {
        0.0
    };

    let active_specs = status_counts.get("draft").copied().unwrap_or(0)
        + status_counts.get("planned").copied().unwrap_or(0)
        + status_counts.get("in-progress").copied().unwrap_or(0);

    let avg_tags_per_spec = if total_specs > 0 {
        total_tags as f64 / total_specs as f64
    } else {
        0.0
    };

    // Sort status and priority counts for consistent output
    let mut specs_by_status: Vec<StatusCount> = status_counts
        .into_iter()
        .map(|(status, count)| StatusCount { status, count })
        .collect();
    specs_by_status.sort_by(|a, b| b.count.cmp(&a.count));

    let mut specs_by_priority: Vec<PriorityCount> = priority_counts
        .into_iter()
        .map(|(priority, count)| PriorityCount { priority, count })
        .collect();
    specs_by_priority.sort_by(|a, b| b.count.cmp(&a.count));

    // Calculate unique tags
    let mut unique_tags: std::collections::HashSet<&str> = std::collections::HashSet::new();
    for spec in specs {
        for tag in &spec.tags {
            unique_tags.insert(tag);
        }
    }

    StatsResult {
        total_projects: 1,
        total_specs,
        specs_by_status,
        specs_by_priority,
        completion_rate: (completion_rate * 10.0).round() / 10.0,
        active_specs,
        total_tags: unique_tags.len() as i32,
        avg_tags_per_spec: (avg_tags_per_spec * 100.0).round() / 100.0,
        specs_with_dependencies,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_spec(status: &str, priority: Option<&str>, tags: Vec<&str>, deps: Vec<&str>) -> Spec {
        Spec {
            id: "test".to_string(),
            project_id: "test".to_string(),
            spec_number: Some(1),
            spec_name: "test-spec".to_string(),
            title: Some("Test".to_string()),
            status: status.to_string(),
            priority: priority.map(String::from),
            tags: tags.into_iter().map(String::from).collect(),
            assignee: None,
            content_md: String::new(),
            content_html: None,
            created_at: None,
            updated_at: None,
            completed_at: None,
            file_path: "specs/test/README.md".to_string(),
            github_url: None,
            synced_at: Utc::now(),
            depends_on: deps.into_iter().map(String::from).collect(),
            required_by: Vec::new(),
        }
    }

    #[test]
    fn test_calculate_stats() {
        let specs = vec![
            create_test_spec("planned", Some("high"), vec!["architecture"], vec![]),
            create_test_spec("in-progress", Some("high"), vec!["ui", "ux"], vec!["001"]),
            create_test_spec("complete", Some("medium"), vec!["docs"], vec![]),
            create_test_spec("complete", Some("low"), vec![], vec!["002"]),
        ];

        let stats = calculate_stats(&specs);

        assert_eq!(stats.total_specs, 4);
        assert_eq!(stats.active_specs, 2); // planned + in-progress
        assert_eq!(stats.completion_rate, 50.0);
        assert_eq!(stats.total_tags, 4); // unique tags
        assert_eq!(stats.specs_with_dependencies, 2);
    }

    #[test]
    fn test_empty_stats() {
        let stats = calculate_stats(&[]);
        
        assert_eq!(stats.total_specs, 0);
        assert_eq!(stats.completion_rate, 0.0);
        assert_eq!(stats.active_specs, 0);
    }
}
