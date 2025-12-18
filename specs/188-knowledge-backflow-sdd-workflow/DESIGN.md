# Knowledge Backflow - Technical Design

## Three-Tier Architecture

### Tier 1: Workflow Integration (Phase 1 - v0.5.0)

**Goal**: Make spec updates a natural part of the SDD workflow.

**Enhanced Workflow**:

```bash
# Current workflow (one-way):
lean-spec create feature-x
# ... implement ...
lean-spec update feature-x --status complete  # Done!

# Enhanced workflow (with backflow):
lean-spec create feature-x
lean-spec update feature-x --status in-progress
# ... implement ...
# ... document learnings in spec ...
lean-spec validate feature-x --check-reality  # NEW: Catches outdated content
lean-spec update feature-x --status complete  # Checks spec freshness
```

#### 1.1 Completion Verification Enhancement

Extends **spec 174** (completion-status-verification-hook) to include spec freshness check:

```rust
// In leanspec-core::validators::CompletionVerifier

impl CompletionVerifier {
    pub fn verify_completion(spec_path: &Path) -> Result<VerificationResult> {
        // Existing: Check unchecked checkboxes
        let checklist_result = Self::verify_checklist(spec_path)?;
        
        // NEW: Check spec freshness
        let freshness_result = Self::verify_freshness(spec_path)?;
        
        if !checklist_result.is_complete {
            return Ok(checklist_result); // Existing behavior
        }
        
        if !freshness_result.is_fresh {
            return Ok(VerificationResult {
                is_complete: false,
                warning: "Spec hasn't been updated since in-progress. Did implementation match design exactly?",
                suggestions: vec![
                    "Review spec and update with implementation changes",
                    "Document design decisions and learnings",
                    "Use --force if no changes needed"
                ],
            });
        }
        
        Ok(VerificationResult::complete())
    }
    
    fn verify_freshness(spec_path: &Path) -> Result<FreshnessResult> {
        let metadata = read_frontmatter(spec_path)?;
        let status_transitions = metadata.transitions.unwrap_or_default();
        
        // Find when status changed to "in-progress"
        let in_progress_time = status_transitions
            .iter()
            .find(|t| t.to_status == "in-progress")
            .map(|t| t.timestamp);
            
        // Get spec README last modified time
        let spec_modified = get_file_modified_time(spec_path.join("README.md"))?;
        
        // Spec is fresh if modified after in-progress transition
        let is_fresh = match in_progress_time {
            Some(ip_time) => spec_modified > ip_time,
            None => true, // No in-progress transition, skip check
        };
        
        Ok(FreshnessResult { is_fresh, spec_modified, in_progress_time })
    }
}
```

**CLI Output**:

```
⚠️  Spec hasn't been updated since starting work (2 days ago)

Did the implementation match the design exactly?
  • If changes were made, update the spec with:
    - Architecture changes
    - Design decisions
    - Learnings and trade-offs
  
  • If no changes, use --force to mark complete

❓ Mark complete anyway? Use --force flag to skip this check.
```

#### 1.2 AGENTS.md Workflow Update

Add explicit backflow step to SDD workflow:

```markdown
## 📋 SDD Workflow

BEFORE: board → search → check existing specs
DURING: update status to in-progress → code → **document decisions** → link dependencies
AFTER:  **update spec with learnings** → check off all checklist items → update status to complete
```

**New section in AGENTS.md**:

```markdown
### Keeping Specs Current (Knowledge Backflow)

After implementation, **ALWAYS** update the spec with:
- ✅ Architecture changes (if different from design)
- ✅ Design decisions made during coding
- ✅ Trade-offs and alternatives considered
- ✅ What worked differently than expected

**Example**:
// In spec README.md, add section:
## Implementation Notes

**Architecture Change**: Migrated from TypeScript to Rust for performance
**Decision**: Used channels instead of callbacks for async (simpler error handling)
**Learning**: Initial 3-step validation was redundant, simplified to 2 steps
```

#### 1.3 Template Updates

Add "Implementation Learnings" section to spec templates:

```markdown
## Implementation Notes

<!-- Document changes from original design, decisions made during coding, learnings -->

**Architecture Changes**:
- List any changes from original design

**Design Decisions**:
- Key decisions made during implementation
- Alternatives considered and why rejected

**Learnings**:
- What worked differently than expected
- Trade-offs discovered
```

Add checklist item to Plan section:
```markdown
- [ ] Update spec with implementation changes and learnings
```

**Implementation Complexity**: Low
**Value**: High (immediate behavior change)

---

### Tier 2: Automated Drift Detection (Phase 2 - v0.6.0)

**Goal**: System automatically identifies when specs might be outdated.

#### 2.1 Reality Alignment Validator

New validator in `rust/leanspec-core/src/validators/reality_alignment.rs`:

```rust
pub struct RealityAlignmentValidator;

impl RealityAlignmentValidator {
    pub fn validate(spec: &Spec, repo_path: &Path) -> Result<Vec<DriftWarning>> {
        let mut warnings = Vec::new();
        
        // Check 1: Technology mentions vs codebase reality
        warnings.extend(Self::check_tech_mentions(spec, repo_path)?);
        
        // Check 2: File staleness (spec vs code changes)
        warnings.extend(Self::check_file_staleness(spec, repo_path)?);
        
        // Check 3: Broken references
        warnings.extend(Self::check_broken_references(spec, repo_path)?);
        
        // Check 4: TODO staleness
        warnings.extend(Self::check_todo_staleness(spec, repo_path)?);
        
        Ok(warnings)
    }
}

#[derive(Debug)]
pub struct DriftWarning {
    pub category: DriftCategory,
    pub message: String,
    pub suggestions: Vec<String>,
    pub severity: Severity,
}

pub enum DriftCategory {
    TechnologyMismatch,
    FileStaleness,
    BrokenReference,
    TodoStaleness,
}
```

#### 2.2 Detection Heuristics

**Heuristic 1: Technology Mentions**

```rust
fn check_tech_mentions(spec: &Spec, repo_path: &Path) -> Result<Vec<DriftWarning>> {
    let tech_keywords = extract_tech_keywords(&spec.content);
    let mut warnings = Vec::new();
    
    for tech in tech_keywords {
        if !exists_in_codebase(tech, repo_path)? {
            warnings.push(DriftWarning {
                category: DriftCategory::TechnologyMismatch,
                message: format!("Spec mentions '{}' but not found in codebase", tech),
                suggestions: vec![
                    format!("Verify if '{}' is still used", tech),
                    "Update spec if technology changed".to_string(),
                ],
                severity: Severity::Warning,
            });
        }
    }
    
    Ok(warnings)
}

fn extract_tech_keywords(content: &str) -> Vec<&str> {
    // Keywords to look for
    const TECH_KEYWORDS: &[&str] = &[
        "TypeScript", "JavaScript", "Rust", "Python", "Go",
        "React", "Vue", "Angular", "Next.js",
        "PostgreSQL", "MongoDB", "Redis",
        "GraphQL", "REST", "gRPC",
        "Docker", "Kubernetes",
    ];
    
    TECH_KEYWORDS.iter()
        .filter(|&&tech| content.contains(tech))
        .copied()
        .collect()
}

fn exists_in_codebase(tech: &str, repo_path: &Path) -> Result<bool> {
    // Simple heuristic: check for related files
    let patterns = match tech {
        "TypeScript" => vec!["**/*.ts", "**/*.tsx"],
        "Rust" => vec!["**/*.rs", "**/Cargo.toml"],
        "React" => vec!["**/react", "**/node_modules/react"],
        "PostgreSQL" => vec!["**/*postgres*", "**/*.sql"],
        // ... more mappings
        _ => vec![],
    };
    
    for pattern in patterns {
        if has_files_matching(repo_path, pattern)? {
            return Ok(true);
        }
    }
    
    Ok(false)
}
```

**Heuristic 2: File Staleness**

```rust
fn check_file_staleness(spec: &Spec, repo_path: &Path) -> Result<Vec<DriftWarning>> {
    let spec_modified = spec.updated_at;
    let related_files = find_related_code_files(spec, repo_path)?;
    
    let recent_changes: Vec<_> = related_files
        .into_iter()
        .filter(|f| f.modified > spec_modified)
        .collect();
    
    if !recent_changes.is_empty() {
        let days_stale = (now() - spec_modified).num_days();
        
        Ok(vec![DriftWarning {
            category: DriftCategory::FileStaleness,
            message: format!(
                "Spec last updated {} days ago, but {} related files changed since",
                days_stale, recent_changes.len()
            ),
            suggestions: vec![
                "Review recent code changes".to_string(),
                "Update spec if architecture changed".to_string(),
            ],
            severity: if days_stale > 60 { Severity::Warning } else { Severity::Info },
        }])
    } else {
        Ok(vec![])
    }
}

fn find_related_code_files(spec: &Spec, repo_path: &Path) -> Result<Vec<FileInfo>> {
    // Heuristic: Find files mentioned in spec content
    let file_mentions = extract_file_paths(&spec.content);
    
    let mut related_files = Vec::new();
    for path in file_mentions {
        let full_path = repo_path.join(&path);
        if full_path.exists() {
            let modified = get_file_modified_time(&full_path)?;
            related_files.push(FileInfo { path, modified });
        }
    }
    
    Ok(related_files)
}
```

**Heuristic 3: Broken References**

```rust
fn check_broken_references(spec: &Spec, repo_path: &Path) -> Result<Vec<DriftWarning>> {
    let mut warnings = Vec::new();
    
    // Check spec dependencies
    for dep in &spec.depends_on {
        if is_spec_archived(dep, repo_path)? {
            warnings.push(DriftWarning {
                category: DriftCategory::BrokenReference,
                message: format!("Depends on archived spec {}", dep),
                suggestions: vec![
                    format!("Review if dependency on {} is still valid", dep),
                    "Update dependencies if architecture changed".to_string(),
                ],
                severity: Severity::Warning,
            });
        }
    }
    
    // Check file links in content
    let file_links = extract_file_links(&spec.content);
    for link in file_links {
        let full_path = repo_path.join(&link);
        if !full_path.exists() {
            warnings.push(DriftWarning {
                category: DriftCategory::BrokenReference,
                message: format!("References non-existent file: {}", link),
                suggestions: vec![
                    "Update file path if it moved".to_string(),
                    "Remove reference if file was deleted".to_string(),
                ],
                severity: Severity::Warning,
            });
        }
    }
    
    Ok(warnings)
}
```

**Heuristic 4: TODO Staleness**

```rust
fn check_todo_staleness(spec: &Spec, repo_path: &Path) -> Result<Vec<DriftWarning>> {
    if spec.status != "complete" {
        return Ok(vec![]); // Only check complete specs
    }
    
    // Parse unchecked items from spec
    let unchecked = parse_unchecked_items(&spec.content);
    
    if !unchecked.is_empty() {
        Ok(vec![DriftWarning {
            category: DriftCategory::TodoStaleness,
            message: format!("Spec marked complete but has {} unchecked items", unchecked.len()),
            suggestions: vec![
                "Check off completed items".to_string(),
                "Remove irrelevant TODOs".to_string(),
                "Move deferred items to new spec".to_string(),
            ],
            severity: Severity::Info,
        }])
    } else {
        Ok(vec![])
    }
}
```

#### 2.3 CLI Integration

```bash
# Add --check-reality flag to validate command
lean-spec validate --check-reality

# Output:
✓ 182 specs validated
⚠ 3 specs with potential drift:

188-knowledge-backflow-sdd-workflow
  ⚠ [tech] Mentions 'TypeScript' but no TS files found
  ⚠ [stale] Last updated 15 days ago, 4 related files changed since
  💡 Review recent changes and update spec

045-unified-dashboard
  ⚠ [refs] Depends on archived spec 042
  💡 Update dependencies

122-ai-agent-deps-management-fix
  ⚠ [refs] References non-existent file: src/old-validator.ts
  💡 Update file references
```

**Implementation Complexity**: Medium
**Value**: High (automated detection)

---

### Tier 3: AI-Assisted Sync (Phase 3 - v0.7.0+)

**Goal**: Use AI to analyze code changes and suggest spec updates.

#### 3.1 Git Diff Analysis

```rust
pub struct SpecSyncAnalyzer;

impl SpecSyncAnalyzer {
    pub fn analyze_changes(spec: &Spec, repo_path: &Path) -> Result<ChangeAnalysis> {
        // Find commits since spec creation
        let spec_created_commit = find_spec_creation_commit(spec, repo_path)?;
        let current_commit = get_current_commit(repo_path)?;
        
        // Get diff
        let diff = get_git_diff(repo_path, &spec_created_commit, &current_commit)?;
        
        // Categorize changes
        let changes = categorize_changes(&diff)?;
        
        Ok(ChangeAnalysis {
            commits: get_commit_range(&spec_created_commit, &current_commit, repo_path)?,
            changes,
            summary: generate_summary(&changes),
        })
    }
}

struct ChangeAnalysis {
    commits: Vec<CommitInfo>,
    changes: CategorizChanges,
    summary: String,
}

struct CategorizedChanges {
    architecture: Vec<Change>,
    api: Vec<Change>,
    workflow: Vec<Change>,
    dependencies: Vec<Change>,
    other: Vec<Change>,
}
```

#### 3.2 LLM Integration

```rust
pub struct SpecUpdateSuggester {
    llm_client: LLMClient,
}

impl SpecUpdateSuggester {
    pub async fn suggest_updates(
        &self,
        spec: &Spec,
        analysis: &ChangeAnalysis,
    ) -> Result<Vec<SpecUpdate>> {
        let prompt = self.build_prompt(spec, analysis);
        let response = self.llm_client.complete(&prompt).await?;
        let updates = parse_llm_response(&response)?;
        
        Ok(updates)
    }
    
    fn build_prompt(&self, spec: &Spec, analysis: &ChangeAnalysis) -> String {
        format!(
            r#"You are a technical writer analyzing code changes to update a specification.

Original Spec:
---
{}
---

Code Changes Since Spec Creation:
{}

Task: Suggest specific updates to the spec based on the code changes.
Focus on:
1. Architecture changes (language, framework, structure)
2. API changes (endpoints, parameters, responses)
3. Workflow changes (process, steps, order)
4. Important design decisions not in spec

Output format:
For each suggestion:
- Section: [which spec section to update]
- Change: [what changed]
- Suggested text: [proposed spec update]
"#,
            spec.content,
            format_changes(analysis)
        )
    }
}

struct SpecUpdate {
    section: String,
    change_type: ChangeType,
    current_text: String,
    suggested_text: String,
    rationale: String,
}
```

#### 3.3 Interactive Update Flow

```bash
lean-spec sync 188

Analyzing changes since spec creation (commit abc123f)...
Found 12 commits, 47 files changed

Change Summary:
  • Architecture: Migrated CLI from TypeScript to Rust
  • API: Added --check-reality flag to validate command
  • Workflow: Added completion freshness check

Suggested Spec Updates:
  
  1. Architecture Section
     Change: Language stack migration
     Current: "TypeScript CLI using Commander.js"
     Suggested: "Rust CLI using Clap, compiled to native binaries"
     [a]ccept | [r]eject | [e]dit | [s]kip
     
  2. Design Section  
     Change: New validation feature
     Current: "Validation checks structure and content"
     Suggested: "Validation checks structure, content, and spec-reality alignment (--check-reality flag)"
     [a]ccept | [r]eject | [e]dit | [s]kip
     
  3. Plan Section
     Change: Completed implementation
     Current: "- [ ] Implement reality alignment validator"
     Suggested: "- [x] Implement reality alignment validator"
     [a]ccept | [r]eject | [e]dit | [s]kip

Review Summary:
  2 accepted, 1 edited, 0 rejected, 0 skipped

Apply updates? [Y/n]
```

**Implementation Complexity**: High (LLM integration, interactive UI)
**Value**: Very High (minimal manual work)

---

## Phased Rollout

**Phase 1 (v0.5.0)**: Workflow Integration ← **START HERE**
- Completion freshness check
- AGENTS.md workflow update
- Template improvements
- Documentation

**Phase 2 (v0.6.0)**: Drift Detection
- Reality alignment validator
- `--check-reality` flag
- Freshness metrics

**Phase 3 (v0.7.0+)**: AI-Assisted Sync (Optional)
- Git diff analysis
- LLM integration
- `lean-spec sync` command

## Success Metrics

**Phase 1**:
- % of specs updated within 7 days of completion (target: >80%)
- Completion rejection rate (target: 10-20% healthy rejection)

**Phase 2**:
- False positive rate (target: <10%)
- % of drift warnings leading to spec updates (target: >50%)

**Phase 3**:
- Suggestion acceptance rate (target: >80%)
- Time saved updating specs (measure before/after)
