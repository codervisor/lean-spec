use crate::commands::init::ai_tools::{home_dir, AiTool, DetectionResult};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum SkillTool {
    Copilot,
    Claude,
    Cursor,
    Codex,
    Gemini,
    Windsurf,
    VsCode,
    Generic,
}

impl SkillTool {
    pub fn project_dir(&self, root: &Path) -> PathBuf {
        match self {
            SkillTool::Copilot => root.join(".github/skills"),
            SkillTool::Claude => root.join(".claude/skills"),
            SkillTool::Cursor => root.join(".cursor/skills"),
            SkillTool::Codex => root.join(".codex/skills"),
            SkillTool::Gemini => root.join(".gemini/skills"),
            SkillTool::Windsurf => root.join(".windsurf/skills"),
            SkillTool::VsCode => root.join(".vscode/skills"),
            SkillTool::Generic => root.join(".skills"),
        }
    }

    pub fn user_dir(&self, home: &Path) -> PathBuf {
        match self {
            SkillTool::Copilot => home.join(".copilot/skills"),
            SkillTool::Claude => home.join(".claude/skills"),
            SkillTool::Cursor => home.join(".cursor/skills"),
            SkillTool::Codex => home.join(".codex/skills"),
            SkillTool::Gemini => home.join(".gemini/skills"),
            SkillTool::Windsurf => home.join(".windsurf/skills"),
            SkillTool::VsCode => home.join(".vscode/skills"),
            SkillTool::Generic => home.join(".skills"),
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Hash)]
pub enum SkillScope {
    Project,
    User,
}

#[derive(Clone, Debug)]
pub struct SkillTarget {
    pub tool: SkillTool,
    pub scope: SkillScope,
    pub path: PathBuf,
    pub recommended: bool,
    pub exists: bool,
}

#[derive(Default, Clone, Debug)]
pub struct SkillFlags {
    pub skip: bool,
    pub enable: bool,
    pub include_user: bool,
    pub explicit: HashSet<(SkillTool, SkillScope)>,
}

#[derive(Clone, Debug)]
pub struct SkillInstallResult {
    pub path: PathBuf,
    pub created: bool,
    pub skipped: bool,
    pub error: Option<String>,
}

const SKILL_FILES: &[(&str, &str)] = &[
    (
        "SKILL.md",
        include_str!("../../../../../skills/leanspec-sdd/SKILL.md"),
    ),
    (
        "references/BEST-PRACTICES.md",
        include_str!("../../../../../skills/leanspec-sdd/references/BEST-PRACTICES.md"),
    ),
    (
        "references/COMMANDS.md",
        include_str!("../../../../../skills/leanspec-sdd/references/COMMANDS.md"),
    ),
    (
        "references/EXAMPLES.md",
        include_str!("../../../../../skills/leanspec-sdd/references/EXAMPLES.md"),
    ),
    (
        "references/WORKFLOW.md",
        include_str!("../../../../../skills/leanspec-sdd/references/WORKFLOW.md"),
    ),
    (
        "references/WORKFLOWS.md",
        include_str!("../../../../../skills/leanspec-sdd/references/WORKFLOWS.md"),
    ),
    (
        "scripts/validate-spec.sh",
        include_str!("../../../../../skills/leanspec-sdd/scripts/validate-spec.sh"),
    ),
];

pub fn build_skill_flags_from_cli(
    skill: bool,
    no_skill: bool,
    skill_user: bool,
    tool_flags: &[(SkillTool, bool)],
) -> SkillFlags {
    let mut explicit = HashSet::new();
    for (tool, enabled) in tool_flags.iter().copied() {
        if enabled {
            explicit.insert((tool, SkillScope::Project));
        }
    }

    SkillFlags {
        skip: no_skill,
        enable: skill || !explicit.is_empty(),
        include_user: skill_user,
        explicit,
    }
}

pub fn discover_targets(
    root: &Path,
    home_override: Option<&Path>,
    detections: &[DetectionResult],
) -> Vec<SkillTarget> {
    let mut targets: Vec<SkillTarget> = Vec::new();
    let home = home_dir(home_override);

    // Recommended targets from detected tools
    for detection in detections.iter().filter(|d| d.detected) {
        let skill_tool = match detection.tool {
            AiTool::Copilot => SkillTool::Copilot,
            AiTool::Claude => SkillTool::Claude,
            AiTool::Cursor => SkillTool::Cursor,
            AiTool::Codex => SkillTool::Codex,
            AiTool::Gemini => SkillTool::Gemini,
            AiTool::Windsurf => SkillTool::Windsurf,
            AiTool::Aider => SkillTool::Generic,
            AiTool::Droid => SkillTool::Generic,
        };

        let project_path = skill_tool.project_dir(root);
        push_unique_target(
            &mut targets,
            SkillTarget {
                tool: skill_tool,
                scope: SkillScope::Project,
                path: project_path.clone(),
                recommended: true,
                exists: project_path.exists(),
            },
        );

        if let Some(home_dir) = home.as_ref() {
            let user_path = skill_tool.user_dir(home_dir);
            push_unique_target(
                &mut targets,
                SkillTarget {
                    tool: skill_tool,
                    scope: SkillScope::User,
                    path: user_path.clone(),
                    recommended: true,
                    exists: user_path.exists(),
                },
            );
        }
    }

    // Existing known directories even if not detected
    add_known_directories(root, home.as_deref(), &mut targets);

    // Fallback project target
    if !targets.iter().any(|t| t.scope == SkillScope::Project) {
        let fallback = SkillTool::Copilot.project_dir(root);
        targets.push(SkillTarget {
            tool: SkillTool::Copilot,
            scope: SkillScope::Project,
            path: fallback.clone(),
            recommended: true,
            exists: fallback.exists(),
        });
    }

    targets
}

fn add_known_directories(root: &Path, home: Option<&Path>, targets: &mut Vec<SkillTarget>) {
    let known_project = [
        SkillTool::Copilot,
        SkillTool::Claude,
        SkillTool::Cursor,
        SkillTool::Codex,
        SkillTool::Gemini,
        SkillTool::Windsurf,
        SkillTool::VsCode,
        SkillTool::Generic,
    ];

    for tool in known_project {
        let path = tool.project_dir(root);
        if path.exists() {
            push_unique_target(
                targets,
                SkillTarget {
                    tool,
                    scope: SkillScope::Project,
                    path: path.clone(),
                    recommended: false,
                    exists: true,
                },
            );
        }
    }

    if let Some(home_dir) = home {
        let known_user = [
            SkillTool::Copilot,
            SkillTool::Claude,
            SkillTool::Cursor,
            SkillTool::Codex,
            SkillTool::Gemini,
            SkillTool::Windsurf,
            SkillTool::VsCode,
            SkillTool::Generic,
        ];

        for tool in known_user {
            let path = tool.user_dir(home_dir);
            if path.exists() {
                push_unique_target(
                    targets,
                    SkillTarget {
                        tool,
                        scope: SkillScope::User,
                        path: path.clone(),
                        recommended: false,
                        exists: true,
                    },
                );
            }
        }
    }
}

fn push_unique_target(targets: &mut Vec<SkillTarget>, candidate: SkillTarget) {
    if targets
        .iter()
        .any(|existing| existing.path == candidate.path && existing.scope == candidate.scope)
    {
        return;
    }
    targets.push(candidate);
}

pub fn default_selection(
    flags: &SkillFlags,
    candidates: &[SkillTarget],
    root: &Path,
    home_override: Option<&Path>,
) -> Vec<SkillTarget> {
    let mut selected: Vec<SkillTarget> = Vec::new();
    let mut seen_paths: HashSet<PathBuf> = HashSet::new();

    // Explicit flags take priority
    for (tool, scope) in &flags.explicit {
        if let Some(target) = candidates
            .iter()
            .find(|c| c.tool == *tool && c.scope == *scope)
        {
            if seen_paths.insert(target.path.clone()) {
                selected.push(target.clone());
            }
        } else {
            // Add synthetic target if it was not discovered
            let path = match scope {
                SkillScope::Project => tool.project_dir(root),
                SkillScope::User => {
                    tool.user_dir(home_dir(home_override).as_deref().unwrap_or(root))
                }
            };
            if seen_paths.insert(path.clone()) {
                selected.push(SkillTarget {
                    tool: *tool,
                    scope: *scope,
                    path,
                    recommended: true,
                    exists: false,
                });
            }
        }
    }

    if flags.enable && selected.is_empty() {
        for target in candidates
            .iter()
            .filter(|t| t.scope == SkillScope::Project && t.recommended)
        {
            if seen_paths.insert(target.path.clone()) {
                selected.push(target.clone());
            }
        }
    }

    if flags.include_user {
        for target in candidates
            .iter()
            .filter(|t| t.scope == SkillScope::User && t.recommended)
        {
            if seen_paths.insert(target.path.clone()) {
                selected.push(target.clone());
            }
        }
    }

    if selected.is_empty() {
        if let Some(first) = candidates.first() {
            selected.push(first.clone());
        }
    }

    selected
}

pub fn install_skill(targets: &[SkillTarget]) -> Vec<SkillInstallResult> {
    let mut results = Vec::new();

    for target in targets {
        let skill_dir = target.path.join("leanspec-sdd");
        if skill_dir.exists() {
            results.push(SkillInstallResult {
                path: skill_dir,
                created: false,
                skipped: true,
                error: None,
            });
            continue;
        }

        if let Some(parent) = skill_dir.parent() {
            if let Err(err) = fs::create_dir_all(parent) {
                results.push(SkillInstallResult {
                    path: skill_dir,
                    created: false,
                    skipped: false,
                    error: Some(err.to_string()),
                });
                continue;
            }
        }

        let mut write_error = None;
        for (relative, contents) in SKILL_FILES {
            let target_path = skill_dir.join(relative);
            if let Some(parent) = target_path.parent() {
                if let Err(err) = fs::create_dir_all(parent) {
                    write_error = Some(err.to_string());
                    break;
                }
            }

            if let Err(err) = fs::write(&target_path, contents) {
                write_error = Some(err.to_string());
                break;
            }
        }

        if let Some(err) = write_error {
            results.push(SkillInstallResult {
                path: skill_dir,
                created: false,
                skipped: false,
                error: Some(err),
            });
        } else {
            results.push(SkillInstallResult {
                path: skill_dir,
                created: true,
                skipped: false,
                error: None,
            });
        }
    }

    results
}
