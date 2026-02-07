---
status: planned
created: 2026-02-07
priority: medium
tags:
- rust
- database
- refactor
created_at: 2026-02-07T05:27:19.084883Z
updated_at: 2026-02-07T05:27:19.084883Z
---

# Adopt sea-query + rusqlite_migration for DB layer

## Overview

Replace raw SQL strings and ad-hoc schema management in `leanspec-core` with **sea-query** (type-safe query builder) and **rusqlite_migration** (versioned migrations). This gives us backend-portable queries (SQLite today, Postgres later) and reliable schema evolution without a heavy ORM.

## Context

Current state in `leanspec-core`:
- 2 SQLite databases: `sessions.db` (4 tables) and `chat.db` (3 tables)
- All queries are raw SQL strings via `rusqlite` with `params![]`
- Schema managed via `CREATE TABLE IF NOT EXISTS` + manual `ensure_column()` helper
- No formal migration versioning (chat_store uses `PRAGMA user_version` informally)
- Manual `row.get(N)` deserialization with index-based column access

## Design

### Dependencies

```toml
sea-query = { version = "0.32", features = ["derive", "backend-sqlite"] }
sea-query-rusqlite = "0.7"
rusqlite_migration = "2.4"
```

When Postgres support is added later, enable `backend-postgres` and swap `SqliteQueryBuilder` → `PostgresQueryBuilder` via a trait-based backend abstraction.

### Architecture

```
leanspec-core/src/db/
├── mod.rs              # Database struct, connection management (keep)
├── schema.rs           # Iden enums for all tables/columns
├── migrations.rs       # Versioned migrations using rusqlite_migration
├── query_helpers.rs    # Shared query builder patterns + row mapping
```

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
    M::up(include_str!("../migrations/V1__initial_sessions.sql")),
    M::up(include_str!("../migrations/V2__initial_chat.sql")),
    // Future: M::up(include_str!("../migrations/V3__add_feature.sql")),
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
- [ ] Create SQL migration files from existing CREATE TABLE statements
- [ ] Create `db/migrations.rs` with `rusqlite_migration::Migrations`
- [ ] Refactor `SessionDatabase` to use sea-query for all queries
- [ ] Refactor `ChatStore` to use sea-query for all queries
- [ ] Remove `ensure_column()` hack — handle via proper migrations
- [ ] Update `Database` struct to run migrations on open
- [ ] Add migration validation test (`MIGRATIONS.validate()`)
- [ ] Verify existing tests pass with new query layer

## Test

- [ ] `MIGRATIONS.validate()` passes
- [ ] All existing `SessionDatabase` tests pass
- [ ] All existing `ChatStore` operations work
- [ ] New database gets schema via migrations (not CREATE IF NOT EXISTS)
- [ ] Existing databases migrate forward correctly

## Notes

- **sea-query-rusqlite v0.7** provides `build_rusqlite()` for parameter binding
- sea-query's `Table::create()` can also generate schema SQL, but we use raw SQL migration files for clarity and auditability
- `rusqlite_migration` uses `PRAGMA user_version` internally — same as our current chat_store approach, so migration is seamless
- Postgres support is a future goal — sea-query's backend-agnostic query building is the primary motivator over staying with raw SQL
- No async migration needed — current codebase is fully sync