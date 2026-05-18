use regex::Regex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MatchMode {
    Unique,
    All,
    First,
}

#[derive(Debug, Clone)]
pub struct Replacement {
    pub old_string: String,
    pub new_string: String,
    pub match_mode: MatchMode,
}

#[derive(Debug, Clone)]
pub struct ReplacementResult {
    pub old_string: String,
    pub new_string: String,
    pub lines: Vec<usize>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SectionMode {
    Replace,
    Append,
    Prepend,
}

#[derive(Debug, Clone)]
pub struct SectionUpdate {
    pub section: String,
    pub content: String,
    pub mode: SectionMode,
}

#[derive(Debug, Clone)]
pub struct ChecklistToggle {
    pub item_text: String,
    pub checked: bool,
}

#[derive(Debug, Clone)]
pub struct ChecklistToggleResult {
    pub item_text: String,
    pub checked: bool,
    pub line: usize,
    pub line_text: String,
}

pub fn split_frontmatter(content: &str) -> (Option<String>, String) {
    let re = Regex::new(r"(?s)^---\s*\n(.*?)\n---\s*\n?").unwrap();
    if let Some(caps) = re.captures(content) {
        let full = caps.get(0).map(|m| m.as_str()).unwrap_or("");
        let frontmatter = full.trim_end().to_string();
        let body = content[full.len()..].to_string();
        (Some(frontmatter), body)
    } else {
        (None, content.to_string())
    }
}

pub fn rebuild_content(frontmatter: Option<String>, body: &str) -> String {
    if let Some(frontmatter) = frontmatter {
        let trimmed = body.trim_start_matches('\n');
        format!("{}\n{}", frontmatter, trimmed)
    } else {
        body.to_string()
    }
}

pub fn preserve_title_heading(original_body: &str, new_body: &str) -> String {
    let Some(existing_title) = extract_title_line(original_body) else {
        return new_body.to_string();
    };

    let new_title = extract_title_line(new_body);
    if let Some(new_title) = new_title {
        if new_title.trim() == existing_title.trim() {
            return new_body.to_string();
        }
    }

    let stripped = strip_leading_h1(new_body);
    let trimmed = stripped.trim_start_matches('\n');
    if trimmed.is_empty() {
        format!("{}\n", existing_title.trim_end())
    } else {
        format!("{}\n\n{}", existing_title.trim_end(), trimmed)
    }
}

pub fn apply_replacements(
    body: &str,
    replacements: &[Replacement],
) -> Result<(String, Vec<ReplacementResult>), String> {
    let mut current = body.to_string();
    let mut results = Vec::new();

    for replacement in replacements {
        if replacement.old_string.is_empty() {
            return Err("oldString cannot be empty".to_string());
        }

        let matches = find_matches(&current, &replacement.old_string);
        if matches.is_empty() {
            return Err(
                "Found 0 matches for oldString. Check for typos or whitespace.".to_string(),
            );
        }

        let lines: Vec<usize> = matches.iter().map(|m| m.line).collect();

        match replacement.match_mode {
            MatchMode::Unique => {
                if matches.len() != 1 {
                    return Err(format!(
                        "Found {} matches for oldString at lines: {}. Add more context to disambiguate.",
                        matches.len(),
                        format_line_list(&lines)
                    ));
                }
                current = replace_first(
                    &current,
                    matches[0].start,
                    &replacement.old_string,
                    &replacement.new_string,
                );
            }
            MatchMode::First => {
                current = replace_first(
                    &current,
                    matches[0].start,
                    &replacement.old_string,
                    &replacement.new_string,
                );
            }
            MatchMode::All => {
                current = current.replace(&replacement.old_string, &replacement.new_string);
            }
        }

        results.push(ReplacementResult {
            old_string: replacement.old_string.clone(),
            new_string: replacement.new_string.clone(),
            lines,
        });
    }

    Ok((current, results))
}

pub fn apply_section_updates(body: &str, updates: &[SectionUpdate]) -> Result<String, String> {
    let mut current = body.to_string();
    for update in updates {
        current = update_section(&current, &update.section, &update.content, update.mode)?;
    }
    Ok(current)
}

pub fn apply_checklist_toggles(
    body: &str,
    toggles: &[ChecklistToggle],
) -> Result<(String, Vec<ChecklistToggleResult>), String> {
    let mut lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    let mut results = Vec::new();
    let checkbox_re = Regex::new(r"- \[[ xX]\]").map_err(|e| e.to_string())?;

    let inline_md_re = Regex::new(r"`([^`]*)`|\*\*([^*]*)\*\*|\*([^*]*)\*|_([^_]*)_")
        .map_err(|e| e.to_string())?;

    for toggle in toggles {
        let target = toggle.item_text.trim().to_lowercase();
        let index = lines
            .iter()
            .position(|line| {
                let normalized = line.trim().to_lowercase();
                (normalized.starts_with("- [ ]")
                    || normalized.starts_with("- [x]")
                    || normalized.starts_with("- [X]"))
                    && {
                        // Try exact match first, then match with inline markdown stripped
                        normalized.contains(&target) || {
                            let stripped = inline_md_re.replace_all(&normalized, "$1$2$3$4");
                            stripped.contains(&target)
                        }
                    }
            })
            .ok_or_else(|| format!("Checklist item not found: {}", toggle.item_text))?;

        let line = lines[index].clone();
        let updated = checkbox_re.replace(&line, if toggle.checked { "- [x]" } else { "- [ ]" });
        lines[index] = updated.to_string();

        results.push(ChecklistToggleResult {
            item_text: toggle.item_text.clone(),
            checked: toggle.checked,
            line: index + 1,
            line_text: lines[index].clone(),
        });
    }

    Ok((lines.join("\n"), results))
}

fn extract_title_line(body: &str) -> Option<String> {
    for line in body.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.starts_with("# ") {
            return Some(line.to_string());
        }

        return None;
    }

    None
}

fn strip_leading_h1(body: &str) -> String {
    let mut lines: Vec<&str> = body.lines().collect();
    let mut first_non_empty = None;
    for (index, line) in lines.iter().enumerate() {
        if !line.trim().is_empty() {
            first_non_empty = Some(index);
            break;
        }
    }

    if let Some(index) = first_non_empty {
        if lines[index].trim().starts_with("# ") {
            lines.remove(index);
            if index < lines.len() && lines[index].trim().is_empty() {
                lines.remove(index);
            }
        }
    }

    lines.join("\n")
}

fn update_section(
    body: &str,
    section: &str,
    new_content: &str,
    mode: SectionMode,
) -> Result<String, String> {
    let mut lines: Vec<String> = body.lines().map(|l| l.to_string()).collect();
    let target = section.trim().to_lowercase();
    let mut start: Option<usize> = None;
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        if let Some(stripped) = trimmed.strip_prefix("## ") {
            let title = stripped.trim().to_lowercase();
            if title == target {
                start = Some(i + 1);
                break;
            }
        }
    }

    let start = start.ok_or_else(|| format!("Section not found: {}", section))?;
    let mut end = lines.len();
    for (i, line) in lines.iter().enumerate().skip(start) {
        if line.trim().starts_with("## ") {
            end = i;
            break;
        }
    }

    let mut updated_lines: Vec<String> = if new_content.trim().is_empty() {
        Vec::new()
    } else {
        new_content.trim().lines().map(|l| l.to_string()).collect()
    };

    match mode {
        SectionMode::Append => {
            if updated_lines.is_empty() {
                return Ok(lines.join("\n"));
            }
            lines.splice(
                end..end,
                std::iter::once(String::new())
                    .chain(updated_lines.drain(..))
                    .chain(std::iter::once(String::new())),
            );
        }
        SectionMode::Prepend => {
            if updated_lines.is_empty() {
                return Ok(lines.join("\n"));
            }
            lines.splice(
                start..start,
                std::iter::once(String::new())
                    .chain(updated_lines.drain(..))
                    .chain(std::iter::once(String::new())),
            );
        }
        SectionMode::Replace => {
            let mut insert = vec![String::new()];
            insert.append(&mut updated_lines);
            insert.push(String::new());
            lines.splice(start..end, insert);
        }
    }

    Ok(lines.join("\n"))
}

struct MatchInfo {
    start: usize,
    line: usize,
}

fn find_matches(body: &str, needle: &str) -> Vec<MatchInfo> {
    body.match_indices(needle)
        .map(|(start, _)| MatchInfo {
            start,
            line: line_number_at(body, start),
        })
        .collect()
}

fn line_number_at(body: &str, index: usize) -> usize {
    body[..index].bytes().filter(|b| *b == b'\n').count() + 1
}

fn replace_first(content: &str, start: usize, old: &str, new: &str) -> String {
    let mut updated = String::with_capacity(content.len() - old.len() + new.len());
    updated.push_str(&content[..start]);
    updated.push_str(new);
    updated.push_str(&content[start + old.len()..]);
    updated
}

fn format_line_list(lines: &[usize]) -> String {
    lines
        .iter()
        .map(|line| line.to_string())
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── split_frontmatter / rebuild_content ──────────────────────────

    #[test]
    fn test_split_frontmatter_with_frontmatter() {
        let content = "---\nstatus: planned\n---\n# Title\n\nBody text.\n";
        let (fm, body) = split_frontmatter(content);
        assert!(fm.is_some());
        assert!(fm.unwrap().contains("status: planned"));
        assert!(body.contains("# Title"));
        assert!(body.contains("Body text."));
    }

    #[test]
    fn test_split_frontmatter_without_frontmatter() {
        let content = "# Title\n\nBody text.\n";
        let (fm, body) = split_frontmatter(content);
        assert!(fm.is_none());
        assert_eq!(body, content);
    }

    #[test]
    fn test_rebuild_content_with_frontmatter() {
        let fm = Some("---\nstatus: planned\n---".to_string());
        let body = "\n# Title\n\nBody.\n";
        let result = rebuild_content(fm, body);
        assert!(result.starts_with("---\nstatus: planned\n---\n"));
        assert!(result.contains("# Title"));
    }

    #[test]
    fn test_rebuild_content_without_frontmatter() {
        let body = "# Title\n\nBody.\n";
        let result = rebuild_content(None, body);
        assert_eq!(result, body);
    }

    // ── apply_replacements ───────────────────────────────────────────

    #[test]
    fn test_replacement_unique_mode_single_match() {
        let body = "Hello world.\nGoodbye world.\n";
        let replacements = vec![Replacement {
            old_string: "Hello world.".to_string(),
            new_string: "Hi world.".to_string(),
            match_mode: MatchMode::Unique,
        }];
        let (result, infos) = apply_replacements(body, &replacements).unwrap();
        assert_eq!(result, "Hi world.\nGoodbye world.\n");
        assert_eq!(infos.len(), 1);
        assert_eq!(infos[0].lines, vec![1]);
    }

    #[test]
    fn test_replacement_unique_mode_multiple_matches_errors() {
        let body = "foo bar\nfoo baz\n";
        let replacements = vec![Replacement {
            old_string: "foo".to_string(),
            new_string: "qux".to_string(),
            match_mode: MatchMode::Unique,
        }];
        let err = apply_replacements(body, &replacements).unwrap_err();
        assert!(err.contains("Found 2 matches"));
    }

    #[test]
    fn test_replacement_first_mode() {
        let body = "foo bar\nfoo baz\n";
        let replacements = vec![Replacement {
            old_string: "foo".to_string(),
            new_string: "qux".to_string(),
            match_mode: MatchMode::First,
        }];
        let (result, _) = apply_replacements(body, &replacements).unwrap();
        assert_eq!(result, "qux bar\nfoo baz\n");
    }

    #[test]
    fn test_replacement_all_mode() {
        let body = "foo bar\nfoo baz\n";
        let replacements = vec![Replacement {
            old_string: "foo".to_string(),
            new_string: "qux".to_string(),
            match_mode: MatchMode::All,
        }];
        let (result, infos) = apply_replacements(body, &replacements).unwrap();
        assert_eq!(result, "qux bar\nqux baz\n");
        assert_eq!(infos[0].lines, vec![1, 2]);
    }

    #[test]
    fn test_replacement_empty_old_string_errors() {
        let body = "Hello.";
        let replacements = vec![Replacement {
            old_string: "".to_string(),
            new_string: "x".to_string(),
            match_mode: MatchMode::Unique,
        }];
        let err = apply_replacements(body, &replacements).unwrap_err();
        assert!(err.contains("cannot be empty"));
    }

    #[test]
    fn test_replacement_not_found_errors() {
        let body = "Hello world.";
        let replacements = vec![Replacement {
            old_string: "Goodbye".to_string(),
            new_string: "x".to_string(),
            match_mode: MatchMode::Unique,
        }];
        let err = apply_replacements(body, &replacements).unwrap_err();
        assert!(err.contains("Found 0 matches"));
    }

    #[test]
    fn test_multiple_replacements_sequential() {
        let body = "Alpha\nBeta\nGamma\n";
        let replacements = vec![
            Replacement {
                old_string: "Alpha".to_string(),
                new_string: "One".to_string(),
                match_mode: MatchMode::Unique,
            },
            Replacement {
                old_string: "Beta".to_string(),
                new_string: "Two".to_string(),
                match_mode: MatchMode::Unique,
            },
        ];
        let (result, infos) = apply_replacements(body, &replacements).unwrap();
        assert_eq!(result, "One\nTwo\nGamma\n");
        assert_eq!(infos.len(), 2);
    }

    // ── apply_section_updates ────────────────────────────────────────

    fn sample_body_with_sections() -> String {
        "# Title\n\n## Overview\n\nOriginal overview.\n\n## Design\n\nOriginal design.\n\n## Notes\n\nSome notes.\n".to_string()
    }

    #[test]
    fn test_section_replace() {
        let body = sample_body_with_sections();
        let updates = vec![SectionUpdate {
            section: "Overview".to_string(),
            content: "New overview content.".to_string(),
            mode: SectionMode::Replace,
        }];
        let result = apply_section_updates(&body, &updates).unwrap();
        assert!(result.contains("New overview content."));
        assert!(!result.contains("Original overview."));
        assert!(result.contains("Original design."));
    }

    #[test]
    fn test_section_append() {
        let body = sample_body_with_sections();
        let updates = vec![SectionUpdate {
            section: "Overview".to_string(),
            content: "Appended text.".to_string(),
            mode: SectionMode::Append,
        }];
        let result = apply_section_updates(&body, &updates).unwrap();
        assert!(result.contains("Original overview."));
        assert!(result.contains("Appended text."));
        // The appended text should come after the original
        let orig_pos = result.find("Original overview.").unwrap();
        let append_pos = result.find("Appended text.").unwrap();
        assert!(append_pos > orig_pos);
    }

    #[test]
    fn test_section_prepend() {
        let body = sample_body_with_sections();
        let updates = vec![SectionUpdate {
            section: "Overview".to_string(),
            content: "Prepended text.".to_string(),
            mode: SectionMode::Prepend,
        }];
        let result = apply_section_updates(&body, &updates).unwrap();
        assert!(result.contains("Original overview."));
        assert!(result.contains("Prepended text."));
        let prepend_pos = result.find("Prepended text.").unwrap();
        let orig_pos = result.find("Original overview.").unwrap();
        assert!(prepend_pos < orig_pos);
    }

    #[test]
    fn test_section_not_found_errors() {
        let body = sample_body_with_sections();
        let updates = vec![SectionUpdate {
            section: "NonExistent".to_string(),
            content: "Content.".to_string(),
            mode: SectionMode::Replace,
        }];
        let err = apply_section_updates(&body, &updates).unwrap_err();
        assert!(err.contains("Section not found"));
    }

    #[test]
    fn test_section_replace_last_section() {
        let body = sample_body_with_sections();
        let updates = vec![SectionUpdate {
            section: "Notes".to_string(),
            content: "New notes.".to_string(),
            mode: SectionMode::Replace,
        }];
        let result = apply_section_updates(&body, &updates).unwrap();
        assert!(result.contains("New notes."));
        assert!(!result.contains("Some notes."));
    }

    #[test]
    fn test_multiple_section_updates() {
        let body = sample_body_with_sections();
        let updates = vec![
            SectionUpdate {
                section: "Overview".to_string(),
                content: "Updated overview.".to_string(),
                mode: SectionMode::Replace,
            },
            SectionUpdate {
                section: "Notes".to_string(),
                content: "Extra note.".to_string(),
                mode: SectionMode::Append,
            },
        ];
        let result = apply_section_updates(&body, &updates).unwrap();
        assert!(result.contains("Updated overview."));
        assert!(result.contains("Some notes."));
        assert!(result.contains("Extra note."));
    }

    // ── apply_checklist_toggles ──────────────────────────────────────

    #[test]
    fn test_checklist_toggle_check() {
        let body = "## Plan\n\n- [ ] Task A\n- [ ] Task B\n";
        let toggles = vec![ChecklistToggle {
            item_text: "Task A".to_string(),
            checked: true,
        }];
        let (result, infos) = apply_checklist_toggles(body, &toggles).unwrap();
        assert!(result.contains("- [x] Task A"));
        assert!(result.contains("- [ ] Task B"));
        assert_eq!(infos.len(), 1);
        assert!(infos[0].checked);
    }

    #[test]
    fn test_checklist_toggle_uncheck() {
        let body = "## Plan\n\n- [x] Task A\n- [ ] Task B\n";
        let toggles = vec![ChecklistToggle {
            item_text: "Task A".to_string(),
            checked: false,
        }];
        let (result, _) = apply_checklist_toggles(body, &toggles).unwrap();
        assert!(result.contains("- [ ] Task A"));
    }

    #[test]
    fn test_checklist_toggle_not_found_errors() {
        let body = "## Plan\n\n- [ ] Task A\n";
        let toggles = vec![ChecklistToggle {
            item_text: "NonExistent".to_string(),
            checked: true,
        }];
        let err = apply_checklist_toggles(body, &toggles).unwrap_err();
        assert!(err.contains("Checklist item not found"));
    }

    #[test]
    fn test_checklist_toggle_with_inline_markdown() {
        let body = "- [ ] **Bold task**\n- [ ] `code task`\n";
        let toggles = vec![ChecklistToggle {
            item_text: "Bold task".to_string(),
            checked: true,
        }];
        let (result, _) = apply_checklist_toggles(body, &toggles).unwrap();
        assert!(result.contains("- [x] **Bold task**"));
    }

    #[test]
    fn test_checklist_toggle_multiple() {
        let body = "- [ ] Task A\n- [ ] Task B\n- [ ] Task C\n";
        let toggles = vec![
            ChecklistToggle {
                item_text: "Task A".to_string(),
                checked: true,
            },
            ChecklistToggle {
                item_text: "Task C".to_string(),
                checked: true,
            },
        ];
        let (result, infos) = apply_checklist_toggles(body, &toggles).unwrap();
        assert!(result.contains("- [x] Task A"));
        assert!(result.contains("- [ ] Task B"));
        assert!(result.contains("- [x] Task C"));
        assert_eq!(infos.len(), 2);
    }

    #[test]
    fn test_checklist_case_insensitive_match() {
        let body = "- [ ] Build the Widget\n";
        let toggles = vec![ChecklistToggle {
            item_text: "build the widget".to_string(),
            checked: true,
        }];
        let (result, _) = apply_checklist_toggles(body, &toggles).unwrap();
        assert!(result.contains("- [x] Build the Widget"));
    }

    // ── preserve_title_heading ───────────────────────────────────────

    #[test]
    fn test_preserve_title_when_new_body_lacks_title() {
        let original = "# My Spec\n\n## Overview\n\nOld content.\n";
        let new_body = "## Overview\n\nNew content.\n";
        let result = preserve_title_heading(original, new_body);
        assert!(result.contains("# My Spec"));
        assert!(result.contains("New content."));
        // Title should appear exactly once
        assert_eq!(result.matches("# My Spec").count(), 1);
    }

    #[test]
    fn test_preserve_title_when_new_body_has_same_title() {
        let original = "# My Spec\n\n## Overview\n\nOld.\n";
        let new_body = "# My Spec\n\n## Overview\n\nNew.\n";
        let result = preserve_title_heading(original, new_body);
        assert_eq!(result, new_body);
    }

    #[test]
    fn test_preserve_title_when_original_has_no_title() {
        let original = "## Overview\n\nOld.\n";
        let new_body = "## Overview\n\nNew.\n";
        let result = preserve_title_heading(original, new_body);
        assert_eq!(result, new_body);
    }

    // ── helper functions ─────────────────────────────────────────────

    #[test]
    fn test_line_number_at() {
        let body = "line1\nline2\nline3\n";
        assert_eq!(line_number_at(body, 0), 1); // start of line1
        assert_eq!(line_number_at(body, 6), 2); // start of line2
        assert_eq!(line_number_at(body, 12), 3); // start of line3
    }

    #[test]
    fn test_find_matches() {
        let body = "foo bar\nfoo baz\nqux foo\n";
        let matches = find_matches(body, "foo");
        assert_eq!(matches.len(), 3);
        assert_eq!(matches[0].line, 1);
        assert_eq!(matches[1].line, 2);
        assert_eq!(matches[2].line, 3);
    }
}
