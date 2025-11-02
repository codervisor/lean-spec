---
status: planned
created: 2025-11-02
tags: [feature, ide, vscode]
priority: medium
---

# vscode-extension

> **Status**: 📅 Planned · **Priority**: Medium · **Created**: 2025-11-02

## Overview

Create a VS Code extension that integrates LeanSpec directly into the editor, providing inline spec management, navigation, and AI agent integration.

**Developer Pain Points:**
- Switching between editor and terminal for spec management
- Finding specs across folder structure
- No syntax highlighting for spec frontmatter
- AI agents can't easily reference specs during coding
- Manual updating of spec status

**What Success Looks Like:**
- Create/edit specs without leaving VS Code
- Tree view showing all specs with status indicators
- Quick actions to update spec metadata
- Frontmatter validation and autocomplete
- Integration with GitHub Copilot context

## Design

### 1. Extension Features

**Spec Explorer (Tree View)**
```
LEANSPEC SPECS
├── 📅 20251102/
│   ├── ✅ 001-custom-spec-templates/
│   ├── 📅 002-complete-custom-frontmatter/
│   └── 🔨 003-npm-publishing/
├── ✅ 20251101/
│   └── ✅ 001-existing-project-integration/
└── 📅 Planned (3)
    🔨 In Progress (1)
    ✅ Complete (9)
```

**Quick Actions:**
- Right-click spec → Update Status
- Right-click spec → Archive
- Right-click spec → Open in Editor
- Right-click spec → Copy Path

**Commands (Ctrl+Shift+P):**
- `LeanSpec: Create New Spec`
- `LeanSpec: Update Spec Status`
- `LeanSpec: Show Stats`
- `LeanSpec: Show Board`
- `LeanSpec: Search Specs`
- `LeanSpec: Validate All Specs`

**Status Bar:**
```
📋 LeanSpec: 3 planned, 1 in progress, 9 complete
```

### 2. Editor Features

**Frontmatter Validation:**
- Syntax highlighting for YAML frontmatter
- Red squiggles for invalid fields
- Autocomplete for status, priority, tags
- Hover tooltips showing field descriptions

**Snippets:**
- `lspec-spec` → Full spec template
- `lspec-front` → Frontmatter block
- `lspec-plan` → Plan section with checkboxes

**CodeLens:**
```markdown
---
status: planned
---
👆 Update Status | 🔄 Sync Metadata

# My Feature Spec
```

### 3. AI Agent Integration

**Copilot Context Provider:**
```typescript
// Enable Copilot to reference specs
vscode.lm.registerContextProvider('leanspec', {
  provideContext(query) {
    // Search specs matching query
    // Return relevant spec content
  }
});
```

**Usage:**
```
@leanspec How should I implement the API endpoints?
// Copilot gets context from relevant specs
```

### 4. Extension Architecture

```typescript
// Extension structure
src/
├── extension.ts              # Activation
├── commands/
│   ├── createSpec.ts
│   ├── updateSpec.ts
│   └── searchSpecs.ts
├── providers/
│   ├── SpecTreeProvider.ts   # Tree view
│   ├── FrontmatterValidator.ts
│   ├── CompletionProvider.ts # Autocomplete
│   └── CopilotProvider.ts    # AI context
├── views/
│   └── statsWebview.ts       # Stats dashboard
└── utils/
    └── lspecClient.ts        # Wrap CLI commands
```

### 5. Configuration

```json
{
  "leanspec.specsDirectory": "specs",
  "leanspec.autoRefresh": true,
  "leanspec.showStatusBar": true,
  "leanspec.validateOnSave": true,
  "leanspec.copilotIntegration": true
}
```

## Plan

### Phase 1: Core Extension Setup
- [ ] Initialize VS Code extension project
- [ ] Set up TypeScript, webpack bundling
- [ ] Create extension manifest (package.json)
- [ ] Set up activation events
- [ ] Install lean-spec as dependency

### Phase 2: Spec Explorer Tree View
- [ ] Implement SpecTreeProvider
- [ ] Load specs from workspace
- [ ] Display folder structure with icons
- [ ] Show status indicators (icons)
- [ ] Add click to open spec
- [ ] Add refresh button

### Phase 3: Commands & Quick Actions
- [ ] Implement `Create New Spec` command
- [ ] Implement `Update Status` command
- [ ] Implement `Show Stats` command
- [ ] Implement `Search Specs` command
- [ ] Add context menu items to tree view
- [ ] Add status bar item with spec counts

### Phase 4: Editor Features
- [ ] Add frontmatter syntax highlighting
- [ ] Implement validation diagnostics
- [ ] Add autocomplete for frontmatter fields
- [ ] Create spec snippets
- [ ] Add CodeLens for quick actions
- [ ] Add hover tooltips

### Phase 5: AI Integration
- [ ] Research Copilot Context Provider API
- [ ] Implement context provider
- [ ] Test with GitHub Copilot
- [ ] Add configuration toggle

### Phase 6: Polish & Publishing
- [ ] Create extension icon
- [ ] Write comprehensive README
- [ ] Add screenshots/GIFs
- [ ] Test on Windows, macOS, Linux
- [ ] Publish to VS Code Marketplace
- [ ] Link from lean-spec README

## Test

### Tree View Tests
- [ ] Tree view loads specs correctly
- [ ] Icons match spec status
- [ ] Click opens spec file
- [ ] Refresh updates tree
- [ ] Works with empty specs directory

### Command Tests
- [ ] Create spec command works
- [ ] Update status command works
- [ ] Commands show in palette
- [ ] Status bar updates on changes

### Editor Tests
- [ ] Frontmatter validation detects errors
- [ ] Autocomplete suggests valid values
- [ ] Snippets expand correctly
- [ ] CodeLens actions work

### Integration Tests
- [ ] Extension activates in workspace with .lspec/
- [ ] Works with all templates
- [ ] Handles spec creation/deletion
- [ ] File watcher updates on external changes

### Copilot Tests
- [ ] Context provider registers
- [ ] Copilot can query specs
- [ ] Returns relevant spec content

## Notes

**VS Code Extension API:**
- TreeDataProvider for tree view
- DiagnosticCollection for validation
- CompletionItemProvider for autocomplete
- CodeLensProvider for inline actions
- StatusBarItem for status display
- FileSystemWatcher for auto-refresh

**Marketplace Listing:**
- Name: "LeanSpec"
- Description: "Lightweight spec management for AI-powered development"
- Categories: Programming Languages, Other
- Icon: 📋 or spec document icon
- Keywords: spec, sdd, documentation, ai, agent

**Bundle Size:**
- Keep extension lightweight (< 5MB)
- Use webpack to bundle dependencies
- Consider using CLI as subprocess vs. importing

**Future Enhancements:**
- Spec dependency graph visualization
- Inline spec preview in hover
- Spec templates gallery
- Integration with other AI tools (Cursor, etc.)
- Spec metrics dashboard (webview)
- Git blame integration (show who wrote spec)

**Alternative Approach:**
- Could build as Language Server Protocol (LSP)
- Would enable support for other editors (Neovim, etc.)
- More complex but more portable

**References:**
- VS Code Extension API: https://code.visualstudio.com/api
- Tree View Guide: https://code.visualstudio.com/api/extension-guides/tree-view
- Copilot Context: https://code.visualstudio.com/api/extension-guides/language-model
