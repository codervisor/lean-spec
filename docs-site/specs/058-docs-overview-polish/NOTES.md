# Implementation Notes

## Scope Evolution

**Original Scope** (minor polish):
- Fix feature list in overview
- Fix example structure mismatch
- Fix cosmetic date issue

**Expanded Scope** (comprehensive restructure):
- Restructure entire navigation (AI Integration → Working with AI in Guide)
- Add First Principles doc (from spec 049)
- Migrate all `docs/` content into docs-site
- Create Workflow section (board, stats, deps, validate)
- Update all Core Concepts to align with First Principles

**Rationale for Scope Change**:
1. **User feedback identified structural issues** - AI Integration tab placement is wrong
2. **First Principles spec (049) completed** - Must be reflected in docs
3. **Duplicate content causes confusion** - `docs/` folder vs docs-site
4. **v0.2.0 launch approaching** - Must get structure right before launch

## Key Architectural Decisions

**Decision #1: AI Integration → Working with AI in Guide**

- **Rationale**: LeanSpec is fundamentally AI-native, not AI-optional
- **Impact**: Changes mental model from "docs + optional AI add-on" to "AI-integrated workflow"
- **First Principle**: Bridge the Gap (align human intent with machine execution)

**Decision #2: First Principles as Foundation**

- **Rationale**: Everything derives from these 5 principles (spec 049)
- **Impact**: Shows clear derivation hierarchy: Principles → Philosophy → Practice
- **First Principle**: Intent Over Implementation (capture why, not just how)

**Decision #3: Consolidate `docs/` into docs-site**

- **Rationale**: Single source of truth, eliminate confusion
- **Impact**: Better discoverability, easier maintenance, integrated navigation
- **First Principle**: Context Economy (reduce cognitive load)

**Decision #4: Add Workflow Section**

- **Rationale**: Users need practical workflows, not just CLI reference
- **Impact**: Shows how to use board, stats, deps, validate in real workflows
- **First Principle**: Progressive Disclosure (add structure when useful)

## Migration Impact

**Breaking Changes**: None (only documentation reorganization)

**User Impact**:
- Old links redirect (e.g., `/docs/ai-integration/` → `/docs/guide/`)
- `docs/` folder deprecated but kept for backwards compatibility
- All content still accessible, just better organized

**Maintenance Impact**:
- Single docs source (docs-site) instead of two (`docs/` + docs-site)
- Easier to keep docs in sync with code
- Clear structure for future additions

## Timeline Considerations

**Estimated Effort**: 
- Phase 1-2: 2-3 hours (navigation + core concepts)
- Phase 3-4: 3-4 hours (AI content + migration)
- Phase 5-6: 2-3 hours (workflow + overview updates)
- Phase 7-8: 1-2 hours (testing + polish)
- **Total**: 8-12 hours

**Critical Path**: 
1. Phase 2 (First Principles) - Foundation for everything else
2. Phase 3 (AI content move) - Biggest structural change
3. Phase 7 (Testing) - Ensure nothing breaks

## Related Work

**Dependencies**:
- Spec 049 (First Principles) - MUST be complete (✅ Done)
- Spec 043 (v0.2.0 Launch) - This blocks launch
- Spec 057 (Validation) - Identified issues

**Blocked By**: None

**Blocks**:
- v0.2.0 launch (spec 043)
- Future docs updates (need correct structure first)

## Success Metrics

**Quantitative**:
- Zero broken links
- Build time <30 seconds
- All internal references updated
- Zero 404s after deployment

**Qualitative**:
- Navigation flows logically (Introduction → Concepts → AI → Features → Workflow)
- First Principles clearly explained
- AI integration feels core, not optional
- Users can find what they need in <2 clicks

**Dogfooding**:
- This spec itself follows First Principles
- Uses progressive disclosure (comprehensive but organized)
- Signal-to-noise high (every section informs decisions)
- Context economy maintained (split into sub-specs)

## Lessons Learned

**What Worked**:
- User feedback caught structural issues early
- Having First Principles (spec 049) made decisions clear
- Comprehensive analysis revealed deeper issues than original scope

**What to Improve**:
- Should have aligned docs structure with First Principles from the start
- Earlier consolidation of `docs/` folder would have prevented confusion

**What's Next** (Post-Launch):
- Consider automated link checking in CI
- Add visual diagrams to First Principles doc
- Create interactive examples for workflow section
- Video walkthroughs for AI integration setup
