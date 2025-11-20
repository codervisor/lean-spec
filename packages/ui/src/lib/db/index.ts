/**
 * Database connection and client
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { join } from 'path';

// Lazy database initialization
let _db: ReturnType<typeof drizzle> | null = null;
let _sqlite: Database.Database | null = null;

/**
 * Get or create database connection
 * Only initializes when first accessed (lazy loading)
 */
export function getDb() {
  if (!_db) {
    // Database path - use local SQLite for development
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'leanspec.db');
    
    // Create SQLite database connection
    _sqlite = new Database(dbPath);

    // Make sure required tables exist before handing the connection to Drizzle
    ensureSchema(_sqlite);
    
    // Create Drizzle client
    _db = drizzle(_sqlite, { schema });
  }
  
  return _db;
}

// Export schema for use in queries
export { schema };

// Legacy export for backward compatibility (will be lazy)
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop, receiver) {
    const realDb = getDb();
    return Reflect.get(realDb as object, prop, receiver);
  }
});

function ensureSchema(sqlite: Database.Database) {
  sqlite.pragma('foreign_keys = ON');

  const tableExists = (name: string) => {
    const row = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name = ?"
    ).get(name);
    return Boolean(row);
  };

  const indexExists = (name: string) => {
    const row = sqlite.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name = ?"
    ).get(name);
    return Boolean(row);
  };

  if (!tableExists('projects')) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "projects" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "github_owner" TEXT NOT NULL,
        "github_repo" TEXT NOT NULL,
        "display_name" TEXT,
        "description" TEXT,
        "homepage_url" TEXT,
        "stars" INTEGER DEFAULT 0,
        "is_public" INTEGER DEFAULT 1,
        "is_featured" INTEGER DEFAULT 0,
        "last_synced_at" INTEGER,
        "created_at" INTEGER NOT NULL,
        "updated_at" INTEGER NOT NULL
      );
    `);
  }

  if (!tableExists('specs')) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "specs" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "spec_number" INTEGER,
        "spec_name" TEXT NOT NULL,
        "title" TEXT,
        "status" TEXT,
        "priority" TEXT,
        "tags" TEXT,
        "assignee" TEXT,
        "content_md" TEXT NOT NULL,
        "content_html" TEXT,
        "created_at" INTEGER,
        "updated_at" INTEGER,
        "completed_at" INTEGER,
        "file_path" TEXT NOT NULL,
        "github_url" TEXT,
        "synced_at" INTEGER NOT NULL
      );
    `);
  }

  if (!tableExists('spec_relationships')) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "spec_relationships" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "spec_id" TEXT NOT NULL REFERENCES "specs"("id") ON DELETE CASCADE,
        "related_spec_id" TEXT NOT NULL REFERENCES "specs"("id") ON DELETE CASCADE,
        "relationship_type" TEXT NOT NULL,
        "created_at" INTEGER NOT NULL
      );
    `);
  }

  if (!tableExists('sync_logs')) {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS "sync_logs" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "project_id" TEXT NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
        "status" TEXT NOT NULL,
        "specs_added" INTEGER DEFAULT 0,
        "specs_updated" INTEGER DEFAULT 0,
        "specs_deleted" INTEGER DEFAULT 0,
        "error_message" TEXT,
        "started_at" INTEGER NOT NULL,
        "completed_at" INTEGER,
        "duration_ms" INTEGER
      );
    `);
  }

  if (!indexExists('unique_spec_number')) {
    sqlite.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS "unique_spec_number"
      ON "specs" ("project_id", "spec_number");
    `);
  }
}
