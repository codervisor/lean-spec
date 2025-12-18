# Knowledge Backflow - Technical Design

## Progressive Enhancement with Agent-Based Validation

### Overview

Based on feedback, Phase 2 has been revised from heuristic-based drift detection to **orchestrator + reviewer agent validation**:

**Rationale**:
- ❌ Heuristic detection (tech mentions, file staleness) causes too many false positives
- ❌ Context window limitations degrade performance with long contexts
- ✅ Clean context agent (reviewer) works more accurately
- ✅ Orchestrator manages validation workflow, reviewer validates implementation
- ✅ Leverages existing orchestration infrastructure (specs 168, 171)

## Three-Phase Architecture

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

### Phase 2: Orchestrator + Reviewer Agent Validation (v0.6.0)

**Goal**: Use AI agents with clean context to validate specs against actual implementation.

**Architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Spec Validation Flow                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: "Validate spec 188 against implementation"          │
│         ↓                                                   │
│  ┌──────────────────┐                                       │
│  │  Orchestrator    │  (Spec 168 infrastructure)           │
│  │  Agent           │                                       │
│  └────────┬─────────┘                                       │
│           │ Reads: Spec requirements                        │
│           │ Reads: Implementation code                      │
│           │ Prepares: Focused validation task               │
│           ↓                                                 │
│  ┌──────────────────┐                                       │
│  │  Reviewer        │  (Clean context, no history)         │
│  │  Agent           │                                       │
│  └────────┬─────────┘                                       │
│           │ Validates: Implementation vs spec               │
│           │ Identifies: Missing features, drift             │
│           │ Generates: Actionable update suggestions        │
│           ↓                                                 │
│  ┌──────────────────┐                                       │
│  │  Validation      │                                       │
│  │  Report          │                                       │
│  └────────┬─────────┘                                       │
│           │ Displays: In Desktop UI / CLI                   │
│           │ Actions: Update spec / Mark issues              │
│           ↓                                                 │
│  Human reviews and applies suggestions                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1 Orchestrator Integration

Extend orchestration platform (spec 168) to support spec validation workflow:

```rust
// In orchestrator
pub enum OrchestrationMode {
    Implement,      // Existing: Implement a spec
    Validate,       // NEW: Validate spec against implementation
    Review,         // NEW: Review and suggest spec updates
}

pub struct SpecValidationTask {
    spec: Spec,
    implementation_files: Vec<PathBuf>,
    validation_criteria: Vec<String>,
}

impl Orchestrator {
    pub async fn validate_spec(&self, spec_id: &str) -> Result<ValidationReport> {
        // Step 1: Load spec and identify related implementation files
        let spec = self.load_spec(spec_id)?;
        let impl_files = self.find_related_files(&spec)?;
        
        // Step 2: Prepare validation task with clean context
        let task = SpecValidationTask {
            spec: spec.clone(),
            implementation_files: impl_files,
            validation_criteria: spec.extract_requirements()?,
        };
        
        // Step 3: Dispatch to reviewer agent with focused prompt
        let report = self.dispatch_reviewer_agent(task).await?;
        
        // Step 4: Return validation report
        Ok(report)
    }
}
```

#### 2.2 Reviewer Agent Implementation

Create specialized reviewer agent with clean context advantage:

```rust
pub struct ReviewerAgent {
    llm_client: LLMClient,
}

impl ReviewerAgent {
    pub async fn validate_implementation(
        &self,
        spec: &Spec,
        implementation: &[FileContent],
    ) -> Result<ValidationReport> {
        let prompt = self.build_validation_prompt(spec, implementation);
        
        // Fresh context - no conversation history
        let response = self.llm_client.complete(&prompt).await?;
        
        self.parse_validation_response(&response)
    }
    
    fn build_validation_prompt(&self, spec: &Spec, impl_files: &[FileContent]) -> String {
        format!(
            r#"You are a technical reviewer validating if an implementation matches its specification.

**Specification**:
---
{}
---

**Implementation**:
{}

**Task**: Validate if the implementation fulfills all spec requirements.

For each requirement in the spec:
1. Check if it's implemented in the code
2. Note any missing features or incomplete implementations
3. Identify architecture changes from original design
4. Detect outdated technology mentions in spec

**Output Format**:
{{
  "complete": true/false,
  "missing_features": ["feature 1", "feature 2"],
  "architecture_drift": ["change 1", "change 2"],
  "outdated_mentions": ["tech 1", "tech 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}}

Be specific and actionable in your feedback.
"#,
            spec.content,
            format_implementation_files(impl_files)
        )
    }
}
```

**Key Advantages Over Heuristics**:

1. **Clean Context**: Reviewer agent gets fresh context with no conversation history
2. **Semantic Understanding**: AI understands intent, not just keyword matching
3. **Fewer False Positives**: Context-aware validation vs blind pattern matching
4. **Actionable Output**: Specific suggestions, not generic warnings

#### 2.3 CLI Integration

```bash
# Validate spec against current implementation
lean-spec agent review 188

# Output:
🔍 Validating spec 188 against implementation...

📋 Validation Report:
  ✓ Phase 1 (Workflow Integration): Fully implemented
  ✗ Phase 2 (Drift Detection): Replaced with Orchestrator approach
  ⚠ Phase 3 (AI Sync): Not yet implemented

🔄 Architecture Changes Detected:
  • Spec describes "heuristic-based detection"
  • Implementation uses "orchestrator + reviewer agents"
  
💡 Suggested Spec Updates:
  1. Update Phase 2 section to describe orchestrator approach
  2. Add reference to spec 168 and 171
  3. Note token efficiency advantages of clean context

Apply suggestions? [Y/n/edit]
```

#### 2.4 Desktop UI Integration

Add "Validate with AI Reviewer" button to spec detail view:

```typescript
// In Desktop UI
function SpecDetailView({ spec }: { spec: Spec }) {
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  
  const handleValidate = async () => {
    const report = await invoke('validate_spec', { specId: spec.id });
    setValidationReport(report);
  };
  
  return (
    <div>
      {/* Spec content */}
      
      <Button onClick={handleValidate}>
        Validate with AI Reviewer
      </Button>
      
      {validationReport && (
        <ValidationReportView report={validationReport} />
      )}
    </div>
  );
}
```

**Implementation Complexity**: Medium (requires orchestrator integration)
**Value**: Very High (accurate validation with clean context)

---

### Phase 3: Proactive Spec Sync (Future) - High Token Cost ⚠️

**Goal**: Periodic AI-powered review to proactively identify and suggest spec updates.

**⚠️ CAUTION**: This phase requires proactive agents to periodically check specs against codebase, incurring significant token costs. Implementation requires careful cost/benefit analysis.

#### 3.1 Token Cost Analysis

**Per-Spec Review Cost Estimate**:
```
Spec content:           2,000 tokens
Recent code changes:    3,000 tokens
System prompt:            500 tokens
Response generation:    1,500 tokens
------------------------------------------
Total per review:       7,000 tokens
```

**Monthly Cost Projection**:
```
Assumptions:
- 100 active specs in project
- Weekly review frequency
- Claude Sonnet 3.5 pricing: $3/1M input, $15/1M output

Monthly reviews: 100 specs × 4 weeks = 400 reviews
Input tokens:    400 × 5,500 = 2.2M tokens × $3/1M = $6.60
Output tokens:   400 × 1,500 = 0.6M tokens × $15/1M = $9.00
------------------------------------------
Monthly cost:    ~$15.60 for 100 specs

Annual cost:     ~$187 for 100 specs
```

**Scaling Consideration**: At 1,000 specs with weekly reviews, annual cost would be ~$1,870.

#### 3.2 Cost vs Benefit

**Benefits**:
- ✅ Proactive drift detection before it becomes problematic
- ✅ Reduced manual spec maintenance burden
- ✅ Always-current specs improve AI agent accuracy
- ✅ Better institutional knowledge preservation

**Costs**:
- ❌ Ongoing token expenditure
- ❌ API latency (reviews take time)
- ❌ Potential noise (false positives in suggestions)
- ❌ Review fatigue (humans must review all suggestions)

**Decision Criteria**: Implement Phase 3 only if:
1. Phase 1 adoption is >80% (specs being updated)
2. Phase 2 proves valuable (reviewer agent accuracy is high)
3. Organization has budget for ongoing AI costs
4. Manual spec maintenance is measurably expensive

#### 3.3 Alternative: On-Demand Sync Only

Instead of periodic proactive reviews, implement **user-triggered** sync:

```bash
# User explicitly requests sync when needed
lean-spec sync 188

# Analyzing changes since spec creation...
# Found: Architecture migration from TypeScript to Rust
# 
# Suggested updates:
#   1. Update "Design" section: Replace TS examples with Rust
#   2. Update dependencies: Remove @types packages
#   3. Add "Implementation Notes": Document migration rationale
#
# Apply updates? [Y/n/edit]
```

**Advantages**:
- ✅ No ongoing cost (only pay when used)
- ✅ Users control when to incur token cost
- ✅ Focused on specs that actually need updates
- ✅ Less noise (only check when suspicious)

**Disadvantages**:
- ❌ Reactive, not proactive
- ❌ Requires user awareness that spec might be outdated
- ❌ Drift might accumulate before user notices

**Recommendation**: Start with on-demand sync, measure usage, then decide on proactive reviews.

#### 3.4 Implementation (If Justified)

Only proceed with implementation after validating:
- Phase 1 adoption metrics (>80% specs updated within 7 days)
- Phase 2 effectiveness (reviewer agent accuracy >90%)
- Cost budget allocation approved
- User demand for proactive sync feature

See original DESIGN.md git history for detailed implementation approach if needed.

---

## Phased Rollout

**Phase 1 (v0.5.0)**: Workflow Integration ← **START HERE**
- Completion freshness check
- AGENTS.md workflow update
- Template improvements
- Documentation

**Phase 2 (v0.6.0)**: Orchestrator + Reviewer Validation
- Extend orchestrator for validation workflow
- Implement reviewer agent capability
- CLI: `lean-spec agent review <spec>` command
- Desktop UI integration

**Phase 3 (Future)**: Proactive Spec Sync (If Cost-Justified)
- Requires Phase 1+2 success validation
- Cost/benefit analysis and budget approval
- On-demand sync first, proactive reviews later

## Success Metrics

**Phase 1**:
- % of specs updated within 7 days of completion (target: >80%)
- Completion rejection rate (target: 10-20% healthy rejection)

**Phase 2**:
- Reviewer agent accuracy (target: >90%)
- False positive rate (target: <5%)
- % of validation findings leading to spec updates (target: >70%)
- Token efficiency vs heuristic approaches (measure cost per validation)

**Phase 3** (If Implemented):
- ROI validation: Manual time saved vs token cost
- Suggestion acceptance rate (target: >80%)
- User satisfaction with sync feature (target: >4/5 stars)
