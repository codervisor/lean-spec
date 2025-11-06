# Implementation Plan

Detailed implementation phases for v0.2.0 launch.

## Phase 1: Foundation (Week 1-2) - COMPLETE ✅

### Test Stability (RESOLVED)
- [x] Fix 11 failing tests in git-timestamps module - ✅ RESOLVED
- [x] Run full regression testing on all CLI commands - ✅ PASSING
- [x] Verify MCP server stability across error scenarios - ✅ STABLE
- [x] Fix 3 failing tests in `spec-loader.test.ts` - ✅ RESOLVED
- [x] Implement spec 042: MCP error handling - ✅ COMPLETE

**Current Status (2025-11-05):**
- Test suite: **261/261 passing (100%)**
- Core CLI commands working: no TypeScript/lint errors
- MCP server stable after spec 042 fixes

### First Principles Operationalization (COMPLETE)
- [x] Complete spec 048: Complexity analysis - ✅ COMPLETE (foundational insight)
- [x] **Spec 051: Update AGENTS.md + README** - ✅ COMPLETE
  - Conflict resolution framework added to AGENTS.md
  - 5 principles documented in README "Core Principles" section
  - Decision-making guidance for AI agents complete
- [ ] **NEXT: Start spec 018: Basic validation implementation**
  - Implement `lspec validate --max-lines 400` command
  - Add warnings for specs approaching 300 lines
  - Foundation for full operationalization layer

### Documentation Quality
- [x] AGENTS.md accuracy verified - ✅ COMPLETE
- [x] README reflects current features - ✅ COMPLETE
- [x] Review all docs for broken links - ✅ AUTOMATIC (Docusaurus configured with `onBrokenLinks: 'throw'` - build fails on broken links)
- [ ] Ensure code examples work - ⏳ TODO
- **NOTE**: Spec 037 (docs overhaul) merged into spec 051 to avoid duplication

### Quality Gates
- [x] TypeScript builds without errors - ✅ CLEAN
- [x] No console.error/console.log in production - ✅ CLEAN
- [x] Lint passes cleanly - ✅ PASSING
- [x] All tests passing (261/261) - ✅ COMPLETE

**Outcome**: ✅ Phase 1 COMPLETE - Foundation for principle-driven development achieved

**Session Notes (2025-11-06):**
- Validated Docusaurus `onBrokenLinks: 'throw'` catches broken links automatically
- Fixed validation output UX: sub-spec line counts now show inline (much clearer!)
- Marked specs 018, 044, 052 as complete
- Phase 2 is DONE - ready for Phase 3 (dogfooding + launch prep)

---

## Phase 2: Operationalization (Week 3-4) - COMPLETE ✅

### Complete Detection Layer (First Principles)
- [x] **Complete spec 018: Full validation implementation** - ✅ COMPLETE
  - Phases 1-3.5 shipped: line count, frontmatter, structure, corruption, sub-spec validation
  - 370+ tests passing, finding real issues
  - Improved output: sub-spec line counts show inline with parent specs
  - Additional features (complexity command, health check) deferred to v0.3.0
  - **Why**: Tools enforce Context Economy principle

### Core UX Improvements (Aligned with Principles)
- [x] **Implement spec 024: Pattern-aware list grouping** - ✅ COMPLETE
  - Created pattern-detection utility with 14 unit tests
  - List command now adapts to flat/date-grouped/custom patterns
  - **Why**: Context Economy - reduces cognitive load in output
- [x] **Implement spec 026: Init pattern selection** - ✅ COMPLETE
  - Interactive pattern selection wizard during init
  - Users choose pattern upfront (no manual config edits)
  - **Why**: Progressive Disclosure - guides new users
- [x] **Spec 044: Spec relationships clarity** - ✅ COMPLETE
  - `related` field now truly bidirectional in `lspec deps` output
  - Cleaner UX with single "Related Specs" section
  - **Why**: Bridge the Gap - clear communication
- [x] **Spec 052: Branding assets** - ✅ COMPLETE
  - Logo exported in all formats (SVG, PNG, favicon)
  - Social media preview images created
  - Docs site fully branded with dark mode support
  - **Why**: Professional launch presence

### Dogfooding Checkpoint
- [x] Review all specs for Context Economy violations (>400 lines) - ✅ COMPLETE
  - Validation results: 3 specs exceed 400 lines (045: 1169, 046: 685, 048: 601)
  - 3 sub-spec files exceed limits (049: 2 files, 018: 1 file)
  - 7 specs in warning zone (300-400 lines)
- [ ] Split large specs using sub-spec pattern (spec 012)
  - **MUST SPLIT**: 045-unified-dashboard, 046-stats-dashboard-refactor, 048-spec-complexity-analysis
  - **SUB-SPECS TO SPLIT**: 049 (ANALYSIS.md, OPERATIONALIZATION.md), 018 (CONFIGURATION.md)
  - **DECISION NEEDED**: 7 specs at 300-400 lines (simplify or accept?)
- [ ] Document splitting decisions and rationale
- [x] Split spec 043 itself (this spec!) into sub-specs - ✅ COMPLETE
- **Goal**: Practice what we preach before launch

### Testing
- [ ] Beta testing with 3-5 external users
- [ ] Test principle-based decision making with AI agents
- [ ] Collect feedback on onboarding experience
- [ ] Performance testing (large spec repos)

### Deferred from Original Plan
- ❌ Spec 034: Copilot slash commands → Optional, moved to v0.3.0 scope
- ❌ Spec 050: Tool redesign → Too large, deferred to v0.3.0
- ❌ Spec 025: Template config updates → Low priority polish

**Outcome**: ✅ Phase 2 COMPLETE - All critical path features shipped, validation operational, branding done

**Next Session Priority**: Dogfooding checkpoint - split 3 large specs (045, 046, 048) to practice Context Economy

---

## Phase 3: Launch Preparation (Week 5-6) - PLANNED ⏳

### Final Features
- [ ] **Implement spec 044: Spec relationships clarity**
  - **Why**: Bridge the Gap - understand dependencies
- [ ] **Complete spec 035: Live specs showcase** (if ready)
  - Launch content demonstrating dogfooding

### Release Engineering
- [ ] Bump version to 0.2.0 in package.json
- [ ] Write comprehensive CHANGELOG for v0.2.0
  - Emphasize first principles foundation
  - Highlight operationalization features (validation, complexity)
- [ ] Update all version references in docs
- [ ] Create GitHub release with release notes
- [ ] Publish to npm registry
- [ ] Test npm install flow

### Community Building
- [ ] Set up GitHub Discussions
- [ ] Create issue templates
- [ ] Enhance CONTRIBUTING.md with first principles guidance
- [ ] Prepare FAQ: "Why these constraints?"
- [ ] Set up analytics tracking
- [ ] Plan community support strategy

### Launch Day
- [ ] Publish npm package
- [ ] Push GitHub release
- [ ] Publish blog post
- [ ] Submit to Product Hunt
- [ ] Post on Hacker News
- [ ] Share on Reddit (r/programming, r/devtools)
- [ ] Tweet launch announcement
- [ ] Monitor feedback channels

---

## Post-Launch (Week 7+)

### Community Support
- [ ] Respond to issues within 24 hours
- [ ] Monitor npm download stats
- [ ] Track GitHub stars/forks
- [ ] Engage with early adopters
- [ ] Collect feedback for v0.3.0

### Analytics Review
- [ ] Review adoption metrics (downloads, stars)
- [ ] Analyze user feedback themes
- [ ] Identify most-requested features
- [ ] Plan v0.3.0 roadmap based on data

---

## Risk Mitigation

**Risk: Low adoption**
- Mitigation: Strong launch marketing, clear value prop
- Fallback: Iterate messaging, focus on specific niche

**Risk: Critical bug discovered post-launch**
- Mitigation: Thorough testing, beta user validation
- Fallback: Rapid hotfix release (v0.2.1)

**Risk: MCP protocol changes**
- Mitigation: Pin SDK version, monitor updates
- Fallback: Maintain compatibility layer

**Risk: Negative community feedback**
- Mitigation: Responsive support, rapid iteration
- Approach: View feedback as learning opportunity
