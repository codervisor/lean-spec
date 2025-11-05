# Implementation Plan

8-phase implementation plan for the `lspec validate` command.

**Note:** This spec originally proposed expanding `lspec check`, but the implementation created `lspec validate` as a separate command to keep sequence checking and quality validation as separate concerns.

## Status

**Overall Status:** Planned - Part of Phase 2 feature work for v0.2.0/v0.3.0 launch

**Priority:** HIGH - Critical for quality gates and prevents spec corruption

## Phase 1a: Basic Validation Framework (✅ COMPLETE)

**Goal:** Create modular framework for validation rules

**Completed Tasks:**
- [x] Created validation framework architecture
- [x] Implemented `ValidationRule` interface
- [x] Created `LineCountValidator` with warning/error thresholds
- [x] Implemented `lspec validate` command with `--max-lines` flag
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
- [x] Integrate with `lspec validate` command
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

## Phase 2: Structure Validation (NEXT)

**Goal:** Ensure specs follow structural conventions

**Tasks:**
- [ ] Create structure validator module
- [ ] Check README.md exists
- [ ] Validate YAML frontmatter syntax
- [ ] Check for title (H1 heading)
- [ ] Validate required sections present
- [ ] Check for empty sections
- [ ] Detect duplicate section headers
- [ ] Integrate with `lspec validate --structure` flag

**Notes:** 
- Ensures spec consistency across team
- Template-specific validation rules
- Helps maintain standards

**Estimated Effort:** 2 days

## Phase 3: Corruption Detection (HIGH PRIORITY)

**Goal:** Detect file corruption from failed edits

**Tasks:**
- [ ] Create corruption detector module
- [ ] Detect duplicate sections at same level
- [ ] Validate code blocks are properly closed
- [ ] Check JSON/YAML blocks are complete and parseable
- [ ] Detect content fragments (partial duplicates)
- [ ] Validate markdown structure (lists, tables)
- [ ] Detect malformed frontmatter
- [ ] Integrate with `lspec validate --corruption` flag

**Notes:** 
- Addresses real pain point we've experienced
- Should run by default to catch AI edit failures
- Critical for maintaining spec quality

**Estimated Effort:** 3 days

## Phase 4: Content Validation (OPTIONAL for v0.3.0)

**Goal:** Validate spec content quality

**Tasks:**
- [ ] Minimum content length check
- [ ] Detect TODO/FIXME in complete specs
- [ ] Validate internal links
- [ ] Check for placeholder text
- [ ] Integrate with `lspec validate --content` flag

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
- [ ] Integrate with `lspec validate --staleness` flag

**Notes:** 
- Useful for maintenance
- Lower priority for launch
- Git integration adds complexity

**Estimated Effort:** 2 days

## Phase 6: Auto-Fix (OPTIONAL for v0.3.0)

**Goal:** Automatically fix common issues

**Tasks:**
- [ ] Implement --fix flag for `lspec validate`
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

**Minimum (Phases 1-4):** 9-10 days
**Complete (All phases):** 15-18 days

## Dependencies

- Existing `check` command (sequence conflicts)
- Frontmatter parsing infrastructure
- Spec loading system
- Config system

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
   lspec validate --max-lines 400
   ```

2. **Review and fix issues:**
   ```bash
   lspec validate --fix  # When auto-fix is available
   lspec validate        # Verify fixes
   ```

3. **Enable in CI:**
   ```yaml
   - run: lspec validate --strict --format=json
   ```

4. **Add pre-commit hook:**
   ```bash
   lspec check           # Sequence conflicts
   lspec validate        # Quality validation
   ```

### For New Projects

- Comprehensive checking enabled by default
- Use templates with validation hints
- Pre-commit hooks included

## Alternative Approaches Considered

### Separate `lspec validate` Command

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
