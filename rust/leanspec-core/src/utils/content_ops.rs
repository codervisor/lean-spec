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

    for toggle in toggles {
        let target = toggle.item_text.trim().to_lowercase();
        let index = lines
            .iter()
            .position(|line| {
                let normalized = line.trim().to_lowercase();
                (normalized.starts_with("- [ ]")
                    || normalized.starts_with("- [x]")
                    || normalized.starts_with("- [X]"))
                    && normalized.contains(&target)
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
