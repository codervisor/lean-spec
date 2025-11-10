# Migration Guide

## Migrating to Flat Structure (v0.2.0)

Starting with v0.2.0, LeanSpec defaults to a **flat structure with global sequence numbers** instead of date-based grouping. This simplifies spec organization for most projects.

### What Changed?

**Before (v0.1.x):**
```
specs/
├── 20251031/
│   ├── 001-feature-a/
│   └── 002-feature-b/
└── 20251103/
    ├── 001-feature-c/    # ← Sequence resets per date
    └── 002-feature-d/
```

**After (v0.2.0):**
```
specs/
├── 001-feature-a/
├── 002-feature-b/
├── 003-feature-c/    # ← Global unique sequence
└── 004-feature-d/
```

**Key differences:**
- ✅ **No date folders** - Simpler navigation
- ✅ **Global sequence numbers** - Unique across entire project (001, 002, 003...)
- ✅ **Easier references** - Just say "spec 003" instead of "specs/20251103/001"

### Compatibility

**Existing projects continue working without changes.** LeanSpec automatically detects and handles both structures.

### Migration Options

#### Option 1: Keep Date-Based Structure (Recommended for Active Projects)

If you have an active project with many specs, **keep your current structure**:

```json
// .lean-spec/config.json
{
  "structure": {
    "pattern": "custom",
    "groupExtractor": "{YYYYMMDD}",
    "sequenceDigits": 3
  }
}
```

**Note**: Even with date folders, sequence numbers remain globally unique starting with v0.2.0.

#### Option 2: Migrate to Flat Structure

For smaller projects or those wanting simpler organization:

**Step 1: Backup your specs**
```bash
cp -r specs specs-backup
```

**Step 2: Flatten the directory structure**
```bash
# Move all specs to root specs/ folder
for dir in specs/*/; do
  if [ "$(basename "$dir")" != "archived" ]; then
    mv "$dir"*/ specs/ 2>/dev/null || true
  fi
done

# Remove empty date folders
rmdir specs/202* 2>/dev/null || true
```

**Step 3: Update config**
```json
// .lean-spec/config.json
{
  "structure": {
    "pattern": "flat",
    "prefix": "",
    "sequenceDigits": 3
  }
}
```

**Step 4: Verify**
```bash
lspec list        # Should show all specs
lspec stats       # Verify counts are correct
```

#### Option 3: Date Prefix for Chronological Sorting

If you want flat structure but prefer chronological sorting:

```json
// .lean-spec/config.json
{
  "structure": {
    "pattern": "flat",
    "prefix": "{YYYYMMDD}-",  // Results in: 20251103-001-feature/
    "sequenceDigits": 3
  }
}
```

**Result:**
```
specs/
├── 20251031-001-feature-a/
├── 20251031-002-feature-b/
├── 20251103-003-feature-c/
└── 20251103-004-feature-d/
```

### Breaking Changes

**For new projects only:**
- Default structure changed from date-based to flat
- New projects use global sequence numbers without date folders

**No breaking changes for existing projects:**
- Existing specs continue working
- All commands (`lspec list`, `lspec search`, etc.) work with both structures
- Archive functionality unchanged

### FAQ

**Q: Do I have to migrate?**  
A: No. Existing projects work as-is. This only affects new projects created with `lspec init`.

**Q: Will my sequence numbers change?**  
A: No. Sequence numbers remain the same. They're just organized differently (flat vs. date folders).

**Q: Can I still use date-based grouping?**  
A: Yes! Set `pattern: "custom"` and `groupExtractor: "{YYYYMMDD}"` in your config.

**Q: What about archives?**  
A: Archives remain in `specs/archived/` (flat structure) regardless of your main pattern.

**Q: Are sequence numbers still unique?**  
A: Yes! Sequence numbers are globally unique across your entire project, regardless of folder structure.

### Need Help?

If you encounter issues during migration:

1. Check your backup (`specs-backup/`)
2. Review config with `cat .lean-spec/config.json`
3. Test with `lspec list --verbose`
4. Open an issue: https://github.com/codervisor/lean-spec/issues

### Rollback

To rollback to date-based structure:

```bash
# Restore backup
rm -rf specs
mv specs-backup specs

# Update config
lspec init --force  # Then select custom pattern
```
