# Design Document: Folder Structure Improvements

> Detailed implementation notes for spec 002

## Implementation Details

### Auto-Check Integration

Auto-check runs automatically in these commands:

**Commands that interact with specs (11 total):**
1. `lean-spec create` - After creating spec
2. `lean-spec list` - Before showing list
3. `lean-spec board` - Before showing board
4. `lean-spec update` - Before updating spec
5. `lean-spec search` - Before searching
6. `lean-spec stats` - Before showing stats
7. `lean-spec timeline` - Before showing timeline
8. `lean-spec gantt` - Before showing gantt
9. `lean-spec deps` - Before showing dependencies
10. `lean-spec files` - Before listing files
11. `lean-spec archive` - Before archiving

**Commands that skip auto-check:**
- `lean-spec init` - No specs exist yet
- `lean-spec templates` - Template management only
- `lean-spec check` - Already checking conflicts

**Integration pattern:**
```typescript
// Standard pattern for all commands
import { autoCheckIfEnabled } from './check.js';

export async function someCommand(options: any): Promise<void> {
  // Auto-check at start (or end for create)
  await autoCheckIfEnabled();
  
  // ... rest of command logic
}
```

**Specific implementations:**

```typescript
// src/commands/create.ts
export async function createSpec(...) {
  // ... create spec logic ...
  
  console.log(chalk.green(`✓ Created: ${specDir}/`));
  
  // Auto-check AFTER creation
  await autoCheckIfEnabled();
}

// src/commands/list.ts
export async function listSpecs(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... list logic ...
}

// src/commands/board.ts
export async function boardCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... board logic ...
}

// src/commands/update.ts
export async function updateSpec(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... update logic ...
}

// src/commands/search.ts
export async function searchCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... search logic ...
}

// src/commands/stats.ts
export async function statsCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... stats logic ...
}

// src/commands/timeline.ts
export async function timelineCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... timeline logic ...
}

// src/commands/gantt.ts
export async function ganttCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... gantt logic ...
}

// src/commands/deps.ts
export async function depsCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... deps logic ...
}

// src/commands/files.ts
export async function filesCommand(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... files logic ...
}

// src/commands/archive.ts
export async function archiveSpec(...) {
  await autoCheckIfEnabled();  // Check at start
  // ... archive logic ...
}
```

### Config Schema Update

```typescript
// src/config.ts
export interface LeanSpecConfig {
  template: string;
  templates?: Record<string, string>;
  specsDir: string;
  autoCheck?: boolean;  // NEW: Enable/disable auto-check (default: true)
  structure: {
    pattern: 'flat' | 'custom' | string;
    dateFormat: string;
    sequenceDigits: number;
    defaultFile: string;
    prefix?: string;
    groupExtractor?: string;
    groupFallback?: string;
  };
  features?: {
    aiAgents?: boolean;
    examples?: boolean;
    collaboration?: boolean;
    compliance?: boolean;
    approvals?: boolean;
    apiDocs?: boolean;
  };
  frontmatter?: {
    required?: string[];
    optional?: string[];
    custom?: Record<string, 'string' | 'number' | 'boolean' | 'array'>;
  };
  variables?: Record<string, string>;
}
```

### 1. Default Config Change

```typescript
// src/config.ts
const DEFAULT_CONFIG: LeanSpecConfig = {
  template: 'spec-template.md',
  templates: {
    default: 'spec-template.md',
  },
  specsDir: 'specs',
  structure: {
    pattern: 'flat',
    prefix: '{YYYYMMDD}-',  // NEW: Add date prefix by default
    dateFormat: 'YYYYMMDD',
    sequenceDigits: 3,
    defaultFile: 'README.md',
  },
  features: {
    aiAgents: true,
    examples: true,
  },
};
```

### 2. Create Command: Add --no-prefix Flag

```typescript
// src/commands/create.ts
import { autoCheckIfEnabled } from './check.js';  // NEW

export async function createSpec(name: string, options: { 
  title?: string; 
  description?: string;
  tags?: string[];
  priority?: SpecPriority;
  assignee?: string;
  template?: string;
  customFields?: Record<string, unknown>;
  noPrefix?: boolean;  // NEW
} = {}): Promise<void> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);

  await fs.mkdir(specsDir, { recursive: true });

  const seq = await getGlobalNextSeq(specsDir, config.structure.sequenceDigits);
  
  let specRelativePath: string;
  
  if (config.structure.pattern === 'flat') {
    // NEW: Check noPrefix flag
    const prefix = options.noPrefix 
      ? ''
      : config.structure.prefix 
        ? resolvePrefix(config.structure.prefix, config.structure.dateFormat)
        : '';
    specRelativePath = `${prefix}${seq}-${name}`;
  } else if (config.structure.pattern === 'custom') {
    // ... existing custom pattern logic
  }
  
  // ... create spec logic ...
  
  console.log(chalk.green(`✓ Created: ${specDir}/`));
  console.log(chalk.gray(`  Edit: ${specFile}`));
  
  // NEW: Auto-check after creation
  await autoCheckIfEnabled();
}
```

### 3. Check Command Implementation

```typescript
// src/commands/check.ts
import * as path from 'node:path';
import chalk from 'chalk';
import { loadConfig } from '../config.js';
import { loadAllSpecs } from '../spec-loader.js';

export async function checkSpecs(options: {
  quiet?: boolean;
  silent?: boolean;  // NEW: Completely suppress output
} = {}): Promise<boolean> {
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  // Find all specs with sequence numbers
  const specs = await loadAllSpecs();
  const sequenceMap = new Map<number, string[]>();
  
  for (const spec of specs) {
    // Extract sequence number from spec name
    const specName = path.basename(spec.path);
    const match = specName.match(/^(\d+)-/);
    
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!sequenceMap.has(seq)) {
        sequenceMap.set(seq, []);
      }
      sequenceMap.get(seq)!.push(spec.path);
    }
  }
  
  // Find conflicts (sequences with multiple specs)
  const conflicts = Array.from(sequenceMap.entries())
    .filter(([_, paths]) => paths.length > 1)
    .sort(([a], [b]) => a - b);
  
  if (conflicts.length === 0) {
    if (!options.quiet && !options.silent) {
      console.log(chalk.green('✓ No sequence conflicts detected'));
    }
    return true;
  }
  
  // Report conflicts
  if (!options.silent) {
    if (!options.quiet) {
      // Full output
      console.log('');
      console.log(chalk.yellow('⚠️  Sequence conflicts detected:\n'));
      
      for (const [seq, paths] of conflicts) {
        console.log(chalk.red(`  Sequence ${String(seq).padStart(config.structure.sequenceDigits, '0')}:`));
        for (const p of paths) {
          console.log(chalk.gray(`    - ${p}`));
        }
        console.log('');
      }
      
      console.log(chalk.cyan('Tip: Use date prefix to prevent conflicts:'));
      console.log(chalk.gray('  Edit .lspec/config.json → structure.prefix: "{YYYYMMDD}-"'));
      console.log('');
      console.log(chalk.cyan('Or rename folders manually to resolve.'));
      console.log('');
    } else {
      // Brief warning (for auto-check)
      console.log('');
      console.log(chalk.yellow(`⚠️  Conflict warning: ${conflicts.length} sequence conflict(s) detected`));
      console.log(chalk.gray('Run: lean-spec check'));
      console.log('');
    }
  }
  
  return false;
}

// NEW: Helper for auto-check in other commands
export async function autoCheckIfEnabled(): Promise<void> {
  const config = await loadConfig();
  
  // Check if auto-check is disabled
  if (config.autoCheck === false) {
    return;
  }
  
  // Run check in quiet mode (brief warning only)
  try {
    await checkSpecs({ quiet: true });
  } catch {
    // Ignore errors in auto-check
  }
}
```

### 4. Pattern-Aware List Grouping

```typescript
// src/commands/list.ts
import { autoCheckIfEnabled } from './check.js';  // NEW

function groupSpecs(specs: Spec[], config: LeanSpecConfig): Map<string, Spec[]> {
  if (config.structure.pattern === 'flat') {
    // Group by month from frontmatter.created
    const byMonth = new Map<string, Spec[]>();
    
    for (const spec of specs) {
      const created = spec.frontmatter.created;
      const date = new Date(created);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, []);
      }
      byMonth.get(monthKey)!.push(spec);
    }
    
    return byMonth;
  } else {
    // Group by folder structure (first path component)
    const byFolder = new Map<string, Spec[]>();
    
    for (const spec of specs) {
      const folder = spec.path.split('/')[0];
      
      if (!byFolder.has(folder)) {
        byFolder.set(folder, []);
      }
      byFolder.get(folder)!.push(spec);
    }
    
    return byFolder;
  }
}

export async function listSpecs(options: {
  showArchived?: boolean;
  status?: SpecStatus | SpecStatus[];
  tags?: string[];
  priority?: SpecPriority | SpecPriority[];
  assignee?: string;
  customFields?: Record<string, unknown>;
  flat?: boolean;  // NEW: Disable grouping
} = {}): Promise<void> {
  // NEW: Auto-check before listing
  await autoCheckIfEnabled();
  
  const config = await loadConfig();
  const cwd = process.cwd();
  const specsDir = path.join(cwd, config.specsDir);
  
  try {
    await fs.access(specsDir);
  } catch {
    console.log('');
    console.log('No specs directory found. Initialize with: lean-spec init');
    console.log('');
    return;
  }

  // Build filter options and load specs...
  // ... rest of list implementation ...
}
```

### 5. CLI Command Registration

```typescript
// src/cli.ts

// Import new command
import { checkSpecs } from './commands/check.js';

// Add command
program
  .command('check')
  .description('Check for sequence conflicts')
  .option('-q, --quiet', 'Suppress output')
  .action(async (options) => {
    const hasConflicts = await checkSpecs(options);
    process.exit(hasConflicts ? 0 : 1);
  });

// Update create command
program
  .command('create <name>')
  .description('Create a new spec')
  .option('-t, --title <title>', 'Spec title')
  .option('-d, --description <description>', 'Spec description')
  .option('--tags <tags>', 'Comma-separated tags')
  .option('-p, --priority <priority>', 'Priority (low, medium, high, critical)')
  .option('--assignee <assignee>', 'Assignee name')
  .option('--template <template>', 'Template to use')
  .option('--field <key=value>', 'Custom field (repeatable)', collectFields, {})
  .option('--no-prefix', 'Skip date prefix even if configured')  // NEW
  .action(async (name, options) => {
    // ... parse options
    await createSpec(name, {
      // ... other options
      noPrefix: !options.prefix,  // NEW
    });
  });

// Update list command
program
  .command('list')
  .description('List all specs')
  .option('-a, --archived', 'Include archived specs')
  .option('-s, --status <status>', 'Filter by status')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-p, --priority <priority>', 'Filter by priority')
  .option('--assignee <assignee>', 'Filter by assignee')
  .option('--field <key=value>', 'Filter by custom field', collectFields, {})
  .option('--flat', 'Disable grouping')  // NEW
  .action(async (options) => {
    // ... parse options
    await listSpecs({
      // ... other options
      flat: options.flat,  // NEW
    });
  });
```

### 6. Template Config Updates

```json
// templates/minimal/config.json
{
  "name": "Minimal",
  "description": "Just the essentials - folder structure only",
  "config": {
    "template": "minimal",
    "specsDir": "specs",
    "structure": {
      "pattern": "flat",
      "prefix": "{YYYYMMDD}-",
      "dateFormat": "YYYYMMDD",
      "sequenceDigits": 3,
      "defaultFile": "README.md"
    }
  }
}
```

```json
// templates/standard/config.json
{
  "name": "Standard",
  "description": "Recommended for most projects - solo devs and small teams",
  "config": {
    "template": "standard",
    "specsDir": "specs",
    "structure": {
      "pattern": "flat",
      "prefix": "{YYYYMMDD}-",
      "dateFormat": "YYYYMMDD",
      "sequenceDigits": 3,
      "defaultFile": "README.md"
    },
    "features": {
      "aiAgents": true
    }
  }
}
```

```json
// templates/enterprise/config.json
{
  "name": "Enterprise",
  "description": "Governance-ready with approvals, compliance, and security",
  "config": {
    "template": "enterprise",
    "specsDir": "specs",
    "structure": {
      "pattern": "custom",
      "groupExtractor": "{YYYYMMDD}",
      "dateFormat": "YYYYMMDD",
      "sequenceDigits": 3,
      "defaultFile": "README.md"
    },
    "features": {
      "aiAgents": true,
      "compliance": true,
      "approvals": true
    }
  }
}
```

### 7. Init Wizard Pattern Selection

```typescript
// src/commands/init.ts

// Add pattern selection
async function promptStructurePattern(): Promise<Partial<LeanSpecConfig['structure']>> {
  const choice = await select({
    message: 'How do you want to organize specs?',
    options: [
      {
        name: 'Flat with dates (Recommended)',
        value: 'flat-dated',
        description: '20251103-001-feature/ - Prevents conflicts in teams',
      },
      {
        name: 'Flat, clean numbers',
        value: 'flat-clean',
        description: '001-feature/ - Simple for solo developers',
      },
      {
        name: 'Date folders',
        value: 'custom-date',
        description: '20251103/001-feature/ - Traditional nested structure',
      },
    ],
  });
  
  switch (choice) {
    case 'flat-dated':
      return {
        pattern: 'flat',
        prefix: '{YYYYMMDD}-',
        sequenceDigits: 3,
        dateFormat: 'YYYYMMDD',
        defaultFile: 'README.md',
      };
    case 'flat-clean':
      return {
        pattern: 'flat',
        sequenceDigits: 3,
        dateFormat: 'YYYYMMDD',
        defaultFile: 'README.md',
      };
    case 'custom-date':
      return {
        pattern: 'custom',
        groupExtractor: '{YYYYMMDD}',
        sequenceDigits: 3,
        dateFormat: 'YYYYMMDD',
        defaultFile: 'README.md',
      };
    default:
      return {
        pattern: 'flat',
        prefix: '{YYYYMMDD}-',
        sequenceDigits: 3,
        dateFormat: 'YYYYMMDD',
        defaultFile: 'README.md',
      };
  }
}

// Update init function
export async function initProject(options: { template?: string } = {}): Promise<void> {
  // ... existing template selection
  
  // NEW: Add structure pattern selection
  const structureConfig = await promptStructurePattern();
  
  // Merge structure config into final config
  config.structure = {
    ...config.structure,
    ...structureConfig,
  };
  
  // ... rest of init
}
```

## Testing Strategy

### Unit Tests

```typescript
// src/commands/check.test.ts
describe('checkSpecs', () => {
  it('should detect duplicate sequences', async () => {
    // Create two specs with same sequence
    await createTestSpec('001-feature-a');
    await createTestSpec('001-feature-b');
    
    const hasConflicts = await checkSpecs({ quiet: true });
    expect(hasConflicts).toBe(false); // Returns false when conflicts exist
  });
  
  it('should pass when no conflicts', async () => {
    await createTestSpec('001-feature-a');
    await createTestSpec('002-feature-b');
    
    const hasConflicts = await checkSpecs({ quiet: true });
    expect(hasConflicts).toBe(true); // Returns true when no conflicts
  });
  
  it('should respect silent mode', async () => {
    await createTestSpec('001-feature-a');
    await createTestSpec('001-feature-b');
    
    // Should not output anything
    const output = captureConsoleOutput(() => {
      checkSpecs({ silent: true });
    });
    
    expect(output).toBe('');
  });
});

describe('autoCheckIfEnabled', () => {
  it('should run check when autoCheck is true', async () => {
    await setConfig({ autoCheck: true });
    await createTestSpec('001-feature-a');
    await createTestSpec('001-feature-b');
    
    const output = captureConsoleOutput(() => {
      autoCheckIfEnabled();
    });
    
    expect(output).toContain('conflict');
  });
  
  it('should skip check when autoCheck is false', async () => {
    await setConfig({ autoCheck: false });
    await createTestSpec('001-feature-a');
    await createTestSpec('001-feature-b');
    
    const output = captureConsoleOutput(() => {
      autoCheckIfEnabled();
    });
    
    expect(output).toBe('');
  });
});

// Test auto-check integration in each command
describe('auto-check integration', () => {
  beforeEach(async () => {
    await setConfig({ autoCheck: true });
    // Create conflicting specs
    await createTestSpec('001-feature-a');
    await createTestSpec('001-feature-b');
  });
  
  it('should auto-check in create command', async () => {
    const output = captureConsoleOutput(() => {
      createSpec('feature-c');
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in list command', async () => {
    const output = captureConsoleOutput(() => {
      listSpecs();
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in board command', async () => {
    const output = captureConsoleOutput(() => {
      boardCommand({});
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in update command', async () => {
    const output = captureConsoleOutput(() => {
      updateSpec('001-feature-a', { status: 'complete' });
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in search command', async () => {
    const output = captureConsoleOutput(() => {
      searchCommand('feature');
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in stats command', async () => {
    const output = captureConsoleOutput(() => {
      statsCommand({});
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in timeline command', async () => {
    const output = captureConsoleOutput(() => {
      timelineCommand({});
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in gantt command', async () => {
    const output = captureConsoleOutput(() => {
      ganttCommand({});
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in deps command', async () => {
    const output = captureConsoleOutput(() => {
      depsCommand('001-feature-a');
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in files command', async () => {
    const output = captureConsoleOutput(() => {
      filesCommand('001-feature-a');
    });
    expect(output).toContain('conflict');
  });
  
  it('should auto-check in archive command', async () => {
    const output = captureConsoleOutput(() => {
      archiveSpec('001-feature-a');
    });
    expect(output).toContain('conflict');
  });
  
  it('should NOT auto-check in init command', async () => {
    const output = captureConsoleOutput(() => {
      initProject();
    });
    expect(output).not.toContain('conflict');
  });
  
  it('should NOT auto-check in templates command', async () => {
    const output = captureConsoleOutput(() => {
      listTemplates();
    });
    expect(output).not.toContain('conflict');
  });
  
  it('should NOT auto-check in check command', async () => {
    const output = captureConsoleOutput(() => {
      checkSpecs();
    });
    // Should show full report, not auto-check warning
    expect(output).toContain('Sequence conflicts detected');
  });
});

// src/commands/create.test.ts
describe('createSpec with --no-prefix', () => {
  it('should skip prefix when flag provided', async () => {
    await createSpec('test-feature', { noPrefix: true });
    
    const specDir = path.join(tmpDir, 'specs', '001-test-feature');
    expect(await dirExists(specDir)).toBe(true);
  });
  
  it('should apply date prefix by default', async () => {
    await createSpec('test-feature');
    
    const today = getToday('YYYYMMDD');
    const specDir = path.join(tmpDir, 'specs', `${today}-001-test-feature`);
    expect(await dirExists(specDir)).toBe(true);
  });
});

// src/commands/list.test.ts
describe('listSpecs with --flat', () => {
  it('should display flat list without grouping', async () => {
    // Test flat display
  });
  
  it('should group by month for flat pattern', async () => {
    // Test month grouping
  });
  
  it('should group by folder for custom pattern', async () => {
    // Test folder grouping
  });
});
```

### Integration Tests

```typescript
// Multi-user conflict scenario
describe('Multi-user workflow', () => {
  it('should prevent conflicts with date prefix', async () => {
    // User A creates spec on Nov 3
    const specA = await createSpec('feature-a');
    expect(specA).toContain('20251103-001');
    
    // User B creates spec on Nov 3 (different sequence)
    const specB = await createSpec('feature-b');
    expect(specB).toContain('20251103-002');
    
    // No conflicts
    const hasConflicts = await checkSpecs({ quiet: true });
    expect(hasConflicts).toBe(true);
  });
});
```

## Performance Impact

- **Date prefix**: No performance impact (string concatenation)
- **Check command**: O(n) where n = number of specs, fast even with 1000+ specs
- **List grouping**: Minimal overhead, same O(n) complexity
- **Template changes**: No runtime impact

## Migration Path

1. Existing projects without prefix: Continue working, no changes required
2. Existing projects with date folders: Already using custom pattern, no changes
3. New projects: Get date prefix by default
4. Users can opt out: Use `--no-prefix` flag or edit config
