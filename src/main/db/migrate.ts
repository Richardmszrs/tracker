import { app } from "electron";
import Database from "better-sqlite3";
import path from "node:path";

// Inline migrations as raw SQL - this gets bundled by Vite
const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS tt_clients (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    created_at integer NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tt_tags (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tt_projects (
    id text PRIMARY KEY NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    client_id text,
    hourly_rate real,
    archived integer DEFAULT 0 NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (client_id) REFERENCES tt_clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_time_entries (
    id text PRIMARY KEY NOT NULL,
    description text NOT NULL,
    start_at integer NOT NULL,
    end_at integer,
    project_id text,
    billable integer DEFAULT 1 NOT NULL,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES tt_projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_entry_tags (
    entry_id text NOT NULL,
    tag_id text NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES tt_time_entries(id),
    FOREIGN KEY (tag_id) REFERENCES tt_tags(id)
  )`,
];

// Indexes for query performance
const INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_time_entries_start_at ON tt_time_entries(start_at)`,
  `CREATE INDEX IF NOT EXISTS idx_time_entries_project_id ON tt_time_entries(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entry_tags_entry_id ON tt_entry_tags(entry_id)`,
  `CREATE INDEX IF NOT EXISTS idx_entry_tags_tag_id ON tt_entry_tags(tag_id)`,
  `CREATE INDEX IF NOT EXISTS idx_projects_client_id ON tt_projects(client_id)`,
];

export function runMigrations() {
  const dbPath = path.join(app.getPath("userData"), "timetracker.db");
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run inline migrations
  for (const sql of MIGRATIONS) {
    db.exec(sql);
  }

  // Create indexes (idempotent)
  for (const sql of INDEXES) {
    db.exec(sql);
  }
}
