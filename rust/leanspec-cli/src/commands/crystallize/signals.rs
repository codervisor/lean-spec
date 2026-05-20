//! `Signal` types and aggregation for the crystallize scanner pipeline.
//!
//! Scanners emit weighted, categorised signals. The generator groups them by
//! category to build the final L1/L2 rule output. Deduplication is on the
//! `(category, text)` pair — the higher weight wins.

use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Category {
    Arch,
    Naming,
    Testing,
    Forbidden,
    /// L2 procedural rules — currently emitted only by the generator into
    /// skill files, but reserved here so scanners can emit them directly.
    #[allow(dead_code)]
    Workflow,
    Convention,
}

impl Category {
    pub fn header(&self) -> &'static str {
        match self {
            Category::Arch => "Architecture",
            Category::Naming => "Naming",
            Category::Testing => "Testing",
            Category::Forbidden => "Forbidden",
            Category::Workflow => "Workflow",
            Category::Convention => "Conventions",
        }
    }
}

#[derive(Debug, Clone)]
pub struct Signal {
    pub category: Category,
    pub text: String,
    pub weight: f32,
    pub source: &'static str,
}

impl Signal {
    pub fn new(
        category: Category,
        text: impl Into<String>,
        weight: f32,
        source: &'static str,
    ) -> Self {
        Self {
            category,
            text: text.into(),
            weight,
            source,
        }
    }
}

/// Group signals by category, deduplicating on `text` (keeping max weight) and
/// sorting each bucket by descending weight then text.
pub fn group_and_dedupe(signals: Vec<Signal>) -> HashMap<Category, Vec<Signal>> {
    let mut by_key: HashMap<(Category, String), Signal> = HashMap::new();
    for s in signals {
        let key = (s.category, s.text.clone());
        by_key
            .entry(key)
            .and_modify(|existing| {
                if s.weight > existing.weight {
                    existing.weight = s.weight;
                    existing.source = s.source;
                }
            })
            .or_insert(s);
    }

    let mut out: HashMap<Category, Vec<Signal>> = HashMap::new();
    for ((cat, _), sig) in by_key {
        out.entry(cat).or_default().push(sig);
    }
    for bucket in out.values_mut() {
        bucket.sort_by(|a, b| {
            b.weight
                .partial_cmp(&a.weight)
                .unwrap_or(std::cmp::Ordering::Equal)
                .then_with(|| a.text.cmp(&b.text))
        });
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupes_keeps_highest_weight() {
        let signals = vec![
            Signal::new(Category::Arch, "rule a", 0.5, "src1"),
            Signal::new(Category::Arch, "rule a", 0.9, "src2"),
            Signal::new(Category::Arch, "rule b", 0.3, "src3"),
        ];
        let grouped = group_and_dedupe(signals);
        let arch = grouped.get(&Category::Arch).expect("arch bucket");
        assert_eq!(arch.len(), 2);
        assert_eq!(arch[0].text, "rule a");
        assert!((arch[0].weight - 0.9).abs() < f32::EPSILON);
        assert_eq!(arch[0].source, "src2");
    }

    #[test]
    fn empty_input_yields_empty_output() {
        let grouped = group_and_dedupe(vec![]);
        assert!(grouped.is_empty());
    }
}
