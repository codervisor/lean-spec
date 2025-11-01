# Integration Example: Merging LeanSpec with Existing AGENTS.md

This example shows what happens when you run `lspec init` on a project with an existing `AGENTS.md` and choose the "Merge" option.

## Before (Existing AGENTS.md)

```markdown
# My Custom Agent Instructions

## Project Standards

- Use TypeScript strict mode
- Functional programming preferred
- No classes unless absolutely needed

## Testing Requirements

- Jest for all tests
- 90% code coverage minimum
- Integration tests for all API endpoints

## Code Review Checklist

- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated
```

## After Merge (with LeanSpec section appended)

```markdown
# My Custom Agent Instructions

## Project Standards

- Use TypeScript strict mode
- Functional programming preferred
- No classes unless absolutely needed

## Testing Requirements

- Jest for all tests
- 90% code coverage minimum
- Integration tests for all API endpoints

## Code Review Checklist

- [ ] All tests pass
- [ ] No linting errors
- [ ] Documentation updated

---

## LeanSpec Integration

## Project Overview

<!-- Brief description of what this project does -->

## Working with LeanSpec

1. **Read specs first** - Check `specs/` for relevant specifications
2. **Update living docs** - If implementation differs, update the spec
3. **Follow Non-Goals** - Don't implement explicitly excluded items
4. **Keep it lean** - If spec is unclear, ask rather than guess

## Code Standards

### Style
- <!-- e.g., Use TypeScript strict mode, functional style -->
- <!-- e.g., Prefer composition, avoid classes unless needed -->

### Testing
- Write tests for new features
- <!-- e.g., Use Jest, aim for >80% coverage -->

### Common Patterns

<!-- Document your project's common patterns here -->

## Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests written and passing
- [ ] Spec updated if needed
- [ ] No unnecessary dependencies

---

**Note**: Customize this file for your project. Remove placeholders and add real guidelines.
```

## Key Benefits

1. **No Content Loss** - Your existing instructions are preserved
2. **Clear Separation** - Horizontal rules mark the LeanSpec section
3. **Complementary** - LeanSpec adds spec-driven workflow without conflicting
4. **Customizable** - You can edit both sections to fit your needs

## Alternative Options

If merge isn't right for you:

- **Backup Mode**: Creates `AGENTS.md.backup` with your original, starts fresh with template
- **Skip Mode**: Keeps your `AGENTS.md` completely untouched, only adds `.lspec/` and `specs/`
