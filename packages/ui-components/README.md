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
import { StatusBadge, PriorityBadge } from '@leanspec/ui-components';
import '@leanspec/ui-components/styles.css';

function MyComponent() {
  return (
    <div>
      <StatusBadge status="in-progress" />
      <PriorityBadge priority="high" />
    </div>
  );
}
```

## Components

### Spec Components

- `StatusBadge` - Display spec status with icon
- `PriorityBadge` - Display spec priority with icon

### UI Components

- `Badge` - Base badge component with variants

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
