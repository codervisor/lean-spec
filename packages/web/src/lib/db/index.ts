/**
 * Database connection and client
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { join } from 'path';

// Database path - use local SQLite for development
const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'leanspec.db');

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Create Drizzle client
export const db = drizzle(sqlite, { schema });

// Export schema for use in queries
export { schema };
