---
status: in-progress
created: '2025-11-04'
tags:
  - release
  - launch
  - milestone
  - stability
priority: critical
related: [054]
created_at: '2025-11-04T00:00:00Z'
updated_at: '2025-11-06T07:20:03.887Z'
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

**Launch Goals:**
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

**Three-Phase Rollout:**

**Phase 1: Foundation (Week 1-2)**
- Operationalize first principles through tooling and documentation
- Fix all failing tests, complete spec 048 (complexity analysis)
- Implement spec 051 (AGENTS.md, README updates)
- Start spec 018 (basic validation: `--max-lines` check)

**Phase 2: Operationalization (Week 3-4)**
- Complete spec 018 (full validation with complexity checks)
- Implement specs 024 (pattern-aware list) and 026 (init pattern selection)
- Dogfood: Review and split any specs >400 lines
- Beta testing with principle validation checklist

**Phase 3: Launch Preparation (Week 5-6)**
- Implement spec 044 (spec relationships clarity)
- Complete spec 035 (live specs showcase) if ready
- Marketing content emphasizing first-principles philosophy
- Official v0.2.0 release

**What Changed:**
- Elevated principle operationalization (specs 051, 018) to Phase 1
- Deferred major redesign (spec 050) to v0.3.0 (too large for v0.2.0)
- Merged docs work: spec 037 absorbed into spec 051
- Spec 034 (Copilot slash commands) moved to v0.3.0
- Added dogfooding checkpoint: split large specs before launch

### Version Positioning

```
v0.1.0 (Current)    → Alpha - Internal validation, early adopters
v0.2.0 (This Spec)  → Official Launch - Public release, production-ready
v0.3.0+             → Iterative improvements based on feedback
v1.0.0 (Future)     → Feature-complete milestone with enterprise features
```

### Success Criteria

**Technical Quality Gates:**
- [x] 100% test pass rate (261/261 passing) - ✅ COMPLETE
- [x] Zero critical or high severity bugs - ✅ COMPLETE
- [x] MCP server stability (no crashes on errors) - ✅ STABLE
- [ ] <100ms CLI response time for common commands
- [x] Documentation accuracy verified - ✅ COMPLETE (spec 056)
- [x] All examples tested and working - ✅ COMPLETE (spec 056)

**User Experience Benchmarks:**
- ✅ Install to first spec: <5 minutes
- ✅ Find any spec via search: <10 seconds
- ✅ README clarity: 3 beta users succeed without help
- ✅ MCP integration works flawlessly in Claude/Copilot

**Launch Readiness:**
- ✅ CHANGELOG updated
- ✅ README reflects current features
- ✅ Marketing website ready (lean-spec.dev)
- ✅ Blog post drafted
- ✅ Demo video/GIF created
- ✅ Social media content prepared

## Status Summary

**Current Status (2025-11-06):**
- Test suite: **261/261 passing (100%)** - ✅ ALL TESTS PASSING
- Core CLI commands working: no TypeScript/lint errors
- MCP server stable after spec 042 fixes
- **All critical path specs COMPLETE**: 018, 024, 026, 042, 044, 045, 046, 048, 051, 052, 056
- Documentation site: 100% accurate, clean builds with no warnings

**Phase 1: ✅ COMPLETE** - Foundation achieved
**Phase 2: ✅ COMPLETE** - Validation, UX improvements, branding all shipped
**Phase 3: 🟡 READY TO START** - Dogfooding checkpoint next, then launch prep

**Blocking Issue for Launch:**
- ⚠️ **Spec 061 (AI-assisted spec writing)** - Fundamentally changes how we position LeanSpec and "When to Use" docs. Must be resolved before launch messaging.

## Dependencies

**Critical Path:**
- [x] Spec 042: MCP error handling - ✅ COMPLETE
- [x] Spec 048: Complexity analysis - ✅ COMPLETE
- [x] Spec 051: Docs + AGENTS.md with first principles - ✅ COMPLETE
- [x] Spec 018: Spec validation - ✅ COMPLETE
- [x] Spec 045: Unified dashboard - ✅ COMPLETE
- [x] Spec 046: Stats refactor - ✅ COMPLETE
- [x] Spec 052: Branding assets - ✅ COMPLETE

**High Priority:**
- [x] Spec 026: Init pattern selection - ✅ COMPLETE
- [x] Spec 024: Pattern-aware list grouping - ✅ COMPLETE
- [x] Spec 044: Spec relationships clarity - ✅ COMPLETE
- [x] Spec 056: Docs site accuracy audit - ✅ COMPLETE
- [ ] **Spec 061: AI-assisted spec writing** - 🔥 CRITICAL (blocks launch positioning)
- [ ] Dogfooding checkpoint: Split large specs

**Nice-to-have:**
- [ ] Spec 035: Live specs showcase

**Deferred to v0.3.0:**
- Spec 050: Tool redesign (too large)
- Spec 034: Copilot slash commands
- Specs 036, 016, 017, 025

## Timeline

**Week 1-2:** Foundation (tests, principles docs, basic validation)  
**Week 3-4:** Operationalization (full validation, core UX, dogfooding)  
**Week 5-6:** Launch prep and execution  
**Week 7+:** Community support and iteration

**Target launch date:** ~Mid-December 2025 (6 weeks from now)

## Sub-Specs

Detailed information split for Context Economy:

- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Detailed implementation phases with step-by-step tasks
- **[TESTING.md](./TESTING.md)** - Quality gates, testing strategy, success metrics
- **[MARKETING.md](./MARKETING.md)** - Positioning, messaging, launch channels, content strategy
- **[SESSION-2025-11-06.md](./SESSION-2025-11-06.md)** - Session progress notes and next steps
- **[DOGFOODING-SUMMARY.md](./DOGFOODING-SUMMARY.md)** - Summary of dogfooding sessions and findings
- **[DOGFOODING-SESSION-2025-11-06.md](./DOGFOODING-SESSION-2025-11-06.md)** - Detailed dogfooding session notes
- **[DOGFOODING-FINAL.md](./DOGFOODING-FINAL.md)** - Final dogfooding checkpoint and validation

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
- Focus on stability over features
- Listen to early users
- Rapid iteration based on feedback

**Not Including in v0.2.0:**
- PM integrations (defer to v0.3.0+)
- GitHub Actions (defer to v0.3.0+)
- VS Code extension (defer to v0.3.0+)

**Why defer?** v0.2.0 = stability and core UX. Complex integrations add risk. Better to nail the basics first.

### Success Definition

**v0.2.0 is successful if:**
1. All specs follow first principles (no specs >400 lines without sub-specs)
2. Validation tooling shipped and working
3. Philosophy is clear from docs
4. Establishes LeanSpec as serious, stable tool
5. Attracts 1,000+ early adopters who understand the philosophy
6. Generates positive community sentiment around first-principles thinking
7. Validates product-market fit for AI-powered dev teams
