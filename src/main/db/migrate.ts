import path from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app } from "electron";
import { getDb } from "./client";

export function runMigrations() {
  const db = getDb();
  const migrationsFolder = path.join(
    app.getAppPath(),
    "src/main/db/migrations"
  );
  migrate(db, { migrationsFolder });
}
