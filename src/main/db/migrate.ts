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
    invoice_id text,
    created_at integer NOT NULL,
    FOREIGN KEY (project_id) REFERENCES tt_projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_entry_tags (
    entry_id text NOT NULL,
    tag_id text NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES tt_time_entries(id),
    FOREIGN KEY (tag_id) REFERENCES tt_tags(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_invoices (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    number text NOT NULL,
    client_id text,
    status text DEFAULT 'draft' NOT NULL,
    issue_date integer NOT NULL,
    due_date integer NOT NULL,
    notes text,
    tax_rate real DEFAULT 0 NOT NULL,
    discount real DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    paid_at integer,
    synced_at integer,
    deleted_at integer,
    created_at integer NOT NULL,
    FOREIGN KEY (client_id) REFERENCES tt_clients(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_invoice_items (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    invoice_id text,
    entry_id text,
    description text NOT NULL,
    quantity real NOT NULL,
    unit_price real NOT NULL,
    amount real NOT NULL,
    synced_at integer,
    deleted_at integer,
    FOREIGN KEY (invoice_id) REFERENCES tt_invoices(id),
    FOREIGN KEY (entry_id) REFERENCES tt_time_entries(id)
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

// Indexes for new kanban tables - created after tables are ready
const KANBAN_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON tt_time_entries(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_boards_project_id ON tt_boards(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_columns_board_id ON tt_columns(board_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON tt_tasks(column_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tt_tasks(board_id)`,
  `CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON tt_task_tags(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_task_tags_tag_id ON tt_task_tags(tag_id)`,
];

// Sync columns migration (v2)
const SYNC_MIGRATIONS = [
  // Add user_id columns
  `ALTER TABLE tt_clients ADD COLUMN user_id text`,
  `ALTER TABLE tt_projects ADD COLUMN user_id text`,
  `ALTER TABLE tt_tags ADD COLUMN user_id text`,
  `ALTER TABLE tt_time_entries ADD COLUMN user_id text`,
  `ALTER TABLE tt_entry_tags ADD COLUMN user_id text`,

  // Add id column to entry_tags (without PRIMARY KEY - SQLite doesn't support it via ALTER)
  `ALTER TABLE tt_entry_tags ADD COLUMN id text`,

  // Add synced_at columns
  `ALTER TABLE tt_clients ADD COLUMN synced_at integer`,
  `ALTER TABLE tt_projects ADD COLUMN synced_at integer`,
  `ALTER TABLE tt_tags ADD COLUMN synced_at integer`,
  `ALTER TABLE tt_time_entries ADD COLUMN synced_at integer`,
  `ALTER TABLE tt_entry_tags ADD COLUMN synced_at integer`,

  // Add deleted_at columns for soft deletes
  `ALTER TABLE tt_clients ADD COLUMN deleted_at integer`,
  `ALTER TABLE tt_projects ADD COLUMN deleted_at integer`,
  `ALTER TABLE tt_tags ADD COLUMN deleted_at integer`,
  `ALTER TABLE tt_time_entries ADD COLUMN deleted_at integer`,
  `ALTER TABLE tt_entry_tags ADD COLUMN deleted_at integer`,

  // Add created_at to tags if it doesn't exist (for new schema alignment)
  `ALTER TABLE tt_tags ADD COLUMN created_at integer`,

  // Add invoice_id to time_entries (for marking entries as invoiced)
  `ALTER TABLE tt_time_entries ADD COLUMN invoice_id text`,

  // Invoice tables columns (for existing installations)
  `ALTER TABLE tt_invoices ADD COLUMN user_id text`,
  `ALTER TABLE tt_invoices ADD COLUMN synced_at integer`,
  `ALTER TABLE tt_invoices ADD COLUMN deleted_at integer`,
  `ALTER TABLE tt_invoices ADD COLUMN paid_at integer`,

  `ALTER TABLE tt_invoice_items ADD COLUMN user_id text`,
  `ALTER TABLE tt_invoice_items ADD COLUMN synced_at integer`,
  `ALTER TABLE tt_invoice_items ADD COLUMN deleted_at integer`,
  `ALTER TABLE tt_invoice_items ADD COLUMN created_at integer`,

  // Boards, columns, tasks for kanban
  `CREATE TABLE IF NOT EXISTS tt_boards (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    project_id text NOT NULL,
    name text NOT NULL,
    created_at integer NOT NULL,
    synced_at integer,
    deleted_at integer,
    FOREIGN KEY (project_id) REFERENCES tt_projects(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_columns (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    board_id text NOT NULL,
    name text NOT NULL,
    "order" integer NOT NULL,
    color text NOT NULL,
    created_at integer NOT NULL,
    synced_at integer,
    deleted_at integer,
    FOREIGN KEY (board_id) REFERENCES tt_boards(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_tasks (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    column_id text NOT NULL,
    board_id text NOT NULL,
    title text NOT NULL,
    description text,
    "order" integer NOT NULL,
    priority text DEFAULT 'none' NOT NULL,
    due_date integer,
    assignee text,
    estimated_minutes integer,
    created_at integer NOT NULL,
    synced_at integer,
    deleted_at integer,
    FOREIGN KEY (column_id) REFERENCES tt_columns(id),
    FOREIGN KEY (board_id) REFERENCES tt_boards(id)
  )`,
  `CREATE TABLE IF NOT EXISTS tt_task_tags (
    id text PRIMARY KEY NOT NULL,
    user_id text,
    task_id text NOT NULL,
    tag_id text NOT NULL,
    synced_at integer,
    deleted_at integer,
    FOREIGN KEY (task_id) REFERENCES tt_tasks(id),
    FOREIGN KEY (tag_id) REFERENCES tt_tags(id)
  )`,

  // Add task_id to time_entries
  `ALTER TABLE tt_time_entries ADD COLUMN task_id text`,
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

  // Run sync column migrations if needed
  for (const sql of SYNC_MIGRATIONS) {
    try {
      db.exec(sql);
    } catch {
      // Ignore errors from ALTER TABLE if column already exists
      // SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
    }
  }

  // Create indexes for kanban tables (after tables are created)
  for (const sql of KANBAN_INDEXES) {
    try {
      db.exec(sql);
    } catch {
      // Ignore if already exists
    }
  }
}
