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
