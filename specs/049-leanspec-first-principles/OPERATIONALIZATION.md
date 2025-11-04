# Operationalizing LeanSpec's First Principles

> Part of spec: [049-leanspec-first-principles](README.md)

Principles without operationalization are just nice words. This document outlines how to make first principles enforceable and actionable.

## The Problem

**We discovered:** 
- We built sub-specs (spec 012) but never used them
- Specs grew to 600-1,166 lines despite principles
- Spec corruption from complex editing operations
- "Keep it minimal" was aspirational, not enforced

**Root Cause:** Principles existed but had no teeth—no tooling, metrics, or enforcement.

**Solution:** Three-layer operationalization: Tooling + Culture + Metrics

---

## Layer 1: Tooling

### Detection Tools

**1. Complexity Checking**
```bash
# Check if spec exceeds thresholds
lspec validate --max-lines 400 <spec>

# Check all specs in project
lspec validate --max-lines 400 --all

# Get complexity metrics for a spec
lspec complexity <spec>
# Output:
# Lines: 423
# Sections: 12
# Code blocks: 8
# Estimated tokens: ~11,000
# Status: ⚠️ Warning - Consider splitting
```

**2. Project Health Check**
```bash
# Overall project health
lspec health

# Output:
# 📊 Project Health Report
# 
# ✅ 45 specs within limits (<400 lines)
# ⚠️ 3 specs approaching limit (300-400 lines)
# 🚨 2 specs over limit (>400 lines)
#   - 048-spec-complexity-analysis (591 lines)
#   - 045-unified-dashboard (1,166 lines)
# 
# Recommendations:
# - Split spec 045 into sub-specs (urgently)
# - Consider splitting spec 048
```

**3. Sub-Spec Navigation**
```bash
# List sub-specs within a spec
lspec files <spec>

# Output:
# 📄 049-leanspec-first-principles
# ├── README.md (main spec, 312 lines)
# ├── ANALYSIS.md (detailed analysis, 287 lines)
# ├── FIRST-PRINCIPLES.md (the 5 principles, 245 lines)
# └── OPERATIONALIZATION.md (this file, 198 lines)
```

### Guidance Tools

**1. Splitting Assistance**
```bash
# Interactive splitting guide
lspec split <spec>

# Guided workflow:
# 1. Analyze spec structure
# 2. Suggest logical splits
# 3. Create sub-spec files
# 4. Update cross-references
# 5. Validate result
```

**2. Simplification Suggestions**
```bash
# AI-powered simplification
lspec simplify <spec>

# Analyzes spec and suggests:
# - Redundant sections to merge
# - Verbose content to condense
# - Sections that could be sub-specs
# - Content that might be noise
```

**3. Template Recommendations**
```bash
# Suggest appropriate template based on complexity
lspec template --suggest

# Based on your needs:
# - Team size: solo
# - Spec type: feature
# - Complexity: medium
# 
# Recommended: standard template
```

### Prevention Tools

**1. Git Hooks**
```bash
# Pre-commit hook
.git/hooks/pre-commit

#!/bin/bash
# Check for overly complex specs
lspec validate --max-lines 400 --staged

# Warn but don't block (allow with explanation)
if [ $? -ne 0 ]; then
  echo "⚠️ Warning: Some specs exceed 400 lines"
  echo "Consider splitting before committing"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi
```

**2. PR Checks**
```yaml
# .github/workflows/spec-quality.yml
name: Spec Quality Check

on: [pull_request]

jobs:
  validate-specs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install LeanSpec
        run: npm install -g lean-spec
      - name: Validate Spec Complexity
        run: |
          lspec validate --max-lines 400 --all
          lspec health --ci
```

**3. CI/CD Gates**
```bash
# In CI pipeline
lspec validate --max-lines 400 --all --strict

# --strict mode:
# - Fails build if any spec >400 lines
# - Requires justification in spec frontmatter
# - Enforces first principles
```

---

## Layer 2: Culture

### Norms and Practices

**1. Review Checklist**

Every spec review should check:
- [ ] Spec is <400 lines (or split into sub-specs)
- [ ] Every section informs decisions
- [ ] Intent (why) is clear
- [ ] Success criteria are defined
- [ ] Both human and AI can understand it
- [ ] Appropriate complexity for team size

**2. "Split Early, Split Often"**

**Cultural norm:**
- Don't wait for 600 lines to split
- At 300 lines, ask: "Should this be split?"
- At 400 lines, actively plan splitting
- Use sub-specs proactively, not reactively

**Anti-pattern:**
- "Let's keep everything in one file for now"
- "We'll split it later if needed" (never happens)
- "It's just a little over 400 lines" (becomes 600+)

**3. "Every Word Must Earn Its Keep"**

**Practice:** During spec reviews, challenge content:
- "What decision does this sentence inform?"
- "Can we infer this from context?"
- "Is this obvious or can we remove it?"
- "Does this belong in code comments instead?"

**4. "Intent First, Details Later"**

**Writing order:**
1. Write Overview (why + what)
2. Define success criteria (how we'll know)
3. Sketch Design (high-level approach)
4. Add Plan details (as understanding emerges)

**Not:** Start with implementation details and try to add intent later.

### Examples and Models

**1. Showcase Well-Structured Specs**

Maintain a "gallery" of exemplary specs:
- Spec 012 (sub-spec files) - Good use of splitting
- Spec 047 (git backfill) - Right amount of detail
- Spec 049 (this one) - Demonstrates sub-specs

**2. Splitting Case Studies**

Document before/after of spec splits:
- Spec 018: 591 lines → README (200) + VALIDATION (180) + TESTING (150)
- Spec 045: 1,166 lines → README (250) + DASHBOARD (300) + COMPONENTS (350) + DESIGN (266)
- Show improved maintainability

**3. Dogfooding Stories**

Share learnings:
- "How we caught ourselves violating our principles"
- "The 600-line spec problem and how we fixed it"
- "Why we built sub-specs but didn't use them"

### Education and Onboarding

**1. First Principles in README**

Add prominent section in README.md explaining first principles.

**2. Conflict Resolution Examples**

In documentation, show how to resolve common conflicts using first principles.

**3. AGENTS.md Guidance**

Update AI agent instructions with:
- First principles
- Conflict resolution framework
- When to split specs
- How to check complexity

---

## Layer 3: Metrics

### What to Track

**1. Spec Health Metrics**

Track over time:
- Average spec length (target: <300 lines)
- % specs over 400 lines (target: 0%)
- % specs over 300 lines (target: <20%)
- Number of sub-specs used
- Spec corruption incidents (target: 0)

**2. Maintenance Metrics**

Track:
- Time to update specs (should decrease)
- Frequency of spec updates (should increase)
- Specs not updated in 90 days (target: <10%)
- Average time between spec update and code commit

**3. Usage Metrics**

Track tool usage:
- `lspec validate` runs per week
- `lspec complexity` checks
- `lspec split` usage
- `lspec files` navigation

### Alerting

**1. Spec Complexity Alerts**

Automated alerts:
- 🟡 Spec approaching 300 lines
- 🟠 Spec exceeds 400 lines
- 🔴 Spec exceeds 600 lines (urgent)

**2. Staleness Alerts**

Track freshness:
- ⚠️ Spec not updated in 60 days (minor concern)
- 🚨 Spec not updated in 90 days (needs review)

**3. Project Health Alerts**

Weekly/monthly reports:
- Average spec complexity trend (↑ bad, ↓ good)
- Number of specs needing attention
- Dogfooding health (are we following our principles?)

### Continuous Improvement

**1. Regular Retrospectives**

Monthly or quarterly:
- Review specs created/updated
- Check adherence to first principles
- Identify patterns (good and bad)
- Adjust thresholds if needed

**2. Threshold Tuning**

Based on data:
- Are 300/400/600 the right thresholds?
- Should they vary by spec type?
- What's the actual context window usage?

**3. Tooling Iteration**

Improve based on usage:
- What tools are used most?
- What problems still occur?
- What new tools are needed?
- How can we make compliance easier?

---

## Implementation Roadmap

### Phase 1: Foundation (Immediate)
- [ ] Add first principles to README.md
- [ ] Add conflict resolution to AGENTS.md
- [ ] Document 300/400/600 line thresholds
- [ ] Update review checklist

### Phase 2: Detection (v0.2.0)
- [ ] Implement `lspec validate --max-lines`
- [ ] Implement `lspec complexity <spec>`
- [ ] Implement `lspec health`
- [ ] Add warnings to `lspec list` for large specs

### Phase 3: Guidance (v0.3.0)
- [ ] Implement `lspec split <spec>` (interactive)
- [ ] Implement `lspec simplify <spec>` (suggestions)
- [ ] Implement `lspec files <spec>` (sub-spec nav)
- [ ] Add AI-powered complexity analysis

### Phase 4: Prevention (v0.3.0+)
- [ ] Create git hook templates
- [ ] Create GitHub Action for PR checks
- [ ] Add CI/CD validation examples
- [ ] Implement `--strict` mode enforcement

### Phase 5: Culture (Ongoing)
- [ ] Document exemplary specs
- [ ] Share splitting case studies
- [ ] Create first principles guide
- [ ] Add onboarding materials

### Phase 6: Metrics (v0.4.0)
- [ ] Track spec health over time
- [ ] Implement alerting system
- [ ] Create health dashboard
- [ ] Enable trend analysis

---

## Success Criteria

**We've successfully operationalized first principles when:**

1. ✅ **Zero specs over 400 lines** (or explicitly justified with sub-specs)
2. ✅ **Zero spec corruption incidents** for 30+ days
3. ✅ **Team consistently splits** specs proactively (before hitting 400 lines)
4. ✅ **New contributors understand** when/how to apply principles
5. ✅ **AI agents maintain specs** without errors
6. ✅ **Can confidently say** "we practice what we preach"
7. ✅ **Tooling is used** regularly (validate, health, complexity commands)
8. ✅ **Reviews include** first principles checks
9. ✅ **Specs stay fresh** (updated within 90 days of related code changes)
10. ✅ **Trend is positive** (average spec complexity decreasing over time)

---

## The Key Insight

**Principles without operationalization are aspirational.**

**Principles with operationalization are practiced.**

The difference between LeanSpec being a "nice idea" and LeanSpec being a "lived practice" is this three-layer approach:

1. **Tooling** makes principles easy to follow
2. **Culture** makes principles expected
3. **Metrics** make principles measurable

All three layers are required. Remove any one and principles decay into nice words that nobody follows.

---

## Related Documents

- [Main Spec](README.md) - Overview and complete findings
- [Analysis](ANALYSIS.md) - Deep dive into constraints
- [First Principles](FIRST-PRINCIPLES.md) - The 5 crystal stone rules
