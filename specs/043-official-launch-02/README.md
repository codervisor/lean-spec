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

**Launch Goals:**
1. **Rock-solid stability** - Zero critical bugs, 100% test pass rate
2. **Best-in-class UX** - <5 min from install to first spec
3. **Clear positioning** - "SDD for AI-powered development"
4. **Strong launch momentum** - Marketing, community, adoption metrics

## Design

### Release Strategy

**Three-Phase Rollout:**

**Phase 1: Stabilization (Week 1-2)**
- Fix all failing tests
- Resolve MCP error handling bug (spec 042)
- Documentation cleanup and simplification (spec 037)
- Manual QA of all CLI commands
- **Outcome**: v0.2.0-beta.1 for internal testing

**Phase 2: Polish & Features (Week 3-5)**
- Init pattern selection (spec 026)
- Pattern-aware list grouping (spec 024)
- Spec validation (spec 018)
- Optional: Start Copilot integration (spec 034)
- **Outcome**: v0.2.0-rc.1 for beta testers

**Phase 3: Launch (Week 6)**
- Final QA and bug fixes
- Marketing content creation
- Community outreach
- **Outcome**: v0.2.0 official release

### Version Positioning

```
v0.1.0 (Current)    → Alpha - Internal validation, early adopters
v0.2.0 (This Spec)  → Official Launch - Public release, production-ready
v0.3.0+             → Iterative improvements based on feedback
v1.0.0 (Future)     → Feature-complete milestone with enterprise features
```

### Success Criteria

**Technical Quality Gates:**
- ✅ 100% test pass rate (currently 98.4% - 3 tests failing)
- ✅ Zero critical or high severity bugs
- ✅ MCP server stability (no crashes on errors)
- ✅ <100ms CLI response time for common commands
- ✅ Documentation accuracy verified
- ✅ All examples tested and working

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

### Phase 1: Critical Fixes (Week 1-2)

**Blocking Issues:**
- [ ] Fix 3 failing tests in `spec-loader.test.ts` (date assertions)
- [ ] Implement spec 042: MCP error handling (prevent server crashes)
- [ ] Run full regression testing on all CLI commands
- [ ] Verify MCP server stability across error scenarios
- [ ] Fix any discovered bugs from testing

**Documentation:**
- [ ] Start spec 037: Documentation overhaul
- [ ] Simplify README (remove redundancy)
- [ ] Audit AGENTS.md for accuracy
- [ ] Review all docs for broken links
- [ ] Ensure code examples work

**Quality Checks:**
- [ ] TypeScript builds without errors
- [ ] No console.error/console.log in production
- [ ] Lint passes cleanly
- [ ] Bundle size acceptable (<5MB)

### Phase 2: Polish & UX (Week 3-5)

**User Experience Improvements:**
- [ ] Implement spec 026: Init pattern selection (interactive setup)
- [ ] Implement spec 024: Pattern-aware list grouping (clearer output)
- [ ] Consider spec 025: Template config updates (polish)
- [ ] Review and improve error messages
- [ ] Add helpful hints to common failure scenarios

**Feature Work:**
- [ ] Implement spec 018: Spec validation (schema checking)
- [ ] Optional: Begin spec 034: Copilot slash commands (if time allows)
- [ ] Review and prioritize any new user-requested features

**Testing:**
- [ ] Beta testing with 3-5 external users
- [ ] Collect feedback on onboarding experience
- [ ] Iterate on pain points discovered
- [ ] Performance testing (large spec repos)

### Phase 3: Launch Preparation (Week 6)

**Release Engineering:**
- [ ] Bump version to 0.2.0 in package.json
- [ ] Write comprehensive CHANGELOG for v0.2.0
- [ ] Update all version references in docs
- [ ] Create GitHub release with release notes
- [ ] Publish to npm registry
- [ ] Test npm install flow

**Marketing Content:**
- [ ] Write launch blog post
- [ ] Create demo video (3-5 min walkthrough)
- [ ] Record GIF demos for key features
- [ ] Prepare social media posts (Twitter, LinkedIn, Reddit)
- [ ] Write comparison guides (vs BMAD, SpecKit, Kiro)
- [ ] Create Product Hunt submission

**Community Building:**
- [ ] Set up GitHub Discussions
- [ ] Create issue templates
- [ ] Write CONTRIBUTING.md enhancements
- [ ] Prepare FAQ document
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

### Marketing Positioning

**Tagline:** "Spec-Driven Development for AI-powered teams"

**Key Messages:**
1. **Lightweight SDD** - Not 50-page docs, just what AI needs
2. **AI-native** - Built for human + AI collaboration
3. **Adaptive** - Starts simple, scales to enterprise
4. **Your workflow** - Integrates with existing tools

**Target Audience (Priority Order):**
1. Solo developers using Cursor/Copilot/Claude
2. Small teams (2-5 devs) adopting AI pair programming
3. Startups scaling from solo to team
4. Engineering teams frustrated with heavyweight SDD

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

### Success Definition

**v0.2.0 is successful if:**
1. ✅ Establishes LeanSpec as a serious, stable tool
2. ✅ Attracts 1,000+ early adopters
3. ✅ Generates positive community sentiment
4. ✅ Provides solid foundation for future growth
5. ✅ Validates product-market fit for AI-powered dev teams

### Dependencies

**Blocking specs for v0.2.0:**
- Spec 042: MCP error handling (MUST fix)
- Spec 037: Docs overhaul (SHOULD do)

**Nice-to-have specs:**
- Spec 026: Init pattern selection
- Spec 024: Pattern-aware list grouping
- Spec 018: Spec validation

**Deferred to post-v0.2.0:**
- Spec 034: Copilot slash commands
- Spec 036: PM integrations
- Spec 016: GitHub Action
- Spec 017: VS Code extension

### Timeline

**Week 1-2:** Stabilization (tests, bugs, docs)  
**Week 3-5:** Polish (UX, validation, beta testing)  
**Week 6:** Launch prep and execution  
**Week 7+:** Community support and iteration

**Target launch date:** ~Mid-December 2025 (6 weeks from now)

### Open Questions

- Should we create a launch checklist tool in LeanSpec itself?
- Do we need a security audit before launch?
- Should we have a paid tier ready at launch? (probably no)
- What's our support SLA commitment?
- Do we need contributor guidelines before launch?
