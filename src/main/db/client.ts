import path from "node:path";
import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { app } from "electron";

let db: BetterSQLite3Database | null = null;

export function getDb(): BetterSQLite3Database {
  if (!db) {
    const dbPath = path.join(app.getPath("userData"), "timetracker.db");
    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    db = drizzle(sqlite);
  }
  return db;
}
