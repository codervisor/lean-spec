### Production Deployment Configuration

#### v0.3.0 (Filesystem Mode)

**Vercel Configuration:**
```json
// vercel.json (web app deployment)
{
  "buildCommand": "pnpm -F @leanspec/web build",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "pnpm install"
}
```

**Environment Variables (Vercel Dashboard):**
```bash
SPECS_MODE=filesystem
SPECS_DIR=../../specs
CACHE_TTL=60000
REVALIDATION_SECRET=<random-secret>
```

**Key Points:**
- Specs directory (`specs/`) must be in git repo
- No database required for v0.3.0
- Specs read at runtime from filesystem
- In-memory cache keeps performance <100ms
- Vercel serverless functions have filesystem access

#### v0.3.1+ (Dual Mode)

**Vercel Configuration:**
```json
// vercel.json (unchanged)
{
  "buildCommand": "pnpm -F @leanspec/web build",
  "outputDirectory": "packages/web/.next",
  "framework": "nextjs",
  "installCommand": "pnpm install",
  "crons": [{
    "path": "/api/cron/sync",
    "schedule": "0 * * * *"
  }]
}
```

**Environment Variables (Vercel Dashboard):**
```bash
SPECS_MODE=both
SPECS_DIR=../../specs
CACHE_TTL=60000
DATABASE_URL=postgres://...
GITHUB_TOKEN=ghp_...
CRON_SECRET=<random-secret>
REVALIDATION_SECRET=<random-secret>
```

**Database Setup (Vercel Postgres):**
1. Create Vercel Postgres database
2. Run migrations: `pnpm -F @leanspec/web db:migrate`
3. Seed LeanSpec project: `pnpm -F @leanspec/web db:seed`
4. Cron job handles external repos

**Key Points:**
- Both filesystem and database sources active
- LeanSpec's specs use filesystem (fast, realtime)
- External repos use database (cached, scheduled sync)
- Cron job syncs external repos every hour
