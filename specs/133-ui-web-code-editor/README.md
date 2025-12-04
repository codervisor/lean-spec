---
status: planned
created: '2025-11-28'
tags:
  - ui
  - ux
  - feature
  - editor
  - dx
priority: low
created_at: '2025-11-28T03:37:36.843Z'
related:
  - 131-ui-project-context-visibility
  - 107-ui-ux-refinements
  - 119-ui-diagram-rendering
  - 134-ui-metadata-editing
updated_at: '2025-12-04T04:10:12.737Z'
---

# External Editor Integration for Spec Editing

> **Status**: 🗓️ Planned · **Priority**: Low · **Created**: 2025-11-28 · **Tags**: ui, ux, feature, editor, dx

**Project**: lean-spec  
**Team**: Core Development

## Overview

Enhance `@leanspec/ui` with seamless external editor integration for editing spec files, agent instructions, and project configuration. Rather than building a web-based code editor, leverage the user's preferred local editor (VS Code, Cursor, Neovim, etc.).

### Problem

Users viewing specs in `@leanspec/ui` need to switch context when editing:
1. Find the spec file in their filesystem
2. Open in their editor manually
3. Navigate to the correct section

This friction breaks the reading-editing workflow.

### Solution

Add "Edit" buttons throughout the UI that open files directly in the user's configured editor:
- **Spec content**: Open spec README.md at specific line
- **Context files**: Open AGENTS.md, config files, etc.
- **Sub-specs**: Open specific sub-spec files

### Deployment Modes

| Mode | Context | Editing Approach |
|------|---------|------------------|
| **Local** | `npm run dev` or local server | External editor via URI protocol |
| **Remote** | Vercel, team server, cloud | GitHub.dev / Web editor fallback |

### Why Hybrid Approach?

| Approach | Pros | Cons |
|----------|------|------|
| **External Editor** | Zero bundle, full features, AI copilot | Local deployment only |
| **GitHub.dev** | Works remotely, familiar VS Code UI | Requires GitHub repo, no AI copilot |
| **Embedded Monaco** | Works anywhere, self-contained | +500KB bundle, no AI assistance |

**Decision**: 
- **Local mode** → External editor (VS Code, Cursor, etc.)
- **Remote mode** → GitHub.dev as primary fallback, with optional lightweight Monaco for non-GitHub projects

## Design

### Deployment Mode Detection

Detect whether UI is running locally or remotely:

```typescript
// lib/deployment-mode.ts
export type DeploymentMode = 'local' | 'remote';

export function getDeploymentMode(): DeploymentMode {
  // Check if running on localhost or local IP
  const hostname = window.location.hostname;
  const isLocal = 
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local');
  
  return isLocal ? 'local' : 'remote';
}

// Alternative: Server-side detection via environment variable
export function getServerDeploymentMode(): DeploymentMode {
  return process.env.LEANSPEC_DEPLOYMENT_MODE as DeploymentMode || 
         (process.env.VERCEL ? 'remote' : 'local');
}
```

### Editor Protocol URIs (Local Mode)

Support multiple editor protocols for cross-editor compatibility:

```typescript
// lib/editor-links.ts
export type EditorProtocol = 'vscode' | 'cursor' | 'zed' | 'sublime' | 'custom';

interface EditorConfig {
  protocol: EditorProtocol;
  uriPattern: string;  // Pattern with {path} and {line} placeholders
}

const EDITOR_PROTOCOLS: Record<EditorProtocol, string> = {
  vscode: 'vscode://file{path}:{line}',
  cursor: 'cursor://file{path}:{line}',
  zed: 'zed://file{path}:{line}',
  sublime: 'subl://open?url=file://{path}&line={line}',
  custom: '', // User-defined
};

export function getEditorUri(
  protocol: EditorProtocol,
  projectRoot: string,
  filePath: string,
  line?: number
): string {
  const fullPath = filePath.startsWith('/') ? filePath : `${projectRoot}/${filePath}`;
  const pattern = EDITOR_PROTOCOLS[protocol];
  
  return pattern
    .replace('{path}', fullPath)
    .replace(':{line}', line ? `:${line}` : '');
}
```

### Editor Selection UI

Add editor preference selector to settings/UI:

```typescript
// components/editor-selector.tsx
interface EditorSelectorProps {
  value: EditorProtocol;
  onChange: (protocol: EditorProtocol) => void;
}

const EDITORS = [
  { id: 'vscode', name: 'VS Code', icon: VSCodeIcon },
  { id: 'cursor', name: 'Cursor', icon: CursorIcon },
  { id: 'zed', name: 'Zed', icon: ZedIcon },
  { id: 'sublime', name: 'Sublime Text', icon: SublimeIcon },
];
```

### Line Number Mapping

For "Edit Section" functionality, map markdown headings to line numbers:

```typescript
// lib/markdown-utils.ts
interface HeadingLocation {
  id: string;      // Slug from heading text
  text: string;    // Heading text
  line: number;    // 1-based line number
  level: number;   // h1=1, h2=2, etc.
}

export function extractHeadingLocations(content: string): HeadingLocation[] {
  const lines = content.split('\n');
  const headings: HeadingLocation[] = [];
  
  lines.forEach((line, index) => {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const id = slugify(text);
      headings.push({ id, text, line: index + 1, level });
    }
  });
  
  return headings;
}
```

### Unified Edit Button Logic

Single "Edit" button that adapts to deployment mode:

```typescript
// hooks/use-edit-handler.ts
export function useEditHandler(filePath: string, line?: number) {
  const mode = getDeploymentMode();
  const editorPref = getPreferredEditor();
  const githubConfig = useGitHubConfig(); // From project config
  
  const handleEdit = useCallback(() => {
    if (mode === 'local') {
      // Open in local editor
      const uri = getEditorUri(editorPref, projectRoot, filePath, line);
      window.open(uri, '_blank');
    } else if (githubConfig) {
      // Open in GitHub.dev
      const uri = getGitHubDevUri(githubConfig, filePath, line);
      window.open(uri, '_blank');
    } else {
      // Show modal with options or copy path
      showEditOptionsModal(filePath);
    }
  }, [mode, editorPref, githubConfig, filePath, line]);
  
  const editLabel = mode === 'local' 
    ? `Edit in ${getEditorName(editorPref)}`
    : githubConfig 
      ? 'Edit on GitHub.dev'
      : 'Copy file path';
  
  return { handleEdit, editLabel, mode };
}
```

### UI Integration Points

**1. Spec Detail Header** - "Edit" button next to spec title:
```tsx
<Button variant="outline" size="sm" onClick={handleEdit}>
  <PencilLine className="h-4 w-4 mr-2" />
  Edit in {editorName}
</Button>
```

**2. Section-Level Edit** - "Edit" icon in TOC or section headers:
```tsx
// In TableOfContents component
<Button 
  variant="ghost" 
  size="icon"
  onClick={() => openInEditor(specPath, heading.line)}
  title={`Edit "${heading.text}" section`}
>
  <ExternalLink className="h-3 w-3" />
</Button>
```

**3. Context File Detail** (already implemented):
The existing "Open in Editor" button in `context-file-detail.tsx` follows this pattern.

**4. Quick Actions Dropdown**:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon">
      <MoreVertical className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => openInEditor(specPath)}>
      <ExternalLink className="mr-2 h-4 w-4" />
      Edit in {editorName}
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => openInEditor(agentsPath)}>
      <Bot className="mr-2 h-4 w-4" />
      Edit Agent Instructions
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### Preference Storage

Store editor preference in localStorage:

```typescript
// lib/preferences.ts
const EDITOR_PREF_KEY = 'leanspec:editor-protocol';

export function getPreferredEditor(): EditorProtocol {
  const stored = localStorage.getItem(EDITOR_PREF_KEY);
  return (stored as EditorProtocol) || detectDefaultEditor();
}

export function setPreferredEditor(protocol: EditorProtocol): void {
  localStorage.setItem(EDITOR_PREF_KEY, protocol);
}

function detectDefaultEditor(): EditorProtocol {
  // Could check for editor CLI availability or common patterns
  return 'vscode'; // Safe default
}
```

### Remote Mode: GitHub.dev Integration

For remote deployments, integrate with GitHub.dev (browser-based VS Code):

```typescript
// lib/github-editor.ts
interface GitHubEditorConfig {
  owner: string;      // Repository owner
  repo: string;       // Repository name  
  branch?: string;    // Default: main
  specsPath?: string; // Path to specs directory
}

export function getGitHubDevUri(
  config: GitHubEditorConfig,
  filePath: string,
  line?: number
): string {
  const { owner, repo, branch = 'main' } = config;
  // github.dev URL format
  const baseUrl = `https://github.dev/${owner}/${repo}/blob/${branch}/${filePath}`;
  return line ? `${baseUrl}#L${line}` : baseUrl;
}

export function getGitHub1sUri(
  config: GitHubEditorConfig,
  filePath: string,
  line?: number
): string {
  const { owner, repo, branch = 'main' } = config;
  // github1s.com - faster loading alternative
  const baseUrl = `https://github1s.com/${owner}/${repo}/blob/${branch}/${filePath}`;
  return line ? `${baseUrl}#L${line}` : baseUrl;
}
```

**Configuration** (`.lean-spec/config.json`):
```json
{
  "github": {
    "owner": "your-org",
    "repo": "your-project",
    "branch": "main"
  }
}
```

### Remote Mode: Lightweight Embedded Editor (Optional)

For projects not on GitHub, provide a minimal embedded editor:

```typescript
// Option A: CodeMirror 6 (lighter than Monaco)
// ~60KB gzipped vs Monaco's ~500KB

// Option B: Textarea with syntax highlighting overlay
// Minimal bundle, covers 80% of quick edit use cases

interface EmbeddedEditorProps {
  content: string;
  language: 'markdown' | 'json' | 'yaml';
  onSave: (newContent: string) => Promise<void>;
  readOnly?: boolean;
}
```

**Decision**: Defer embedded editor to Phase 5. GitHub.dev covers most remote use cases. Add lightweight editor only if strong user demand.

### Auto-Refresh After Edit

When user returns from editing, refresh the spec data:

```typescript
// hooks/use-focus-refresh.ts
export function useFocusRefresh(refreshFn: () => void) {
  useEffect(() => {
    const handleFocus = () => {
      // Small delay to ensure file system is synced
      setTimeout(refreshFn, 100);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshFn]);
}

// Usage in spec detail page
const { refetch } = useQuery(['spec', specId], ...);
useFocusRefresh(refetch);
```

## Plan

### Phase 1: Core Infrastructure
- [ ] Create `lib/deployment-mode.ts` for local/remote detection
- [ ] Create `lib/editor-links.ts` with multi-editor URI generation
- [ ] Create `lib/preferences.ts` for editor preference storage
- [ ] Add `extractHeadingLocations()` for section-to-line mapping
- [ ] Implement `useFocusRefresh` hook for auto-refresh

### Phase 2: Local Mode - External Editor
- [ ] Add "Edit in {Editor}" button to spec detail header
- [ ] Add edit icons to TableOfContents for section-level editing
- [ ] Implement quick actions dropdown with edit options
- [ ] Show keyboard shortcut hint (e.g., "Press E to edit")

### Phase 3: Remote Mode - GitHub.dev Integration
- [ ] Create `lib/github-editor.ts` for GitHub.dev URI generation
- [ ] Add GitHub config to `.lean-spec/config.json` schema
- [ ] Detect GitHub repo info from git remote or config
- [ ] Fallback to "Copy path" when no GitHub config

### Phase 4: Editor Selection UI
- [ ] Create `EditorSelector` component with popular editors
- [ ] Add settings dropdown/dialog for editor preference
- [ ] Support custom editor URI patterns
- [ ] Show deployment mode indicator in UI

### Phase 5: (Future) Lightweight Embedded Editor
- [ ] Evaluate CodeMirror 6 vs simple textarea
- [ ] Implement for non-GitHub remote deployments
- [ ] Add save-to-filesystem API route
- [ ] Only if significant user demand

## Test

**Deployment Mode Detection**
- [ ] Correctly identifies localhost as local mode
- [ ] Correctly identifies Vercel/remote URLs as remote mode
- [ ] Handles edge cases (local IP, .local domains)

**Local Mode - URI Generation**
- [ ] VS Code URI opens correct file
- [ ] Cursor URI works correctly
- [ ] Line number parameter opens at correct line
- [ ] Handles paths with spaces and special characters

**Remote Mode - GitHub.dev**
- [ ] GitHub.dev link opens correct file in browser
- [ ] Line number anchor scrolls to correct line
- [ ] Works with different branch configurations
- [ ] Graceful fallback when GitHub config missing

**Preference Storage**
- [ ] Editor preference persists across sessions
- [ ] Default detection works when no preference set
- [ ] Can switch editors without page reload

**Section Editing**
- [ ] Clicking "Edit Section" opens at correct line
- [ ] Works for all heading levels (h1-h6)
- [ ] Handles duplicate heading text correctly

**Auto-Refresh**
- [ ] Spec content updates after returning from editor
- [ ] No duplicate refreshes on rapid focus changes
- [ ] Works across browser tabs

**Error Handling**
- [ ] Graceful fallback if editor not installed
- [ ] Shows helpful message about installing editor
- [ ] Fallback to copy path if all else fails

## Notes

### Existing Implementation Reference

The pattern is already proven in `context-file-detail.tsx`:

```tsx
function getVSCodeUri(projectRoot: string, filePath: string): string {
  const fullPath = filePath.startsWith('/') ? filePath : `${projectRoot}/${filePath}`;
  return `vscode://file${fullPath}`;
}

const handleOpenInEditor = () => {
  if (projectRoot) {
    window.open(getVSCodeUri(projectRoot, file.path), '_blank');
  }
};
```

This spec extends that pattern with:
1. Multi-editor support (not just VS Code)
2. Line number targeting for section editing
3. User preference storage
4. Auto-refresh on return

### Alternative: Embedded Editor Modal

A lighter alternative to full web editor: show a simple textarea modal for quick edits, then save via API. Consider for Phase 5 if users want inline editing without switching apps. Only pursue if:
1. Many users deploy remotely without GitHub
2. GitHub.dev friction is too high for quick edits

### Remote Editing Limitations

When deployed remotely, be aware of these constraints:
- **GitHub.dev** requires the project to be in a GitHub repository
- **File sync** after editing requires git commit + refresh
- **No AI copilot** in GitHub.dev (only basic IntelliSense)
- **Authentication** may be required for private repositories

### Related Work

- **Spec 131**: Project context visibility - has existing "Open in Editor" button
- **Spec 134**: Metadata editing - handles quick edits for frontmatter only
- **Spec 107**: UI/UX refinements - design system patterns

### Future Enhancements

- **GitHub.dev integration**: For users without local editors, offer GitHub.dev as fallback
- **Browser extension**: Detect when file is saved and auto-refresh UI
- **Diff view**: Show changes since last UI view when refreshing
