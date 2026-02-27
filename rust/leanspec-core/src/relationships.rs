//! Relationship validation utilities

use crate::types::SpecInfo;
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RelationshipError {
    ParentCycle { path: Vec<String> },
    DependencyCycle { path: Vec<String> },
    SelfDependency { spec: String },
    DependsOnParent { spec: String, parent: String },
    DependsOnChild { spec: String, child: String },
}

impl RelationshipError {
    fn format_path(path: &[String]) -> String {
        path.join(" → ")
    }
}

impl std::fmt::Display for RelationshipError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RelationshipError::ParentCycle { path } => write!(
                f,
                "Cannot set parent - would create cycle: {}",
                Self::format_path(path)
            ),
            RelationshipError::DependencyCycle { path } => write!(
                f,
                "Cannot add dependency - would create cycle: {}",
                Self::format_path(path)
            ),
            RelationshipError::SelfDependency { spec } => write!(
                f,
                "Cannot add dependency - spec cannot depend on itself: {}",
                spec
            ),
            RelationshipError::DependsOnParent { spec, parent } => write!(
                f,
                "Cannot add dependency - spec already has hierarchy relationship:\n  {} has parent {}, cannot also depend on {}\n  Use hierarchy (parent/child) OR dependency, not both for same spec pair.",
                spec, parent, parent
            ),
            RelationshipError::DependsOnChild { spec, child } => write!(
                f,
                "Cannot add dependency - target is a child of this spec:\n  {} is parent of {}, cannot depend on its own child",
                spec, child
            ),
        }
    }
}

impl std::error::Error for RelationshipError {}

/// Validate setting a parent for a spec.
pub fn validate_parent_assignment(
    child_spec: &str,
    new_parent: &str,
    specs: &[SpecInfo],
) -> Result<(), RelationshipError> {
    if child_spec == new_parent {
        return Err(RelationshipError::ParentCycle {
            path: vec![child_spec.to_string(), child_spec.to_string()],
        });
    }

    let parent_map: HashMap<String, Option<String>> = specs
        .iter()
        .map(|spec| (spec.path.clone(), spec.frontmatter.parent.clone()))
        .collect();

    let mut seen = HashSet::new();
    let mut current = new_parent.to_string();
    let mut path = vec![child_spec.to_string(), new_parent.to_string()];

    loop {
        let parent = match parent_map.get(&current).and_then(|p| p.clone()) {
            Some(parent) => parent,
            None => return Ok(()),
        };

        if !seen.insert(parent.clone()) {
            return Ok(());
        }

        if parent == child_spec {
            path.push(child_spec.to_string());
            return Err(RelationshipError::ParentCycle { path });
        }

        path.push(parent.clone());
        current = parent;
    }
}

/// Validate setting a parent for a spec using a precomputed child->parent map.
pub fn validate_parent_assignment_with_index(
    child_spec: &str,
    new_parent: &str,
    parent_by_child: &HashMap<String, String>,
) -> Result<(), RelationshipError> {
    if child_spec == new_parent {
        return Err(RelationshipError::ParentCycle {
            path: vec![child_spec.to_string(), child_spec.to_string()],
        });
    }

    let mut seen = HashSet::new();
    let mut current = new_parent.to_string();
    let mut path = vec![child_spec.to_string(), new_parent.to_string()];

    loop {
        let Some(parent) = parent_by_child.get(&current).cloned() else {
            return Ok(());
        };

        if !seen.insert(parent.clone()) {
            return Ok(());
        }

        if parent == child_spec {
            path.push(child_spec.to_string());
            return Err(RelationshipError::ParentCycle { path });
        }

        path.push(parent.clone());
        current = parent;
    }
}

/// Validate adding a dependency for a spec.
pub fn validate_dependency_addition(
    spec: &str,
    new_dep: &str,
    specs: &[SpecInfo],
) -> Result<(), RelationshipError> {
    if spec == new_dep {
        return Err(RelationshipError::SelfDependency {
            spec: spec.to_string(),
        });
    }

    let Some(spec_info) = specs.iter().find(|s| s.path == spec) else {
        return Ok(());
    };

    if spec_info.frontmatter.parent.as_deref() == Some(new_dep) {
        return Err(RelationshipError::DependsOnParent {
            spec: spec.to_string(),
            parent: new_dep.to_string(),
        });
    }

    if specs
        .iter()
        .any(|s| s.frontmatter.parent.as_deref() == Some(spec) && s.path == new_dep)
    {
        return Err(RelationshipError::DependsOnChild {
            spec: spec.to_string(),
            child: new_dep.to_string(),
        });
    }

    let dep_map = build_dependency_map(specs);
    if let Some(path) = find_dependency_path(new_dep, spec, &dep_map) {
        let mut cycle_path = Vec::with_capacity(path.len() + 1);
        cycle_path.push(spec.to_string());
        cycle_path.extend(path);
        return Err(RelationshipError::DependencyCycle { path: cycle_path });
    }

    Ok(())
}

fn build_dependency_map(specs: &[SpecInfo]) -> HashMap<String, Vec<String>> {
    specs
        .iter()
        .map(|spec| (spec.path.clone(), spec.frontmatter.depends_on.clone()))
        .collect()
}

fn find_dependency_path(
    start: &str,
    target: &str,
    dep_map: &HashMap<String, Vec<String>>,
) -> Option<Vec<String>> {
    let mut queue = VecDeque::new();
    let mut visited = HashSet::new();
    let mut parent_map: HashMap<String, String> = HashMap::new();

    queue.push_back(start.to_string());
    visited.insert(start.to_string());

    while let Some(node) = queue.pop_front() {
        let deps = dep_map.get(&node).cloned().unwrap_or_default();
        for dep in deps {
            if !visited.insert(dep.clone()) {
                continue;
            }
            parent_map.insert(dep.clone(), node.clone());

            if dep == target {
                return build_path(&parent_map, start, target);
            }

            queue.push_back(dep);
        }
    }

    None
}

fn build_path(
    parent_map: &HashMap<String, String>,
    start: &str,
    target: &str,
) -> Option<Vec<String>> {
    let mut path = Vec::new();
    let mut current = target.to_string();
    path.push(current.clone());

    while current != start {
        let parent = parent_map.get(&current)?;
        current = parent.clone();
        path.push(current.clone());
    }

    path.reverse();
    Some(path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecInfo, SpecStatus};
    use std::path::PathBuf;

    fn make_spec(path: &str, parent: Option<&str>, depends_on: Vec<&str>) -> SpecInfo {
        SpecInfo {
            path: path.to_string(),
            title: path.to_string(),
            frontmatter: SpecFrontmatter {
                status: SpecStatus::Planned,
                created: "2025-01-01".to_string(),
                priority: None,
                tags: Vec::new(),
                depends_on: depends_on.iter().map(|s| s.to_string()).collect(),
                parent: parent.map(|p| p.to_string()),
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
                transitions: Vec::new(),
                custom: std::collections::HashMap::new(),
            },
            content: "".to_string(),
            file_path: PathBuf::from(format!("specs/{}/README.md", path)),
            is_sub_spec: false,
            parent_spec: None,
        }
    }

    #[test]
    fn detects_parent_cycle() {
        let specs = vec![
            make_spec("A", None, vec![]),
            make_spec("B", Some("C"), vec![]),
            make_spec("C", Some("A"), vec![]),
        ];

        let err = validate_parent_assignment("A", "B", &specs).unwrap_err();
        match err {
            RelationshipError::ParentCycle { path } => {
                assert_eq!(path, vec!["A", "B", "C", "A"]);
            }
            _ => panic!("Unexpected error"),
        }
    }

    #[test]
    fn detects_dependency_cycle() {
        let specs = vec![
            make_spec("A", None, vec![]),
            make_spec("B", None, vec!["A"]),
            make_spec("C", None, vec!["B"]),
        ];

        let err = validate_dependency_addition("A", "C", &specs).unwrap_err();
        match err {
            RelationshipError::DependencyCycle { path } => {
                assert_eq!(path, vec!["A", "C", "B", "A"]);
            }
            _ => panic!("Unexpected error"),
        }
    }

    #[test]
    fn detects_hierarchy_conflict() {
        let specs = vec![
            make_spec("A", None, vec![]),
            make_spec("B", Some("A"), vec![]),
        ];

        let err = validate_dependency_addition("A", "B", &specs).unwrap_err();
        assert!(matches!(err, RelationshipError::DependsOnChild { .. }));

        let err = validate_dependency_addition("B", "A", &specs).unwrap_err();
        assert!(matches!(err, RelationshipError::DependsOnParent { .. }));
    }
}
