# Design Decisions

## 1. File-Centric Grouping

Group all issues by file path, not by validator type:

```diff
- Line Count:
-   ✗ 045-unified-dashboard (1169 lines - exceeds limit!)
-   ⚠ 049-leanspec-first-principles (373 lines - approaching limit)
- 
- Structure:
-   ✓ All 25 spec(s) passed
- 
- Sub-Specs:
-   ⚠ 045-unified-dashboard
-     • Orphaned sub-spec: IMPLEMENTATION.md

+ 045-unified-dashboard/README.md
+   error    Spec exceeds 400 lines (1169 lines)                   max-lines
+   warning  Orphaned sub-spec: IMPLEMENTATION.md                  sub-specs
+
+ 049-leanspec-first-principles/README.md
+   warning  Spec approaching limit (373/400 lines)                max-lines
```

**Rationale:** Matches ESLint/TypeScript. Easier to find issues for a specific spec.

## 2. Compact Error Format

Use aligned columns like ESLint:

```
<severity>  <message>  <rule-name>
           <suggestion>
```

## 3. Quiet Success Mode (Default)

Only show specs with issues, summarize clean specs:

```diff
- Line Count:
-   ✓ 053-spec-assets-philosophy (98 lines)
-   ✓ 052-branding-assets (129 lines)
-   ✓ 043-official-launch-02 (200 lines)
-   ... (15 more passing specs)

+ ✖ 5 errors, 13 warnings (25 specs checked, 19 clean)
```

## 4. Severity Hierarchy

Always show errors before warnings within a file - matches how developers prioritize fixes.

## Design Trade-offs

### Considered: Keep Validator Grouping

```
Pros: Shows all line count issues together
Cons: Requires scanning multiple sections per spec
```

**Decision:** File-centric grouping (like ESLint/TypeScript)

**Rationale:** Developers fix issues file-by-file, not rule-by-rule. Better to show all issues for a file together.

### Considered: Show All Passing Specs

```
Pros: Complete transparency
Cons: Noisy output, hard to spot issues
```

**Decision:** Quiet success by default, `--verbose` for details

**Rationale:** ESLint/Prettier only show issues. Summary line provides confidence.

## Backward Compatibility

**Breaking Changes:**

- Output format completely different (but exit codes unchanged)
- Default behavior: quiet success (was: show all passing specs)

**Migration:**

1. Release in v0.2.0 with clear CHANGELOG notes
2. Add migration guide showing old vs new output
3. Keep `--verbose` as escape hatch for old-style detail

**Rationale:** v0.2.0 is the "official launch" - acceptable time for UX breaking changes.
