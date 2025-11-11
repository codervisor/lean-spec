# @leanspec/core

Platform-agnostic spec parsing and validation library for LeanSpec.

## Overview

`@leanspec/core` provides the core functionality for parsing and validating LeanSpec specifications without dependencies on Node.js file system operations. This enables the same parsing and validation logic to work across different platforms (CLI, web, etc.).

## Installation

```bash
pnpm add @leanspec/core
```

## Features

- **Type Definitions**: `SpecInfo`, `SpecFrontmatter`, `SpecStatus`, `SpecPriority`, etc.
- **Frontmatter Parsing**: Parse and validate YAML frontmatter from markdown content
- **Validators**: Frontmatter validation, structure validation, line count checks
- **Utilities**: Spec statistics, insights generation, filtering
- **Storage Interface**: Abstract `SpecStorage` interface for platform-specific I/O

## Usage

### Parsing Frontmatter

```typescript
import { parseFrontmatterFromString } from '@leanspec/core';

const markdownContent = `---
status: in-progress
created: 2025-01-15
tags: [feature, api]
priority: high
---

# My Spec
...
`;

const frontmatter = parseFrontmatterFromString(markdownContent);
console.log(frontmatter);
// {
//   status: 'in-progress',
//   created: '2025-01-15',
//   tags: ['feature', 'api'],
//   priority: 'high'
// }
```

### Updating Frontmatter

```typescript
import { createUpdatedFrontmatter } from '@leanspec/core';

const existingContent = await storage.readFile('spec.md');
const { content, frontmatter } = createUpdatedFrontmatter(existingContent, {
  status: 'complete',
  completed: '2025-01-20'
});

await storage.writeFile('spec.md', content);
```

### Validation

```typescript
import { 
  FrontmatterValidator,
  StructureValidator,
  LineCountValidator 
} from '@leanspec/core';

const spec: SpecInfo = {
  path: '001-example',
  fullPath: '/path/to/specs/001-example',
  filePath: '/path/to/specs/001-example/README.md',
  name: '001-example',
  frontmatter: { status: 'planned', created: '2025-01-15' },
  content: '...'
};

// Validate frontmatter
const fmValidator = new FrontmatterValidator();
const fmResult = await fmValidator.validate(spec);

// Validate structure
const structValidator = new StructureValidator();
const structResult = await structValidator.validate(spec);

// Validate line count (Context Economy principle)
const lcValidator = new LineCountValidator({ maxLines: 400, warningThreshold: 300 });
const lcResult = await lcValidator.validate(spec);
```

### Utilities

```typescript
import { 
  countSpecsByStatusAndPriority,
  generateInsights,
  matchesFilter 
} from '@leanspec/core';

// Count specs by status and priority
const { statusCounts, priorityCounts, tagCounts } = countSpecsByStatusAndPriority(specs);

// Generate insights
const insights = generateInsights(specs);
console.log(insights); // Array of insight objects

// Filter specs
const inProgressSpecs = specs.filter(spec => 
  matchesFilter(spec.frontmatter, { status: 'in-progress' })
);
```

## Storage Interface

The core package uses an abstract `SpecStorage` interface for platform independence:

```typescript
export interface SpecStorage {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  listFiles(dirPath: string): Promise<string[]>;
  listDirs(dirPath: string): Promise<string[]>;
  getFileStats?(path: string): Promise<{ size: number; modified: Date }>;
}
```

### Implementations

**FileSystemStorage (Node.js):**
```typescript
// In @leanspec/cli
import { FileSystemStorage } from './adapters/fs-storage.js';

const storage = new FileSystemStorage();
const content = await storage.readFile('/path/to/spec.md');
```

**GitHubStorage (Web - future):**
```typescript
// In @leanspec/web
import { GitHubStorage } from '@leanspec/web/adapters';

const storage = new GitHubStorage(octokit, 'owner', 'repo');
const content = await storage.readFile('specs/001-example/README.md');
```

## Type Definitions

### SpecInfo

```typescript
interface SpecInfo {
  path: string;           // Relative path
  fullPath: string;       // Absolute path to spec directory
  filePath: string;       // Absolute path to spec file
  name: string;           // Spec name (e.g., "001-example")
  date?: string;          // Optional date (for dated patterns)
  frontmatter: SpecFrontmatter;
  content?: string;       // Full file content (optional)
  subFiles?: SubFileInfo[]; // Sub-documents and assets
}
```

### SpecFrontmatter

```typescript
interface SpecFrontmatter {
  // Required
  status: SpecStatus;     // 'planned' | 'in-progress' | 'complete' | 'archived'
  created: string;        // YYYY-MM-DD

  // Recommended
  tags?: string[];
  priority?: SpecPriority; // 'low' | 'medium' | 'high' | 'critical'

  // Optional
  related?: string[];
  depends_on?: string[];
  assignee?: string;
  // ... and more
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## License

MIT - See LICENSE file in repository root
