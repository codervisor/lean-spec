# @leanspec/ui-components

Framework-agnostic, tree-shakeable UI components for LeanSpec.

## Installation

```bash
npm install @leanspec/ui-components
# or
pnpm add @leanspec/ui-components
```

## Usage

```tsx
import { StatusBadge, PriorityBadge, SpecCard, EmptyState, SearchInput } from '@leanspec/ui-components';
import '@leanspec/ui-components/styles.css';

function MyComponent() {
  return (
    <div>
      <SearchInput placeholder="Search specs..." onSearch={(q) => console.log(q)} />
      <StatusBadge status="in-progress" />
      <PriorityBadge priority="high" />
      <SpecCard 
        spec={{ 
          specNumber: 185, 
          specName: 'ui-components', 
          title: 'UI Components',
          status: 'in-progress',
          priority: 'high',
          tags: ['ui', 'components'],
          updatedAt: new Date().toISOString(),
        }} 
      />
    </div>
  );
}
```

## Components

### Spec Components

- `StatusBadge` - Display spec status with icon
- `PriorityBadge` - Display spec priority with icon
- `SpecCard` - Compact spec card for lists
- `SpecMetadata` - Metadata display card with all spec details
- `TagBadge` - Display a single tag
- `TagList` - Display multiple tags with truncation

### Project Components

- `ProjectAvatar` - Avatar with initials and color from project name
- `ProjectCard` - Project card with avatar, description, stats, and tags
- `ProjectSwitcher` - Project switcher dropdown (framework-agnostic with callbacks)
- `ProjectDialog` - Project creation/edit dialog (framework-agnostic with callbacks)

### Stats Components

- `StatsCard` - Single stat card with icon and trend indicator
- `StatsOverview` - Grid of stats cards for project overview
- `ProgressBar` - Horizontal progress bar with variants

### Search & Filter Components

- `SearchInput` - Search input with keyboard shortcut hint
- `FilterSelect` - Dropdown filter component
- `SearchResults` - Search results grid display

### Graph Components

- `SpecDependencyGraph` - Interactive dependency graph using ReactFlow (framework-agnostic with callbacks)

### Navigation Components

- `ThemeToggle` - Light/dark theme toggle button
- `BackToTop` - Floating scroll-to-top button

### UI Components

- `Avatar` - Avatar with image and fallback
- `Badge` - Base badge component with variants
- `Button` - Button with variants (default, destructive, outline, secondary, ghost, link)
- `Card` - Card container with header, content, footer
- `Input` - Form input field
- `Separator` - Horizontal or vertical divider
- `Skeleton` - Loading placeholder

### Layout Components

- `EmptyState` - Empty state placeholder with icon, title, description, action
- `SpecListSkeleton` - Loading skeleton for spec list
- `SpecDetailSkeleton` - Loading skeleton for spec detail
- `StatsCardSkeleton` - Loading skeleton for stats card
- `KanbanBoardSkeleton` - Loading skeleton for kanban board
- `ProjectCardSkeleton` - Loading skeleton for project card
- `SidebarSkeleton` - Loading skeleton for sidebar
- `ContentSkeleton` - Generic content skeleton

## Hooks

- `useLocalStorage` - Persist state in localStorage
- `useDebounce` - Debounce a value
- `useDebouncedCallback` - Debounce a callback function
- `useTheme` - Theme state management with localStorage persistence

## Utilities

- `cn` - Merge Tailwind CSS classes
- `formatDate` - Format date in readable format
- `formatDateTime` - Format date with time
- `formatRelativeTime` - Format relative time (e.g., "2 days ago")
- `formatDuration` - Format duration between dates
- `getColorFromString` - Generate consistent color from string
- `getContrastColor` - Get contrasting text color for background
- `getInitials` - Get initials from name string
- `PROJECT_COLORS` - Predefined color palette

## Types

All spec-related TypeScript types are exported:

- `Spec`, `LightweightSpec`, `SidebarSpec`
- `SpecStatus`, `SpecPriority`
- `StatsResult`, `DependencyGraph`, etc.

## Advanced Usage Examples

### Using SpecDependencyGraph

```tsx
import { SpecDependencyGraph } from '@leanspec/ui-components';

function MyDependencyView({ relationships, specNumber, specTitle }) {
  return (
    <div style={{ height: '600px' }}>
      <SpecDependencyGraph
        relationships={relationships}
        specNumber={specNumber}
        specTitle={specTitle}
        onNodeClick={(specId) => {
          // Handle navigation to spec
          router.push(`/specs/${specId}`);
        }}
        labels={{
          title: 'Dependencies',
          subtitle: 'Click to navigate',
        }}
      />
    </div>
  );
}
```

### Using ProjectSwitcher

```tsx
import { ProjectSwitcher } from '@leanspec/ui-components';

function MyProjectSwitcher({ currentProject, projects }) {
  return (
    <ProjectSwitcher
      currentProject={currentProject}
      projects={projects}
      onProjectSelect={(projectId) => {
        // Handle project switching
        router.push(`/projects/${projectId}`);
      }}
      onAddProject={() => {
        // Open project creation dialog
        setShowDialog(true);
      }}
      onManageProjects={() => {
        // Navigate to project management
        router.push('/projects');
      }}
    />
  );
}
```

### Using ProjectDialog

```tsx
import { ProjectDialog } from '@leanspec/ui-components';

function MyProjectDialog({ open, onOpenChange }) {
  return (
    <ProjectDialog
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={async (path) => {
        // Handle project creation
        await createProject(path);
        onOpenChange(false);
      }}
      onBrowseFolder={async () => {
        // Show native file picker (Tauri/Electron)
        const result = await window.__TAURI__.dialog.open({
          directory: true,
        });
        return result;
      }}
    />
  );
}
```

### Using SearchResults

```tsx
import { SearchResults } from '@leanspec/ui-components';

function MySearch({ query, results, isSearching }) {
  return (
    <SearchResults
      query={query}
      results={results}
      isSearching={isSearching}
      onSpecClick={(specId) => {
        router.push(`/specs/${specId}`);
      }}
    />
  );
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run tests
pnpm test
```

## License

MIT
