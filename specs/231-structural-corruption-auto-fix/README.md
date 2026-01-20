---
status: planned
created: 2026-01-20
priority: high
tags:
- quality
- validation
- auto-fix
- automation
depends_on:
- 018-spec-validation
created_at: 2026-01-20T03:16:27.829219851Z
updated_at: 2026-01-20T03:20:55.054610486Z
---

# Automatic Repair of Structural Spec Corruption

## Overview

Automatically detect and repair common structural corruption in specs (unclosed code blocks, malformed frontmatter, duplicate sections, etc.). This extends spec 018's validation by adding safe auto-fix capabilities.

**The Problem:**
- AI agents corrupt specs during editing (unclosed blocks, duplicates, etc.)
- Spec 018 detects these issues but requires manual fixes
- Manual fixes are tedious and error-prone
- Corrupted specs mislead both humans and AI

**The Solution:**
Add safe auto-fix transformations for unambiguous structural issues. Only fix issues with clear, deterministic solutions.

**Key Principles:**
- **Safety first** - Backup before fixing, allow rollback
- **Conservative** - Only fix unambiguous issues
- **Idempotent** - Running twice produces same result
- **Fast** - < 100ms per validation
- **Transparent** - Report what was fixed

## Design

### Auto-Fix Architecture

```
┌─────────────────────────────────────────────────┐
│         Programmatic Validation                 │
│         (Reuse Spec 018 Validators)            │
├─────────────────────────────────────────────────┤
│ • FrontmatterValidator                          │
│ • StructureValidator                            │
│ • CorruptionValidator                           │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│         Classify Issues                         │
│   - Safe to auto-fix?                           │
│   - High confidence?                            │
│   - Deterministic solution?                     │
└─────────────────────────────────────────────────┘
            │                    │
            ▼                    ▼
    ┌─────────────┐      ┌─────────────┐
    │  Auto-Fix   │      │  Report     │
    │  (backup)   │      │  (manual)   │
    └─────────────┘      └─────────────┘
            │
            ▼
    ┌─────────────┐
    │ Revalidate  │
    │ (verify)    │
    └─────────────┘
```

### Safe Auto-Fixes

#### 1. Unclosed Code Blocks

**Detection:** Odd number of ``` fences

**Fix:**
```typescript
function fixUnclosedCodeBlock(content: string): string {
  const lines = content.split('\n');
  const fenceIndices: number[] = [];
  
  lines.forEach((line, i) => {
    if (line.trim().startsWith('```')) {
      fenceIndices.push(i);
    }
  });
  
  // Odd number → unclosed block
  if (fenceIndices.length % 2 !== 0) {
    const lastFence = fenceIndices[fenceIndices.length - 1];
    
    // Find next ## header after last fence
    let nextHeaderIndex = lines.length;
    for (let i = lastFence + 1; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        nextHeaderIndex = i;
        break;
      }
    }
    
    // Insert closing fence before next header
    lines.splice(nextHeaderIndex, 0, '```');
  }
  
  return lines.join('\n');
}
```

**Safety:** Only fix if next section is clear header (##)

#### 2. Malformed Frontmatter Dates

**Detection:** Non-ISO 8601 date format

**Fix:**
```typescript
function fixMalformedDate(frontmatter: any): void {
  if (frontmatter.created && !isISO8601(frontmatter.created)) {
    const parsed = parseDate(frontmatter.created);
    if (parsed) {
      frontmatter.created = formatISO(parsed);
    }
  }
}

function parseDate(str: string): Date | null {
  // Try common formats: MM/DD/YYYY, DD-MM-YYYY, etc.
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,    // DD-MM-YYYY
    // ... more formats
  ];
  
  for (const format of formats) {
    const match = str.match(format);
    if (match) {
      // Parse and validate
      return new Date(/* ... */);
    }
  }
  
  return null;
}
```

**Safety:** Only fix if date can be unambiguously parsed

#### 3. Duplicate Section Headers

**Detection:** Multiple H2 headers with same name

**Fix:**
```typescript
function removeDuplicateHeaders(content: string): string {
  const lines = content.split('\n');
  const seenH2Headers = new Set<string>();
  const toRemove: number[] = [];
  
  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      const headerText = line.substring(3).trim();
      
      if (seenH2Headers.has(headerText)) {
        // Mark for removal (header + content until next header)
        toRemove.push(i);
      } else {
        seenH2Headers.add(headerText);
      }
    }
  });
  
  // Remove duplicate sections
  // (Keep first occurrence, remove subsequent)
  return lines.filter((_, i) => !toRemove.includes(i)).join('\n');
}
```

**Safety:** Keep first occurrence, remove subsequent ones

#### 4. Missing Required Frontmatter Fields

**Detection:** Required field missing from frontmatter

**Fix:**
```typescript
function addMissingFields(frontmatter: any): void {
  if (!frontmatter.status) {
    frontmatter.status = 'planned';  // Sensible default
  }
  
  if (!frontmatter.created) {
    frontmatter.created = formatISO(new Date());  // Current date
  }
}
```

**Safety:** Only add with sensible defaults

### Auto-Fix Interface

```typescript
export interface FixableIssue {
  issue: ValidationIssue;
  canAutoFix: boolean;
  safe: boolean;
  fix: () => Promise<void>;
}

export interface AutoFixResult {
  success: boolean;
  fixedCount: number;
  fixes: Array<{
    description: string;
    location: string;
  }>;
  errors: string[];
}

export class AutoFixer {
  async fix(specPath: string, issues: FixableIssue[]): Promise<AutoFixResult> {
    // 1. Create backup
    const backup = await this.createBackup(specPath);
    
    try {
      const fixes: any[] = [];
      
      // 2. Apply each fix
      for (const issue of issues) {
        if (issue.canAutoFix && issue.safe) {
          await issue.fix();
          fixes.push({
            description: issue.issue.message,
            location: issue.issue.location
          });
        }
      }
      
      // 3. Revalidate
      const revalidation = await validateSpec(specPath);
      
      if (revalidation.hasErrors()) {
        // Fix made things worse - rollback
        await this.rollback(specPath, backup);
        return {
          success: false,
          fixedCount: 0,
          fixes: [],
          errors: ['Validation failed after fixes - rolled back']
        };
      }
      
      // 4. Success
      await this.scheduleBackupCleanup(backup, 60000);  // 1 min
      
      return {
        success: true,
        fixedCount: fixes.length,
        fixes,
        errors: []
      };
      
    } catch (error) {
      // Rollback on any error
      await this.rollback(specPath, backup);
      throw error;
    }
  }
}
```

### Backup & Rollback

```typescript
class BackupManager {
  async createBackup(filePath: string): Promise<string> {
    const timestamp = Date.now();
    const backupPath = `${filePath}.backup-${timestamp}`;
    await fs.copyFile(filePath, backupPath);
    return backupPath;
  }
  
  async rollback(filePath: string, backupPath: string): Promise<void> {
    await fs.copyFile(backupPath, filePath);
    await fs.unlink(backupPath);
  }
  
  async scheduleCleanup(backupPath: string, delayMs: number): Promise<void> {
    setTimeout(async () => {
      try {
        await fs.unlink(backupPath);
      } catch (error) {
        // Backup already cleaned or deleted manually
      }
    }, delayMs);
  }
}
```

### Configuration

```json
{
  "autoFix": {
    "enabled": true,
    "rules": {
      "unclosedCodeBlocks": true,
      "malformedDates": true,
      "duplicateHeaders": true,
      "missingRequiredFields": true
    },
    "backup": {
      "enabled": true,
      "retentionMinutes": 60
    }
  }
}
```

## Plan

- [ ] Design `FixableIssue` and `AutoFixResult` interfaces
- [ ] Implement `AutoFixer` class with backup/rollback
- [ ] Add fix implementations:
  - [ ] Unclosed code blocks
  - [ ] Malformed dates
  - [ ] Duplicate headers
  - [ ] Missing required fields
- [ ] Integrate with spec 018 validators
- [ ] Add revalidation after fixes
- [ ] Write unit tests (40+ test cases)
- [ ] Add CLI command: `lean-spec fix <spec>`
- [ ] Add `--dry-run` flag (show what would be fixed)
- [ ] Integration with file watcher
- [ ] Documentation

## Test

### Fix Implementation Tests
- [ ] Unclosed code blocks are closed correctly
- [ ] Malformed dates are converted to ISO 8601
- [ ] Duplicate headers are removed (keep first)
- [ ] Missing fields are added with defaults
- [ ] Doesn't break valid content

### Backup & Rollback Tests
- [ ] Creates backup before fixing
- [ ] Rolls back on validation failure
- [ ] Rolls back on error
- [ ] Cleans up backups after retention period
- [ ] No data loss in any scenario

### Safety Tests
- [ ] Revalidates after fixes
- [ ] Reports what was fixed
- [ ] Reports what couldn't be fixed
- [ ] Idempotent (running twice = same result)
- [ ] Performance < 100ms

## Notes

**Non-Fixable Issues:**
These require manual intervention:
- Invalid status/priority values (requires decision)
- Empty required sections (requires content)
- Broken links (requires investigation)
- Complex corruption (ambiguous fix)

**Future Enhancements:**
- Interactive mode (show diff, ask user to approve)
- Custom fix rules via config
- LLM-powered fix suggestions (for semantic issues)
- Batch fix mode (fix all specs in project)