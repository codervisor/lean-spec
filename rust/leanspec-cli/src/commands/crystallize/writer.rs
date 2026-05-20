//! Materialise `GeneratedOutput` to disk. Supports `--dry-run`,
//! `--output stdout`, and `--update` (merge with existing manual content).

use std::error::Error;
use std::fs;
use std::path::{Path, PathBuf};

use crate::commands::crystallize::generator::{GeneratedOutput, SkillFile, BEGIN_MARK, END_MARK};

#[derive(Debug, Clone, Copy)]
pub enum WriteMode {
    /// Print everything to stdout, write nothing.
    DryRun,
    /// Print everything to stdout (same as dry-run for v1 — kept distinct so
    /// future versions can differentiate noise levels).
    Stdout,
    /// Replace the generated block in `AGENTS.md` (or create it) and overwrite
    /// each skill file.
    Write,
    /// Like `Write`, but preserve manual content outside the BEGIN/END markers
    /// in `AGENTS.md` and merge skill files (replace generated block only).
    Update,
}

pub struct WriteReport {
    pub agents_path: Option<PathBuf>,
    pub skill_paths: Vec<PathBuf>,
    pub dry_run: bool,
}

pub fn apply(
    root: &Path,
    output: &GeneratedOutput,
    mode: WriteMode,
    target_filename: &str,
) -> Result<WriteReport, Box<dyn Error>> {
    let agents_path = root.join(target_filename);
    let skills_dir = root.join(".claude").join("skills");

    match mode {
        WriteMode::DryRun | WriteMode::Stdout => {
            println!("--- {} ---", target_filename);
            println!("{}", output.agents_md);
            for sf in &output.skills {
                let rel = skill_rel_path(&sf.topic);
                println!("--- {} ---", rel.display());
                println!("{}", sf.content);
            }
            Ok(WriteReport {
                agents_path: None,
                skill_paths: Vec::new(),
                dry_run: true,
            })
        }
        WriteMode::Write => {
            fs::write(&agents_path, &output.agents_md)?;
            let skill_paths = write_skills(&skills_dir, &output.skills)?;
            Ok(WriteReport {
                agents_path: Some(agents_path),
                skill_paths,
                dry_run: false,
            })
        }
        WriteMode::Update => {
            let merged = merge_agents_md(&agents_path, &output.agents_md)?;
            fs::write(&agents_path, merged)?;
            let skill_paths = write_skills(&skills_dir, &output.skills)?;
            Ok(WriteReport {
                agents_path: Some(agents_path),
                skill_paths,
                dry_run: false,
            })
        }
    }
}

fn skill_rel_path(topic: &str) -> PathBuf {
    PathBuf::from(".claude/skills").join(format!("{topic}.md"))
}

fn write_skills(skills_dir: &Path, skills: &[SkillFile]) -> Result<Vec<PathBuf>, Box<dyn Error>> {
    fs::create_dir_all(skills_dir)?;
    let mut paths = Vec::new();
    for sf in skills {
        let path = skills_dir.join(format!("{}.md", sf.topic));
        fs::write(&path, &sf.content)?;
        paths.push(path);
    }
    Ok(paths)
}

/// Merge a freshly-rendered AGENTS.md block with the existing file's content.
///
/// Behaviour:
/// - If the file does not exist: write the generated block as-is.
/// - If the file contains BEGIN/END markers: replace what's between them.
/// - Otherwise: append the generated block to the existing content with a
///   blank-line separator.
pub fn merge_agents_md(path: &Path, fresh: &str) -> Result<String, Box<dyn Error>> {
    if !path.exists() {
        return Ok(fresh.to_string());
    }
    let existing = fs::read_to_string(path)?;

    if let (Some(begin), Some(end_after)) = (existing.find(BEGIN_MARK), existing.find(END_MARK)) {
        // end_after is the start of END_MARK; we want to splice it out.
        let end = end_after + END_MARK.len();
        // Drop optional trailing newline after the END marker so we don't
        // accumulate blank lines on every regeneration.
        let mut after = &existing[end..];
        if let Some(stripped) = after.strip_prefix('\n') {
            after = stripped;
        }
        let mut out = String::new();
        out.push_str(&existing[..begin]);
        out.push_str(fresh.trim_end_matches('\n'));
        out.push('\n');
        out.push_str(after);
        return Ok(out);
    }

    // No markers — append. Keep manual content on top, generated block below.
    let mut out = existing.trim_end().to_string();
    out.push_str("\n\n");
    out.push_str(fresh);
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn merge_preserves_manual_content_outside_markers() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("AGENTS.md");
        let existing = format!(
            "# Manual header\n\nKeep me forever.\n\n{}\nOLD GENERATED\n{}\n\n# Manual footer\nKeep me too.\n",
            BEGIN_MARK, END_MARK
        );
        fs::write(&path, &existing).unwrap();
        let fresh = format!("{}\nNEW GENERATED\n{}\n", BEGIN_MARK, END_MARK);
        let merged = merge_agents_md(&path, &fresh).unwrap();
        assert!(merged.contains("# Manual header"));
        assert!(merged.contains("Keep me forever."));
        assert!(merged.contains("# Manual footer"));
        assert!(merged.contains("Keep me too."));
        assert!(merged.contains("NEW GENERATED"));
        assert!(!merged.contains("OLD GENERATED"));
    }

    #[test]
    fn merge_appends_when_no_markers() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("AGENTS.md");
        fs::write(&path, "# Existing\n\nOriginal body.\n").unwrap();
        let fresh = format!("{}\nNEW\n{}\n", BEGIN_MARK, END_MARK);
        let merged = merge_agents_md(&path, &fresh).unwrap();
        assert!(merged.contains("Original body."));
        assert!(merged.contains("NEW"));
        // Manual portion is on top of the generated block.
        assert!(merged.find("Original body.").unwrap() < merged.find("NEW").unwrap());
    }

    #[test]
    fn merge_creates_file_when_absent() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("AGENTS.md");
        let fresh = format!("{}\nNEW\n{}\n", BEGIN_MARK, END_MARK);
        let merged = merge_agents_md(&path, &fresh).unwrap();
        assert_eq!(merged, fresh);
    }
}
