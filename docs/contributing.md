# Contributing to LeanSpec

Thank you for your interest in contributing to LeanSpec! This guide will help you get started.

## Code of Conduct

Be respectful, constructive, and collaborative. We're all here to build something useful.

## Ways to Contribute

### 1. Report Issues

Found a bug or have a feature request?

- Check [existing issues](https://github.com/codervisor/lean-spec/issues) first
- If not found, [create a new issue](https://github.com/codervisor/lean-spec/issues/new)
- Provide clear description and reproduction steps

### 2. Improve Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples
- Expand guides
- Update outdated content

### 3. Submit Code Changes

- Bug fixes
- New features
- Performance improvements
- Test coverage

## Development Setup

### Prerequisites

- Node.js >= 18
- npm or pnpm

### Clone and Install

```bash
git clone https://github.com/codervisor/lean-spec.git
cd lean-spec
npm install
```

### Build

```bash
npm run build
```

### Run Tests

```bash
npm run test:run      # Run tests once
npm test              # Same as test:run
npm run test:ui       # Run tests with UI
npm run test:coverage # Generate coverage report
```

### Development Workflow

```bash
npm run dev           # Watch mode for development
npm run typecheck     # Type checking
npm run lint          # Lint code
npm run format        # Format code
```

### Test Locally

After building, test the CLI:

```bash
node bin/lspec.js --version
node bin/lspec.js init
```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/my-feature
# or
git checkout -b fix/my-bugfix
```

### 2. Make Your Changes

- Write clear, focused code
- Follow existing code style
- Add tests for new functionality
- Update documentation if needed

### 3. Test Your Changes

```bash
npm run build
npm run test:run
npm run lint
```

Ensure all tests pass and there are no lint errors.

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git commit -m "Add support for custom templates"
git commit -m "Fix frontmatter parsing bug"
git commit -m "Update documentation for custom fields"
```

### 5. Push and Create PR

```bash
git push origin feature/my-feature
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### Good PR Description

- Explain what the change does
- Link to related issues
- Include examples if applicable
- Mention breaking changes

### Example:

```markdown
## Description

Adds support for custom validation rules in frontmatter.

Fixes #123

## Changes

- Add `validation` field to config
- Implement validation logic
- Add tests for validation
- Update documentation

## Breaking Changes

None
```

### PR Checklist

- [ ] Tests pass
- [ ] Lint passes
- [ ] Documentation updated (if needed)
- [ ] Examples added (if applicable)
- [ ] Breaking changes noted

## Code Style

- TypeScript for all source code
- Use ESLint configuration
- Format with Prettier
- Write tests for new features

### TypeScript Guidelines

```typescript
// Use explicit types
function createSpec(name: string): SpecResult {
  // ...
}

// Use interfaces for objects
interface SpecConfig {
  status: string;
  created: string;
}

// Avoid `any`
// Use `unknown` if type is truly unknown
```

### Test Guidelines

```typescript
import { describe, it, expect } from 'vitest';

describe('createSpec', () => {
  it('should create spec with valid name', () => {
    const result = createSpec('my-feature');
    expect(result.success).toBe(true);
  });
  
  it('should reject invalid names', () => {
    const result = createSpec('invalid/name');
    expect(result.success).toBe(false);
  });
});
```

## Documentation

Documentation is in the `docs/` directory using VitePress.

### Running Docs Locally

```bash
npm run docs:dev
```

Open `http://localhost:5173/lean-spec/`

### Building Docs

```bash
npm run docs:build
```

### Documentation Guidelines

- Use clear, simple language
- Include examples
- Keep it concise (LeanSpec philosophy!)
- Use proper markdown formatting

## Release Process

(For maintainers)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Commit changes: `git commit -m "Release v0.2.0"`
4. Tag release: `git tag v0.2.0`
5. Push: `git push && git push --tags`
6. Publish to npm: `npm publish`
7. Create GitHub release

## Questions?

- Open an issue for questions
- Check existing documentation
- Review closed issues for similar questions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to LeanSpec! 🚀
