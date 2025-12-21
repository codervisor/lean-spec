# API Contract Validation Test Suite

Language-agnostic TypeScript test suite that defines and validates LeanSpec API contracts against any HTTP server implementation.

## Overview

This test suite provides:

1. **Canonical API Schemas**: Zod schemas that serve as the source of truth for API contracts
2. **Schema Validation**: Automatic validation of API responses against defined schemas
3. **Contract Testing**: Tests that make real HTTP requests to actual running servers
4. **Implementation Agnostic**: Works with any HTTP server (Rust, Node.js, etc.)

## Quick Start

### Prerequisites

- Node.js 20+
- A running LeanSpec HTTP server

### Installation

```bash
cd tests/api
npm install
```

### Running Tests

**Against Rust HTTP server (default):**

```bash
# Terminal 1: Start the Rust server
cd rust
cargo run --bin leanspec-http -- --port 3001

# Terminal 2: Run tests
cd tests/api
npm test
```

**Against a different server:**

```bash
# Set the API_BASE_URL environment variable
API_BASE_URL=http://localhost:3000 npm test
```

## Directory Structure

```
tests/api/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
└── src/
    ├── schemas/           # API contract schemas (SOURCE OF TRUTH)
    │   ├── projects.ts    # Project API schemas
    │   ├── specs.ts       # Spec API schemas
    │   ├── search.ts      # Search API schemas
    │   ├── stats.ts       # Stats API schemas
    │   ├── deps.ts        # Dependencies API schemas
    │   ├── validate.ts    # Validation API schemas
    │   ├── errors.ts      # Error response schemas
    │   ├── health.ts      # Health check schemas
    │   └── index.ts       # Re-exports all schemas
    ├── fixtures/          # Test data generators
    │   ├── projects.ts    # Project fixtures
    │   ├── specs.ts       # Spec fixtures
    │   └── index.ts
    ├── client/            # Generic HTTP client
    │   ├── config.ts      # API_BASE_URL configuration
    │   └── index.ts       # HTTP client implementation
    ├── utils/
    │   ├── validation.ts  # Schema validation helpers
    │   ├── assertions.ts  # Custom assertions
    │   └── index.ts
    └── tests/
        ├── health.test.ts      # Health endpoint tests
        ├── projects.test.ts    # Project management tests
        ├── specs.test.ts       # Spec operations tests
        ├── search.test.ts      # Search tests
        ├── stats.test.ts       # Stats tests
        ├── deps.test.ts        # Dependencies tests
        ├── validate.test.ts    # Validation tests
        ├── errors.test.ts      # Error handling tests
        └── performance.test.ts # Performance tests
```

## API Schemas

The schemas in `src/schemas/` are the **source of truth** for API contracts. They define:

- Request body schemas
- Response schemas
- Error schemas
- Enum types for status, priority, etc.

### Example: Project Schema

```typescript
import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  specsDir: z.string(),
  favorite: z.boolean(),
  color: z.string().nullable(),
  lastAccessed: z.string(),
  addedAt: z.string(),
});
```

### Using Schemas in Tests

```typescript
import { ProjectsListResponseSchema } from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';

it('returns valid response matching schema', async () => {
  const response = await apiClient.get('/api/projects');
  const result = validateSchema(ProjectsListResponseSchema, response.data);

  if (!result.success) {
    throw new Error(
      createSchemaErrorMessage('GET /api/projects', result.errors || [])
    );
  }

  expect(result.success).toBe(true);
});
```

## Test Fixtures

The `src/fixtures/` directory contains utilities for creating test projects and specs:

```typescript
import { createTestProject, defaultTestFixtures } from '../fixtures';

const testProject = await createTestProject({
  name: 'test-project',
  specs: defaultTestFixtures,
});
```

Fixtures automatically:
- Create temporary directories
- Generate valid spec files with frontmatter
- Provide cleanup functions

## Configuration

### Environment Variables

| Variable       | Description                | Default                 |
| -------------- | -------------------------- | ----------------------- |
| `API_BASE_URL` | Base URL of the API server | `http://localhost:3001` |

### Running Against Different Servers

```bash
# Rust HTTP server
API_BASE_URL=http://localhost:3001 npm test

# Next.js server
API_BASE_URL=http://localhost:3000 npm test

# Remote server
API_BASE_URL=https://api.example.com npm test
```

## Adding New Tests

1. Create a new test file in `src/tests/`
2. Import the API client and schemas
3. Create test fixtures if needed
4. Write tests that validate both schema compliance and data correctness

### Test Template

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '../client';
import { YourSchema } from '../schemas';
import { validateSchema, createSchemaErrorMessage } from '../utils/validation';
import { createTestProject, type TestProject } from '../fixtures';

describe('Your Endpoint', () => {
  let testProject: TestProject | null = null;
  let addedProjectId: string | null = null;

  beforeAll(async () => {
    testProject = await createTestProject({ /* options */ });
    // Add project and switch to it
  });

  afterAll(async () => {
    // Cleanup
  });

  it('returns valid response', async () => {
    const response = await apiClient.get('/api/your-endpoint');
    const result = validateSchema(YourSchema, response.data);
    expect(result.success).toBe(true);
  });
});
```

## Adding New Schemas

1. Create a new file in `src/schemas/`
2. Define Zod schemas for request/response types
3. Export types using `z.infer<typeof Schema>`
4. Add exports to `src/schemas/index.ts`

### Schema Template

```typescript
import { z } from 'zod';

export const YourResponseSchema = z.object({
  field1: z.string(),
  field2: z.number(),
  optional: z.string().optional(),
  nullable: z.string().nullable(),
});

export type YourResponse = z.infer<typeof YourResponseSchema>;
```

## Troubleshooting

### "Cannot connect to API server"

Ensure the server is running:

```bash
# Check if server is running
curl http://localhost:3001/health
```

### Schema Validation Failures

The test output will show which fields failed validation:

```
Schema validation failed for GET /api/projects:
  - projects.0.lastAccessed: Expected string, received undefined
```

### Test Timeouts

Increase the timeout in `vitest.config.ts`:

```typescript
test: {
  testTimeout: 30000,
}
```

## CI Integration

Example GitHub Actions workflow:

```yaml
name: API Contract Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build Rust HTTP server
        run: cargo build --release --manifest-path rust/Cargo.toml

      - name: Start server
        run: |
          ./rust/target/release/leanspec-http --port 3001 &
          sleep 2

      - name: Install test dependencies
        run: |
          cd tests/api
          npm install

      - name: Run contract tests
        run: |
          cd tests/api
          npm test
```

## Philosophy

### Why TypeScript?

- Language-neutral (not tied to any backend implementation)
- Excellent schema validation with Zod
- Type-safe API schemas serve as documentation
- Familiar to most developers

### Why Real HTTP Requests?

- Tests actual HTTP behavior
- Tests complete request/response cycle
- Implementation-agnostic
- Catches integration issues

### Why Schema-First?

- Single source of truth for contracts
- Schemas serve as documentation
- Catches API drift automatically
- Clear failure messages
