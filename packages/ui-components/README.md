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
import { StatusBadge, PriorityBadge, SpecCard, EmptyState } from '@leanspec/ui-components';
import '@leanspec/ui-components/styles.css';

function MyComponent() {
  return (
    <div>
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
- `TagBadge` - Display a single tag
- `TagList` - Display multiple tags with truncation

### UI Components

- `Badge` - Base badge component with variants
- `Button` - Button with variants (default, destructive, outline, secondary, ghost, link)
- `Card` - Card container with header, content, footer
- `Input` - Form input field
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

## Utilities

- `cn` - Merge Tailwind CSS classes
- `formatDate` - Format date in readable format
- `formatDateTime` - Format date with time
- `formatRelativeTime` - Format relative time (e.g., "2 days ago")
- `formatDuration` - Format duration between dates

## Types

All spec-related TypeScript types are exported:

- `Spec`, `LightweightSpec`, `SidebarSpec`
- `SpecStatus`, `SpecPriority`
- `StatsResult`, `DependencyGraph`, etc.

## Development

```bash
# Install dependencies
pnpm install

# Build the library
pnpm build

# Run Storybook
pnpm storybook

# Run tests
pnpm test
```

## License

MIT
