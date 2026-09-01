import Database from 'better-sqlite3';
import { schema } from './schema.js';

export type Db = Database.Database;

export function createDb(path = process.env.DATABASE_PATH ?? 'relaydesk.db'): Db {
  const db = new Database(path);

  db.pragma('journal_mode = WAL');
  db.exec(schema);

  return db;
}
