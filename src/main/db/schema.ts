import {
  integer,
  real,
  sqliteTableCreator,
  text,
} from "drizzle-orm/sqlite-core";

const createTable = sqliteTableCreator((name) => `tt_${name}`);

export const clients = createTable("clients", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const projects = createTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  color: text("color").notNull(),
  clientId: text("client_id").references(() => clients.id),
  hourlyRate: real("hourly_rate"),
  archived: integer("archived", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const tags = createTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const timeEntries = createTable("time_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  description: text("description").notNull(),
  startAt: integer("start_at", { mode: "timestamp" }).notNull(),
  endAt: integer("end_at", { mode: "timestamp" }),
  projectId: text("project_id").references(() => projects.id),
  billable: integer("billable", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});

export const entryTags = createTable("entry_tags", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  entryId: text("entry_id")
    .notNull()
    .references(() => timeEntries.id),
  tagId: text("tag_id")
    .notNull()
    .references(() => tags.id),
  syncedAt: integer("synced_at", { mode: "timestamp" }),
  deletedAt: integer("deleted_at", { mode: "timestamp" }),
});
