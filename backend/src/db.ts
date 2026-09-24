// DB driver: better-sqlite3 (not knex + sqlite3).
// - Synchronous API: queries take microseconds at 10k rows, so async plumbing buys nothing.
// - ':memory:' databases make every test fast and isolated.
// - We hand-write a handful of SQL queries (window functions for the median); a query
//   builder would add a layer without removing any SQL we need to reason about.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type Db = Database.Database;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

export function openDb(filename: string): Db {
  const db = new Database(filename);
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

/** Applies every migrations/*.sql file not yet recorded, in filename order. */
export function migrate(db: Db): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)',
  );
  const applied = new Set(
    db.prepare('SELECT name FROM schema_migrations').pluck().all() as string[],
  );
  const pending = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql') && !applied.has(file))
    .sort();

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare(
        "INSERT INTO schema_migrations (name, applied_at) VALUES (?, datetime('now'))",
      ).run(file);
    })();
  }
}
