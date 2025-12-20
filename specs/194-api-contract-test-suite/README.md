---
status: planned
created: 2025-12-20
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
created_at: 2025-12-20T07:13:29.722091Z
updated_at: 2025-12-20T07:13:38.531807Z
---

# Language-Agnostic API Contract Test Suite

> Comprehensive TypeScript-based API test suite that validates actual HTTP server behavior for both Next.js and Rust backends

## Overview

**Problem**: Current test approaches have serious limitations:
- **Spec 191** (Rust HTTP API tests): Uses Rust unit tests that call router directly with `.oneshot()` - NOT testing actual HTTP server
- **No contract validation**: No guarantee Next.js and Rust APIs behave identically
- **Language-coupled**: Tests embedded in implementation language, hard to reuse
- **Mock-based**: Unit tests can fool us - we need real HTTP requests to real servers

**Solution**: Build **language-agnostic** TypeScript test suite that:
- Tests **actual running HTTP servers** (not mocked routers)
- Works against **both** Next.js API (`@leanspec/ui`) and Rust HTTP server
- Makes **real HTTP requests** with `fetch`/`axios`
- Validates **API contracts** (requests, responses, errors)
- Can be run independently or in CI

**Why TypeScript?**
- Language-neutral (not tied to Rust or Next.js)
- Excellent HTTP client libraries (`axios`, `node-fetch`)
- Type-safe with TypeScript
- Can validate both implementations easily
- Familiar to most developers

## Design

### Test Architecture

```
tests/api-contracts/          # New standalone test package
├── package.json              # Independent npm package
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── fixtures/             # Test data generators
│   │   ├── projects.ts       # Create test projects
│   │   └── specs.ts          # Create test specs
│   ├── clients/              # API client adapters
│   │   ├── base.ts           # Base client interface
│   │   ├── nextjs.ts         # Next.js API client
│   │   └── rust.ts           # Rust HTTP client
│   ├── utils/
│   │   ├── server.ts         # Server startup/shutdown
│   │   ├── assertions.ts     # Custom assertions
│   │   └── comparisons.ts    # Response comparison helpers
│   └── tests/
│       ├── projects.test.ts  # Project management tests
│       ├── specs.test.ts     # Spec operations tests
│       ├── search.test.ts    # Search tests
│       ├── stats.test.ts     # Stats tests
│       ├── deps.test.ts      # Dependencies tests
│       ├── validate.test.ts  # Validation tests
│       ├── errors.test.ts    # Error handling tests
│       └── contracts.test.ts # Contract comparison tests
└── README.md
```

### Test Strategy

**1. Contract Validation** (Primary Goal):
```typescript
describe('API Contract: GET /api/projects', () => {
  test('both servers return identical structure', async () => {
    // Start both servers with same test data
    const nextjsClient = await startNextJsServer(testProject);
    const rustClient = await startRustServer(testProject);
    
    // Make identical requests
    const nextjsRes = await nextjsClient.get('/api/projects');
    const rustRes = await rustClient.get('/api/projects');
    
    // Validate identical responses
    expect(nextjsRes.status).toBe(rustRes.status);
    expect(nextjsRes.data).toMatchObject(rustRes.data);
    
    // Validate contract
    expect(nextjsRes.data).toMatchSchema(ProjectsListSchema);
    expect(rustRes.data).toMatchSchema(ProjectsListSchema);
  });
});
```

**2. Real HTTP Server Testing**:
```typescript
async function startRustServer(projectDir: string) {
  // Spawn actual Rust HTTP server process
  const process = spawn('./rust/target/release/leanspec-http', [
    '--port', '3001',
    '--project', projectDir
  ]);
  
  // Wait for server to be ready
  await waitForServer('http://localhost:3001/health');
  
  return {
    url: 'http://localhost:3001',
    process,
    cleanup: () => process.kill()
  };
}
```

**3. Comprehensive Endpoint Coverage**:
- ✅ All project management endpoints
- ✅ All spec CRUD operations
- ✅ Search functionality
- ✅ Stats computation
- ✅ Dependency graphs
- ✅ Validation
- ✅ Error conditions (404, 400, 500)
- ✅ Edge cases (empty projects, large datasets)

**4. Test Data Management**:
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

### Server Configuration

**Next.js API** (legacy):
```bash
PORT=3000 pnpm -F @leanspec/ui dev
# Expects: http://localhost:3000/api/*
```

**Rust HTTP Server**:
```bash
cargo run --bin leanspec-http -- --port 3001
# Expects: http://localhost:3001/api/*
```

**Test Runner**:
```bash
# Start both servers
npm run test:start-servers

# Run contract tests
npm run test:contracts

# Cleanup
npm run test:stop-servers
```

### API Client Abstraction

```typescript
interface ApiClient {
  get(path: string, params?: Record<string, any>): Promise<ApiResponse>;
  post(path: string, body?: any): Promise<ApiResponse>;
  patch(path: string, body?: any): Promise<ApiResponse>;
  delete(path: string): Promise<ApiResponse>;
  baseUrl: string;
}

class RustHttpClient implements ApiClient {
  constructor(public baseUrl: string) {}
  
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
      data: await res.json()
    };
  }
  // ... other methods
}

class NextJsApiClient implements ApiClient {
  // Similar implementation but targets Next.js routes
}
```

### Contract Schemas

```typescript
// Define expected API contracts
const ProjectResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  specsDir: z.string(),
  favorite: z.boolean(),
  color: z.string().nullable(),
  lastAccessed: z.string().datetime()
});

const SpecListResponseSchema = z.object({
  specs: z.array(z.object({
    specNumber: z.number().nullable(),
    specName: z.string(),
    title: z.string(),
    status: z.enum(['planned', 'in-progress', 'complete', 'archived']),
    priority: z.enum(['low', 'medium', 'high', 'critical']).nullable(),
    tags: z.array(z.string()),
    created: z.string().nullable(),
    filePath: z.string()
  }))
});

// Use in tests
expect(response.data).toMatchSchema(ProjectResponseSchema);
```

## Plan

### Phase 1: Test Infrastructure (Days 1-2)
- [ ] Create `tests/api-contracts` package
- [ ] Set up TypeScript + Vitest
- [ ] Implement server startup/shutdown utilities
- [ ] Create API client abstraction (Rust + Next.js)
- [ ] Test fixture generators (projects, specs)
- [ ] Port configuration utilities

### Phase 2: Core Endpoint Tests (Days 3-5)
- [ ] Project management tests (8 endpoints)
  - GET /api/projects
  - POST /api/projects
  - GET /api/projects/:id
  - PATCH /api/projects/:id
  - DELETE /api/projects/:id
  - POST /api/projects/:id/switch
  - POST /api/projects/:id/favorite
  - POST /api/projects/refresh
- [ ] Validate both servers return same responses

### Phase 3: Spec Operations Tests (Days 6-8)
- [ ] Spec listing tests (with filters)
  - GET /api/specs
  - Query params: status, priority, tags, assignee
- [ ] Spec detail tests
  - GET /api/specs/:spec
  - By number, by name
- [ ] Search tests
  - POST /api/search
  - Query, filters, ranking
- [ ] Validate response schemas

### Phase 4: Advanced Features Tests (Days 9-11)
- [ ] Stats endpoint
  - GET /api/stats
  - Verify counts, percentages
- [ ] Dependencies endpoint
  - GET /api/deps/:spec
  - Simple, transitive, circular
- [ ] Validation endpoint
  - GET /api/validate
  - GET /api/validate/:spec
  - Error detection

### Phase 5: Error Handling & Edge Cases (Days 12-13)
- [ ] 404 errors (not found)
- [ ] 400 errors (invalid input)
- [ ] 500 errors (internal errors)
- [ ] Malformed JSON
- [ ] Invalid query parameters
- [ ] Empty projects
- [ ] Large datasets (100+ specs)

### Phase 6: Contract Comparison Tests (Days 14-15)
- [ ] Side-by-side comparison for all endpoints
- [ ] Response structure validation
- [ ] Field name consistency (camelCase)
- [ ] Error format consistency
- [ ] Status code consistency
- [ ] Document any intentional differences

### Phase 7: CI Integration (Day 16)
- [ ] Add to GitHub Actions
- [ ] Auto-start servers in CI
- [ ] Run tests in parallel
- [ ] Cleanup after tests
- [ ] Report coverage

### Phase 8: Documentation (Day 17)
- [ ] Test suite README
- [ ] Running tests locally
- [ ] Adding new tests
- [ ] Contract schema documentation
- [ ] Troubleshooting guide

## Success Criteria

**Must Have**:
- [ ] Tests run against **actual HTTP servers** (not mocked)
- [ ] Tests pass for **both** Next.js and Rust backends
- [ ] **100% endpoint coverage** from both implementations
- [ ] All tests pass consistently (no flaky tests)
- [ ] CI integration working
- [ ] Under 5 minutes total test run time

**Should Have**:
- [ ] Contract validation catches schema drift
- [ ] Easy to add new tests
- [ ] Clear error messages
- [ ] Performance benchmarks included
- [ ] Documentation complete

**Nice to Have**:
- [ ] Visual test report
- [ ] Coverage badges
- [ ] Automated contract diff reports

## Test Examples

### Basic Endpoint Test

```typescript
describe('GET /api/projects', () => {
  let rustServer: TestServer;
  let nextjsServer: TestServer;
  let testProject: TempDir;
  
  beforeAll(async () => {
    testProject = await createTestProject([
      { name: '001-test', status: 'planned', title: 'Test Spec' }
    ]);
    
    rustServer = await startRustServer(testProject.path);
    nextjsServer = await startNextJsServer(testProject.path);
  });
  
  afterAll(async () => {
    await rustServer.cleanup();
    await nextjsServer.cleanup();
    await testProject.cleanup();
  });
  
  test('Rust server returns valid project list', async () => {
    const res = await rustServer.client.get('/api/projects');
    
    expect(res.status).toBe(200);
    expect(res.data).toMatchSchema(ProjectsListSchema);
    expect(res.data.projects).toBeInstanceOf(Array);
  });
  
  test('Next.js server returns valid project list', async () => {
    const res = await nextjsServer.client.get('/api/projects');
    
    expect(res.status).toBe(200);
    expect(res.data).toMatchSchema(ProjectsListSchema);
    expect(res.data.projects).toBeInstanceOf(Array);
  });
});
```

### Contract Comparison Test

```typescript
describe('API Contract Validation', () => {
  test('GET /api/specs returns identical structure', async () => {
    const rustRes = await rustServer.client.get('/api/specs');
    const nextjsRes = await nextjsServer.client.get('/api/specs');
    
    // Status codes match
    expect(rustRes.status).toBe(nextjsRes.status);
    
    // Response structure matches
    expect(rustRes.data).toHaveSameStructureAs(nextjsRes.data);
    
    // Field names match (camelCase)
    const rustSpec = rustRes.data.specs[0];
    const nextjsSpec = nextjsRes.data.specs[0];
    
    expect(Object.keys(rustSpec).sort())
      .toEqual(Object.keys(nextjsSpec).sort());
    
    // No snake_case fields
    expect(JSON.stringify(rustRes.data)).not.toMatch(/_/);
    expect(JSON.stringify(nextjsRes.data)).not.toMatch(/_/);
  });
});
```

### Error Handling Test

```typescript
describe('Error Handling', () => {
  test.each([
    { server: 'rust', client: () => rustServer.client },
    { server: 'nextjs', client: () => nextjsServer.client }
  ])('$server: GET /api/projects/:id returns 404 for nonexistent', async ({ client }) => {
    const res = await client().get('/api/projects/nonexistent-id');
    
    expect(res.status).toBe(404);
    expect(res.data.error).toBeDefined();
    expect(res.data.code).toBe('PROJECT_NOT_FOUND');
  });
});
```

### Performance Test

```typescript
describe('Performance', () => {
  test('GET /api/specs completes within 100ms', async () => {
    const start = Date.now();
    await rustServer.client.get('/api/specs');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
  
  test('handles 10 concurrent requests', async () => {
    const requests = Array(10).fill(null).map(() => 
      rustServer.client.get('/api/specs')
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
- ❌ Can't compare with Next.js API
- ❌ Language-coupled (can't reuse for Next.js)

**This approach** (TypeScript tests with real HTTP):
- ✅ Tests actual servers
- ✅ Tests complete request/response cycle
- ✅ Tests both implementations
- ✅ Language-agnostic
- ✅ Can catch integration issues
- ✅ Validates contracts

### Why TypeScript over Rust Tests?

1. **Language-neutral**: Not tied to implementation language
2. **Both implementations**: Can test Next.js and Rust equally
3. **Better HTTP tools**: axios, fetch are excellent
4. **Familiar**: Most developers know TypeScript
5. **Type-safe**: TypeScript + Zod for validation
6. **Fast iteration**: TypeScript compiles quickly

### Test Data Isolation

**Each test gets fresh data**:
- Creates temporary directory
- Generates test specs
- Starts servers pointing at temp dir
- Runs test
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
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Rust HTTP server
        run: |
          cd rust
          cargo build --release --bin leanspec-http
      
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run API contract tests
        run: |
          cd tests/api-contracts
          npm test
```

### Related Specs

- [Spec 191](../191-rust-http-api-test-suite/) - Rust unit tests (to be replaced/supplemented)
- [Spec 186](../186-rust-http-server/) - Rust HTTP server implementation
- [Spec 190](../190-ui-vite-parity-rust-backend/) - UI parity (depends on this)
- [Spec 192](../192-backend-api-parity/) - Backend API parity (depends on this)

### Migration Path

**Phase 1**: Keep Spec 191 Rust tests
- They still have value for quick feedback
- Test internal logic

**Phase 2**: Add this spec (194) tests
- Comprehensive HTTP-level validation
- Contract testing

**Phase 3**: Evolve Spec 191 tests
- Focus on unit-level logic testing
- Remove redundant HTTP tests
- Keep fast unit tests for development

**Long-term**:
- **Unit tests** (Spec 191): Fast feedback, test internal logic
- **Contract tests** (Spec 194): Validate HTTP APIs, ensure compatibility
- **E2E tests** (future): Full UI + backend workflows

## Implementation Log

### 2025-12-20: Spec Created
- Identified gap: Spec 191 tests don't actually test HTTP servers
- Proposed language-agnostic TypeScript test suite
- Contract validation between Next.js and Rust implementations
- Real HTTP requests to real servers
- Priority: HIGH - prerequisite for API parity confidence
