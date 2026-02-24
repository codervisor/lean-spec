---
status: planned
created: 2026-02-24
priority: high
tags:
- storage
- sqlite
- postgresql
- mysql
- sqlx
- architecture
- database
created_at: 2026-02-24T14:10:14.774940Z
updated_at: 2026-02-24T14:10:14.774940Z
---
# Database Consolidation and Multi-Backend Support

## Problem

The current storage layer has two issues that this spec addresses together, since they share the same solution:

### 1. Fragmented SQLite Files

There are currently multiple separate database files on disk:

| File | Purpose |
|---|---|
| `~/.lean-spec/sessions.db` | Sessions, session logs, events, specs |
| `~/.lean-spec/chat.db` | Conversations, messages, sync metadata |
| `~/.lean-spec/runners.json` | Runner config (JSON, not yet in DB — see spec 329) |
| `~/.lean-spec/projects.json` | Projects (JSON) |
| `~/.lean-spec/config.json` | Server config (JSON) |

Fragmented DB files make it hard to reason about data as a whole, complicate backup/restore, and prevent cross-table queries (e.g. joining sessions with conversations).

### 2. Locked to SQLite / No Proper Connection Pooling

The current implementation uses `rusqlite` (sync) wrapped in `Mutex<Connection>`, one per DB file. This means:
- All DB concurrent access is serialized through a single mutex — a bottleneck
- No connection pooling
- Blocking synchronous I/O mixed into an async Tokio runtime (blocks worker threads)
- No path to enterprise databases (PostgreSQL, MySQL) for teams or self-hosted deployments

## Goal

1. **Consolidate** all storage into a **single logical database** (one SQLite file, or one Postgres/MySQL connection string)
2. **Migrate** from `rusqlite` to **`sqlx`** for:
   - Async-native database I/O (no more blocking Tokio workers)
   - Proper connection pooling via `sqlx::Pool`
   - Multi-backend support: SQLite, PostgreSQL, MySQL
   - Compile-time query verification (optional, via `sqlx::query!` macro)
   - Built-in migration runner (`sqlx::migrate!`)
3. **Support configurable database URL** so users can point LeanSpec at an external database

## Non-Goals

- SQL Server / MSSQL (requires `tiberius` driver, added complexity — revisit if needed)
- Cloud-hosted DB as a service offering
- Changing the HTTP API or TypeScript types

## Proposed Architecture

### Database URL Configuration

Add to `~/.lean-spec/config.json` (`ServerConfig`):

```json
{
  "database_url": "sqlite://~/.lean-spec/leanspec.db"
}
```

Default (when missing): `sqlite://{config_dir}/leanspec.db`

Supported formats:
- `sqlite:///absolute/path/to/db.db`
- `sqlite://~/.lean-spec/leanspec.db` (home-dir expansion)
- `postgres://user:pass@host:5432/leanspec` (Phase 3)
- `mysql://user:pass@host:3306/leanspec` (Phase 3)

### Single Database File

All tables migrate into one logical database:

```
leanspec.db  (or the configured URL)
├── sessions
├── session_specs
├── session_metadata
├── session_logs
├── session_events
├── conversations
├── messages
├── sync_metadata
└── runners          ← from spec 329
```

### Migration to sqlx

Replace `rusqlite` with `sqlx` using `SqlitePool` first (phases 1–2). `AnyPool` is deferred to phase 3 when multi-backend support is actually needed — this avoids the runtime driver registration complexity and debugging overhead of `AnyPool` before it's required.

**Phases 1–2 dependency (SQLite only):**
```toml
[dependencies]
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "migrate", "chrono", "uuid"] }
```

**Phase 3 (multi-backend):**
```toml
[dependencies]
sqlx = { version = "0.8", features = ["runtime-tokio", "sqlite", "postgres", "mysql", "migrate", "chrono", "uuid"] }
```

Migration files go in `rust/leanspec-core/migrations/`:

```
migrations/
  0001_initial_sessions.sql
  0002_chat.sql
  0003_runners.sql
  ...
```

Applied via:
```rust
sqlx::migrate!("./migrations").run(&pool).await?;
```

### Storage Layer Refactor

Phases 1–2 use `SqlitePool` directly — simpler, better debuggable, full feature support:

```rust
pub struct Database {
    pub pool: SqlitePool,
}

impl Database {
    pub async fn connect(url: &str) -> CoreResult<Self>;
    pub async fn migrate(&self) -> CoreResult<()>;
}
```

Phase 3 upgrades to URL-dispatch (either `AnyPool` or per-backend enum) when Postgres/MySQL support is added. The migration files are plain SQL by then, making the switch mechanical.

Sub-stores become methods or associated query modules (no owned DB connection):

```rust
pub struct SessionStore<'a> { db: &'a Database }
pub struct ChatStore<'a>    { db: &'a Database }
pub struct RunnerStore<'a>  { db: &'a Database }
```

### Backward Compatibility / Data Migration

On first startup with this version:
1. Detect if old `sessions.db` or `chat.db` exists
2. If so, run an in-process migration: read all rows from old SQLite, insert into new DB
3. Rename old files to `sessions.db.migrated`, `chat.db.migrated`
4. Works for SQLite → SQLite (same data, single file) and SQLite → Postgres (for users upgrading storage)

## Migration Path (Implementation Phases)

### Phase 1 — Consolidate SQLite (no sqlx yet)
- Merge `sessions.db` and `chat.db` schemas into `leanspec.db` using rusqlite `ATTACH DATABASE`
- Add runners table (spec 329)
- Update all store structs to point at the single DB
- Verify data migration works

### Phase 2 — Migrate to sqlx + async
- Replace `rusqlite` with `sqlx` (SQLite backend first)
- Convert all queries to `sqlx::query` / `sqlx::query_as`
- Replace `Mutex<Connection>` with `SqlitePool` / `AnyPool`
- Add migration files under `migrations/`
- All queries become async

### Phase 3 — Multi-backend
- Enable `AnyPool` with URL-dispatch
- Test with PostgreSQL and MySQL
- Document self-hosted database setup
- Add `database_url` to `ServerConfig`

## Dependency on Spec 329

This spec supersedes spec 329 (Runner Storage SQLite Migration). The `runners` table design from spec 329 should be included directly in the migrations here. Spec 329 can be closed as replaced.

## Checklist

- [ ] Phase 1: Merge sessions.db + chat.db into leanspec.db (rusqlite)
- [ ] Phase 1: Add runners table (replaces spec 329)
- [ ] Phase 1: Data migration from old files on startup
- [ ] Phase 2: Add sqlx dependency (sqlite + postgres + mysql features)
- [ ] Phase 2: Write SQL migration files under migrations/
- [ ] Phase 2: Implement `Database` struct with `AnyPool`
- [ ] Phase 2: Convert `SessionDatabase` → `SessionStore` (async sqlx)
- [ ] Phase 2: Convert `ChatStore` → async sqlx
- [ ] Phase 2: Convert `RunnerStore` → async sqlx
- [ ] Phase 2: Update `AppState` to use single `Database`
- [ ] Phase 3: Add `database_url` to `ServerConfig`
- [ ] Phase 3: Test PostgreSQL backend end-to-end
- [ ] Phase 3: Test MySQL backend end-to-end
- [ ] Phase 3: Documentation for self-hosted database setup
- [ ] Update/add tests for all phases