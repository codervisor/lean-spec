# UI/UX Design System & Implementation Guide

This document details the comprehensive UI/UX design requirements, design system specifications, and component patterns for LeanSpec Web enhancements.

## Design Goals

1. **Professional Quality** - Match standards of Linear, Vercel, Stripe docs
2. **Accessible** - WCAG 2.1 AA compliance, keyboard navigation, screen readers
3. **Responsive** - Mobile-first design that works on all devices
4. **Performant** - Fast loading, smooth animations, optimistic updates
5. **Intuitive** - Clear information hierarchy, easy navigation

## Design System Foundation

### Color Palette

**Status Colors:**
```css
Complete:     hsl(142 76% 36%)        /* Green */
In Progress:  hsl(38 92% 50%)         /* Orange */
Planned:      hsl(221 83% 53%)        /* Blue */
Archived:     hsl(215 16% 47%)        /* Gray */
```

**Priority Colors:**
```css
Critical:     hsl(0 84% 60%)          /* Red */
High:         hsl(38 92% 50%)         /* Orange */
Medium:       hsl(221 83% 53%)        /* Blue */
Low:          hsl(215 16% 47%)        /* Gray */
```

### Typography

**Font Stack:**
```css
--font-sans: system-ui, -apple-system, 'Segoe UI', sans-serif
--font-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace
```

**Sizes & Weights:**
- Display: 2.25rem (36px), weight 700, line-height 1.1
- Heading 1: 1.875rem (30px), weight 700, line-height 1.2
- Heading 2: 1.5rem (24px), weight 600, line-height 1.3
- Body: 1rem (16px), weight 400, line-height 1.5
- Small: 0.875rem (14px), weight 400, line-height 1.5

### Spacing Scale

```css
xs:   4px    sm:   8px    md:   12px
base: 16px   lg:   24px   xl:   32px
2xl:  48px   3xl:  64px   4xl:  80px
```

### Icon System

**Library:** Lucide React v0.553.0+

**Status Icons:**
- Clock: Planned
- PlayCircle: In Progress  
- CheckCircle2: Complete
- Archive: Archived

**Priority Icons:**
- AlertCircle: Critical
- ArrowUp: High
- Minus: Medium
- ArrowDown: Low

**Icon Size Standards:**
- Small (inline): h-4 w-4 (16px)
- Medium (default): h-5 w-5 (20px)
- Large (sections): h-6 w-6 (24px)
- Extra large (empty states): h-12 w-12 (48px)

## Component Specifications

### Stats Cards with Gradients

```tsx
<Card className="relative overflow-hidden">
  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
  <CardHeader className="relative pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        Total Specs
      </CardTitle>
      <FileText className="h-5 w-5 text-blue-600" />
    </div>
  </CardHeader>
  <CardContent className="relative">
    <div className="text-3xl font-bold">{stats.totalSpecs}</div>
    <p className="text-xs text-muted-foreground mt-1">
      <TrendingUp className="inline h-3 w-3 text-green-600" />
      <span className="text-green-600">↑ 12%</span> from last month
    </p>
  </CardContent>
</Card>
```

### Sidebar Navigation (Spec List)

**Features:**
- Collapsible left sidebar
- Search/filter within sidebar
- Current spec highlighted
- Sticky positioning
- Quick access to all specs

**Layout:**
```tsx
<aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 border-r overflow-y-auto">
  <div className="p-4 space-y-4">
    <Input 
      placeholder="Search specs..." 
      className="h-9"
    />
    <ScrollArea className="h-full">
      {specs.map(spec => (
        <Link
          key={spec.id}
          href={`/specs/${spec.id}`}
          className={cn(
            "block p-2 rounded-md text-sm transition-colors",
            currentSpec === spec.id 
              ? "bg-accent text-accent-foreground font-medium"
              : "hover:bg-accent/50"
          )}
        >
          #{spec.specNumber} - {spec.title}
        </Link>
      ))}
    </ScrollArea>
  </div>
</aside>
```

### Sticky Elements Implementation

**Sticky Header:**
```tsx
<div className="sticky top-0 z-40 bg-background/95 backdrop-blur">
  <Breadcrumb />
  <div className="flex items-center justify-between px-6 py-3 border-b">
    <h1 className="text-2xl font-bold">{spec.title}</h1>
    <div className="flex gap-2">
      <ThemeToggle />
      <Button variant="outline">Actions</Button>
    </div>
  </div>
</div>
```

**Sticky Info Panel:**
```tsx
<aside className="sticky top-24 h-fit w-80 flex-shrink-0">
  <Card>
    <CardHeader>
      <CardTitle>Metadata</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Timeline, status, priority, tags, etc. */}
    </CardContent>
  </Card>
</aside>
```

### Enhanced Frontmatter Display

**Improved Layout with Icons:**
```tsx
<Card>
  <CardContent className="pt-6">
    <dl className="grid grid-cols-2 gap-4">
      <div>
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <PlayCircle className="h-4 w-4" />
          Status
        </dt>
        <dd className="mt-1">
          <Badge variant="secondary" className="flex items-center gap-1.5 w-fit">
            <PlayCircle className="h-3.5 w-3.5" />
            In Progress
          </Badge>
        </dd>
      </div>
      {/* Additional metadata fields... */}
    </dl>
  </CardContent>
</Card>
```

### Sub-Spec Navigation Redesign

**Better Hierarchy with Icons:**
```tsx
<Tabs defaultValue="readme" className="w-full">
  <TabsList className="grid w-full grid-cols-auto">
    <TabsTrigger value="readme" className="flex items-center gap-2">
      <FileText className="h-4 w-4" />
      Overview
    </TabsTrigger>
    <TabsTrigger value="design" className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-purple-600" />
      Design
    </TabsTrigger>
    <TabsTrigger value="implementation" className="flex items-center gap-2">
      <Code className="h-4 w-4 text-green-600" />
      Implementation
    </TabsTrigger>
  </TabsList>
</Tabs>
```

### Quick Search (Cmd+K)

**Implementation with shadcn/ui Command:**
```tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search specs..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Recent">
      {recentSearches.map(search => (
        <CommandItem key={search} onSelect={() => navigate(search)}>
          <History className="mr-2 h-4 w-4" />
          {search}
        </CommandItem>
      ))}
    </CommandGroup>
    <CommandGroup heading="Specs">
      {searchResults.map(spec => (
        <CommandItem key={spec.id} onSelect={() => navigate(`/specs/${spec.id}`)}>
          <FileText className="mr-2 h-4 w-4" />
          <div className="flex flex-col">
            <span>{spec.title}</span>
            <span className="text-xs text-muted-foreground">{spec.description}</span>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

### Loading Skeletons

**Spec Card Skeleton:**
```tsx
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-[250px]" />
  </CardHeader>
  <CardContent className="space-y-2">
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-16" />
    </div>
  </CardContent>
</Card>
```

**Page Loading State:**
```tsx
// app/specs/[id]/loading.tsx
export default function Loading() {
  return (
    <div className="container py-6 space-y-6">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
```

### Enhanced Empty States

**With Icons and Actions:**
```tsx
<Card className="border-dashed">
  <CardContent className="py-12 text-center">
    <FileX className="mx-auto h-12 w-12 text-muted-foreground/50" />
    <h3 className="mt-4 text-lg font-semibold">No specs found</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Try adjusting your filters or search query
    </p>
    <div className="mt-4 flex items-center justify-center gap-2">
      <Button variant="outline" onClick={clearFilters}>
        <Filter className="h-4 w-4 mr-2" />
        Clear Filters
      </Button>
      <Button variant="outline" onClick={clearSearch}>
        <X className="h-4 w-4 mr-2" />
        Clear Search
      </Button>
    </div>
  </CardContent>
</Card>
```

### Toast Notifications

**Using sonner library:**
```tsx
import { toast } from 'sonner';

// Success
toast.success('Spec created successfully', {
  description: 'Your spec has been saved to the database.',
  action: {
    label: 'View',
    onClick: () => router.push(`/specs/${spec.id}`)
  }
});

// Error
toast.error('Failed to save spec', {
  description: error.message
});

// Loading
toast.loading('Saving spec...');
```

## Theme Switching

### next-themes Implementation

**Provider Setup:**
```tsx
// app/providers.tsx
import { ThemeProvider } from 'next-themes';

export function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
```

**Toggle Component:**
```tsx
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

## Responsive Design

### Breakpoints
- sm: 640px
- md: 768px  
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

### Mobile Optimizations
- Hamburger menu below 768px
- Single column layout on mobile
- Collapsible sidebar
- Horizontal scroll for tables
- Bottom sheet for filters
- Larger touch targets (min 44x44px)

## Accessibility Standards

### WCAG 2.1 AA Requirements

**Keyboard Navigation:**
- Tab order follows visual order
- Skip links to main content
- Cmd+K for search
- Escape to close modals
- Arrow keys for lists

**Screen Readers:**
- Semantic HTML
- ARIA labels for icons
- Live regions for dynamic content
- Descriptive link text

**Visual:**
- Color contrast >= 4.5:1 for text
- Color contrast >= 3:1 for UI components
- Focus indicators visible
- No information by color alone

**Testing Tools:**
- axe DevTools
- Lighthouse accessibility audit
- Manual keyboard testing
- Screen reader testing (NVDA/JAWS/VoiceOver)

## Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Performance: > 90
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

## Implementation Priority

### High Priority (Week 1-2)
1. Quick search (Cmd+K)
2. Sidebar navigation
3. Sticky header and info panel
4. Improved frontmatter display
5. Sub-spec navigation redesign

### Medium Priority (Week 3)
6. Loading skeletons
7. Enhanced empty states
8. Toast notifications
9. Stats page completion

### Lower Priority (Week 4)
10. Logo and favicon
11. Accessibility audit
12. Performance optimization
13. Final polish
