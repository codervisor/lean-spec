# Implementation Plan

8-phase implementation plan for the `lean-spec validate` command.

**Note:** This spec originally proposed expanding `lean-spec check`, but the implementation created `lean-spec validate` as a separate command to keep sequence checking and quality validation as separate concerns.

## Status

**Overall Status:** ✅ COMPLETE for v0.2.0 - Core validation (Phases 1-3.5) shipped

**Priority:** CRITICAL - Quality gates and spec corruption prevention

**v0.2.0 Delivered:** Core validation working, finding real issues, 370+ tests passing.

## Phase 1a: Basic Validation Framework (✅ COMPLETE)

**Goal:** Create modular framework for validation rules

**Completed Tasks:**
- [x] Created validation framework architecture
- [x] Implemented `ValidationRule` interface
- [x] Created `LineCountValidator` with warning/error thresholds
- [x] Implemented `lean-spec validate` command with `--max-lines` flag
- [x] Added integration tests
- [x] Documented in README

**Notes:** 
- Built as separate `validate` command (not expansion of `check`)
- Framework allows easy addition of new validators
- Already in production use

**Phase Completed:** November 2025

## Phase 1b: Frontmatter Validation (✅ COMPLETE)

**Goal:** Validate spec frontmatter for required fields and valid values

**Completed Tasks:**
- [x] Create frontmatter validator module (`src/validators/frontmatter.ts`)
- [x] Validate required fields present (status, created)
- [x] Validate status values (planned, in-progress, complete, archived)
- [x] Validate priority values (low, medium, high, critical)
- [x] Validate date formats (ISO 8601: YYYY-MM-DD or full timestamp)
- [x] Validate tags format (must be array)
- [x] Add comprehensive unit tests (27 tests passing)
- [x] Integrate with `lean-spec validate` command
- [ ] Validate custom fields (if defined in config) - deferred to future phase
- [ ] Add `--frontmatter` flag for selective validation - deferred to future phase

**Notes:** 
- Most critical for catching common mistakes ✓
- Enables comprehensive pre-commit hooks ✓
- Prevents invalid specs from being created ✓
- Pragmatic approach: coerces types where reasonable
- Clear error messages with actionable suggestions
- Tested against real repository specs: all passing

**Phase Completed:** November 2025

**Actual Effort:** 1 day (ahead of 2-day estimate)

## Phase 2: Structure Validation (✅ COMPLETE)

**Goal:** Ensure specs follow structural conventions

**Completed Tasks:**
- [x] Create structure validator module (`src/validators/structure.ts`)
- [x] Validate YAML frontmatter syntax
- [x] Check for title (H1 heading)
- [x] Validate required sections present (Overview, Design)
- [x] Check for empty sections (with proper subsection handling)
- [x] Detect duplicate section headers
- [x] Add comprehensive unit tests (17 tests passing)
- [x] Integrate with `lean-spec validate` command
- [x] Test against real repository specs

**Notes:** 
- Ensures spec consistency across team ✓
- Template-specific validation rules (configurable)
- Properly handles sections with subsections (doesn't flag as empty)
- Found 2 real issues in repository (duplicate headers in specs 048, 049)

**Phase Completed:** November 2025

**Actual Effort:** 0.5 days (ahead of 2-day estimate)

## Phase 3: Corruption Detection (✅ COMPLETE)

**Goal:** Detect file corruption from failed edits

**Completed Tasks:**
- [x] Create corruption detector module (`src/validators/corruption.ts`)
- [x] Detect duplicate sections at same level (delegated to structure validator)
- [x] Validate code blocks are properly closed
- [x] Check JSON/YAML blocks are complete and parseable
- [x] Detect content fragments (partial duplicates / merge artifacts)
- [x] Validate markdown structure (unclosed formatting)
- [x] Add comprehensive unit tests (19 tests passing)
- [x] Integrate with `lean-spec validate` command
- [x] Test against real repository specs

**Notes:** 
- Addresses real pain point we've experienced ✓
- Runs by default to catch AI edit failures ✓
- Critical for maintaining spec quality ✓
- Found 6 real corruption issues in repository:
  - Invalid YAML blocks (specs 044, 045)
  - Unclosed formatting (specs 036, 037, 038, 045, 046)

**Phase Completed:** November 2025

**Actual Effort:** 1 day (ahead of 3-day estimate)

## Phase 3.5: Sub-Spec Validation (✅ COMPLETE)

**Goal:** Validate sub-spec files per spec 012 conventions

**Completed Tasks:**
- [x] Create sub-spec validator module (`src/validators/sub-spec.ts`)
- [x] Check sub-spec naming conventions (uppercase .md files)
- [x] Validate README.md references all sub-specs
- [x] Check line counts per sub-spec file (<400 lines)
- [x] Detect orphaned sub-spec files (not linked from README)
- [x] Validate cross-document references
- [x] Add comprehensive unit tests (16 tests passing)
- [x] Integrate with `lean-spec validate` command
- [ ] Check for content duplication across sub-specs (deferred - complex analysis)

**Notes:** 
- Complements spec 012 (sub-spec files management) ✓
- Important as teams adopt multi-file specs ✓
- Enforces Context Economy principle per file ✓
- Leverages existing `loadSubFiles()` infrastructure ✓
- Found real issues in repository:
  - spec 049: ANALYSIS.md (428 lines), OPERATIONALIZATION.md (415 lines)
  - spec 018: CONFIGURATION.md (443 lines)

**Phase Completed:** November 2025

**Actual Effort:** 0.5 days (ahead of 2-day estimate)

## Phase 4: Content Validation (OPTIONAL for v0.3.0)

**Goal:** Validate spec content quality

**Tasks:**
- [ ] Minimum content length check
- [ ] Detect TODO/FIXME in complete specs
- [ ] Validate internal links
- [ ] Check for placeholder text
- [ ] Integrate with `lean-spec validate --content` flag

**Notes:** 
- Nice to have, can defer to v0.3.0 if time-constrained
- Lower priority than corruption detection
- Useful for quality gates

**Estimated Effort:** 1-2 days

## Phase 5: Staleness Detection (OPTIONAL for v0.3.0)

**Goal:** Identify stale or abandoned specs

**Tasks:**
- [ ] Calculate spec age (created date)
- [ ] Calculate last update (git or file mtime)
- [ ] Warn on in-progress specs > 30 days
- [ ] Warn on no updates > 90 days
- [ ] Warn on planned specs > 60 days
- [ ] Integrate with `lean-spec validate --staleness` flag

**Notes:** 
- Useful for maintenance
- Lower priority for launch
- Git integration adds complexity

**Estimated Effort:** 2 days

## Phase 6: Auto-Fix (OPTIONAL for v0.3.0)

**Goal:** Automatically fix common issues

**Tasks:**
- [ ] Implement --fix flag for `lean-spec validate`
- [ ] Add missing frontmatter fields
- [ ] Format dates to ISO 8601
- [ ] Sort frontmatter fields
- [ ] Update visual badges
- [ ] Remove duplicate sections
- [ ] Close unclosed code blocks
- [ ] Report what was fixed

**Notes:** 
- Great UX feature
- Can defer to post-launch iteration
- Should be conservative (only fix obvious issues)

**Estimated Effort:** 3 days

## Phase 8: Integration & Polish

**Goal:** Complete feature with docs and tests

**Tasks:**
- [ ] Add tests for all check types
- [ ] Update README with expanded check command
- [ ] Update AGENTS.md to mention comprehensive checking
- [ ] Create pre-commit hook example
- [ ] Document migration guide for backwards compatibility
- [ ] Update MCP server to expose new check capabilities
- [ ] Performance optimization (parallel checking)
- [ ] Caching for repeated checks

**Notes:** 
- Essential for launch
- Documentation is critical for adoption
- Performance matters for large projects

**Estimated Effort:** 2-3 days

## Launch Strategy (2025-11-04)

### v0.2.0 Scope
- **MUST HAVE:** Phases 1-3 (refactored framework + frontmatter + structure validation)
- **HIGHLY RECOMMENDED:** Phase 3.5 (sub-spec validation - enforces spec 012)
- **HIGHLY RECOMMENDED:** Phase 4 (corruption detection - addresses real pain point)
- **SHOULD HAVE:** Phase 7 (auto-fix, at least for corruption issues)
- **NICE TO HAVE:** Phases 5-6 (content, staleness)

### v0.3.0 Scope
- Complete all remaining phases
- Roll out comprehensive checking with backwards compatibility
- Enable by default with config override

### Post-v0.3.0
- Add advanced features based on user feedback
- Custom validation rules
- Performance optimizations
- Additional check types

## Total Estimated Effort

**Minimum (Phases 1-3.5):** 11-12 days
**Complete (All phases):** 17-20 days

## Dependencies

- Existing `check` command (sequence conflicts)
- Frontmatter parsing infrastructure
- Spec loading system (with `loadSubFiles()` support)
- Config system
- Spec 012 conventions (sub-spec file organization)

## Risks & Mitigation

**Risk:** Breaking backwards compatibility
- **Mitigation:** Comprehensive testing, config options, gradual rollout

**Risk:** Performance degradation with many checks
- **Mitigation:** Parallel checking, caching, incremental mode

**Risk:** False positives in corruption detection
- **Mitigation:** Conservative rules, allow configuration

**Risk:** Scope creep (too many check types)
- **Mitigation:** Focus on Phases 1-4 for launch, defer others

## Success Metrics

- Zero spec corruption incidents after deployment
- >90% of specs pass validation checks
- <1s check time for 100 specs
- Positive user feedback on validation quality
- Reduced time debugging spec issues

## Testing Strategy

Each phase includes:
- Unit tests for validator modules
- Integration tests with real specs
- Edge case testing
- Performance benchmarks
- Backwards compatibility tests

See [TESTING.md](./TESTING.md) for detailed test plan.

## Migration Path

### For Existing Projects

1. **Run initial validation:**
   ```bash
   lean-spec validate --max-lines 400
   ```

2. **Review and fix issues:**
   ```bash
   lean-spec validate --fix  # When auto-fix is available
   lean-spec validate        # Verify fixes
   ```

3. **Enable in CI:**
   ```yaml
   - run: lean-spec validate --strict --format=json
   ```

4. **Add pre-commit hook:**
   ```bash
   lean-spec check           # Sequence conflicts
   lean-spec validate        # Quality validation
   ```

### For New Projects

- Comprehensive checking enabled by default
- Use templates with validation hints
- Pre-commit hooks included

## Alternative Approaches Considered

### Separate `lean-spec validate` Command

**Pros:** 
- Clear separation of concerns
- No backwards compatibility issues

**Cons:**
- Two commands for quality checking
- User confusion (when to use which?)
- More maintenance burden

**Decision:** Expand `check` with flags for better UX

### Always-On Comprehensive Checking

**Pros:**
- Maximum quality enforcement
- Simple model

**Cons:**
- Breaking change
- Performance impact for large projects
- User pushback

**Decision:** Make it opt-in with config, default in v0.3.0

### External Plugin System

**Pros:**
- Extensibility
- Community contributions

**Cons:**
- Over-engineering for current needs
- Added complexity
- Maintenance burden

**Decision:** Defer to future version if needed
