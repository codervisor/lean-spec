# LeanSpec Web

> Interactive spec showcase platform for browsing and exploring LeanSpec specifications

A fullstack web application built with Next.js 16, showcasing LeanSpec's own specifications in a rich, interactive format. This is the MVP (Phase 1) implementation for spec 035-live-specs-showcase.

## Features

✨ **Core Features (MVP - Phase 1)**:
- 📊 **Stats Dashboard**: Visual overview of project metrics and completion rates
- 🔍 **Search & Filtering**: Find specs by title, name, tags, status, or priority
- 📋 **Spec Browser**: Table view with sortable columns and detailed information
- 🎯 **Kanban Board**: Visual workflow tracking across all statuses
- 📝 **Rich Markdown Rendering**: Syntax-highlighted code blocks and GitHub-flavored markdown
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- 🌐 **Navigation**: Clean header with routing between pages
- ⚡ **Loading States**: Skeleton loaders for better UX
- 🛡️ **Error Handling**: Custom 404 and error pages

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS 4, shadcn/ui components
- **Database**: SQLite (dev) with Drizzle ORM
- **Markdown**: react-markdown with syntax highlighting (highlight.js)
- **Icons**: lucide-react
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (monorepo package manager)

### Installation

From the monorepo root:

```bash
# Install dependencies
pnpm install

# Navigate to web package
cd packages/web
```

### Database Setup

```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with LeanSpec specs
npm run db:seed
```

### Development

```bash
# Start dev server (from packages/web)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build

```bash
# Type check
npm run typecheck

# Build for production
npm run build

# Start production server
npm run start
```

### Testing

```bash
# Run tests once
npm run test

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── projects/      # Projects endpoints
│   │   ├── specs/         # Specs endpoints
│   │   └── stats/         # Statistics endpoint
│   ├── board/             # Kanban board page
│   ├── specs/[id]/        # Spec detail page
│   ├── error.tsx          # Error boundary
│   ├── loading.tsx        # Global loading state
│   ├── not-found.tsx      # 404 page
│   ├── page.tsx           # Home page (server)
│   └── home-client.tsx    # Home page (client)
├── components/
│   ├── ui/                # shadcn/ui components
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── skeleton.tsx
│   └── navigation.tsx     # Header navigation
├── lib/
│   ├── db/                # Database layer
│   │   ├── index.ts       # DB connection
│   │   ├── schema.ts      # Drizzle schema
│   │   ├── queries.ts     # Data access layer
│   │   ├── migrate.ts     # Migration runner
│   │   └── seed.ts        # Database seeding
│   └── utils.ts           # Utility functions
└── types/                 # TypeScript types
```

## Database Schema

- **projects**: GitHub repositories using LeanSpec
- **specs**: Cached specification content from GitHub
- **spec_relationships**: Dependencies and relationships between specs
- **sync_logs**: Audit trail for GitHub sync operations

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type check with TypeScript |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:ui` | Run tests with UI |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:seed` | Seed database with specs |

## Roadmap

### ✅ Phase 1: Foundation & MVP (Complete)
- Core pages and navigation
- Search and filtering
- Kanban board view
- Error handling and loading states
- Basic testing

### 🚧 Phase 2: GitHub Integration (Upcoming)
- Multi-project support
- Automatic GitHub sync
- Scheduled cron jobs
- Enhanced error handling

### 📋 Phase 3: Community & Discovery (Future)
- Public project explorer
- Full-text search across projects
- Spec relationship visualization
- Export to PDF

### 🔮 Phase 4: Advanced Features (Future)
- GitHub OAuth for private repos
- Real-time webhooks
- Version history and diffs
- Team collaboration features

## Contributing

This is part of the LeanSpec monorepo. See the main README for contribution guidelines.

## License

Same as the LeanSpec project.

## Documentation

For detailed architecture, design decisions, and implementation details, see:
- [Spec 035 README](../../specs/035-live-specs-showcase/README.md)
- [Architecture](../../specs/035-live-specs-showcase/ARCHITECTURE.md)
- [Implementation Plan](../../specs/035-live-specs-showcase/IMPLEMENTATION.md)

