---
status: planned
created: 2025-11-02
tags: [feature, ci, automation]
priority: medium
---

# github-action

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-02

## Overview

Create a GitHub Action to automate LeanSpec workflows in CI/CD pipelines. Enable teams to validate specs, check status, and enforce spec requirements as part of their development process.

**Use Cases:**
1. **Spec Validation** - Ensure all specs have required frontmatter
2. **Status Checks** - Block PRs if planned specs aren't complete
3. **Documentation Generation** - Auto-generate spec summaries in PR comments
4. **Metrics Collection** - Track spec completion over time
5. **Template Compliance** - Validate specs follow template structure

**Why Now:**
- Core CLI is stable and tested
- Common use case for teams adopting LeanSpec
- Differentiator for AI-powered development workflows

## Design

### 1. Action Types

**Option A: Single Flexible Action**
```yaml
- uses: codervisor/lspec-action@v1
  with:
    command: validate  # or: stats, board, search, check-status
    filters: '--status=in-progress'
    fail-on-error: true
```

**Option B: Multiple Specific Actions**
```yaml
- uses: codervisor/lspec-validate@v1
- uses: codervisor/lspec-stats@v1
- uses: codervisor/lspec-check-status@v1
```

**Recommendation**: Option A (single flexible action) for v1, easier to maintain.

### 2. Core Features

**1. Spec Validation**
```yaml
- uses: codervisor/lspec-action@v1
  with:
    command: validate
    rules: |
      - required: [status, created]
      - no-empty-sections: true
      - max-age-days: 90
```

**2. Status Checks**
```yaml
- uses: codervisor/lspec-action@v1
  with:
    command: check-status
    fail-if: 'in-progress'
    message: 'Cannot merge with in-progress specs'
```

**3. PR Comments**
```yaml
- uses: codervisor/lspec-action@v1
  with:
    command: stats
    output: pr-comment
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

**4. Metrics Export**
```yaml
- uses: codervisor/lspec-action@v1
  with:
    command: export-metrics
    format: json
    output-file: specs-metrics.json
```

### 3. Action Structure

```
lspec-action/
├── action.yml          # Action metadata
├── dist/
│   └── index.js       # Bundled action code (ncc)
├── src/
│   ├── main.ts        # Entry point
│   ├── commands/      # Command implementations
│   │   ├── validate.ts
│   │   ├── check-status.ts
│   │   ├── stats.ts
│   │   └── export.ts
│   └── utils/
│       ├── github.ts  # GitHub API helpers
│       └── formatting.ts
├── package.json
├── tsconfig.json
└── README.md
```

### 4. Example Workflows

**Validate on PR:**
```yaml
name: Validate Specs
on: pull_request

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codervisor/lspec-action@v1
        with:
          command: validate
          fail-on-error: true
```

**Block Merge with In-Progress Specs:**
```yaml
name: Check Spec Status
on: pull_request

jobs:
  check-status:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codervisor/lspec-action@v1
        with:
          command: check-status
          allow-status: 'planned,complete'
          fail-if: 'in-progress'
```

**Post Stats to PR:**
```yaml
name: Spec Stats
on: pull_request

jobs:
  stats:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codervisor/lspec-action@v1
        with:
          command: stats
          output: pr-comment
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### 5. Action Inputs

```yaml
inputs:
  command:
    description: 'Command to run (validate, check-status, stats, export-metrics)'
    required: true
  
  fail-on-error:
    description: 'Fail action if validation fails'
    default: 'true'
  
  filters:
    description: 'CLI filter flags (--status, --tag, --priority)'
    required: false
  
  output:
    description: 'Output type (console, pr-comment, file, json)'
    default: 'console'
  
  output-file:
    description: 'Output file path (for file/json output)'
    required: false
  
  github-token:
    description: 'GitHub token for PR comments'
    required: false
  
  working-directory:
    description: 'Directory containing .lspec/ (defaults to repo root)'
    default: '.'
```

### 6. Action Outputs

```yaml
outputs:
  result:
    description: 'Command result (success/failure)'
  
  stats:
    description: 'Spec statistics (JSON)'
  
  validation-errors:
    description: 'List of validation errors (JSON array)'
  
  comment-url:
    description: 'URL of posted PR comment'
```

## Plan

### Phase 1: Setup & Core Infrastructure
- [ ] Create `lspec-action` repository
- [ ] Set up TypeScript build with @vercel/ncc for bundling
- [ ] Create action.yml with inputs/outputs
- [ ] Set up GitHub Actions workflow for testing action itself
- [ ] Install lean-spec as dependency

### Phase 2: Core Commands
- [ ] Implement `validate` command (check frontmatter, structure)
- [ ] Implement `check-status` command (fail on specific statuses)
- [ ] Implement `stats` command (gather metrics)
- [ ] Implement `export-metrics` command (JSON output)
- [ ] Add formatting utilities for console/PR output

### Phase 3: GitHub Integration
- [ ] Add PR comment posting (using @actions/github)
- [ ] Add commit status updates
- [ ] Add annotations for validation errors
- [ ] Test with sample repository

### Phase 4: Documentation & Examples
- [ ] Write comprehensive README
- [ ] Add example workflows for common use cases
- [ ] Create action marketplace listing
- [ ] Document all inputs/outputs

### Phase 5: Publishing
- [ ] Tag v1.0.0 release
- [ ] Publish to GitHub Marketplace
- [ ] Link from lean-spec README
- [ ] Create demo repository showing usage

## Test

### Action Tests
- [ ] Action builds and bundles correctly
- [ ] All commands execute without errors
- [ ] Exit codes are correct (0 for success, 1 for failure)
- [ ] Inputs are parsed correctly
- [ ] Outputs are set correctly

### Command Tests
- [ ] `validate` detects missing frontmatter
- [ ] `validate` passes for valid specs
- [ ] `check-status` fails on disallowed statuses
- [ ] `stats` generates correct metrics
- [ ] `export-metrics` produces valid JSON

### GitHub Integration Tests
- [ ] PR comments are posted correctly
- [ ] Comments include formatted tables
- [ ] Annotations appear on correct files/lines
- [ ] Works with GITHUB_TOKEN

### End-to-End Tests
- [ ] Run action in test repository
- [ ] Validate specs workflow works
- [ ] PR comment workflow works
- [ ] Metrics export workflow works

## Notes

**Dependencies:**
- lean-spec CLI (core dependency)
- @actions/core (GitHub Actions SDK)
- @actions/github (GitHub API)
- @vercel/ncc (bundle for distribution)

**Marketplace Listing:**
- Name: "LeanSpec Action"
- Description: "Validate and manage LeanSpec documents in CI/CD"
- Categories: Code Quality, Continuous Integration
- Icon: 📋 or 📝
- Color: Blue

**Future Enhancements:**
- Spec coverage reports (% of code with specs)
- Spec drift detection (specs out of sync with code)
- Auto-create specs from PR descriptions
- Integration with Linear, Jira for issue linking
- Spec dependency graph visualization in PR

**Alternative: Reusable Workflow**
Instead of GitHub Action, could provide reusable workflow:
```yaml
# .github/workflows/lspec-validate.yml
on:
  workflow_call:
    inputs:
      command:
        required: true
        type: string
```

But GitHub Action is more flexible and easier for users to adopt.

**References:**
- GitHub Actions docs: https://docs.github.com/en/actions
- Action toolkit: https://github.com/actions/toolkit
- Marketplace: https://github.com/marketplace?type=actions
