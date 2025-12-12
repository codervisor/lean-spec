//! Dependency graph computation
//!
//! Builds a directed graph of spec dependencies for visualization.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::specs::reader::Spec;

/// A node in the dependency graph
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyNode {
    pub id: String,
    pub name: String,
    pub number: i32,
    pub status: String,
    pub priority: String,
    pub tags: Vec<String>,
}

/// An edge in the dependency graph
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyEdge {
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: String,
}

/// The complete dependency graph
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyGraph {
    pub nodes: Vec<DependencyNode>,
    pub edges: Vec<DependencyEdge>,
}

/// Build a dependency graph from a list of specs
pub fn build_dependency_graph(specs: &[Spec]) -> DependencyGraph {
    // Build lookup maps
    let mut spec_id_by_name: HashMap<String, String> = HashMap::new();
    let mut spec_id_by_number: HashMap<i32, String> = HashMap::new();

    // Only include specs with numbers
    let numbered_specs: Vec<&Spec> = specs
        .iter()
        .filter(|s| s.spec_number.is_some())
        .collect();

    // Build lookup maps
    for spec in &numbered_specs {
        spec_id_by_name.insert(spec.spec_name.clone(), spec.id.clone());
        if let Some(num) = spec.spec_number {
            spec_id_by_number.insert(num, spec.id.clone());
            // Also index by padded number
            spec_id_by_name.insert(format!("{:03}", num), spec.id.clone());
            spec_id_by_name.insert(num.to_string(), spec.id.clone());
        }
    }

    // Build nodes
    let nodes: Vec<DependencyNode> = numbered_specs
        .iter()
        .map(|spec| DependencyNode {
            id: spec.id.clone(),
            name: spec.title.clone().unwrap_or_else(|| {
                format!("Spec {}", spec.spec_number.unwrap_or(0))
            }),
            number: spec.spec_number.unwrap_or(0),
            status: spec.status.clone(),
            priority: spec.priority.clone().unwrap_or_else(|| "medium".to_string()),
            tags: spec.tags.clone(),
        })
        .collect();

    // Build edges
    let mut edges: Vec<DependencyEdge> = Vec::new();

    for spec in &numbered_specs {
        for dep in &spec.depends_on {
            // Try to resolve the dependency
            let target_id = resolve_dependency(dep, &spec_id_by_name, &spec_id_by_number);

            if let Some(target_id) = target_id {
                // Only add edge if target exists and is different from source
                if target_id != spec.id {
                    edges.push(DependencyEdge {
                        // Edge goes from dependency (source) to dependent (target)
                        // i.e., "A depends on B" means edge from B to A
                        source: target_id,
                        target: spec.id.clone(),
                        edge_type: "dependsOn".to_string(),
                    });
                }
            }
        }
    }

    DependencyGraph { nodes, edges }
}

/// Resolve a dependency string to a spec ID
fn resolve_dependency(
    dep: &str,
    by_name: &HashMap<String, String>,
    by_number: &HashMap<i32, String>,
) -> Option<String> {
    let trimmed = dep.trim();

    // Direct name match
    if let Some(id) = by_name.get(trimmed) {
        return Some(id.clone());
    }

    // Try to extract number from dependency
    if let Some(num_str) = trimmed.split('-').next() {
        if let Ok(num) = num_str.parse::<i32>() {
            if let Some(id) = by_number.get(&num) {
                return Some(id.clone());
            }
        }
    }

    None
}

/// Get dependency chain for a specific spec (for visualization)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpecDependencies {
    pub depends_on: Vec<DependencyInfo>,
    pub required_by: Vec<DependencyInfo>,
}

/// Information about a dependency
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DependencyInfo {
    pub spec_name: String,
    pub title: Option<String>,
    pub status: String,
}

/// Get dependency info for a specific spec
pub fn get_spec_dependencies(spec: &Spec, all_specs: &[Spec]) -> SpecDependencies {
    let spec_map: HashMap<String, &Spec> = all_specs
        .iter()
        .flat_map(|s| {
            let mut entries = vec![(s.spec_name.clone(), s)];
            if let Some(num) = s.spec_number {
                entries.push((format!("{:03}", num), s));
                entries.push((num.to_string(), s));
            }
            entries
        })
        .collect();

    // Resolve depends_on
    let depends_on: Vec<DependencyInfo> = spec
        .depends_on
        .iter()
        .filter_map(|dep| {
            let trimmed = dep.trim();
            
            // Try direct match first
            if let Some(s) = spec_map.get(trimmed) {
                return Some(DependencyInfo {
                    spec_name: s.spec_name.clone(),
                    title: s.title.clone(),
                    status: s.status.clone(),
                });
            }
            
            // Try number prefix
            if let Some(num_str) = trimmed.split('-').next() {
                if let Ok(num) = num_str.parse::<i32>() {
                    if let Some(s) = spec_map.get(&num.to_string()) {
                        return Some(DependencyInfo {
                            spec_name: s.spec_name.clone(),
                            title: s.title.clone(),
                            status: s.status.clone(),
                        });
                    }
                }
            }
            
            None
        })
        .collect();

    // Resolve required_by
    let required_by: Vec<DependencyInfo> = spec
        .required_by
        .iter()
        .filter_map(|name| {
            spec_map.get(name).map(|s| DependencyInfo {
                spec_name: s.spec_name.clone(),
                title: s.title.clone(),
                status: s.status.clone(),
            })
        })
        .collect();

    SpecDependencies {
        depends_on,
        required_by,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Utc;

    fn create_test_spec(num: i32, name: &str, deps: Vec<&str>) -> Spec {
        Spec {
            id: format!("fs-{}", name),
            project_id: "test".to_string(),
            spec_number: Some(num),
            spec_name: name.to_string(),
            title: Some(format!("Spec {}", num)),
            status: "planned".to_string(),
            priority: Some("medium".to_string()),
            tags: vec![],
            assignee: None,
            content_md: String::new(),
            content_html: None,
            created_at: None,
            updated_at: None,
            completed_at: None,
            file_path: format!("specs/{}/README.md", name),
            github_url: None,
            synced_at: Utc::now(),
            depends_on: deps.into_iter().map(String::from).collect(),
            required_by: Vec::new(),
        }
    }

    #[test]
    fn test_build_dependency_graph() {
        let specs = vec![
            create_test_spec(1, "001-base", vec![]),
            create_test_spec(2, "002-feature", vec!["001-base"]),
            create_test_spec(3, "003-extension", vec!["002-feature", "001"]),
        ];

        let graph = build_dependency_graph(&specs);

        assert_eq!(graph.nodes.len(), 3);
        assert_eq!(graph.edges.len(), 3);

        // Check edges go from dependency to dependent
        let edge_pairs: Vec<(&str, &str)> = graph
            .edges
            .iter()
            .map(|e| (e.source.as_str(), e.target.as_str()))
            .collect();

        assert!(edge_pairs.contains(&("fs-001-base", "fs-002-feature")));
        assert!(edge_pairs.contains(&("fs-002-feature", "fs-003-extension")));
        assert!(edge_pairs.contains(&("fs-001-base", "fs-003-extension")));
    }

    #[test]
    fn test_resolve_dependency() {
        let mut by_name = HashMap::new();
        let mut by_number = HashMap::new();
        
        by_name.insert("001-base".to_string(), "id-1".to_string());
        by_name.insert("001".to_string(), "id-1".to_string());
        by_name.insert("1".to_string(), "id-1".to_string());
        by_number.insert(1, "id-1".to_string());

        assert_eq!(resolve_dependency("001-base", &by_name, &by_number), Some("id-1".to_string()));
        assert_eq!(resolve_dependency("001", &by_name, &by_number), Some("id-1".to_string()));
        assert_eq!(resolve_dependency("1", &by_name, &by_number), Some("id-1".to_string()));
        assert_eq!(resolve_dependency("999", &by_name, &by_number), None);
    }
}
