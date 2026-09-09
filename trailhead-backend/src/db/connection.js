import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'data', 'trailhead.db');
const schemaPath = path.join(__dirname, 'schema.sql');

// node:sqlite is experimental as of Node 22 but ships built-in — zero
// native dependencies to compile, which matters a lot for a Windows
// deployment target. If this ever becomes a real reliability problem,
// swap this one file for better-sqlite3 (same synchronous API shape) —
// nothing else in the codebase needs to change.
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec(fs.readFileSync(schemaPath, 'utf-8'));

// CREATE TABLE IF NOT EXISTS won't retroactively add columns to a table
// that already existed before a schema change — this handles that case
// safely, without a full migration framework.
export function ensureColumn(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some((c) => c.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] added column ${table}.${column}`);
  }
}

// Phase 2 addition: richer escalation payloads (conversation context,
// products discussed, attempted solutions) need somewhere to live.
ensureColumn('escalations', 'context', "TEXT DEFAULT '{}'");

export function generateId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}
