---
status: complete
created: '2025-11-24'
tags:
  - documentation
  - cli
  - user-experience
  - tutorials
priority: high
created_at: '2025-11-24T04:44:10.441Z'
updated_at: '2025-11-26T02:35:18.853Z'
completed_at: '2025-11-24T05:03:27.523Z'
completed: '2025-11-24'
transitions:
  - status: complete
    at: '2025-11-24T05:03:27.523Z'
related:
  - 116-init-example-leanspec-setup
  - 113-tutorial-simplification
---

# Example Projects and Init Scaffold for Tutorials

> **Status**: ✅ Complete · **Priority**: High · **Created**: 2025-11-24 · **Tags**: documentation, cli, user-experience, tutorials

**Project**: lean-spec  
**Team**: Core Development

## Overview

The new simplified tutorials (spec 113) demonstrate real-world scenarios with AI-driven workflows. To make these tutorials easy to follow and reproducible, we need:

1. **Example projects** that users can instantly scaffold
2. **`lean-spec init --example <name>`** command to set up tutorial scenarios
3. **Pre-configured project structures** with starter code, specs, and realistic context

**Problem**: Users following tutorials need to:
- Set up project structure manually
- Create placeholder files and code
- Understand domain context before starting
- Risk typos or misconfigurations that block learning

**Goal**: Users can run `lean-spec init --example dark-theme` and immediately have a working project ready for Tutorial 1, with all files, dependencies, and context in place.

**Related**: Spec 113 - Tutorial Simplification

## Design

### Example Project Structure

**Location**: `packages/cli/templates/examples/`

Each example is a complete mini-project with:
```
examples/
  dark-theme/              # Tutorial 1: Adding Dark Theme Support (simplest)
    package.json
    src/
      server.js           # Express server
      public/
        index.html        # Task manager UI
        style.css         # Light theme only
        app.js            # Task logic
    README.md             # Scenario context
    .gitignore
  
  dashboard-widgets/      # Tutorial 2: Managing Multiple Features
    package.json
    src/
      app.ts
      components/
        Dashboard.tsx
    README.md
  
  api-refactor/          # Tutorial 3: Refactoring with Specs
    package.json
    src/
      monolith.ts         # Messy code to refactor
      services/
        userService.ts
    README.md
```

### CLI Command Design

**New command**: `lean-spec init --example <name>`

**Behavior**:
1. Create new directory with example name (or custom name with `--name`)
2. Copy example template to new directory
3. Run `npm install` (or detect pnpm/yarn)
4. Display next steps with tutorial link

**Example usage**:
```bash
lean-spec init --example dark-theme

# Output:
# ✓ Created directory: dark-theme/
# ✓ Copied example project
# ✓ Installed dependencies
# 
# Next steps:
# 1. cd dark-theme
# 2. Open this project in your editor
# 3. Follow the tutorial: https://lean-spec.dev/docs/tutorials/first-spec-with-ai
# 4. Ask your AI: "Help me add dark theme support to this app using LeanSpec"
```

**Custom directory name**:
```bash
lean-spec init --example dark-theme --name my-feature-demo

# Creates: my-feature-demo/ with dark-theme template
```

**Interactive mode**: `lean-spec init --example` (no name)
- Show list of available examples
- Display description for each
- Let user select with arrow keys

### Example Project Requirements

Each example must:
- **Be minimal**: <10 files, <500 lines total
- **Have context**: README explains the scenario clearly
- **Be realistic**: Real-world tech stack (Express, React, etc.)
- **Be runnable**: `npm start` or `npm run dev` works immediately
- **Have clear pain points**: Obvious places where features/refactors are needed

### Integration with Tutorials

Tutorial docs reference the examples:

**Tutorial 1 opening:**
```markdown
## Quick Start

Want to follow along? Set up the example project:

\```bash
npx lean-spec init --example dark-theme
\```

Or use your own project...
```

**Benefits**:
- Zero friction to start learning
- Consistent experience across users
- Easy to reproduce issues
- Tutorials can reference specific files/code

## Plan

### Phase 1: Core Infrastructure
- [ ] Create `packages/cli/templates/examples/` directory structure
- [ ] Add `--example` flag to `init` command in CLI
- [ ] Implement template copying logic
- [ ] Handle package manager detection (npm/pnpm/yarn)
- [ ] Add interactive example selection mode

### Phase 2: Example Projects
- [x] Create `dark-theme` example (Tutorial 0: Adding Dark Theme Support)
  - Simple task manager web app with light theme
  - Express server serving static files
  - HTML/CSS/JS (no framework complexity)
  - README with scenario context
  - ~150 lines of starter code
  - **Status**: ✅ Completed 2025-11-24

- [ ] Create `email-notifications` example (Tutorial 2 - future)
  - Express.js API with user routes
  - Simple in-memory store
  - README with scenario context
  - ~200 lines of starter code

- [ ] Create `dashboard-widgets` example (Tutorial 2)
  - React app with basic dashboard
  - 2 existing widgets (stats, chart)
  - Component structure for adding more
  - ~300 lines of starter code

- [ ] Create `api-refactor` example (Tutorial 3)
  - Node.js app with monolithic structure
  - Tightly coupled services
  - Clear extraction opportunities
  - ~250 lines of "legacy" code

### Phase 3: CLI Polish
- [ ] Add `lean-spec examples` command to list all examples
- [ ] Show example descriptions and difficulty
- [ ] Add `--list` flag to `init` command
- [ ] Implement progress indicators during setup
- [ ] Add error handling for non-empty directories

### Phase 4: Documentation Integration
- [x] Update tutorial 0 to reference `dark-theme` example
  - **Status**: ✅ Completed 2025-11-24 - Created new first tutorial "Adding Dark Theme Support"
- [x] Update tutorial 1 to reference `dark-theme` example
  - **Status**: ✅ Completed 2025-11-24
- [ ] Update tutorial 2 to reference `dashboard-widgets` example
- [ ] Update tutorial 3 to reference `api-refactor` example
- [ ] Add "Examples" page to docs site
- [ ] Document example project structure
- [ ] Add troubleshooting section

### Phase 5: Testing & Validation
- [ ] Test scaffolding on clean directories
- [ ] Test with different package managers
- [ ] Verify all examples run successfully after init
- [ ] Test interactive selection mode
- [ ] Validate examples work with tutorial prompts

### Phase 6: Chinese Translations
- [ ] Translate example READMEs to Chinese
- [ ] Update Chinese tutorial docs with example references
- [ ] Ensure CLI output has i18n support for examples

## Test

**Success Criteria:**
- [ ] User can scaffold any example in <30 seconds
- [x] `lean-spec init --example dark-theme` creates working project
  - **Status**: ✅ Completed 2025-11-24
- [ ] All examples run without errors: `npm install && npm start`
- [ ] Interactive mode shows all examples with descriptions
- [ ] Tutorial prompts work correctly with scaffolded examples
- [ ] Examples follow LeanSpec best practices (minimal, realistic)
- [ ] Token count <2,000 per example README
- [ ] CLI provides clear next steps after scaffolding

**Validation Process:**
1. **Scaffolding test**: Run `lean-spec init --example <name>` for each example
2. **Dependency test**: Verify `npm install` completes successfully
3. **Runtime test**: Confirm `npm start` or `npm run dev` works
4. **Tutorial test**: Follow each tutorial using scaffolded example
5. **AI test**: Verify tutorial prompts produce expected results
6. **Error handling**: Test on non-empty directory, invalid example name
7. **Cross-platform**: Test on Linux, macOS, Windows

**Test Cases:**
```bash
# Basic usage
lean-spec init --example dark-theme
npm install && npm start  # Should run without errors

# Interactive mode
lean-spec init --example  # Should show selection menu

# List examples
lean-spec examples  # Should show all available examples

# Error cases
lean-spec init --example invalid-name  # Should show helpful error
lean-spec init --example dark-theme  # In non-empty dir → error
```

## Notes

### Design Decisions

**Why package manager detection?**
- Users may prefer pnpm/yarn over npm
- Better experience if we use their preferred tool
- Detect from lockfiles: `pnpm-lock.yaml`, `yarn.lock`, `package-lock.json`

**Why minimal starter code?**
- Focus on learning LeanSpec, not the tech stack
- Reduces token count when AI reads project
- Easier to understand and modify
- Faster setup time

**Why separate examples for each tutorial?**
- Each tutorial has different learning goals
- Avoids complexity of progressive examples
- Users can start at any tutorial
- Easier to maintain and update

### Example Project Tech Choices

**Tutorial 1 - Dark Theme Support**:
- **Tech**: Vanilla HTML/CSS/JS + Express
- **Why**: Simplest possible example, no framework complexity, CSS-focused
- **Scenario**: Add dark theme support with system preference detection
- **Complexity**: ~150 lines, 6 files
- **Learning focus**: Basic SDD workflow, CSS theming, spec creation

**Tutorial 2 - Dashboard Widgets**:
- **Tech**: React + TypeScript
- **Why**: Most popular frontend framework
- **Scenario**: Add 3 new widgets to existing dashboard
- **Complexity**: ~300 lines, 8-10 files

**Tutorial 3 - API Refactor**:
- **Tech**: Node.js + TypeScript (no framework)
- **Why**: Focus on architecture, not framework
- **Scenario**: Extract API client from monolith
- **Complexity**: ~250 lines, 6-8 files

### Alternative Approaches Considered

**1. Single progressive example**
- ❌ Users must complete tutorials in order
- ❌ More complex to maintain
- ❌ Harder to isolate concepts

**2. GitHub template repositories**
- ❌ Requires internet connection
- ❌ Harder to version with CLI
- ❌ No offline support

**3. Inline tutorial code snippets**
- ❌ User must copy-paste manually
- ❌ High friction, error-prone
- ❌ No realistic context

**Chosen approach**: Built-in templates with `--example` flag
- ✅ Works offline
- ✅ Instant setup
- ✅ Version-controlled with CLI
- ✅ Easy to maintain

### Future Enhancements

**Post-MVP ideas**:
- Example templates for other languages (Python, Go, Rust)
- Advanced examples (microservices, mobile apps)
- Community-contributed examples
- `lean-spec init --from-repo <url>` for custom templates
- Integration with `npx create-` patterns
- Example browser with search/filter

### Open Questions

- Should examples include `.git` directory? (Probably no - let user init)
- Should we support example "variants" (e.g., JavaScript vs TypeScript)?
- How to handle examples with external dependencies (databases)?
- Should examples be in separate npm package for smaller CLI bundle?

### Implementation Notes

**Template copying logic**:
```typescript
// Pseudo-code
async function initExample(name: string) {
  const templatePath = path.join(__dirname, '../templates/examples', name);
  const targetPath = process.cwd();
  
  // Check if target is empty
  if (!isEmptyOrGitOnly(targetPath)) {
    throw new Error('Directory must be empty');
  }
  
  // Copy template
  await fs.copy(templatePath, targetPath);
  
  // Detect package manager
  const pm = detectPackageManager();
  
  // Install dependencies
  await exec(`${pm} install`);
  
  // Show next steps
  console.log(getNextSteps(name));
}
```

**Interactive selection**:
```typescript
import prompts from 'prompts';

async function selectExample() {
  const examples = getExamples();
  const response = await prompts({
    type: 'select',
    name: 'example',
    message: 'Choose an example project:',
    choices: examples.map(ex => ({
      title: ex.name,
      description: ex.description,
      value: ex.name
    }))
  });
  
  return response.example;
}
```
