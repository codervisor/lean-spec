# Detailed Task Breakdown

This document provides granular, actionable tasks for each implementation phase.

## Phase 1: Foundation & MVP (2-3 weeks)

### Week 1, Day 1-2: Setup Project

**Initialize Next.js project:**
```bash
npx create-next-app@latest leanspec-web --typescript --tailwind --app
cd leanspec-web
```

**Install core dependencies:**
```bash
npm install drizzle-orm @octokit/rest @tanstack/react-query
npm install -D drizzle-kit
```

**Install shadcn/ui:**
```bash
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card badge tabs input select
npx shadcn-ui@latest add table dropdown-menu dialog toast
```

**Configure Tailwind + Theme:**
- [ ] Custom color palette
- [ ] Typography scale
- [ ] Dark mode support (class-based)
- [ ] Custom spacing

**Project structure:**
```
src/
  app/              # Next.js app router pages
    api/            # API routes
    (routes)/       # Page routes
  components/       # React components
    ui/             # shadcn components
    spec/           # Spec-specific components
  lib/
    db/             # Database schema, queries
    github/         # GitHub API client
    utils/          # Utilities
  types/            # TypeScript types
  styles/           # Global styles
```

### Week 1, Day 3-5: Database & Data Layer

**Define Drizzle schema:**
```typescript
// src/lib/db/schema.ts
import { pgTable, uuid, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  githubOwner: text('github_owner').notNull(),
  githubRepo: text('github_repo').notNull(),
  displayName: text('display_name'),
  description: text('description'),
  homepageUrl: text('homepage_url'),
  stars: integer('stars').default(0),
  isPublic: boolean('is_public').default(true),
  isFeatured: boolean('is_featured').default(false),
  lastSyncedAt: timestamp('last_synced_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const specs = pgTable('specs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  specNumber: integer('spec_number'),
  specName: text('spec_name').notNull(),
  title: text('title'),
  status: text('status'),
  priority: text('priority'),
  tags: text('tags').array(),
  assignee: text('assignee'),
  contentMd: text('content_md').notNull(),
  contentHtml: text('content_html'),
  filePath: text('file_path').notNull(),
  githubUrl: text('github_url'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
  completedAt: timestamp('completed_at'),
  syncedAt: timestamp('synced_at').defaultNow(),
});

// ... relationships, sync_logs tables
```

**Database connection:**
```typescript
// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
export const db = drizzle(client);
```

**Create migrations:**
```bash
npm run db:generate  # Generate SQL migration
npm run db:migrate   # Apply migration
```

**Data access layer:**
```typescript
// src/lib/db/queries.ts
export async function getProjects(filters?: { featured?: boolean }) {
  return db.select().from(projects).where(/* ... */);
}

export async function getSpecs(projectId: string) {
  return db.select().from(specs).where(eq(specs.projectId, projectId));
}

export async function getSpec(id: string) {
  return db.select().from(specs).where(eq(specs.id, id)).limit(1);
}

export async function getStats() {
  // Count by status, priority, etc.
}
```

**Integrate spec-loader.ts:**
- [ ] Import parser from CLI package
- [ ] Adapt to work with GitHub file content
- [ ] Reuse frontmatter parsing
- [ ] Validate spec structure

**Seed database:**
```typescript
// scripts/seed.ts
import { syncProject } from '@/lib/sync';

async function seed() {
  // Create LeanSpec project
  const project = await createProject({
    githubOwner: 'codervisor',
    githubRepo: 'lean-spec',
    displayName: 'LeanSpec',
    isFeatured: true,
  });
  
  // Sync specs
  await syncProject(project.id);
}

seed();
```

### Week 2, Day 1-2: Core API Routes

**Projects API:**
```typescript
// src/app/api/projects/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const featured = searchParams.get('featured') === 'true';
  
  const projects = await getProjects({ featured });
  return Response.json({ data: projects });
}

export async function POST(req: Request) {
  const { githubUrl } = await req.json();
  // Validate, create, sync
}
```

**Specs API:**
```typescript
// src/app/api/specs/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const tags = searchParams.get('tags')?.split(',');
  
  const specs = await getSpecs(projectId, { status, priority, tags });
  return Response.json({ data: specs });
}
```

**Spec detail API:**
```typescript
// src/app/api/specs/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const spec = await getSpec(params.id);
  if (!spec) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json({ data: spec });
}
```

**Stats API:**
```typescript
// src/app/api/stats/route.ts
export async function GET(req: Request) {
  const stats = await getStats();
  return Response.json({ data: stats });
}
```

**Sync API:**
```typescript
// src/app/api/sync/[projectId]/route.ts
export async function POST(
  req: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const result = await syncProject(params.projectId);
    return Response.json({ data: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Week 2, Day 3-5: Frontend Pages

**Home Page:**
```typescript
// src/app/page.tsx
export default async function HomePage() {
  const featuredProjects = await getProjects({ featured: true });
  const stats = await getStats();
  
  return (
    <div>
      <Hero />
      <FeaturedProjects projects={featuredProjects} />
      <StatsOverview stats={stats} />
      <CallToAction />
    </div>
  );
}
```

**Spec Browser:**
```typescript
// src/app/specs/page.tsx
export default async function SpecsPage({ searchParams }) {
  const specs = await getSpecs(null, searchParams);
  
  return (
    <div>
      <SpecFilters />
      <SpecList specs={specs} />
      <Pagination />
    </div>
  );
}
```

**Spec Detail:**
```typescript
// src/app/specs/[id]/page.tsx
export default async function SpecDetailPage({ params }) {
  const spec = await getSpec(params.id);
  
  return (
    <div>
      <SpecMetadata spec={spec} />
      <TableOfContents content={spec.contentMd} />
      <MarkdownRenderer content={spec.contentMd} />
      <SpecNavigation spec={spec} />
    </div>
  );
}
```

**Kanban Board:**
```typescript
// src/app/board/page.tsx
export default async function BoardPage() {
  const specs = await getSpecs();
  const grouped = groupByStatus(specs);
  
  return (
    <div className="grid grid-cols-4 gap-4">
      <Column title="Planned" specs={grouped.planned} />
      <Column title="In Progress" specs={grouped['in-progress']} />
      <Column title="Complete" specs={grouped.complete} />
      <Column title="Archived" specs={grouped.archived} />
    </div>
  );
}
```

**Stats Dashboard:**
```typescript
// src/app/stats/page.tsx
export default async function StatsPage() {
  const stats = await getStats();
  
  return (
    <div>
      <StatusChart data={stats.byStatus} />
      <PriorityChart data={stats.byPriority} />
      <TagCloud tags={stats.tags} />
      <Timeline data={stats.timeline} />
    </div>
  );
}
```

### Week 3, Day 1-2: Markdown Rendering

**Markdown Renderer Component:**
```typescript
// src/components/MarkdownRenderer.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="text-4xl font-bold mb-4" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-3xl font-semibold mb-3" {...props} />
        ),
        code: ({ node, inline, className, children, ...props }) => {
          if (inline) {
            return <code className="bg-gray-100 px-1 rounded" {...props}>{children}</code>;
          }
          return (
            <pre className="bg-gray-900 text-white p-4 rounded overflow-x-auto">
              <code className={className} {...props}>{children}</code>
            </pre>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

**Spec Metadata Component:**
```typescript
// src/components/SpecMetadata.tsx
export function SpecMetadata({ spec }: { spec: Spec }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <StatusBadge status={spec.status} />
      <PriorityBadge priority={spec.priority} />
      {spec.tags?.map(tag => <TagBadge key={tag} tag={tag} />)}
      <div className="text-sm text-gray-500">
        Created: {formatDate(spec.createdAt)}
      </div>
      {spec.assignee && <div>Assignee: {spec.assignee}</div>}
    </div>
  );
}
```

**Table of Contents:**
```typescript
// src/components/TableOfContents.tsx
export function TableOfContents({ content }: { content: string }) {
  const headings = extractHeadings(content);
  
  return (
    <nav className="sticky top-4">
      <h3 className="font-semibold mb-2">Contents</h3>
      <ul>
        {headings.map(heading => (
          <li key={heading.id}>
            <a href={`#${heading.id}`}>{heading.text}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

### Week 3, Day 3-5: Testing & Polish

**Unit tests (Vitest):**
```typescript
// src/lib/db/queries.test.ts
describe('getProjects', () => {
  it('returns all projects', async () => {
    const projects = await getProjects();
    expect(projects).toHaveLength(1);
  });
  
  it('filters by featured', async () => {
    const featured = await getProjects({ featured: true });
    expect(featured.every(p => p.isFeatured)).toBe(true);
  });
});
```

**Integration tests:**
```typescript
// src/app/api/specs/route.test.ts
describe('GET /api/specs', () => {
  it('returns specs', async () => {
    const res = await GET(new Request('http://localhost/api/specs'));
    const json = await res.json();
    expect(json.data).toBeInstanceOf(Array);
  });
});
```

**E2E tests (Playwright):**
```typescript
// e2e/specs.spec.ts
test('browse specs', async ({ page }) => {
  await page.goto('/specs');
  await expect(page.locator('h1')).toContainText('Specifications');
  await expect(page.locator('[data-testid="spec-card"]')).toHaveCount(10);
});
```

**Accessibility:**
- [ ] Run axe-core tests
- [ ] Keyboard navigation works
- [ ] Screen reader labels
- [ ] Color contrast passes WCAG AA

**Deploy to Vercel:**
```bash
vercel --prod
```

## Phase 2: GitHub Integration (2-3 weeks)

### Week 4: GitHub Sync System

**Octokit client:**
```typescript
// src/lib/github/client.ts
import { Octokit } from '@octokit/rest';

export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'leanspec-web/1.0',
  throttle: {
    onRateLimit: (retryAfter) => {
      console.warn(`Rate limit, retry after ${retryAfter}s`);
      return true;
    },
  },
});
```

**Repo validation:**
```typescript
// src/lib/github/validate.ts
export async function validateRepo(owner: string, repo: string) {
  try {
    const { data } = await octokit.repos.get({ owner, repo });
    
    if (data.private) {
      throw new Error('Private repos not supported yet');
    }
    
    // Check for specs/ directory
    const { data: tree } = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: data.default_branch,
      recursive: '1',
    });
    
    const hasSpecs = tree.tree.some(item => item.path?.startsWith('specs/'));
    if (!hasSpecs) {
      throw new Error('No specs/ directory found');
    }
    
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

**Spec discovery:**
```typescript
// src/lib/github/discover.ts
export async function discoverSpecs(owner: string, repo: string, branch = 'main') {
  const { data: tree } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: '1',
  });
  
  const specFiles = tree.tree
    .filter(item => item.path?.match(/^specs\/\d+-[^/]+\/README\.md$/))
    .map(item => item.path!);
  
  return specFiles;
}
```

**Spec fetching:**
```typescript
// src/lib/github/fetch.ts
export async function fetchSpec(owner: string, repo: string, path: string) {
  const { data } = await octokit.repos.getContent({ owner, repo, path });
  
  if ('content' in data) {
    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const parsed = parseSpec(content); // Use spec-loader
    
    return {
      ...parsed,
      filePath: path,
      githubUrl: data.html_url,
    };
  }
  
  throw new Error('Not a file');
}
```

**Sync orchestrator:**
```typescript
// src/lib/sync/sync.ts
export async function syncProject(projectId: string) {
  const project = await getProject(projectId);
  const syncLog = await createSyncLog(projectId, { status: 'running' });
  
  try {
    // 1. Discover specs
    const specPaths = await discoverSpecs(project.githubOwner, project.githubRepo);
    
    // 2. Fetch and parse
    const specsData = await Promise.all(
      specPaths.map(path => fetchSpec(project.githubOwner, project.githubRepo, path))
    );
    
    // 3. Upsert to database
    let added = 0, updated = 0, deleted = 0;
    
    for (const specData of specsData) {
      const result = await upsertSpec(projectId, specData);
      if (result.action === 'insert') added++;
      if (result.action === 'update') updated++;
    }
    
    // 4. Handle deletions (specs in DB but not in GitHub)
    deleted = await deleteRemovedSpecs(projectId, specsData);
    
    // 5. Update sync log
    await updateSyncLog(syncLog.id, {
      status: 'success',
      specsAdded: added,
      specsUpdated: updated,
      specsDeleted: deleted,
      completedAt: new Date(),
    });
    
    return { added, updated, deleted };
  } catch (error) {
    await updateSyncLog(syncLog.id, {
      status: 'failed',
      errorMessage: error.message,
      completedAt: new Date(),
    });
    throw error;
  }
}
```

### Week 5: Add Project & Multi-Project

**Add Project Form:**
```typescript
// src/app/projects/new/page.tsx
'use client';

export default function NewProjectPage() {
  const [githubUrl, setGithubUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'validating' | 'syncing' | 'success' | 'error'>('idle');
  
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('validating');
    
    const res = await fetch('/api/projects', {
      method: 'POST',
      body: JSON.stringify({ githubUrl }),
    });
    
    if (res.ok) {
      setStatus('success');
      const { data } = await res.json();
      router.push(`/projects/${data.id}`);
    } else {
      setStatus('error');
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <Input
        placeholder="https://github.com/owner/repo"
        value={githubUrl}
        onChange={e => setGithubUrl(e.target.value)}
      />
      <Button type="submit">Add Project</Button>
      {status === 'syncing' && <Spinner />}
    </form>
  );
}
```

**Project Listing:**
```typescript
// src/app/projects/page.tsx
export default async function ProjectsPage() {
  const projects = await getProjects();
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {projects.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

**Project Detail:**
```typescript
// src/app/projects/[id]/page.tsx
export default async function ProjectDetailPage({ params }) {
  const project = await getProject(params.id);
  const specs = await getSpecs(params.id);
  const syncLogs = await getSyncLogs(params.id);
  
  return (
    <div>
      <ProjectHeader project={project} />
      <SyncStatus logs={syncLogs} />
      <SpecList specs={specs} />
    </div>
  );
}
```

### Week 6: Scheduled Sync

**Cron endpoint:**
```typescript
// src/app/api/cron/sync/route.ts
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const projects = await getProjectsToSync();
  const results = [];
  
  for (const project of projects) {
    try {
      const result = await syncProject(project.id);
      results.push({ projectId: project.id, ...result });
    } catch (error) {
      results.push({ projectId: project.id, error: error.message });
    }
  }
  
  return Response.json({ synced: results.length, results });
}
```

**Vercel cron config:**
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "0 */6 * * *"
  }]
}
```

## Phase 3: Community & Discovery (2-3 weeks)

### Week 7: Discovery Features

**Project Explorer:**
```typescript
// src/app/explore/page.tsx
export default async function ExplorePage({ searchParams }) {
  const projects = await searchProjects(searchParams);
  
  return (
    <div>
      <SearchBar />
      <Filters />
      <ProjectGrid projects={projects} />
    </div>
  );
}
```

**Search Implementation:**
```typescript
// src/lib/db/search.ts
export async function searchSpecs(query: string) {
  return db.select()
    .from(specs)
    .where(
      or(
        sql`to_tsvector('english', ${specs.title}) @@ plainto_tsquery('english', ${query})`,
        sql`to_tsvector('english', ${specs.contentMd}) @@ plainto_tsquery('english', ${query})`
      )
    );
}
```

### Week 8: Enhanced Features

**Relationship Visualization:**
```typescript
// src/components/RelationshipGraph.tsx
import ReactFlow from 'reactflow';

export function RelationshipGraph({ specs }: { specs: Spec[] }) {
  const nodes = specs.map(spec => ({
    id: spec.id,
    data: { label: spec.title },
    position: { x: 0, y: 0 },
  }));
  
  const edges = specs.flatMap(spec =>
    spec.dependsOn?.map(depId => ({
      id: `${spec.id}-${depId}`,
      source: spec.id,
      target: depId,
    })) || []
  );
  
  return <ReactFlow nodes={nodes} edges={edges} />;
}
```

**Export to PDF:**
```typescript
// src/app/api/specs/[id]/pdf/route.ts
import { jsPDF } from 'jspdf';

export async function GET(req: Request, { params }) {
  const spec = await getSpec(params.id);
  
  const doc = new jsPDF();
  doc.text(spec.title, 10, 10);
  // ... render markdown to PDF
  
  return new Response(doc.output('arraybuffer'), {
    headers: { 'Content-Type': 'application/pdf' },
  });
}
```

### Week 9: Polish

**Caching with React Query:**
```typescript
// src/app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
    },
  },
});

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**SEO:**
```typescript
// src/app/specs/[id]/page.tsx
export async function generateMetadata({ params }) {
  const spec = await getSpec(params.id);
  
  return {
    title: `${spec.title} | LeanSpec`,
    description: spec.description,
    openGraph: {
      title: spec.title,
      description: spec.description,
      type: 'article',
    },
  };
}
```

**Error Boundaries:**
```typescript
// src/app/error.tsx
'use client';

export default function Error({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Testing Checklist

### Unit Tests
- [ ] Database CRUD operations
- [ ] GitHub API mocking
- [ ] Spec parsing logic
- [ ] Search functionality
- [ ] Authentication (future)

### Integration Tests
- [ ] API routes end-to-end
- [ ] Database migrations
- [ ] Sync flow with fixtures
- [ ] Error handling

### E2E Tests
- [ ] User signup/login flow (future)
- [ ] Browse specs
- [ ] Search and filter
- [ ] Add project
- [ ] View spec detail
- [ ] Kanban board interaction
- [ ] Mobile navigation

### Performance
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] Database queries < 100ms
- [ ] Sync time < 5min for typical repo

### Accessibility
- [ ] axe-core audit passes
- [ ] Keyboard navigation complete
- [ ] Screen reader tested
- [ ] ARIA labels correct
- [ ] Color contrast WCAG AA

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Deployment Checklist

### Environment Variables
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `GITHUB_TOKEN` - GitHub personal access token
- [ ] `CRON_SECRET` - Secret for cron authentication
- [ ] `NEXT_PUBLIC_API_URL` - API base URL
- [ ] `SENTRY_DSN` - Error tracking (optional)

### Vercel Configuration
- [ ] Connect GitHub repo
- [ ] Set environment variables
- [ ] Configure custom domain
- [ ] Enable preview deployments
- [ ] Setup cron job

### Database Setup
- [ ] Provision PostgreSQL (Neon/Supabase)
- [ ] Run migrations
- [ ] Seed initial data
- [ ] Setup backups
- [ ] Configure connection pooling

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Sentry error tracking
- [ ] Database monitoring dashboard
- [ ] Alert on high error rates
- [ ] Alert on sync failures

### Post-Launch
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Plan next iteration
- [ ] Update documentation
