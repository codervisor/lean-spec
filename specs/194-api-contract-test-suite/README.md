---
status: in-progress
created: '2025-12-20'
priority: high
tags:
  - testing
  - api
  - typescript
  - contract
  - integration
depends_on:
  - 191-rust-http-api-test-suite
  - 186-rust-http-server
created_at: '2025-12-20T07:13:29.722091Z'
updated_at: '2025-12-20T07:13:38.531807Z'
---

# API Contract Validation Test Suite

> Language-agnostic TypeScript test suite that defines and validates LeanSpec API contracts against any HTTP server implementation

## Overview

**Problem**: No single source of truth for API contracts:
- **Spec 191** (Rust HTTP API tests): Uses Rust unit tests that call router directly with `.oneshot()` - NOT testing actual HTTP server
- **No schema definitions**: API contracts exist only in implementation code
- **No validation**: Can't verify server actually conforms to expected behavior
- **Mock-based**: Unit tests can fool us - we need real HTTP requests to real servers

**Solution**: Build **API contract validation suite** that:
- **Defines canonical API schemas** (requests, responses, errors) as source of truth
- Tests **any HTTP server** via configuration (URL-based, implementation-agnostic)
- Makes **real HTTP requests** to actual running servers
- Validates responses match defined schemas
- Tests data correctness with known fixtures
- Can run against Next.js, Rust, or any future implementation

**Why TypeScript?**
- Language-neutral (not tied to any backend implementation)
- Excellent schema validation (`zod`, `ajv`)
- Type-safe API schemas serve as documentation
- Familiar to most developers
- Easy to integrate with CI

## Design

### Test Architecture

```
tests/api-contracts/          # New standalone test package
├── package.json              # Independent npm package
├── tsconfig.json
├── vitest.config.ts
├── .env.test                 # API_BASE_URL=http://localhost:3001
├── src/
│   ├── schemas/              # API contract schemas (SOURCE OF TRUTH)
│   │   ├── projects.ts       # Project API schemas
│   │   ├── specs.ts          # Spec API schemas
│   │   ├── search.ts         # Search API schemas
│   │   ├── stats.ts          # Stats API schemas
│   │   ├── deps.ts           # Dependencies API schemas
│   │   ├── validate.ts       # Validation API schemas
│   │   └── errors.ts         # Error response schemas
│   ├── fixtures/             # Test data generators
│   │   ├── projects.ts       # Create test projects
│   │   └── specs.ts          # Create test specs
│   ├── client/               # Generic HTTP client
│   │   ├── index.ts          # Configurable API client
│   │   └── config.ts         # Read API_BASE_URL from env
│   ├── utils/
│   │   ├── validation.ts     # Schema validation helpers
│   │   └── assertions.ts     # Custom assertions
│   └── tests/
│       ├── projects.test.ts  # Project management tests
│       ├── specs.test.ts     # Spec operations tests
│       ├── search.test.ts    # Search tests
│       ├── stats.test.ts     # Stats tests
│       ├── deps.test.ts      # Dependencies tests
│       ├── validate.test.ts  # Validation tests
│       └── errors.test.ts    # Error handling tests
└── README.md
```

### Test Strategy

**1. Schema-First Validation** (Primary Goal):
```typescript
// schemas/projects.ts - Source of truth
export const ProjectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  specsDir: z.string(),
  favorite: z.boolean(),
  color: z.string().nullable(),
  lastAccessed: z.string().datetime()
});

export const ProjectsListResponseSchema = z.object({
  projects: z.array(ProjectResponseSchema),
  currentProjectId: z.string().nullable()
});

// Test validates server matches schema
describe('GET /api/projects', () => {
  test('returns valid projects list matching schema', async () => {
    const response = await apiClient.get('/api/projects');
    
    expect(response.status).toBe(200);
    
    // Validate against canonical schema
    const result = ProjectsListResponseSchema.safeParse(response.data);
    expect(result.success).toBe(true);
    
    // Validate data correctness
    expect(response.data.projects).toBeInstanceOf(Array);
  });
});
```

**2. Configuration-Based Testing**:
```typescript
// .env.test or environment variable
// API_BASE_URL=http://localhost:3001  # Test Rust server
// API_BASE_URL=http://localhost:3000  # Test Next.js server

// client/config.ts
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

// client/index.ts
export const apiClient = {
  async get(path: string, params?: Record<string, any>) {
    const url = new URL(path, API_BASE_URL);
    if (params) {
      Object.entries(params).forEach(([k, v]) => 
        url.searchParams.append(k, String(v))
      );
    }
    const res = await fetch(url.toString());
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: await res.json()
    };
  }
};
```

**3. Test Data Management**:
```typescript
// Create isolated test projects for each test
async function createTestProject(fixtures: SpecFixture[]) {
  const tempDir = await tmp.dir();
  const specsDir = path.join(tempDir.path, 'specs');
  
  await fs.mkdir(specsDir, { recursive: true });
  
  for (const fixture of fixtures) {
    const specDir = path.join(specsDir, fixture.name);
    await fs.mkdir(specDir, { recursive: true });
    await fs.writeFile(
      path.join(specDir, 'README.md'),
      generateSpecContent(fixture)
    );
  }
  
  return tempDir;
}
```

### Test Configuration

**Running Against Different Servers**:

```bash
# Test Rust HTTP server
API_BASE_URL=http://localhost:3001 npm test

# Test Next.js API (legacy)
API_BASE_URL=http://localhost:3000 npm test

# Default (Rust)
npm test  # Uses http://localhost:3001
```

**Server must be started separately**:
```bash
# Terminal 1: Start server you want to test
cargo run --bin leanspec-http -- --port 3001
# OR
pnpm -F @leanspec/ui dev  # port 3000

# Terminal 2: Run tests
cd tests/api-contracts
npm test
```

### Simple HTTP Client

```typescript
// client/index.ts - Implementation-agnostic
import { API_BASE_URL } from './config';

export const apiClient = {
  baseUrl: API_BASE_URL,
  
  async get(path: string, params?: Record<string, any>) {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => 
        url.searchParams.append(k, String(v))
      );
    }
    const res = await fetch(url.toString());
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: res.ok ? await res.json() : null
    };
  },
  
  async post(path: string, body?: any) {
    const res = await fetch(new URL(path, this.baseUrl).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      data: res.ok ? await res.json() : null
    };
  },
  
  // ... patch, delete
};
```

### Contract Schemas (Source of Truth)

```typescript
// schemas/projects.ts
import { z } from 'zod';

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  specsDir: z.string(),
  favorite: z.boolean(),
  color: z.string().nullable(),
  lastAccessed: z.string().datetime(),
  addedAt: z.string().datetime().optional()
});

export const ProjectsListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  currentProjectId: z.string().nullable()
});

// schemas/specs.ts
export const SpecItemSchema = z.object({
  specNumber: z.number().nullable(),
  specName: z.string(),
  title: z.string(),
  status: z.enum(['planned', 'in-progress', 'complete', 'archived']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).nullable(),
  tags: z.array(z.string()),
  created: z.string().nullable(),
  updated: z.string().nullable().optional(),
  filePath: z.string()
});

export const SpecsListResponseSchema = z.object({
  specs: z.array(SpecItemSchema)
});

// schemas/errors.ts
export const ErrorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  details: z.any().optional()
});

// Use in tests
const result = ProjectsListResponseSchema.safeParse(response.data);
expect(result.success).toBe(true);
if (!result.success) {
  console.error('Schema validation failed:', result.error);
}
```

## Plan

### Phase 1: Test Infrastructure (Days 1-2)
- [x] Create `tests/api-contracts` package
- [x] Set up TypeScript + Vitest
- [x] Create API client (configuration-based)
- [x] Define canonical schemas for all endpoints
- [x] Test fixture generators (projects, specs)
- [x] Schema validation utilities

### Phase 2: Core Endpoint Tests (Days 3-5)
- [x] Project management tests (8 endpoints)
  - GET /api/projects
  - POST /api/projects
  - GET /api/projects/:id
  - PATCH /api/projects/:id
  - DELETE /api/projects/:id
  - POST /api/projects/:id/switch
  - POST /api/projects/:id/favorite
  - POST /api/projects/refresh
- [x] Validate all responses match schemas

### Phase 3: Spec Operations Tests (Days 6-8)
- [x] Spec listing tests (with filters)
  - GET /api/specs
  - Query params: status, priority, tags, assignee
- [x] Spec detail tests
  - GET /api/specs/:spec
  - By number, by name
- [x] Search tests
  - POST /api/search
  - Query, filters, ranking
- [x] Validate response schemas

### Phase 4: Advanced Features Tests (Days 9-11)
- [x] Stats endpoint
  - GET /api/stats
  - Verify counts, percentages
- [x] Dependencies endpoint
  - GET /api/deps/:spec
  - Simple, transitive, circular
- [x] Validation endpoint
  - GET /api/validate
  - GET /api/validate/:spec
  - Error detection

### Phase 5: Error Handling & Edge Cases (Days 12-13)
- [x] 404 errors (not found)
- [x] 400 errors (invalid input)
- [ ] 500 errors (internal errors)
- [ ] Malformed JSON
- [ ] Invalid query parameters
- [ ] Empty projects
- [ ] Large datasets (100+ specs)

### Phase 6: Data Correctness Tests (Days 14-15)
- [x] Verify counts match expected values
- [ ] Verify dependencies computed correctly
- [ ] Verify search ranking works
- [x] Verify stats calculations accurate
- [x] Verify filtered results correct

### Phase 7: CI Integration (Day 16)
- [ ] Add to GitHub Actions
- [ ] Parameterize API_BASE_URL for CI
- [ ] Run tests in parallel
- [ ] Cleanup after tests
- [ ] Report coverage

### Phase 8: Documentation (Day 17)
- [x] Test suite README
- [x] Running tests locally
- [x] Adding new tests
- [x] Contract schema documentation
- [ ] Troubleshooting guide

## Success Criteria

**Must Have**:
- [x] Tests run against **actual HTTP servers** (not mocked)
- [x] **Canonical API schemas** defined in code (source of truth)
- [x] Tests pass against **configured server** (via API_BASE_URL)
- [x] **100% endpoint coverage** validated against schemas
- [x] All tests pass consistently (no flaky tests)
- [ ] CI integration working
- [x] Under 5 minutes total test run time (~1.5s total)

**Should Have**:
- [x] Schema validation catches API drift
- [x] Easy to add new endpoints/schemas
- [x] Clear error messages on schema mismatch
- [x] Performance benchmarks included
- [x] Documentation for running against different servers

**Nice to Have**:
- [ ] Export schemas as OpenAPI/Swagger spec
- [ ] Schema documentation generator
- [ ] Visual test report
- [ ] Coverage badges

## Test Examples

### Schema Validation Test

```typescript
import { apiClient } from '../client';
import { ProjectsListResponseSchema } from '../schemas/projects';

describe('GET /api/projects', () => {
  test('returns valid response matching schema', async () => {
    const response = await apiClient.get('/api/projects');
    
    // Validate status code
    expect(response.status).toBe(200);
    
    // Validate response matches canonical schema
    const result = ProjectsListResponseSchema.safeParse(response.data);
    
    if (!result.success) {
      console.error('Schema validation errors:');
      console.error(JSON.stringify(result.error.format(), null, 2));
    }
    
    expect(result.success).toBe(true);
    
    // Additional data correctness checks
    expect(response.data.projects).toBeInstanceOf(Array);
    expect(response.data.currentProjectId).toBeDefined();
  });
  
  test('projects have required fields', async () => {
    const response = await apiClient.get('/api/projects');
    const result = ProjectsListResponseSchema.parse(response.data);
    
    if (result.projects.length > 0) {
      const project = result.projects[0];
      expect(project.id).toBeTruthy();
      expect(project.name).toBeTruthy();
      expect(project.path).toBeTruthy();
      expect(project.specsDir).toBeTruthy();
      expect(typeof project.favorite).toBe('boolean');
    }
  });
});
```

### Data Correctness Test

```typescript
import { apiClient } from '../client';
import { SpecsListResponseSchema } from '../schemas/specs';

describe('GET /api/specs', () => {
  test('filters by status correctly', async () => {
    const response = await apiClient.get('/api/specs', { 
      status: 'in-progress' 
    });
    
    // Validate schema
    const result = SpecsListResponseSchema.parse(response.data);
    
    // Validate data correctness
    expect(result.specs.every(s => s.status === 'in-progress')).toBe(true);
  });
  
  test('returns specs with correct structure', async () => {
    const response = await apiClient.get('/api/specs');
    const result = SpecsListResponseSchema.parse(response.data);
    
    // Verify each spec has required fields
    result.specs.forEach(spec => {
      expect(spec.specName).toBeTruthy();
      expect(spec.title).toBeTruthy();
      expect(['planned', 'in-progress', 'complete', 'archived'])
        .toContain(spec.status);
      expect(spec.filePath).toBeTruthy();
    });
  });
});
```

### Error Handling Test

```typescript
import { apiClient } from '../client';
import { ErrorResponseSchema } from '../schemas/errors';

describe('Error Handling', () => {
  test('GET /api/projects/:id returns 404 for nonexistent project', async () => {
    const response = await apiClient.get('/api/projects/nonexistent-id');
    
    expect(response.status).toBe(404);
    
    // Validate error response schema
    const result = ErrorResponseSchema.safeParse(response.data);
    expect(result.success).toBe(true);
    
    expect(response.data.error).toBeTruthy();
  });
  
  test('POST /api/projects with invalid data returns 400', async () => {
    const response = await apiClient.post('/api/projects', {
      path: '/nonexistent/path'
    });
    
    expect(response.status).toBe(400);
    const result = ErrorResponseSchema.parse(response.data);
    expect(result.error).toBeTruthy();
  });
});
```

### Performance Test

```typescript
describe('Performance', () => {
  test('GET /api/specs completes within 100ms', async () => {
    const start = Date.now();
    await apiClient.get('/api/specs');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  test('handles 10 concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      apiClient.get('/api/specs')
    );
    
    const results = await Promise.all(requests);
    
    expect(results.every(r => r.status === 200)).toBe(true);
  });
});
```

## Notes

### Why Not Keep Rust Unit Tests?

**Current Spec 191 approach** (Rust tests calling router with `.oneshot()`):
- ❌ Not testing actual HTTP server
- ❌ Not testing network layer
- ❌ Not testing CORS
- ❌ Not testing real request parsing
- ❌ Language-coupled (can't validate other implementations)

**This approach** (TypeScript contract tests):
- ✅ Tests actual HTTP servers
- ✅ Tests complete request/response cycle
- ✅ Implementation-agnostic (works with any server)
- ✅ Schemas as source of truth
- ✅ Can catch integration issues
- ✅ Easy to run in CI

### Why Schema-First Approach?

1. **Single source of truth**: Schemas define the contract, not code
2. **Documentation**: Schemas serve as API documentation
3. **Validation**: Catch API drift automatically
4. **Type-safe**: TypeScript + Zod provide compile-time safety
5. **Portable**: Schemas can be exported as OpenAPI/Swagger
6. **Clear failures**: Schema validation errors are explicit

### Why Configuration-Based?

1. **Flexible**: Test any server implementation
2. **Simple**: Just set API_BASE_URL environment variable
3. **CI-friendly**: Easy to parameterize in CI pipelines
4. **No coupling**: Tests don't know/care about implementation
5. **Real testing**: Must start actual server, forces realistic tests

### Test Data Isolation

**Each test gets fresh data**:
- Creates temporary directory
- Generates test specs
- Tests run against configured server with test data
- Cleans up everything

**No shared state between tests**:
- Prevents flaky tests
- Enables parallel execution
- Makes debugging easier

### CI Integration

```yaml
# .github/workflows/api-contract-tests.yml
name: API Contract Tests

on: [push, pull_request]

jobs:
  test-rust-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Rust HTTP server
        run: |
          cd rust
          cargo build --release --bin leanspec-http
      
      - name: Start Rust HTTP server
        run: |
          ./rust/target/release/leanspec-http --port 3001 &
          sleep 2  # Wait for server to start
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install test dependencies
        run: |
          cd tests/api-contracts
          npm install
      
      - name: Run API contract tests against Rust
        run: |
          cd tests/api-contracts
          API_BASE_URL=http://localhost:3001 npm test
  
  test-nextjs-server:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Start Next.js server
        run: |
          pnpm -F @leanspec/ui dev &
          sleep 5  # Wait for Next.js to start
      
      - name: Run API contract tests against Next.js
        run: |
          cd tests/api-contracts
          API_BASE_URL=http://localhost:3000 npm test
```

### Relationship to Spec 191

**Spec 191** (Rust unit tests):
- Fast feedback during development
- Test internal Rust logic
- Don't require server startup
- **Keep these** for rapid iteration

**Spec 194** (Contract tests):
- Validate actual HTTP behavior
- Define canonical API schemas
- Implementation-agnostic
- **Required** for production confidence

**Both are valuable**:
- **Unit tests** (191): Fast, test implementation details
- **Contract tests** (194): Slow, test public API contracts
- **Use together**: Unit tests during development, contract tests before deploy

### Related Specs

- [Spec 191](../191-rust-http-api-test-suite/) - Rust unit tests (complementary)
- [Spec 186](../186-rust-http-server/) - Rust HTTP server implementation
- [Spec 190](../190-ui-vite-parity-rust-backend/) - UI parity (depends on this)
- [Spec 192](../192-backend-api-parity/) - Backend API parity (depends on this)

## Implementation Log

### 2025-12-20: Spec Created
- Identified gap: Spec 191 tests don't actually test HTTP servers
- Proposed schema-first TypeScript test suite
- Canonical API schemas as source of truth
- Configuration-based testing (via API_BASE_URL)
- Real HTTP requests to actual servers
- Implementation-agnostic (works with any server)
- Priority: HIGH - prerequisite for API parity confidence

### 2025-12-20: Implementation Complete (Phase 1-4, most of Phase 5-8)
**Created complete test suite in `tests/api-contracts/`:**
- 88 passing tests across 9 test files
- Test run time: ~1.5 seconds

**Schemas (source of truth):**
- `schemas/health.ts` - Health endpoint
- `schemas/projects.ts` - Projects API
- `schemas/specs.ts` - Specs API
- `schemas/search.ts` - Search API
- `schemas/stats.ts` - Stats API
- `schemas/deps.ts` - Dependencies API
- `schemas/validate.ts` - Validation API
- `schemas/errors.ts` - Error responses

**Tests:**
- `health.test.ts` - 4 tests (health check)
- `projects.test.ts` - 18 tests (CRUD, switch, favorite)
- `specs.test.ts` - 13 tests (listing, filtering, detail)
- `search.test.ts` - 8 tests (query, filters)
- `stats.test.ts` - 11 tests (counts, percentages)
- `deps.test.ts` - 7 tests (dependencies)
- `validate.test.ts` - 10 tests (validation)
- `errors.test.ts` - 10 tests (404, 400 errors)
- `performance.test.ts` - 7 tests (response times, concurrency)

**Remaining work (optional):**
- [ ] CI integration (GitHub Actions workflow)
- [ ] Some edge case tests (malformed JSON, 500 errors)
- [ ] OpenAPI/Swagger export
