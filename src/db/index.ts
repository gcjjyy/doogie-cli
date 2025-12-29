import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { sql } from 'drizzle-orm';
import * as schema from './schema.ts';
import { getDbPath, ensureAppDirs } from '../utils/paths.ts';

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let sqlite: Database | null = null;

export async function initDatabase(): Promise<ReturnType<typeof drizzle<typeof schema>>> {
  if (db) return db;

  await ensureAppDirs();

  const dbPath = getDbPath();
  sqlite = new Database(dbPath);

  db = drizzle(sqlite, { schema });

  // Create tables if they don't exist
  sqlite.run(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      genre TEXT,
      source_url TEXT NOT NULL,
      launcher_type TEXT NOT NULL DEFAULT 'dosbox',
      is_extracted INTEGER NOT NULL DEFAULT 0,
      local_path TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  sqlite.run(`
    CREATE TABLE IF NOT EXISTS download_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      download_url TEXT,
      downloaded INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    )
  `);

  return db;
}

export function getDatabase(): ReturnType<typeof drizzle<typeof schema>> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
  }
}

export { schema };
