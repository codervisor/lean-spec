# UI/UX Design Specification

This document details the comprehensive UI/UX design requirements for LeanSpec Web.

## Overview

Transform the current basic UI into a professional, polished web application with excellent user experience, theme switching, and intuitive navigation.

**Design Goals:**
1. **Professional Quality** - Match standards of Linear, Vercel, Stripe docs
2. **Accessible** - WCAG 2.1 AA compliance, keyboard navigation, screen readers
3. **Responsive** - Mobile-first design that works on all devices
4. **Performant** - Fast loading, smooth animations, optimistic updates
5. **Intuitive** - Clear information hierarchy, easy navigation

## Current Problems

### 1. Basic UI Design
- Not using shadcn/ui component library
- Inconsistent spacing, padding, alignment
- Plain layouts without visual hierarchy
- Minimal shadows and elevation
- Basic color usage without refinement

### 2. No Theme Switching
- Dark mode variables defined but no toggle
- No system preference detection
- No theme persistence
- Code blocks not theme-aware

### 3. Poor Navigation UX
- No sticky header
- No breadcrumb navigation
- No active page indicators
- Basic mobile experience
- Missing quick search (Cmd+K)

### 4. Spec Reading Experience
**Timeline & History:**
- No visualization of spec evolution
- Can't see when spec was created/completed
- Status transitions not displayed
- Time metrics not shown

**Sub-Spec Handling:**
- Sub-specs not automatically detected
- No navigation between main spec and sub-specs
- Poor layout for different sub-spec types
- Missing table of contents
- Difficult to understand document structure

## Design System

### Color Palette

**Light Mode:**
```css
Background:   hsl(0 0% 100%)           /* Pure white */
Foreground:   hsl(222.2 84% 4.9%)     /* Near black */
Card:         hsl(0 0% 100%)          /* White */
Primary:      hsl(221.2 83.2% 53.3%)  /* Blue */
Secondary:    hsl(210 40% 96.1%)      /* Light gray */
Muted:        hsl(210 40% 96.1%)      /* Subtle bg */
Accent:       hsl(210 40% 96.1%)      /* Light accent */
Destructive:  hsl(0 84.2% 60.2%)      /* Red */
Border:       hsl(214.3 31.8% 91.4%)  /* Light border */
```

**Dark Mode:**
```css
Background:   hsl(222.2 84% 4.9%)     /* Dark blue-black */
Foreground:   hsl(210 40% 98%)        /* Off-white */
Card:         hsl(222.2 84% 4.9%)     /* Dark card */
Primary:      hsl(217.2 91.2% 59.8%)  /* Lighter blue */
Secondary:    hsl(217.2 32.6% 17.5%)  /* Dark gray */
Muted:        hsl(217.2 32.6% 17.5%)  /* Subtle dark */
Accent:       hsl(217.2 32.6% 17.5%)  /* Dark accent */
Destructive:  hsl(0 62.8% 30.6%)      /* Dark red */
Border:       hsl(217.2 32.6% 17.5%)  /* Dark border */
```

**Status Colors:**
```css
Complete:     hsl(142 76% 36%)        /* Green */
In Progress:  hsl(221 83% 53%)        /* Blue */
Planned:      hsl(38 92% 50%)         /* Orange */
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
```css
/* Display */
.text-4xl: 2.25rem (36px), font-weight: 700, line-height: 1.1
.text-3xl: 1.875rem (30px), font-weight: 700, line-height: 1.2

/* Headings */
.text-2xl: 1.5rem (24px), font-weight: 600, line-height: 1.3
.text-xl: 1.25rem (20px), font-weight: 600, line-height: 1.4
.text-lg: 1.125rem (18px), font-weight: 600, line-height: 1.4

/* Body */
.text-base: 1rem (16px), font-weight: 400, line-height: 1.5
.text-sm: 0.875rem (14px), font-weight: 400, line-height: 1.5
.text-xs: 0.75rem (12px), font-weight: 400, line-height: 1.4
```

### Spacing Scale

```css
xs:   4px    (0.25rem)
sm:   8px    (0.5rem)
md:   12px   (0.75rem)
base: 16px   (1rem)
lg:   24px   (1.5rem)
xl:   32px   (2rem)
2xl:  48px   (3rem)
3xl:  64px   (4rem)
4xl:  80px   (5rem)
```

### Elevation System

```css
shadow-sm:  0 1px 2px 0 rgb(0 0 0 / 0.05)
shadow:     0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
shadow-md:  0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
shadow-lg:  0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
shadow-xl:  0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

### Border Radius

```css
sm:   0.125rem (2px)
base: 0.25rem (4px)
md:   0.375rem (6px)
lg:   0.5rem (8px)
xl:   0.75rem (12px)
2xl:  1rem (16px)
full: 9999px (pill shape)
```

### Icon System

**Icon Library:** Lucide React v0.553.0+
- Consistent design language
- Tree-shakeable (only import what you use)
- Accessible with proper aria-labels
- Customizable size and stroke width

**Status Icons:**
```typescript
import { 
  Clock,        // Planned
  PlayCircle,   // In Progress
  CheckCircle2, // Complete
  Archive       // Archived
} from 'lucide-react';

const statusIcons = {
  'planned': { icon: Clock, color: 'text-orange-600' },
  'in-progress': { icon: PlayCircle, color: 'text-blue-600' },
  'complete': { icon: CheckCircle2, color: 'text-green-600' },
  'archived': { icon: Archive, color: 'text-gray-600' }
};
```

**Priority Icons:**
```typescript
import { 
  AlertCircle,  // Critical
  ArrowUp,      // High
  Minus,        // Medium
  ArrowDown     // Low
} from 'lucide-react';

const priorityIcons = {
  'critical': { icon: AlertCircle, color: 'text-red-600' },
  'high': { icon: ArrowUp, color: 'text-orange-600' },
  'medium': { icon: Minus, color: 'text-blue-600' },
  'low': { icon: ArrowDown, color: 'text-gray-600' }
};
```

**Navigation Icons:**
```typescript
import {
  Home,         // Home page
  LayoutGrid,   // Board/Kanban view
  FileText,     // Specs/Documents
  BarChart3,    // Statistics
  Search,       // Search
  Settings,     // Settings
  Github,       // GitHub link
} from 'lucide-react';
```

**Action Icons:**
```typescript
import {
  ExternalLink, // Open in new tab
  Download,     // Export/Download
  Share2,       // Share
  Copy,         // Copy to clipboard
  RefreshCw,    // Sync/Reload
  Filter,       // Filters
  SortAsc,      // Sort ascending
  SortDesc,     // Sort descending
  MoreVertical, // More actions menu
  ChevronRight, // Navigation arrow
  X,            // Close/Remove
} from 'lucide-react';
```

**Content Icons:**
```typescript
import {
  FileText,     // README/Main spec
  Palette,      // DESIGN.md
  Code,         // IMPLEMENTATION.md
  TestTube,     // TESTING.md
  CheckSquare,  // TASKS.md
  GitBranch,    // Dependencies
  Link2,        // Related specs
  Tag,          // Tags
  User,         // Assignee
  Calendar,     // Dates/Timeline
  TrendingUp,   // Metrics/Trends
} from 'lucide-react';
```

**Feedback Icons:**
```typescript
import {
  CheckCircle2, // Success
  AlertCircle,  // Warning
  XCircle,      // Error
  Info,         // Information
  Loader2,      // Loading (with animate-spin)
} from 'lucide-react';
```

**Icon Usage Guidelines:**

1. **Size Standards:**
   ```tsx
   // Small (inline with text): h-4 w-4 (16px)
   // Medium (default): h-5 w-5 (20px)
   // Large (hero sections): h-6 w-6 (24px)
   // Extra large (empty states): h-12 w-12 (48px)
   ```

2. **Color Inheritance:**
   ```tsx
   // Use currentColor to inherit parent text color
   <PlayCircle className="h-5 w-5 text-blue-600" />
   
   // Or let it inherit
   <div className="text-primary">
     <FileText className="h-5 w-5" />
   </div>
   ```

3. **Accessibility:**
   ```tsx
   // Always provide aria-label for standalone icons
   <Button variant="ghost" size="icon" aria-label="Search">
     <Search className="h-5 w-5" />
   </Button>
   
   // Or use with text
   <Button>
     <Search className="h-4 w-4 mr-2" />
     Search Specs
   </Button>
   ```

4. **Loading States:**
   ```tsx
   // Spinning loader
   <Loader2 className="h-5 w-5 animate-spin" />
   ```

## Theme Switching Implementation

### Technology Stack

**Package:** next-themes v0.3.0+
- Automatic system preference detection
- Theme persistence in localStorage
- No flash of unstyled content (FOUC)
- SSR compatible

### Implementation

**1. Install Dependencies:**
```bash
pnpm add next-themes
```

**2. Theme Provider Setup:**
```typescript
// app/providers.tsx
'use client';

import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: React.ReactNode }) {
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

**3. Theme Toggle Component:**
```typescript
// components/theme-toggle.tsx
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
```

**4. CSS Variables:**
Already configured in `globals.css` with proper light/dark mode variables.

### Theme-Aware Components

**Syntax Highlighting:**
- Light mode: GitHub light theme
- Dark mode: GitHub dark theme or Dracula
- Use `rehype-highlight` with theme selection

**Images/Logos:**
- Provide both light/dark variants
- Use CSS filter for automatic inversion (fallback)
- SVGs with currentColor for icons

## Navigation & Layout

### Header Component

**Features:**
- Sticky positioning (top-0)
- Blur backdrop effect (backdrop-blur-md)
- Border bottom
- Logo + navigation links
- Theme toggle
- Search trigger (Cmd+K)
- Mobile hamburger menu

**Layout:**
```tsx
<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="container flex h-14 items-center">
    <Logo />
    <Navigation />
    <div className="ml-auto flex items-center gap-2">
      <SearchTrigger />
      <ThemeToggle />
      <MobileMenu />
    </div>
  </div>
</header>
```

**Active Page Indicators:**
```tsx
<Link
  href="/board"
  className={cn(
    "transition-colors hover:text-foreground/80",
    pathname === "/board" 
      ? "text-foreground font-semibold" 
      : "text-foreground/60"
  )}
>
  Board
</Link>
```

### Breadcrumb Navigation

**Component:**
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/specs">Specs</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>035 - Live Specs Showcase</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Quick Search (Cmd+K)

**Component:** shadcn/ui Command + Dialog
**Features:**
- Keyboard shortcut (⌘K / Ctrl+K)
- Fuzzy search across specs
- Keyboard navigation
- Recent searches
- Grouped results (by project, status)

**Implementation:**
```tsx
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="Search specs..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>
    <CommandGroup heading="Recent">
      {/* Recent searches */}
    </CommandGroup>
    <CommandGroup heading="Specs">
      {/* Search results */}
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

### Mobile Menu

**Features:**
- Hamburger icon (≡)
- Slide-in drawer from right
- Full navigation links
- Theme toggle
- Close on navigation

## Spec Detail Page Design

### Page Layout

```
┌─────────────────────────────────────────────────────┐
│ Header (sticky, breadcrumb, theme toggle)           │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌───────────────────────────────────┐  │
│ │          │ │ Spec Header                       │  │
│ │          │ │ ┌───────────────────────────────┐ │  │
│ │ Table of │ │ │ #035 - Live Specs Showcase    │ │  │
│ │ Contents │ │ │ Status: In Progress | High    │ │  │
│ │ (Sticky) │ │ └───────────────────────────────┘ │  │
│ │          │ │                                   │  │
│ │ • Intro  │ │ Timeline                          │  │
│ │ • Design │ │ Created ──○───○───○── Completed  │  │
│ │ • Plan   │ │         Nov 3  Nov 5  (in prog)  │  │
│ │ • Test   │ │                                   │  │
│ │          │ │ ┌─────────────────────────────┐   │  │
│ │ Scroll   │ │ │ Tabs: README | DESIGN |     │   │  │
│ │ Spy:     │ │ │       IMPLEMENTATION | ...  │   │  │
│ │ Active → │ │ └─────────────────────────────┘   │  │
│ │          │ │                                   │  │
│ │          │ │ Markdown Content                  │  │
│ │          │ │ ─────────────────────────        │  │
│ │          │ │                                   │  │
│ │          │ │ # Overview                        │  │
│ │          │ │ This spec describes...            │  │
│ │          │ │                                   │  │
│ │          │ │ ## Design                         │  │
│ │          │ │ The architecture...               │  │
│ │          │ │                                   │  │
│ └──────────┘ └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Timeline Visualization

**Visual Design:**
```
Timeline
┌──────────────────────────────────────────────────┐
│                                                  │
│  Created        Started         Updated          │
│    ○──────────────○──────────────●              │
│  Nov 3         Nov 5           Nov 11            │
│                                 (current)         │
│                                                  │
│  Status: planned → in-progress (8 days)         │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Implementation:**
```tsx
<div className="relative py-8">
  <div className="absolute inset-x-0 h-0.5 bg-border top-1/2" />
  <div className="relative flex justify-between">
    {transitions.map((transition, i) => (
      <div key={i} className="flex flex-col items-center">
        <div className={cn(
          "w-3 h-3 rounded-full border-2",
          transition.isCurrent 
            ? "bg-primary border-primary" 
            : "bg-background border-border"
        )} />
        <span className="mt-2 text-xs text-muted-foreground">
          {format(transition.at, 'MMM d')}
        </span>
        <span className="text-xs font-medium">
          {transition.status}
        </span>
      </div>
    ))}
  </div>
</div>
```

### Metadata Display

**Card with Key Information (with Icons):**
```tsx
import { PlayCircle, ArrowUp, Calendar, User, Tag, GitBranch } from 'lucide-react';

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
      <div>
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <ArrowUp className="h-4 w-4" />
          Priority
        </dt>
        <dd className="mt-1">
          <Badge variant="default" className="flex items-center gap-1.5 w-fit">
            <ArrowUp className="h-3.5 w-3.5" />
            High
          </Badge>
        </dd>
      </div>
      <div>
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          Created
        </dt>
        <dd className="mt-1 text-sm">
          Nov 3, 2025 <span className="text-muted-foreground">(8 days ago)</span>
        </dd>
      </div>
      <div>
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <User className="h-4 w-4" />
          Assignee
        </dt>
        <dd className="mt-1">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback>MZ</AvatarFallback>
            </Avatar>
            <span className="text-sm">marvzhang</span>
          </div>
        </dd>
      </div>
      <div>
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <Tag className="h-4 w-4" />
          Tags
        </dt>
        <dd className="mt-1 flex gap-1 flex-wrap">
          {spec.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </dd>
      </div>
      <div>
        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          <GitBranch className="h-4 w-4" />
          Dependencies
        </dt>
        <dd className="mt-1 text-sm">
          {spec.depends_on?.length || 0} dependencies
        </dd>
      </div>
    </dl>
  </CardContent>
</Card>
```

### Sub-Spec Navigation

**Tab-Based Navigation (with Icons):**
```tsx
import { FileText, Palette, Code, TestTube, CheckSquare } from 'lucide-react';

<Tabs defaultValue="readme">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="readme" className="flex items-center gap-2">
      <FileText className="h-4 w-4" />
      README
    </TabsTrigger>
    <TabsTrigger value="design" className="flex items-center gap-2">
      <Palette className="h-4 w-4" />
      DESIGN
    </TabsTrigger>
    <TabsTrigger value="implementation" className="flex items-center gap-2">
      <Code className="h-4 w-4" />
      IMPLEMENTATION
    </TabsTrigger>
    <TabsTrigger value="tasks" className="flex items-center gap-2">
      <CheckSquare className="h-4 w-4" />
      TASKS
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="readme">
    <MarkdownRenderer content={readme} />
  </TabsContent>
  
  <TabsContent value="design">
    <MarkdownRenderer content={design} />
  </TabsContent>
  
  {/* ... other tabs */}
</Tabs>
```

**Automatic Detection:**
```typescript
import { FileText, Palette, Code, TestTube, CheckSquare, Wrench, Map } from 'lucide-react';

// Detect sub-spec files with icons
const subSpecs = [
  { name: 'README', file: 'README.md', icon: FileText, color: 'text-blue-600' },
  { name: 'DESIGN', file: 'DESIGN.md', icon: Palette, color: 'text-purple-600' },
  { name: 'ARCHITECTURE', file: 'ARCHITECTURE.md', icon: Map, color: 'text-indigo-600' },
  { name: 'IMPLEMENTATION', file: 'IMPLEMENTATION.md', icon: Code, color: 'text-green-600' },
  { name: 'TESTING', file: 'TESTING.md', icon: TestTube, color: 'text-orange-600' },
  { name: 'TASKS', file: 'TASKS.md', icon: CheckSquare, color: 'text-gray-600' },
  { name: 'CONFIGURATION', file: 'CONFIGURATION.md', icon: Wrench, color: 'text-yellow-600' },
].filter(spec => existsInDatabase(spec.file));
```
  { name: 'TESTING', file: 'TESTING.md', icon: TestTube },
  { name: 'TASKS', file: 'TASKS.md', icon: CheckSquare },
].filter(spec => existsInDatabase(spec.file));
```

### Table of Contents

**Sticky Sidebar:**
```tsx
<aside className="sticky top-20 h-fit">
  <nav>
    <h4 className="text-sm font-semibold mb-2">On this page</h4>
    <ul className="space-y-1">
      {headings.map(heading => (
        <li key={heading.id}>
          <a
            href={`#${heading.id}`}
            className={cn(
              "text-sm hover:text-foreground transition-colors",
              activeId === heading.id 
                ? "text-foreground font-medium" 
                : "text-muted-foreground"
            )}
            style={{ paddingLeft: `${(heading.level - 2) * 12}px` }}
          >
            {heading.text}
          </a>
        </li>
      ))}
    </ul>
  </nav>
</aside>
```

**Scroll Spy:**
```typescript
useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveId(entry.target.id);
        }
      });
    },
    { rootMargin: '-80px 0px -80% 0px' }
  );

  headings.forEach((heading) => {
    const el = document.getElementById(heading.id);
    if (el) observer.observe(el);
  });

  return () => observer.disconnect();
}, [headings]);
```

## Component Enhancements

### Stats Cards

**Enhanced Design (with Icons):**
```tsx
import { FileText, CheckCircle2, PlayCircle, Clock, TrendingUp } from 'lucide-react';

// Stats configuration with icons
const statsConfig = [
  {
    title: 'Total Specs',
    value: stats.totalSpecs,
    icon: FileText,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500/10',
    trend: { value: 12, direction: 'up' }
  },
  {
    title: 'Completed',
    value: stats.completedSpecs,
    icon: CheckCircle2,
    color: 'text-green-600',
    bgGradient: 'from-green-500/10',
    trend: { value: 8, direction: 'up' }
  },
  {
    title: 'In Progress',
    value: stats.inProgressSpecs,
    icon: PlayCircle,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500/10',
  },
  {
    title: 'Planned',
    value: stats.plannedSpecs,
    icon: Clock,
    color: 'text-orange-600',
    bgGradient: 'from-orange-500/10',
  }
];

// Render
{statsConfig.map((stat) => {
  const Icon = stat.icon;
  return (
    <Card key={stat.title} className="relative overflow-hidden">
      <div className={cn("absolute inset-0 bg-gradient-to-br to-transparent", stat.bgGradient)} />
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {stat.title}
          </CardTitle>
          <Icon className={cn("h-5 w-5", stat.color)} />
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="text-3xl font-bold">{stat.value}</div>
        {stat.trend && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span className="text-green-600">↑ {stat.trend.value}%</span>
            from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
})}
```

### Spec Cards (Kanban/Grid)

**Enhanced Card:**
```tsx
<Card className="group hover:shadow-lg transition-all duration-150 hover:scale-[1.02]">
  <div className={cn(
    "absolute left-0 top-0 bottom-0 w-1",
    priorityColors[spec.priority]
  )} />
  <CardHeader className="pb-3">
    <div className="flex items-start justify-between gap-2">
      <Link href={`/specs/${spec.id}`}>
        <CardTitle className="text-sm font-medium group-hover:text-primary transition-colors">
          #{spec.specNumber} - {spec.title}
        </CardTitle>
      </Link>
### Empty States

**Helpful Empty State (with Icons):**
```tsx
import { FileX, Search, Filter, Plus } from 'lucide-react';

// Empty search results
<Card className="border-dashed">
  <CardContent className="py-12 text-center">
    <Search className="mx-auto h-12 w-12 text-muted-foreground/50" />
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

// Empty state - no specs at all
<Card className="border-dashed">
  <CardContent className="py-12 text-center">
    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
    <h3 className="mt-4 text-lg font-semibold">No specifications yet</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Get started by creating your first spec
    </p>
    <Button className="mt-4">
      <Plus className="h-4 w-4 mr-2" />
      Create Spec
    </Button>
  </CardContent>
</Card>

// Empty column in Kanban
<Card className="border-dashed">
  <CardContent className="py-8 text-center">
    <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
    <p className="mt-2 text-sm text-muted-foreground">No planned specs</p>
  </CardContent>
</Card>
``` </p>
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary">{spec.status}</Badge>
      {spec.tags?.slice(0, 2).map(tag => (
        <Badge key={tag} variant="outline">{tag}</Badge>
      ))}
    </div>
  </CardContent>
</Card>
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

### Empty States

**Helpful Empty State:**
```tsx
<Card className="border-dashed">
  <CardContent className="py-12 text-center">
    <FileX className="mx-auto h-12 w-12 text-muted-foreground/50" />
    <h3 className="mt-4 text-lg font-semibold">No specs found</h3>
    <p className="mt-2 text-sm text-muted-foreground">
      Try adjusting your filters or search query
    </p>
    <Button variant="outline" className="mt-4" onClick={clearFilters}>
      Clear Filters
    </Button>
  </CardContent>
</Card>
```

## Responsive Design

### Breakpoints

```css
sm: 640px   (min-width)
md: 768px   (min-width)
lg: 1024px  (min-width)
xl: 1280px  (min-width)
2xl: 1536px (min-width)
```

### Mobile Optimizations

**Navigation:**
- Hamburger menu below 768px
- Bottom navigation bar (optional)
- Swipe gestures for drawer

**Layout:**
- Single column layout on mobile
- Collapsible sidebar
- Horizontal scroll for tables
- Bottom sheet for filters

**Typography:**
- Slightly smaller font sizes
- Increased line height for readability
- Larger touch targets (min 44x44px)

**Kanban Board:**
- Horizontal scroll for columns
- Snap scroll for column alignment
- Column indicators (dots)

## Accessibility

### WCAG 2.1 AA Compliance

**Keyboard Navigation:**
- Tab order follows visual order
- Skip links to main content
- Keyboard shortcuts (Cmd+K for search)
- Escape to close modals/menus
- Arrow keys for lists/menus

**Screen Readers:**
- Semantic HTML (nav, main, article, aside)
- ARIA labels for icons
- Live regions for dynamic content
- Descriptive link text
- Alt text for images

**Visual:**
- Color contrast >= 4.5:1 (text)
- Color contrast >= 3:1 (UI components)
- Focus indicators (ring-2)
- No information by color alone
- Resizable text (up to 200%)

**Testing:**
- axe DevTools
- Lighthouse accessibility audit
- Manual keyboard testing
- Screen reader testing (NVDA/JAWS/VoiceOver)

## Performance

### Optimization Strategies

**Code Splitting:**
```typescript
// Lazy load heavy components
const KanbanBoard = dynamic(() => import('@/components/kanban-board'), {
  loading: () => <BoardSkeleton />
});
```

**Image Optimization:**
```tsx
<Image
  src="/logo.png"
  alt="LeanSpec"
  width={200}
  height={50}
  priority // Above fold
/>
```

**Streaming:**
```tsx
<Suspense fallback={<SpecListSkeleton />}>
  <SpecList />
</Suspense>
```

**Caching:**
- React Query with 5min stale time
- Database query results cached
- Static assets with long cache headers
- Service Worker (future)

### Performance Targets

- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Performance: > 90
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1

## Implementation Checklist

### Phase 1: Foundation (Day 1-2)
- [ ] Install next-themes
- [ ] Install shadcn/ui components (Button, Card, Badge, Input, Select, Dialog, Tabs, Tooltip, Dropdown, Avatar, Skeleton, Alert, Progress, Command, Breadcrumb)
- [ ] Setup ThemeProvider in layout
- [ ] Create ThemeToggle component
- [ ] Refine CSS variables for better dark mode
- [ ] Configure Tailwind with design tokens

### Phase 2: Navigation (Day 2-3)
- [ ] Sticky header with blur backdrop
- [ ] Breadcrumb component and integration
- [ ] Active page indicators
- [ ] Mobile hamburger menu
- [ ] Quick search modal (Cmd+K)
- [ ] Footer component

### Phase 3: Design Polish (Day 3-4)
- [ ] Update all pages with new components
- [ ] Implement consistent spacing
- [ ] Add smooth transitions
- [ ] Enhanced hover effects
- [ ] Loading skeletons everywhere
- [ ] Empty states for all views
- [ ] Error boundaries
- [ ] Toast notifications

### Phase 4: Spec Page (Day 4-5)
- [ ] Timeline visualization component
- [ ] Metadata display card
- [ ] Sub-spec detection logic
- [ ] Tab navigation for sub-specs
- [ ] Table of contents component
- [ ] Scroll spy implementation
- [ ] Proper markdown styling

### Phase 5: Testing & Polish (Day 5-6)
- [ ] Keyboard navigation testing
- [ ] Screen reader testing
- [ ] Mobile responsive testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Visual regression testing

## Success Criteria

**Visual Quality:**
- ✓ Professional design matching industry standards
- ✓ Consistent spacing and alignment
- ✓ Smooth transitions and animations
- ✓ Clear visual hierarchy

**Functionality:**
- ✓ Theme switching works flawlessly
- ✓ Navigation is intuitive and responsive
- ✓ Sub-specs properly displayed and navigable
- ✓ Timeline shows spec evolution clearly

**Technical:**
- ✓ WCAG 2.1 AA compliant
- ✓ Lighthouse score > 90
- ✓ Mobile responsive (all breakpoints)
- ✓ Fast loading (< 2s page load)

**User Experience:**
- ✓ Easy to find and read specs
- ✓ Clear understanding of spec status and timeline
- ✓ Intuitive navigation between main spec and sub-specs
- ✓ Helpful feedback for all interactions

---

**Related Sub-Specs:**
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [IMPLEMENTATION.md](./IMPLEMENTATION.md) - Implementation roadmap
