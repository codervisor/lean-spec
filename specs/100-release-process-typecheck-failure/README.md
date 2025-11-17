---
status: complete
created: '2025-11-17'
tags:
  - process
  - quality
  - ci-cd
  - post-mortem
priority: high
created_at: '2025-11-17T21:12:06.305Z'
completed_at: '2025-11-17T21:12:00.000Z'
updated_at: '2025-11-17T13:13:28.300Z'
completed: '2025-11-17'
---

# Post-Mortem: v0.2.3 TypeScript Check Failure

## Overview

On November 17, 2025, we attempted to release v0.2.3 only to discover **30+ TypeScript compilation errors** that should have been caught before the release process began. This spec documents what went wrong, why it happened, and how to prevent it in the future.

**Impact**: Blocked release, required emergency fix session, wasted development time, damaged trust in release process.

## What Went Wrong

### The Problem
Version 0.2.3 was tagged and released without running `pnpm typecheck`, leading to a published package that:
- Failed TypeScript compilation (`tsc --noEmit` showed 30+ errors)
- Had broken MCP SDK integration (signature mismatches)
- Had type mismatches across packages (core vs CLI)
- Would break for users with strict TypeScript checking

### Root Causes

1. **No Pre-Release Type Check**
   - Release process did NOT include `pnpm typecheck` as a required step
   - Only ran `pnpm build` which uses `tsup` with less strict checking
   - `tsup` successfully bundles code even with type errors when `noCheck: true` or similar flags

2. **No CI/CD Type Checking**
   - GitHub Actions publish workflow (`.github/workflows/publish.yml`) does NOT run `pnpm typecheck`
   - Only runs `pnpm build` before publishing
   - No gate preventing broken releases

3. **Monorepo Complexity**
   - Errors were spread across CLI and Core packages
   - Cross-package type dependencies not validated
   - Core package exported types used in CLI weren't properly exposed

4. **MCP SDK Version Upgrade**
   - SDK v1.21.0 changed handler signatures (added `extra` parameter)
   - No automated check for SDK compatibility
   - Breaking changes went unnoticed until compilation

### Timeline of Errors

The errors fell into several categories:

**Type Export Issues (1 error)**
- `isolate.ts` couldn't import `Frontmatter` type from core (not exported)

**Interface Mismatches (2 errors)**  
- `SpecInfo.date` was required in CLI but optional in core
- `deps.ts` failed due to this mismatch

**Type Casting Issues (2 errors)**
- `search.ts` had `unknown` types for `title`/`description` from frontmatter
- Needed explicit type guards

**MCP SDK Signature Changes (25+ errors)**
- All tool handlers missing required `extra` parameter
- Resource callbacks missing `variables` and `extra` parameters  
- Console capturing code broken by incorrect multi_replace edits
- Type literal issues (`type: 'text'` vs `type: string`)

## Why Didn't We Catch This?

### Human Factors
- **Assumption**: "If build passes, types are good"
- **Habit**: Not running `pnpm typecheck` before releases
- **Time pressure**: Rush to publish without full validation
- **Trust**: Assumed CI would catch issues (but it didn't)

### Process Gaps
- No checklist for releases
- No automated pre-release validation
- No CI gate for type checking
- No cross-package type validation

### Tool Configuration
- `tsup.config.ts` may have been too lenient
- Build tool doesn't enforce strict type checking
- Missing `turbo run typecheck` in release workflow

## What Should Have Happened

### Ideal Pre-Release Checklist
```bash
# 1. Type check all packages
pnpm typecheck

# 2. Run all tests
pnpm test:run

# 3. Build all packages
pnpm build

# 4. Validate docs build
cd docs-site && npm run build

# 5. Run local spec validation
node bin/lean-spec.js validate

# 6. Update CHANGELOG.md

# 7. Commit and tag
git add -A
git commit -m "chore: bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main --tags

# 8. Create GitHub release (triggers CI)
gh release create vX.Y.Z
```

### Ideal CI/CD Workflow
```yaml
# .github/workflows/publish.yml
jobs:
  publish:
    steps:
      - name: Install dependencies
        run: pnpm install
      
      - name: Type check ⚠️ MISSING
        run: pnpm typecheck
      
      - name: Run tests ⚠️ MISSING  
        run: pnpm test:run
      
      - name: Build
        run: pnpm build
      
      - name: Publish to npm
        if: all tests pass
        run: pnpm publish
```

## Lessons Learned

### What Worked
- ✅ Fast identification and triage of errors
- ✅ Systematic fix approach (categorize, prioritize, fix)
- ✅ Good git practices (committed fix, tagged properly)
- ✅ Clear documentation of what was fixed

### What Didn't Work
- ❌ No automated type checking in CI
- ❌ No pre-release validation checklist
- ❌ Build tools don't enforce type safety
- ❌ Assumed "build passes" = "types are correct"
- ❌ No cross-package type validation

## Action Items

### Immediate (Before Next Release)

**1. Add Type Checking to CI Workflow**
```yaml
# .github/workflows/publish.yml
- name: Type check all packages
  run: pnpm typecheck

- name: Run tests
  run: pnpm test:run
```

**2. Create Release Checklist**
Add to `CONTRIBUTING.md` or create `RELEASING.md`:
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm test:run`  
- [ ] Run `pnpm build`
- [ ] Validate with `node bin/lean-spec.js validate`
- [ ] Update CHANGELOG.md
- [ ] Commit, tag, push
- [ ] Create GitHub release

**3. Add Pre-Push Hook** (Optional)
```bash
# .husky/pre-push
pnpm typecheck || (echo "Type check failed!" && exit 1)
```

### Short-term (Next Sprint)

**4. Improve Package Scripts**
Add a `pre-release` script:
```json
{
  "scripts": {
    "pre-release": "pnpm typecheck && pnpm test:run && pnpm build && pnpm validate"
  }
}
```

**5. Enhanced CI Pipeline**
- Add separate typecheck job that runs on all PRs
- Require passing typecheck before merge
- Add matrix testing across Node versions

**6. Documentation**
- Document the release process in `AGENTS.md`
- Add "Why typecheck matters" section
- Include common type error patterns

### Long-term (Future)

**7. Automated Release Process**
Consider tools like:
- `semantic-release` for automated versioning
- `changesets` for monorepo releases
- `release-please` for GitHub-native releases

**8. Type Safety Improvements**
- Enable stricter TypeScript compiler options
- Add `strict: true` to all `tsconfig.json`
- Use `exactOptionalPropertyTypes`
- Enable `noUncheckedIndexedAccess`

**9. Monorepo Type Validation**
- Add Turbo task for cross-package type checking
- Validate type exports/imports between packages
- Add package boundary lint rules

## Metrics to Track

Going forward, track:
- **Time to catch type errors**: Pre-push vs CI vs post-release
- **Type error frequency**: Trend over time
- **Release confidence**: Did we catch issues before release?
- **Developer friction**: Does strict checking slow development?

## Success Criteria

This post-mortem is successful when:
- ✅ CI blocks releases with type errors
- ✅ `pnpm typecheck` is part of standard workflow
- ✅ Developers run typecheck before PRs
- ✅ Zero type-related release failures for 3 months
- ✅ Release checklist is documented and followed

## References

- [TypeScript Handbook - Type Checking](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)
- [Turbo: Type Checking in Monorepos](https://turbo.build/repo/docs/handbook/linting)
- [GitHub Actions: Required Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches#require-status-checks-before-merging)

## Conclusion

This was a **preventable failure** caused by process gaps, not technical limitations. The fix is straightforward:

1. **Always run `pnpm typecheck` before releasing**
2. **Add typecheck to CI/CD pipeline**
3. **Document and follow release checklist**

The tools exist, we just need to use them consistently. This post-mortem serves as both documentation and action plan to ensure this never happens again.

---

**Status**: Complete  
**Priority**: High  
**Owner**: Engineering Team  
**Next Review**: After implementing CI/CD improvements

# Post-Mortem: v0.2.3 TypeScript Check Failure

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-17 · **Tags**: process, quality, ci-cd, post-mortem

**Project**: lean-spec  
**Team**: Core Development

## Overview

<!-- What are we solving? Why now? -->

## Design

<!-- Technical approach, architecture decisions -->

## Plan

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Test

<!-- How will we verify this works? -->

- [ ] Test criteria 1
- [ ] Test criteria 2

## Notes

<!-- Optional: Research findings, alternatives considered, open questions -->
