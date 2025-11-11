/**
 * Run database migrations
 */

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { join } from 'path';

const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'leanspec.db');
const sqlite = new Database(dbPath);
const db = drizzle(sqlite);

console.log('Running migrations...');
migrate(db, { migrationsFolder: './drizzle' });
console.log('Migrations complete!');

sqlite.close();
