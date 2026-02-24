---
status: archived
created: 2026-02-07
priority: medium
tags:
- rust
- database
- refactor
- cancelled
created_at: 2026-02-07T05:27:19.084883Z
updated_at: 2026-02-24T14:21:14.484810Z
transitions:
- status: archived
  at: 2026-02-24T14:21:14.484810Z
---

# Adopt sea-query + rusqlite_migration for DB layer

## Overview

> **Cancelled** — Superseded by spec 329 (Database Consolidation and Multi-Backend Support). The consolidation goal is preserved in 329, which uses `sqlx` for proper async support and connection pooling instead of sea-query on top of sync rusqlite. See spec 329 for rationale.


Replace raw SQL strings and ad-hoc schema management in `leanspec-core` with **sea-query** (type-safe query builder) and **rusqlite_migration** (versioned migrations). **Consolidate `sessions.db` and `chat.db` into a single `leanspec.db`** to simplify connection management and enable a clean Postgres migration path.

## Context

Current state in `leanspec-core`:
- **2 separate SQLite databases** with inconsistent settings:
  - `sessions.db` (`~/.lean-spec/`) — 4 tables, no WAL, no FK pragma, RFC3339 TEXT timestamps
  - `chat.db` (platform data dir) — 3 tables, WAL enabled, epoch-ms INTEGER timestamps
- 3 different connection patterns: `SessionDatabase`, `ChatStore`, and unused `Database` struct
- Schema managed via `CREATE TABLE IF NOT EXISTS` (sessions) + `PRAGMA user_version` + `ensure_column()` hack (chat)
- No cross-db queries, but project identifiers exist in both (different naming/format)
- Manual `row.get(N)` deserialization with index-based column access

### Why consolidate

1. **Postgres maps to a single database** — two SQLite files would require two PG databases or schemas, complicating pooling, transactions, and deployment
2. **Unified connection management** — one `Database` struct, one WAL mode, one set of pragmas
3. **Single migration chain** — eliminates both `CREATE IF NOT EXISTS` and `ensure_column()` hacks
4. **Enables cross-domain queries** — join sessions with conversations (e.g., "show the conversation that triggered this session")
5. **Timestamp normalization** — force consistency (RFC3339 TEXT everywhere)

## Design

### Dependencies

```toml
sea-query = { version = "0.32", features = ["derive", "backend-sqlite"] }
sea-query-rusqlite = "0.7"
rusqlite_migration = "2.4"
```

When Postgres support is added later, enable `backend-postgres` and swap `SqliteQueryBuilder` → `PostgresQueryBuilder` via a trait-based backend abstraction.

### Consolidated Database

**Single file:** `~/.lean-spec/leanspec.db` (7 tables)

| Domain | Tables |
|--------|--------|
| Sessions | `sessions`, `session_metadata`, `session_logs`, `session_events` |
| Chat | `conversations`, `messages`, `sync_metadata` |

Standardized pragmas: `journal_mode=WAL`, `busy_timeout=5000`, `foreign_keys=ON`

Timestamp format: RFC3339 TEXT everywhere (normalize chat tables from epoch-ms INTEGER)

### Architecture

```
leanspec-core/src/db/
├── mod.rs              # Database struct — single connection, WAL, migrations on open
├── schema.rs           # Iden enums for all 7 tables
├── migrations.rs       # Versioned migrations using rusqlite_migration
├── query_helpers.rs    # Shared query builder patterns + row mapping
├── legacy_import.rs    # One-time import from old sessions.db + chat.db
```

### Legacy Data Migration

On first open of `leanspec.db`:
1. Check for `~/.lean-spec/sessions.db` and platform-specific `chat.db`
2. If found, ATTACH each old DB and INSERT INTO new tables (with timestamp normalization for chat)
3. Rename old files to `*.backup` to prevent re-import
4. Log migration summary

### Schema Definitions (sea-query Iden)

```rust
#[derive(Iden)]
enum Sessions {
    Table,
    Id, ProjectPath, SpecId, Runner, Mode, Status,
    ExitCode, StartedAt, EndedAt, DurationMs, TokenCount,
    CreatedAt, UpdatedAt,
}

#[derive(Iden)]
enum Conversations {
    Table,
    Id, ProjectId, Title, ProviderId, ModelId,
    CreatedAt, UpdatedAt, MessageCount, LastMessage,
    Tags, Archived, CloudId,
}
// ... similar for Messages, SyncMetadata, SessionMetadata, SessionLogs, SessionEvents
```

### Migration System

```rust
use rusqlite_migration::{Migrations, M};

pub const MIGRATIONS: Migrations<'static> = Migrations::from_slice(&[
    // V1 creates ALL 7 tables in a single migration (fresh installs)
    M::up(include_str!("../migrations/V1__initial_schema.sql")),
    // Future migrations add columns, tables, etc.
]);

pub fn run_migrations(conn: &mut Connection) -> CoreResult<()> {
    MIGRATIONS.to_latest(conn).map_err(|e| CoreError::DatabaseError(e.to_string()))
}
```

### Query Builder Usage

```rust
// Before (raw SQL):
conn.execute("INSERT INTO sessions (id, project_path, ...) VALUES (?1, ?2, ...)", params![...]);

// After (sea-query):
let (sql, values) = Query::insert()
    .into_table(Sessions::Table)
    .columns([Sessions::Id, Sessions::ProjectPath, ...])
    .values_panic([session.id.into(), session.project_path.into(), ...])
    .build_rusqlite(SqliteQueryBuilder);
conn.execute(&sql, &*values.as_params())?;
```

### Backend Abstraction (future Postgres)

```rust
pub trait DbBackend {
    fn query_builder() -> Box<dyn QueryBuilder>;
    fn open(config: &DbConfig) -> CoreResult<Connection>;
}
```

## Plan

- [ ] Add `sea-query`, `sea-query-rusqlite`, `rusqlite_migration` to Cargo.toml
- [ ] Create `db/schema.rs` with Iden enums for all 7 tables
- [ ] Create unified `V1__initial_schema.sql` with all 7 tables + indexes
- [ ] Create `db/migrations.rs` with `rusqlite_migration::Migrations`
- [ ] Refactor `Database` struct to open single `leanspec.db` with standardized pragmas
- [ ] Implement `legacy_import.rs` — detect + import old `sessions.db` and `chat.db`
- [ ] Normalize chat timestamps from epoch-ms INTEGER to RFC3339 TEXT during import
- [ ] Refactor `SessionDatabase` to use shared `Database` + sea-query
- [ ] Refactor `ChatStore` to use shared `Database` + sea-query
- [ ] Remove `ensure_column()` hack — handled by migrations
- [ ] Update `AppState` (HTTP server) to use single `Database` instance
- [ ] Add migration validation test (`MIGRATIONS.validate()`)
- [ ] Add legacy import tests (both DBs present, one present, neither present)
- [ ] Verify all existing tests pass with new unified DB

## Test

- [ ] `MIGRATIONS.validate()` passes
- [ ] All existing `SessionDatabase` tests pass against unified DB
- [ ] All existing `ChatStore` operations work against unified DB
- [ ] New database gets full schema via V1 migration
- [ ] Legacy import: both old DBs → single new DB with correct data
- [ ] Legacy import: only sessions.db → partial import works
- [ ] Legacy import: only chat.db → partial import works
- [ ] Legacy import: chat timestamps correctly normalized to RFC3339
- [ ] Old DB files renamed to `.backup` after import
- [ ] Re-opening after import doesn't re-import

## Notes

- **sea-query-rusqlite v0.7** provides `build_rusqlite()` for parameter binding
- sea-query's `Table::create()` can also generate schema SQL, but we use raw SQL migration files for clarity and auditability
- `rusqlite_migration` uses `PRAGMA user_version` internally — same as our current chat_store approach, so migration is seamless
- Postgres support is a future goal — consolidation + sea-query's backend-agnostic query building make this straightforward
- No async migration needed — current codebase is fully sync
- **DB location**: `~/.lean-spec/leanspec.db` chosen over platform data dir for discoverability and consistency with existing `sessions.db` location
- **Feature gates**: `SessionDatabase` and `ChatStore` keep their respective feature gates but share the underlying `Database` connection
- No table name collisions between the two domains — merge is structurally clean