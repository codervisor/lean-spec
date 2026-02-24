use crate::SpecInfo;

use super::filters::matches_field;
use super::fuzzy::best_match_distance_in_text;
use super::query::{LogicalConnector, ParsedQuery, QueryTerm};

#[derive(Debug)]
struct SpecText {
    title: String,
    path: String,
    tags: Vec<String>,
    tags_text: String,
    content: String,
}

impl SpecText {
    fn from_spec(spec: &SpecInfo) -> Self {
        let tags: Vec<String> = spec
            .frontmatter
            .tags
            .iter()
            .map(|t| t.to_ascii_lowercase())
            .collect();

        Self {
            title: spec.title.to_ascii_lowercase(),
            path: spec.path.to_ascii_lowercase(),
            tags_text: tags.join(" "),
            tags,
            content: spec.content.to_ascii_lowercase(),
        }
    }
}

pub fn matches_query(spec: &SpecInfo, query: &ParsedQuery) -> bool {
    let text = SpecText::from_spec(spec);

    let mut acc = false;
    let mut current_group = false;

    for (index, clause) in query.clauses.iter().enumerate() {
        let mut matched = matches_term(spec, &text, &clause.term);
        if clause.negated {
            matched = !matched;
        }

        if index == 0 {
            current_group = matched;
            continue;
        }

        match clause.connector {
            LogicalConnector::And => current_group = current_group && matched,
            LogicalConnector::Or => {
                acc = acc || current_group;
                current_group = matched;
            }
        }
    }

    acc || current_group
}

pub fn score_spec(spec: &SpecInfo, query: &ParsedQuery) -> f64 {
    let text = SpecText::from_spec(spec);
    let mut score = 0.0;
    let mut text_term_count = 0usize;
    let mut title_term_count = 0usize;

    for clause in &query.clauses {
        if clause.negated {
            continue;
        }

        match &clause.term {
            QueryTerm::Word { value, fuzzy } => {
                if let Some(threshold) = fuzzy {
                    score += score_fuzzy(value, *threshold, &text);
                    text_term_count += 1;
                } else if text.title.contains(value)
                    || text.path.contains(value)
                    || text.tags.iter().any(|t| t.contains(value))
                    || text.content.contains(value)
                {
                    let term_score = score_plain_word(value, &text);
                    if text.title.contains(value) {
                        title_term_count += 1;
                    }
                    score += term_score;
                    text_term_count += 1;
                }
            }
            QueryTerm::Phrase { value } => {
                if matches_phrase(value, &text) {
                    score += score_phrase(value, &text);
                    text_term_count += 1;
                    if text.title.contains(value) {
                        title_term_count += 1;
                    }
                }
            }
            QueryTerm::Field { field, value } => {
                if matches_field(spec, *field, value) {
                    score += 2.0;
                }
            }
        }
    }

    if title_term_count > 1 {
        score += (title_term_count as f64) * 2.0;
    }

    if text_term_count == 0 {
        1.0f64.max(score)
    } else {
        score
    }
}

fn matches_term(spec: &SpecInfo, text: &SpecText, term: &QueryTerm) -> bool {
    match term {
        QueryTerm::Word { value, fuzzy } => {
            if let Some(threshold) = fuzzy {
                matches_fuzzy(value, *threshold, text)
            } else {
                text.title.contains(value)
                    || text.path.contains(value)
                    || text.tags.iter().any(|tag| tag.contains(value))
                    || text.content.contains(value)
            }
        }
        QueryTerm::Phrase { value } => matches_phrase(value, text),
        QueryTerm::Field { field, value } => matches_field(spec, *field, value),
    }
}

fn matches_phrase(value: &str, text: &SpecText) -> bool {
    text.title.contains(value)
        || text.path.contains(value)
        || text.tags_text.contains(value)
        || text.content.contains(value)
}

fn matches_fuzzy(value: &str, threshold: usize, text: &SpecText) -> bool {
    if text.title.contains(value)
        || text.path.contains(value)
        || text.tags.iter().any(|t| t.contains(value))
        || text.content.contains(value)
    {
        return true;
    }

    best_match_distance_in_text(&text.title, value)
        .map(|d| d <= threshold)
        .unwrap_or(false)
        || best_match_distance_in_text(&text.path, value)
            .map(|d| d <= threshold)
            .unwrap_or(false)
        || best_match_distance_in_text(&text.tags_text, value)
            .map(|d| d <= threshold)
            .unwrap_or(false)
        || best_match_distance_in_text(&text.content, value)
            .map(|d| d <= threshold)
            .unwrap_or(false)
}

fn score_plain_word(value: &str, text: &SpecText) -> f64 {
    let mut score = 0.0;

    if text.title.contains(value) {
        score += 10.0;
        if text.title.split_whitespace().any(|w| w == value) {
            score += 5.0;
        }
    }

    if text.path.contains(value) {
        score += 8.0;
    }

    if text.tags.iter().any(|t| t.contains(value)) {
        score += 6.0;
        if text.tags.iter().any(|t| t == value) {
            score += 3.0;
        }
    }

    let content_matches = text.content.matches(value).count();
    if content_matches > 0 {
        score += (content_matches as f64).min(5.0);
    }

    score
}

fn score_phrase(value: &str, text: &SpecText) -> f64 {
    let mut score = 0.0;

    if text.title.contains(value) {
        score += 14.0;
    }
    if text.path.contains(value) {
        score += 10.0;
    }
    if text.tags_text.contains(value) {
        score += 8.0;
    }

    let content_matches = text.content.matches(value).count();
    if content_matches > 0 {
        score += ((content_matches as f64) * 2.0).min(8.0);
    }

    score
}

fn score_fuzzy(value: &str, threshold: usize, text: &SpecText) -> f64 {
    let mut score = 0.0;

    if let Some(distance) = best_match_distance_in_text(&text.title, value) {
        if distance <= threshold {
            score += 8.0 - distance as f64;
        }
    }
    if let Some(distance) = best_match_distance_in_text(&text.path, value) {
        if distance <= threshold {
            score += 6.0 - distance as f64;
        }
    }
    if let Some(distance) = best_match_distance_in_text(&text.tags_text, value) {
        if distance <= threshold {
            score += 4.0 - distance as f64;
        }
    }
    if let Some(distance) = best_match_distance_in_text(&text.content, value) {
        if distance <= threshold {
            score += 2.0 - (distance as f64 * 0.5);
        }
    }

    score.max(0.0)
}
