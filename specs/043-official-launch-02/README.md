---
status: in-progress
created: '2025-11-04'
tags:
  - release
  - launch
  - milestone
  - stability
priority: critical
---

# Official Launch: v0.2.0

> **Status**: ⏳ In progress · **Priority**: Critical · **Created**: 2025-11-04 · **Tags**: release, launch, milestone, stability

**Project**: lean-spec  
**Team**: Core Development

## Overview

Launch LeanSpec v0.2.0 as the **official public release**, treating v0.1.0 as an alpha. This release establishes LeanSpec as production-ready for teams and solo developers.

**Why 0.2.0, not 0.1.0?**
- v0.1.0 = Alpha release for early validation
- v0.2.0 = First production-ready, publicly marketed release
- Allows us to ship critical fixes and polish before "official" launch
- Semantic versioning: 0.2.0 signals stability improvements over 0.1.0

**Launch Goals (UPDATED - First Principles Focus):**
1. **Practice what we preach** - Demonstrate 5 first principles (spec 049) through implementation
2. **Operationalize principles** - Ship tooling that prevents principle violations (validation, complexity checks)
3. **Rock-solid stability** - Zero critical bugs, 100% test pass rate
4. **Clear philosophy** - Users and AI agents understand "why" not just "what"
5. **Strong launch momentum** - Marketing emphasizes first-principles thinking

**Key Shift from Original Plan:**
- Discovered first principles (spec 049) fundamentally reframes v0.2.0 priorities
- Focus: Foundation & operationalization over feature accumulation
- Defer major redesign work (spec 050) to v0.3.0 to keep release lean and principle-aligned

## Design

### Release Strategy

**Three-Phase Rollout (REVISED - First Principles Focus):**

**Phase 1: Foundation (Week 1-2)**
- **Goal**: Operationalize first principles through tooling and documentation
- Fix all failing tests (git-timestamps blocking)
- Complete spec 048 (complexity analysis) - foundational insight that led to principles
- **NEW PRIORITY**: Implement spec 051 (update AGENTS.md, README with first principles)
- **NEW PRIORITY**: Start spec 018 (basic validation: `--max-lines` check)
- **Outcome**: Foundation for principle-driven development in place

**Phase 2: Operationalization (Week 3-4)**
- **Goal**: Complete detection/enforcement layer + core UX improvements
- Complete spec 018 (full validation with complexity checks)
- Implement spec 024 (pattern-aware list grouping) - Context Economy in output
- Implement spec 026 (init pattern selection) - Progressive Disclosure in onboarding
- Dogfood: Review and split any specs >400 lines (practice what we preach)
- **Outcome**: Tools enforce principles, UX demonstrates principles

**Phase 3: Launch Preparation (Week 5-6)**
- **Goal**: Polish, validation, launch execution
- Implement spec 044 (spec relationships clarity) - Bridge the Gap
- Complete spec 035 (live specs showcase) if ready for launch content
- Beta testing with principle validation checklist
- Marketing content emphasizing first-principles philosophy
- **Outcome**: v0.2.0 official release with clear philosophical foundation

**What Changed from Original Plan:**
- Elevated principle operationalization (specs 051, 018) to Phase 1 critical path
- Deferred major redesign (spec 050: CLI/MCP redesign) to v0.3.0 (too large for v0.2.0 scope)
- Merged docs work: spec 037 absorbed into spec 051 (avoid duplication, Signal-to-Noise principle)
- Spec 034 (Copilot slash commands) demoted to optional/v0.3.0 (not principle-critical)
- Added explicit dogfooding checkpoint: split large specs before launch

### Version Positioning

```
v0.1.0 (Current)    → Alpha - Internal validation, early adopters
v0.2.0 (This Spec)  → Official Launch - Public release, production-ready
v0.3.0+             → Iterative improvements based on feedback
v1.0.0 (Future)     → Feature-complete milestone with enterprise features
```

### Success Criteria

**Technical Quality Gates:**
- [ ] 100% test pass rate (currently **95.7%** - 11 tests failing in git-timestamps) - 🔴 BLOCKING
- [x] Zero critical or high severity bugs - ✅ (spec 042 fixed MCP crashes)
- [x] MCP server stability (no crashes on errors) - ✅ STABLE
- [ ] <100ms CLI response time for common commands - ⏱️ needs testing
- [ ] Documentation accuracy verified
- [ ] All examples tested and working

**User Experience Benchmarks:**
- ✅ Install to first spec: <5 minutes
- ✅ Find any spec via search: <10 seconds
- ✅ README clarity: 3 beta users succeed without help
- ✅ MCP integration works flawlessly in Claude/Copilot

**Launch Readiness:**
- ✅ CHANGELOG updated with all changes since v0.1.0
- ✅ README reflects current features accurately
- ✅ Marketing website ready (lean-spec.dev)
- ✅ Blog post drafted
- ✅ Demo video/GIF created
- ✅ Social media content prepared

## Plan

### Phase 1: Foundation (Week 1-2) - REVISED PRIORITIES

**🔴 BLOCKING: Test Stability**
- [ ] Fix 11 failing tests in git-timestamps module (backfill feature) - 🔴 CRITICAL BLOCKER
- [ ] Run full regression testing on all CLI commands
- [ ] Verify MCP server stability across error scenarios
- [x] Fix 3 failing tests in `spec-loader.test.ts` (date assertions) - ✅ RESOLVED
- [x] Implement spec 042: MCP error handling (prevent server crashes) - ✅ COMPLETE

**Current Status (2025-11-05):**
- Test suite: **244/255 passing (95.7%)** - 11 failures blocking
- Core CLI commands working: no TypeScript/lint errors
- MCP server stable after spec 042 fixes

**🟡 CRITICAL: First Principles Operationalization**
- [ ] Complete spec 048: Complexity analysis - ✅ MARKED COMPLETE (foundational insight)
- [ ] **NEW**: Implement spec 051: Update AGENTS.md + README with first principles framework
  - Add conflict resolution framework for AI agents
  - Document 5 principles in README "Core Principles" section
  - Update AGENTS.md with decision-making guidance
- [ ] **NEW**: Start spec 018: Basic validation implementation
  - Implement `lspec validate --max-lines 400` command
  - Add warnings for specs approaching 300 lines
  - Foundation for full operationalization layer

**🟢 Documentation Quality:**
- [x] AGENTS.md accuracy verified
- [x] README reflects current features
- [ ] Review all docs for broken links
- [ ] Ensure code examples work
- **NOTE**: Spec 037 (docs overhaul) merged into spec 051 to avoid duplication

**Quality Gates:**
- [x] TypeScript builds without errors - ✅ CLEAN
- [x] No console.error/console.log in production - ✅ CLEAN
- [x] Lint passes cleanly - ✅ PASSING
- [ ] All tests passing (255/255) - 🔴 BLOCKING

**Outcome**: Foundation for principle-driven development + test stability

### Phase 2: Operationalization (Week 3-4) - REFOCUSED

**🔴 Complete Detection Layer (First Principles):**
- [ ] Complete spec 018: Full validation implementation
  - Add `lspec complexity <spec>` command
  - Add `lspec health` project-wide check
  - Implement frontmatter warnings for large specs
  - Result: Tools enforce Context Economy principle

**🟡 Core UX Improvements (Aligned with Principles):**
- [ ] Implement spec 024: Pattern-aware list grouping
  - Why: Context Economy - reduces cognitive load in output
- [ ] Implement spec 026: Init pattern selection (interactive setup)
  - Why: Progressive Disclosure - guides new users
- [ ] Review and improve error messages
  - Why: Bridge the Gap - clear communication

**🟢 Dogfooding Checkpoint:**
- [ ] Review all specs for Context Economy violations (>400 lines)
- [ ] Split any large specs using sub-spec pattern (spec 012)
- [ ] Document splitting decisions and rationale
- [ ] **Goal**: Practice what we preach before launch

**Testing:**
- [ ] Beta testing with 3-5 external users
- [ ] Test principle-based decision making with AI agents
- [ ] Collect feedback on onboarding experience
- [ ] Performance testing (large spec repos)

**Deferred from Original Plan:**
- ❌ Spec 034: Copilot slash commands → Optional, moved to v0.3.0 scope
- ❌ Spec 050: Tool redesign → Too large, deferred to v0.3.0
- ❌ Spec 025: Template config updates → Low priority polish

**Outcome**: Complete operationalization layer + validated UX improvements

### Phase 3: Launch Preparation (Week 5-6) - UPDATED

**Final Features:**
- [ ] Implement spec 044: Spec relationships clarity
  - Why: Bridge the Gap - understand dependencies
- [ ] Complete spec 035: Live specs showcase (if ready)
  - Launch content demonstrating dogfooding

**Release Engineering:**
- [ ] Bump version to 0.2.0 in package.json
- [ ] Write comprehensive CHANGELOG for v0.2.0
  - Emphasize first principles foundation
  - Highlight operationalization features (validation, complexity)
- [ ] Update all version references in docs
- [ ] Create GitHub release with release notes
- [ ] Publish to npm registry
- [ ] Test npm install flow

**Marketing Content (First Principles Focus):**
- [ ] Write launch blog post: "LeanSpec: First Principles for AI-Powered Development"
- [ ] Create demo video showing principle validation in action
- [ ] Record GIF demos: spec creation, validation, complexity checks
- [ ] Prepare social media posts emphasizing philosophy
- [ ] Write comparison guides showing principle differentiation
- [ ] Create Product Hunt submission with first-principles angle

**Community Building:**
- [ ] Set up GitHub Discussions
- [ ] Create issue templates
- [ ] Enhance CONTRIBUTING.md with first principles guidance
- [ ] Prepare FAQ: "Why these constraints?"
- [ ] Set up analytics tracking
- [ ] Plan community support strategy

**Launch Day:**
- [ ] Publish npm package
- [ ] Push GitHub release
- [ ] Publish blog post
- [ ] Submit to Product Hunt
- [ ] Post on Hacker News
- [ ] Share on Reddit (r/programming, r/devtools)
- [ ] Tweet launch announcement
- [ ] Monitor feedback channels

### Post-Launch (Week 7+)

**Community Support:**
- [ ] Respond to issues within 24 hours
- [ ] Monitor npm download stats
- [ ] Track GitHub stars/forks
- [ ] Engage with early adopters
- [ ] Collect feedback for v0.3.0

**Analytics Review:**
- [ ] Review adoption metrics (downloads, stars)
- [ ] Analyze user feedback themes
- [ ] Identify most-requested features
- [ ] Plan v0.3.0 roadmap based on data

## Test

### Pre-Launch Quality Gates

**Automated Testing:**
- [ ] All 184 tests pass (currently 181/184)
- [ ] Coverage remains >80% (verify with `pnpm test:coverage`)
- [ ] CI/CD pipeline green
- [ ] No TypeScript errors
- [ ] Lint passes
- [ ] Build succeeds without warnings

**Manual Testing:**
- [ ] Install via `npm install -g lean-spec` works
- [ ] `lspec init` completes successfully
- [ ] `lspec create` generates valid specs
- [ ] `lspec list` displays correctly
- [ ] `lspec search` returns relevant results
- [ ] `lspec update` modifies specs correctly
- [ ] `lspec board` renders properly
- [ ] `lspec stats` shows accurate data
- [ ] MCP server connects and responds without crashes

**Integration Testing:**
- [ ] MCP integration with Claude Desktop works
- [ ] MCP integration with VS Code Copilot works
- [ ] Works on macOS, Linux, Windows
- [ ] Works with different terminal emulators
- [ ] Works in monorepo and single-repo setups

**Documentation Testing:**
- [ ] New user follows README → creates first spec in <5 min
- [ ] All code examples in docs execute correctly
- [ ] Links in documentation are not broken
- [ ] API reference matches actual CLI behavior
- [ ] AGENTS.md instructions work for AI agents

**Beta User Testing:**
- [ ] 3-5 external beta testers try installation
- [ ] Beta testers complete onboarding successfully
- [ ] Collect qualitative feedback
- [ ] No critical issues reported
- [ ] >80% satisfaction rating

### Launch Day Verification

- [ ] npm package published successfully
- [ ] GitHub release created with assets
- [ ] Documentation website reflects v0.2.0
- [ ] All marketing links work
- [ ] Analytics tracking active
- [ ] Community channels live

### Success Metrics (30 Days Post-Launch)

**Adoption:**
- [ ] 1,000+ npm downloads
- [ ] 100+ GitHub stars
- [ ] 50+ unique users/organizations
- [ ] 10+ community contributions (issues, PRs, discussions)

**Quality:**
- [ ] No critical bugs reported
- [ ] <5 high-priority bugs
- [ ] 90%+ user satisfaction (surveys)
- [ ] <1% crash rate

**Community:**
- [ ] 5+ blog posts or mentions from users
- [ ] Active discussions in GitHub Discussions
- [ ] Positive sentiment on social media
- [ ] Featured on at least 1 newsletter/podcast

## Notes

### Why This Matters

**v0.1.0 Retrospective:**
- Successfully validated core concept
- Proved MCP integration works
- Dogfooded successfully (28 archived specs)
- Identified rough edges and bugs

**v0.2.0 Opportunity:**
- Position as "official" first release
- Fix known issues before wide adoption
- Establish reputation for stability
- Build early community momentum

### Release Philosophy

**"Ship lean, iterate fast"**
- Don't wait for perfection
- Focus on stability over features
- Listen to early users
- Rapid iteration based on feedback

**Not Including in v0.2.0:**
- PM integrations (defer to v0.3.0+)
- GitHub Actions (defer to v0.3.0+)
- VS Code extension (defer to v0.3.0+)
- Full Copilot integration (may start, finish later)

**Why defer these?**
- v0.2.0 = stability and core UX
- Complex integrations add risk
- Better to nail the basics first
- Can iterate based on user demand

### Marketing Positioning (UPDATED - First Principles Focus)

**Tagline:** "First-Principles Spec-Driven Development for AI-powered teams"

**Key Messages (Revised):**
1. **First Principles Foundation** - Built on 5 immutable constraints (physics, biology, economics)
2. **Operationalized Philosophy** - Tools that enforce principles, not just document them
3. **AI-native** - Built for human + AI collaboration from the ground up
4. **Practice what we preach** - Dogfooded extensively, specs demonstrate principles

**Differentiation:**
- **vs Traditional SDD**: We optimize for context windows and token costs (first principles, not convention)
- **vs Agile**: We capture intent for AI execution (Bridge the Gap principle)
- **vs "No docs"**: We document what matters (Signal-to-Noise principle)
- **vs Heavyweight tools**: We stay lean by design (Context Economy principle)

**Target Audience (Priority Order):**
1. Solo developers using Cursor/Copilot/Claude (need lightweight SDD)
2. Small teams (2-5 devs) adopting AI pair programming
3. Startups scaling from solo to team (Progressive Disclosure)
4. Engineering teams frustrated with heavyweight SDD
5. First-principles thinkers curious about principled design

### Launch Channels

**Primary:**
- Product Hunt (Tuesday launch, aim for top 5)
- Hacker News (Show HN post)
- Dev.to blog post
- Twitter/X announcement

**Secondary:**
- Reddit (r/programming, r/devtools, r/SideProject)
- LinkedIn engineering groups
- Indie Hackers
- Dev community Discord servers

**Partnerships:**
- Reach out to AI tool creators (Cursor, Aider, Continue)
- Model Context Protocol community
- VS Code extension developers

### Risk Mitigation

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

### Success Definition (REVISED)

**v0.2.0 is successful if:**
1. ✅ **Practice what we preach** - All specs follow first principles (no specs >400 lines without sub-specs)
2. ✅ **Operationalized principles** - Validation tooling shipped and working
3. ✅ **Philosophy is clear** - Users/AI understand "why" from docs
4. ✅ Establishes LeanSpec as a serious, stable tool
5. ✅ Attracts 1,000+ early adopters who "get" the philosophy
6. ✅ Generates positive community sentiment around first-principles thinking
7. ✅ Validates product-market fit for AI-powered dev teams

### Dependencies (UPDATED)

**🔴 Critical Path for v0.2.0:**
- [x] Spec 042: MCP error handling - ✅ COMPLETE
- [x] Spec 048: Complexity analysis - ✅ COMPLETE (foundational insight)
- [ ] Spec 051: Docs + AGENTS.md with first principles - 🔴 CRITICAL (NEW)
- [ ] Spec 018: Spec validation - 🔴 CRITICAL (ELEVATED)
- [x] Spec 045: Unified dashboard - ✅ COMPLETE
- [x] Spec 046: Stats refactor - ✅ COMPLETE

**🟡 High Priority for v0.2.0:**
- [ ] Spec 026: Init pattern selection (Progressive Disclosure)
- [ ] Spec 024: Pattern-aware list grouping (Context Economy)
- [ ] Spec 044: Spec relationships clarity (Bridge the Gap)
- [ ] Dogfooding checkpoint: Split large specs

**🟢 Nice-to-have for v0.2.0:**
- [ ] Spec 035: Live specs showcase (launch content)
- Spec 037: Docs overhaul - ❌ MERGED INTO SPEC 051

**⚪ Deferred to v0.3.0:**
- Spec 050: Tool redesign (too large, complex)
- Spec 034: Copilot slash commands (optional)
- Spec 036: PM integrations
- Spec 016: GitHub Action
- Spec 017: VS Code extension
- Spec 025: Template config updates

**Key Change**: Elevated principle operationalization (051, 018) to critical path, deferred major redesign (050) to maintain lean scope.

### Timeline (REVISED)

**Week 1-2:** Foundation (tests, principles docs, basic validation)  
**Week 3-4:** Operationalization (full validation, core UX, dogfooding)  
**Week 5-6:** Launch prep and execution  
**Week 7+:** Community support and iteration

**Target launch date:** ~Mid-December 2025 (6 weeks from now)

### Open Questions

- Should we create a launch checklist tool in LeanSpec itself?
- Do we need a security audit before launch?
- Should we have a paid tier ready at launch? (probably no)
- What's our support SLA commitment?
- Do we need contributor guidelines before launch?
