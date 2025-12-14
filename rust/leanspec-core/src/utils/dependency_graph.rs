//! Dependency graph for specs
//!
//! Builds an in-memory graph of all spec dependencies for efficient querying.
//! Handles two types of relationships:
//! - dependsOn: Upstream dependencies (current spec depends on these)
//! - requiredBy: Downstream dependents (these specs depend on current)

use crate::types::SpecInfo;
use petgraph::graph::{DiGraph, NodeIndex};

use petgraph::Direction;
use std::collections::{HashMap, HashSet};

/// Complete dependency information for a spec
#[derive(Debug, Clone)]
pub struct CompleteDependencyGraph {
    pub current: SpecInfo,
    pub depends_on: Vec<SpecInfo>,      // Upstream (current depends on these)
    pub required_by: Vec<SpecInfo>,     // Downstream (these depend on current)
}

/// Impact radius showing all specs affected by changes
#[derive(Debug, Clone)]
pub struct ImpactRadius {
    pub current: SpecInfo,
    pub upstream: Vec<SpecInfo>,        // What this spec needs
    pub downstream: Vec<SpecInfo>,      // What needs this spec
}

/// Manages the dependency graph for all specs
pub struct DependencyGraph {
    graph: DiGraph<String, ()>,
    node_indices: HashMap<String, NodeIndex>,
    specs: HashMap<String, SpecInfo>,
}

impl DependencyGraph {
    /// Create a new dependency graph from specs
    pub fn new(specs: &[SpecInfo]) -> Self {
        let mut graph = DiGraph::new();
        let mut node_indices = HashMap::new();
        let mut spec_map = HashMap::new();
        
        // First pass: Create nodes for all specs
        for spec in specs {
            let idx = graph.add_node(spec.path.clone());
            node_indices.insert(spec.path.clone(), idx);
            spec_map.insert(spec.path.clone(), spec.clone());
        }
        
        // Second pass: Add edges for dependencies
        for spec in specs {
            if let Some(&from_idx) = node_indices.get(&spec.path) {
                for dep in &spec.frontmatter.depends_on {
                    if let Some(&to_idx) = node_indices.get(dep) {
                        // Edge from dependent spec to its dependency
                        graph.add_edge(from_idx, to_idx, ());
                    }
                }
            }
        }
        
        Self {
            graph,
            node_indices,
            specs: spec_map,
        }
    }
    
    /// Get complete dependency graph for a spec
    pub fn get_complete_graph(&self, spec_path: &str) -> Option<CompleteDependencyGraph> {
        let spec = self.specs.get(spec_path)?;
        let idx = self.node_indices.get(spec_path)?;
        
        // Get direct dependencies (outgoing edges - what this spec depends on)
        let depends_on: Vec<SpecInfo> = self.graph
            .neighbors_directed(*idx, Direction::Outgoing)
            .filter_map(|neighbor_idx| {
                let path = self.graph.node_weight(neighbor_idx)?;
                self.specs.get(path).cloned()
            })
            .collect();
        
        // Get direct dependents (incoming edges - what depends on this spec)
        let required_by: Vec<SpecInfo> = self.graph
            .neighbors_directed(*idx, Direction::Incoming)
            .filter_map(|neighbor_idx| {
                let path = self.graph.node_weight(neighbor_idx)?;
                self.specs.get(path).cloned()
            })
            .collect();
        
        Some(CompleteDependencyGraph {
            current: spec.clone(),
            depends_on,
            required_by,
        })
    }
    
    /// Get upstream dependencies (specs this one depends on) recursively
    pub fn get_upstream(&self, spec_path: &str, max_depth: usize) -> Vec<SpecInfo> {
        let Some(&start_idx) = self.node_indices.get(spec_path) else {
            return Vec::new();
        };
        
        let mut result = Vec::new();
        let mut visited = HashSet::new();
        visited.insert(start_idx);
        
        self.traverse_outgoing(start_idx, 0, max_depth, &mut visited, &mut result);
        
        result
    }
    
    fn traverse_outgoing(
        &self,
        idx: NodeIndex,
        depth: usize,
        max_depth: usize,
        visited: &mut HashSet<NodeIndex>,
        result: &mut Vec<SpecInfo>,
    ) {
        if depth >= max_depth {
            return;
        }
        
        for neighbor in self.graph.neighbors_directed(idx, Direction::Outgoing) {
            if !visited.contains(&neighbor) {
                visited.insert(neighbor);
                
                if let Some(path) = self.graph.node_weight(neighbor) {
                    if let Some(spec) = self.specs.get(path) {
                        result.push(spec.clone());
                        self.traverse_outgoing(neighbor, depth + 1, max_depth, visited, result);
                    }
                }
            }
        }
    }
    
    /// Get downstream dependents (specs that depend on this one) recursively
    pub fn get_downstream(&self, spec_path: &str, max_depth: usize) -> Vec<SpecInfo> {
        let Some(&start_idx) = self.node_indices.get(spec_path) else {
            return Vec::new();
        };
        
        let mut result = Vec::new();
        let mut visited = HashSet::new();
        visited.insert(start_idx);
        
        self.traverse_incoming(start_idx, 0, max_depth, &mut visited, &mut result);
        
        result
    }
    
    fn traverse_incoming(
        &self,
        idx: NodeIndex,
        depth: usize,
        max_depth: usize,
        visited: &mut HashSet<NodeIndex>,
        result: &mut Vec<SpecInfo>,
    ) {
        if depth >= max_depth {
            return;
        }
        
        for neighbor in self.graph.neighbors_directed(idx, Direction::Incoming) {
            if !visited.contains(&neighbor) {
                visited.insert(neighbor);
                
                if let Some(path) = self.graph.node_weight(neighbor) {
                    if let Some(spec) = self.specs.get(path) {
                        result.push(spec.clone());
                        self.traverse_incoming(neighbor, depth + 1, max_depth, visited, result);
                    }
                }
            }
        }
    }
    
    /// Get impact radius - all specs affected by changes to this spec
    pub fn get_impact_radius(&self, spec_path: &str, max_depth: usize) -> Option<ImpactRadius> {
        let spec = self.specs.get(spec_path)?;
        
        Some(ImpactRadius {
            current: spec.clone(),
            upstream: self.get_upstream(spec_path, max_depth),
            downstream: self.get_downstream(spec_path, max_depth),
        })
    }
    
    /// Check if a circular dependency exists starting from a spec
    pub fn has_circular_dependency(&self, spec_path: &str) -> bool {
        let Some(&start_idx) = self.node_indices.get(spec_path) else {
            return false;
        };
        
        let mut visited = HashSet::new();
        let mut stack = HashSet::new();
        
        self.detect_cycle(start_idx, &mut visited, &mut stack)
    }
    
    fn detect_cycle(
        &self,
        idx: NodeIndex,
        visited: &mut HashSet<NodeIndex>,
        stack: &mut HashSet<NodeIndex>,
    ) -> bool {
        if stack.contains(&idx) {
            return true;
        }
        
        if visited.contains(&idx) {
            return false;
        }
        
        visited.insert(idx);
        stack.insert(idx);
        
        for neighbor in self.graph.neighbors_directed(idx, Direction::Outgoing) {
            if self.detect_cycle(neighbor, visited, stack) {
                return true;
            }
        }
        
        stack.remove(&idx);
        false
    }
    
    /// Find all circular dependencies in the graph
    pub fn find_all_cycles(&self) -> Vec<Vec<String>> {
        let mut cycles = Vec::new();
        let mut visited = HashSet::new();
        
        for (_path, &idx) in &self.node_indices {
            if !visited.contains(&idx) {
                let mut stack = HashSet::new();
                let mut path_stack = Vec::new();
                self.find_cycles_dfs(idx, &mut visited, &mut stack, &mut path_stack, &mut cycles);
            }
        }
        
        cycles
    }
    
    fn find_cycles_dfs(
        &self,
        idx: NodeIndex,
        visited: &mut HashSet<NodeIndex>,
        stack: &mut HashSet<NodeIndex>,
        path_stack: &mut Vec<String>,
        cycles: &mut Vec<Vec<String>>,
    ) {
        visited.insert(idx);
        stack.insert(idx);
        
        if let Some(path) = self.graph.node_weight(idx) {
            path_stack.push(path.clone());
        }
        
        for neighbor in self.graph.neighbors_directed(idx, Direction::Outgoing) {
            if !visited.contains(&neighbor) {
                self.find_cycles_dfs(neighbor, visited, stack, path_stack, cycles);
            } else if stack.contains(&neighbor) {
                // Found a cycle - extract it
                if let Some(start_path) = self.graph.node_weight(neighbor) {
                    let start_idx = path_stack.iter().position(|p| p == start_path);
                    if let Some(start) = start_idx {
                        let cycle: Vec<String> = path_stack[start..].to_vec();
                        if !cycle.is_empty() {
                            cycles.push(cycle);
                        }
                    }
                }
            }
        }
        
        path_stack.pop();
        stack.remove(&idx);
    }
    
    /// Get all specs in the graph
    pub fn all_specs(&self) -> Vec<&SpecInfo> {
        self.specs.values().collect()
    }
    
    /// Get topologically sorted specs (dependencies first)
    pub fn topological_sort(&self) -> Option<Vec<SpecInfo>> {
        use petgraph::algo::toposort;
        
        match toposort(&self.graph, None) {
            Ok(sorted) => {
                // Reverse because we want dependencies first
                Some(sorted.into_iter()
                    .rev()
                    .filter_map(|idx| {
                        let path = self.graph.node_weight(idx)?;
                        self.specs.get(path).cloned()
                    })
                    .collect())
            }
            Err(_) => None, // Cycle detected
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{SpecFrontmatter, SpecStatus};
    use std::path::PathBuf;
    
    fn create_spec(path: &str, depends_on: Vec<&str>) -> SpecInfo {
        SpecInfo {
            path: path.to_string(),
            title: path.to_string(),
            frontmatter: SpecFrontmatter {
                status: SpecStatus::Planned,
                created: "2025-01-01".to_string(),
                priority: None,
                tags: Vec::new(),
                depends_on: depends_on.iter().map(|s| s.to_string()).collect(),
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
    fn test_simple_dependency() {
        let specs = vec![
            create_spec("001-base", vec![]),
            create_spec("002-feature", vec!["001-base"]),
        ];
        
        let graph = DependencyGraph::new(&specs);
        
        let complete = graph.get_complete_graph("002-feature").unwrap();
        assert_eq!(complete.depends_on.len(), 1);
        assert_eq!(complete.depends_on[0].path, "001-base");
        
        let base_complete = graph.get_complete_graph("001-base").unwrap();
        assert_eq!(base_complete.required_by.len(), 1);
        assert_eq!(base_complete.required_by[0].path, "002-feature");
    }
    
    #[test]
    fn test_transitive_dependencies() {
        let specs = vec![
            create_spec("001-base", vec![]),
            create_spec("002-middle", vec!["001-base"]),
            create_spec("003-top", vec!["002-middle"]),
        ];
        
        let graph = DependencyGraph::new(&specs);
        
        // Get all upstream from 003-top
        let upstream = graph.get_upstream("003-top", 3);
        assert_eq!(upstream.len(), 2);
        
        // Get all downstream from 001-base
        let downstream = graph.get_downstream("001-base", 3);
        assert_eq!(downstream.len(), 2);
    }
    
    #[test]
    fn test_circular_dependency() {
        let specs = vec![
            create_spec("001-a", vec!["002-b"]),
            create_spec("002-b", vec!["001-a"]),
        ];
        
        let graph = DependencyGraph::new(&specs);
        
        assert!(graph.has_circular_dependency("001-a"));
        assert!(graph.has_circular_dependency("002-b"));
    }
    
    #[test]
    fn test_topological_sort() {
        let specs = vec![
            create_spec("003-top", vec!["002-middle"]),
            create_spec("001-base", vec![]),
            create_spec("002-middle", vec!["001-base"]),
        ];
        
        let graph = DependencyGraph::new(&specs);
        
        let sorted = graph.topological_sort().unwrap();
        let paths: Vec<&str> = sorted.iter().map(|s| s.path.as_str()).collect();
        
        // Dependencies should come before dependents
        let base_idx = paths.iter().position(|&p| p == "001-base").unwrap();
        let middle_idx = paths.iter().position(|&p| p == "002-middle").unwrap();
        let top_idx = paths.iter().position(|&p| p == "003-top").unwrap();
        
        assert!(base_idx < middle_idx);
        assert!(middle_idx < top_idx);
    }
}
