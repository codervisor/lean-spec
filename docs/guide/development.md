# Development

Guide for contributing and developing LeanSpec.

## Quick Start

```bash
# Clone repository
git clone https://github.com/codervisor/lean-spec.git
cd lean-spec

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm run test:run

# Development mode (watch)
npm run dev
```

## Project Structure

```
lean-spec/
├── bin/              # CLI entry point
├── src/              # TypeScript source code
│   ├── cli.ts       # Main CLI
│   ├── commands/    # Command implementations
│   ├── lib/         # Core library code
│   └── types/       # TypeScript types
├── templates/        # Project templates
├── docs/            # Documentation (VitePress)
├── specs/           # Project specs (dogfooding)
└── tests/           # Test files
```

## Testing

LeanSpec uses Vitest for testing.

### Running Tests

```bash
# Run all tests
npm run test:run

# Watch mode
npm test

# With UI
npm run test:ui

# Coverage report
npm run test:coverage
```

### Test Structure

- Unit tests: Test individual functions and modules
- Integration tests: Test command workflows
- End-to-end tests: Test full CLI scenarios

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createSpec } from '../src/commands/create';

describe('createSpec', () => {
  it('should create spec with valid name', () => {
    const result = createSpec('my-feature');
    expect(result.success).toBe(true);
  });
});
```

## Building

```bash
# Production build
npm run build

# Watch mode for development
npm run dev

# Type check
npm run typecheck
```

Build output goes to `dist/` directory.

## Code Quality

```bash
# Lint
npm run lint

# Format
npm run format
```

## Documentation

The documentation site is built with VitePress.

```bash
# Dev server (hot reload)
npm run docs:dev

# Build docs
npm run docs:build

# Preview built docs
npm run docs:preview
```

Documentation source is in `docs/` directory.

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit: `git commit -m "Release v0.x.0"`
4. Tag: `git tag v0.x.0`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`

## Contributing

See [Contributing Guide](/contributing) for detailed contribution guidelines.
