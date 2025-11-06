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
