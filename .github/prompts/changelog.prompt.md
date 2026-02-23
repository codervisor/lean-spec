---
name: changelog
description: Update CHANGELOG.md with new entries following Keep a Changelog format
---

# Changelog Update Guidelines

Update the CHANGELOG.md file following [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Discovering Changes

Before writing changelog entries, gather information from these sources:

1. **Recent commits** - Run `git log --oneline -20` or check commits since last release
2. **Changed files** - Run `git diff <last-release-tag>..HEAD --stat` to see what changed
3. **PR/merge commits** - Look for feature branches merged since last release

### Useful Commands

```bash
# Commits since last tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline

# Files changed since last release
git diff v0.2.23..HEAD --stat
```

## Entry Format

**Only include shipped/implemented changes** - Do not add planned specs, documentation drafts, or work-in-progress features.

Add entries under `## [Unreleased]` section using these categories:

- **Added** - New features or capabilities
- **Changed** - Changes to existing functionality
- **Fixed** - Bug fixes
- **Deprecated** - Features marked for removal
- **Removed** - Removed features
- **Security** - Security-related changes
- **Technical** - Internal improvements (tests, deps, refactoring)

## Writing Style

1. **Start with bold feature name** followed by description:
   ```markdown
   - **Feature Name** - Brief description of the change
     - Sub-bullet with implementation details
     - Another detail if needed
   ```

2. **Link related specs** when applicable:
   ```markdown
   - **Feature Name** ([spec 123](https://web.lean-spec.dev/specs/123)) - Description
   ```

3. **Use present tense** for descriptions (e.g., "Adds support for..." not "Added support for...")

4. **Be specific** - Include command names, flag names, component names

5. **Group related changes** under single bullet with sub-bullets

## Example Entry

```markdown
### Added
- **Inline Metadata Editing** ([spec 134](https://web.lean-spec.dev/specs/134)) - Edit spec metadata in browser
  - Status dropdown with color-coded badges
  - Priority selector with keyboard navigation
  - Optimistic updates with automatic rollback

### Changed
- **Search Algorithm** - Switched to TF-IDF scoring for better relevance

### Fixed
- Sidebar scroll position drift during navigation
- Missing sub-specs count in spec detail view
```

## When Creating a Release

1. Move entries from `[Unreleased]` to new version section
2. Add version number with date: `## [0.2.24] - 2026-02-05`
3. Add release link at bottom of file:
   ```markdown
   [0.2.24]: https://github.com/codervisor/lean-spec/releases/tag/v0.2.24
   ```

## Tips

- **Only document shipped code** - Skip planned specs, documentation drafts, or WIP features
- Check git history for changes to document
- Keep entries concise but informative
- Include breaking changes prominently with **Breaking:** prefix
- Reference spec numbers for traceability when applicable