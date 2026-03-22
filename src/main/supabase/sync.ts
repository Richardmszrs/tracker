import { net } from "electron";
import Store from "electron-store";
import { supabase } from "./client";
import { getSession } from "./auth";
import { getDb } from "@/main/db/client";
import {
  clients,
  projects,
  tags,
  timeEntries,
  entryTags,
} from "@/main/db/schema";
import { isNull, or, lt, eq } from "drizzle-orm";
import type { AuthUser } from "./auth";

export interface SyncStatus {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
}

interface SyncStore {
  lastSyncedAt: number | null;
  lastPulledAt: number | null;
  syncFrequency: number; // in milliseconds
  syncOnFocus: boolean;
}

const syncStore = new Store<SyncStore>({
  name: "sync-store",
  defaults: {
    lastSyncedAt: null,
    lastPulledAt: 0,
    syncFrequency: 5 * 60 * 1000, // 5 minutes
    syncOnFocus: true,
  },
});

export class SyncEngine {
  private user: AuthUser | null = null;
  private isSyncing = false;

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    const { user } = await getSession();
    this.user = user;
  }

  public async setUser(user: AuthUser | null) {
    this.user = user;
  }

  public isOnline(): boolean {
    return net.isOnline();
  }

  public getStatus(): SyncStatus {
    const db = getDb();
    const pendingCount =
      this.countUnsyncedClients() +
      this.countUnsyncedProjects() +
      this.countUnsyncedTags() +
      this.countUnsyncedEntries();

    return {
      lastSyncedAt: syncStore.get("lastSyncedAt"),
      isSyncing: this.isSyncing,
      isOnline: this.isOnline(),
      pendingCount,
    };
  }

  public getSyncFrequency(): number {
    return syncStore.get("syncFrequency");
  }

  public setSyncFrequency(frequency: number) {
    syncStore.set("syncFrequency", frequency);
  }

  public getSyncOnFocus(): boolean {
    return syncStore.get("syncOnFocus");
  }

  public setSyncOnFocus(enabled: boolean) {
    syncStore.set("syncOnFocus", enabled);
  }

  private countUnsyncedClients(): number {
    const db = getDb();
    const result = db
      .select()
      .from(clients)
      .where(
        or(isNull(clients.syncedAt), lt(clients.syncedAt, clients.createdAt))
      )
      .all();
    return result.length;
  }

  private countUnsyncedProjects(): number {
    const db = getDb();
    return db
      .select()
      .from(projects)
      .where(
        or(
          isNull(projects.syncedAt),
          lt(projects.syncedAt, projects.createdAt)
        )
      )
      .all().length;
  }

  private countUnsyncedTags(): number {
    const db = getDb();
    return db
      .select()
      .from(tags)
      .where(
        or(isNull(tags.syncedAt), lt(tags.syncedAt, tags.createdAt))
      )
      .all().length;
  }

  private countUnsyncedEntries(): number {
    const db = getDb();
    return db
      .select()
      .from(timeEntries)
      .where(
        or(
          isNull(timeEntries.syncedAt),
          lt(timeEntries.syncedAt, timeEntries.createdAt)
        )
      )
      .all().length;
  }

  public async sync(): Promise<void> {
    if (!this.user) {
      console.log("SyncEngine: No authenticated user, skipping sync");
      return;
    }

    if (!this.isOnline()) {
      console.log("SyncEngine: Offline, skipping sync");
      return;
    }

    if (this.isSyncing) {
      console.log("SyncEngine: Sync already in progress, skipping");
      return;
    }

    this.isSyncing = true;
    try {
      console.log("SyncEngine: Starting sync...");
      await this.push();
      await this.pull();
      syncStore.set("lastSyncedAt", Date.now());
      console.log("SyncEngine: Sync completed");
    } catch (error) {
      console.error("SyncEngine: Sync failed:", error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async push(): Promise<void> {
    if (!this.user) return;

    const db = getDb();

    // Push clients
    const unsyncedClients = db
      .select()
      .from(clients)
      .where(
        or(
          isNull(clients.syncedAt),
          lt(clients.syncedAt, clients.createdAt)
        )
      )
      .all();

    if (unsyncedClients.length > 0) {
      const clientsToPush = unsyncedClients.map((c) => ({
        id: c.id,
        user_id: this.user!.id,
        name: c.name,
        created_at: c.createdAt,
        synced_at: new Date(),
        deleted_at: c.deletedAt,
        updated_at: c.createdAt,
      }));

      const { error } = await supabase.from("clients").upsert(clientsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push clients:", error);
      } else {
        // Update local syncedAt
        for (const client of unsyncedClients) {
          db.update(clients)
            .set({ syncedAt: new Date() })
            .where(eq(clients.id, client.id))
            .run();
        }
      }
    }

    // Push projects
    const unsyncedProjects = db
      .select()
      .from(projects)
      .where(
        or(
          isNull(projects.syncedAt),
          lt(projects.syncedAt, projects.createdAt)
        )
      )
      .all();

    if (unsyncedProjects.length > 0) {
      const projectsToPush = unsyncedProjects.map((p) => ({
        id: p.id,
        user_id: this.user!.id,
        name: p.name,
        color: p.color,
        client_id: p.clientId,
        hourly_rate: p.hourlyRate,
        archived: p.archived,
        created_at: p.createdAt,
        synced_at: new Date(),
        deleted_at: p.deletedAt,
        updated_at: p.createdAt,
      }));

      const { error } = await supabase.from("projects").upsert(projectsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push projects:", error);
      } else {
        for (const project of unsyncedProjects) {
          db.update(projects)
            .set({ syncedAt: new Date() })
            .where(eq(projects.id, project.id))
            .run();
        }
      }
    }

    // Push tags
    const unsyncedTags = db
      .select()
      .from(tags)
      .where(
        or(isNull(tags.syncedAt), lt(tags.syncedAt, tags.createdAt))
      )
      .all();

    if (unsyncedTags.length > 0) {
      const tagsToPush = unsyncedTags.map((t) => ({
        id: t.id,
        user_id: this.user!.id,
        name: t.name,
        created_at: t.createdAt,
        synced_at: new Date(),
        deleted_at: t.deletedAt,
        updated_at: t.createdAt,
      }));

      const { error } = await supabase.from("tags").upsert(tagsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push tags:", error);
      } else {
        for (const tag of unsyncedTags) {
          db.update(tags)
            .set({ syncedAt: new Date() })
            .where(eq(tags.id, tag.id))
            .run();
        }
      }
    }

    // Push time entries
    const unsyncedEntries = db
      .select()
      .from(timeEntries)
      .where(
        or(
          isNull(timeEntries.syncedAt),
          lt(timeEntries.syncedAt, timeEntries.createdAt)
        )
      )
      .all();

    if (unsyncedEntries.length > 0) {
      const entriesToPush = unsyncedEntries.map((e) => ({
        id: e.id,
        user_id: this.user!.id,
        description: e.description,
        start_at: e.startAt,
        end_at: e.endAt,
        project_id: e.projectId,
        billable: e.billable,
        created_at: e.createdAt,
        synced_at: new Date(),
        deleted_at: e.deletedAt,
        updated_at: e.createdAt,
      }));

      const { error } = await supabase
        .from("time_entries")
        .upsert(entriesToPush);
      if (error) {
        console.error("SyncEngine: Failed to push entries:", error);
      } else {
        for (const entry of unsyncedEntries) {
          db.update(timeEntries)
            .set({ syncedAt: new Date() })
            .where(eq(timeEntries.id, entry.id))
            .run();
        }
      }
    }

    // Push entry tags
    const unsyncedEntryTags = db
      .select()
      .from(entryTags)
      .where(isNull(entryTags.syncedAt))
      .all();

    if (unsyncedEntryTags.length > 0) {
      const entryTagsToPush = unsyncedEntryTags.map((et) => ({
        id: et.id,
        user_id: this.user!.id,
        entry_id: et.entryId,
        tag_id: et.tagId,
        synced_at: new Date(),
        deleted_at: et.deletedAt,
        created_at: new Date(),
      }));

      const { error } = await supabase
        .from("entry_tags")
        .upsert(entryTagsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push entry tags:", error);
      } else {
        for (const et of unsyncedEntryTags) {
          db.update(entryTags)
            .set({ syncedAt: new Date() })
            .where(eq(entryTags.id, et.id))
            .run();
        }
      }
    }
  }

  private async pull(): Promise<void> {
    if (!this.user) return;

    const db = getDb();
    const lastPulledAt = syncStore.get("lastPulledAt") || 0;
    const lastPulledDate = new Date(lastPulledAt).toISOString();

    // Pull clients
    const { data: remoteClients, error: clientsError } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!clientsError && remoteClients) {
      for (const rc of remoteClients) {
        const existing = db
          .select()
          .from(clients)
          .where(eq(clients.id, rc.id))
          .get();

        if (!existing) {
          db.insert(clients)
            .values({
              id: rc.id,
              userId: rc.user_id,
              name: rc.name,
              createdAt: new Date(rc.created_at),
              syncedAt: new Date(),
              deletedAt: rc.deleted_at ? new Date(rc.deleted_at) : null,
            })
            .run();
        } else if (new Date(rc.updated_at) > existing.createdAt) {
          db.update(clients)
            .set({
              name: rc.name,
              deletedAt: rc.deleted_at ? new Date(rc.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(clients.id, rc.id))
            .run();
        }
      }
    }

    // Pull tags
    const { data: remoteTags, error: tagsError } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!tagsError && remoteTags) {
      for (const rt of remoteTags) {
        const existing = db
          .select()
          .from(tags)
          .where(eq(tags.id, rt.id))
          .get();

        if (!existing) {
          db.insert(tags)
            .values({
              id: rt.id,
              userId: rt.user_id,
              name: rt.name,
              createdAt: new Date(rt.created_at),
              syncedAt: new Date(),
              deletedAt: rt.deleted_at ? new Date(rt.deleted_at) : null,
            })
            .run();
        } else if (new Date(rt.updated_at) > existing.createdAt) {
          db.update(tags)
            .set({
              name: rt.name,
              deletedAt: rt.deleted_at ? new Date(rt.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(tags.id, rt.id))
            .run();
        }
      }
    }

    // Pull projects
    const { data: remoteProjects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!projectsError && remoteProjects) {
      for (const rp of remoteProjects) {
        const existing = db
          .select()
          .from(projects)
          .where(eq(projects.id, rp.id))
          .get();

        if (!existing) {
          db.insert(projects)
            .values({
              id: rp.id,
              userId: rp.user_id,
              name: rp.name,
              color: rp.color,
              clientId: rp.client_id,
              hourlyRate: rp.hourly_rate,
              archived: rp.archived,
              createdAt: new Date(rp.created_at),
              syncedAt: new Date(),
              deletedAt: rp.deleted_at ? new Date(rp.deleted_at) : null,
            })
            .run();
        } else if (new Date(rp.updated_at) > existing.createdAt) {
          db.update(projects)
            .set({
              name: rp.name,
              color: rp.color,
              clientId: rp.client_id,
              hourlyRate: rp.hourly_rate,
              archived: rp.archived,
              deletedAt: rp.deleted_at ? new Date(rp.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(projects.id, rp.id))
            .run();
        }
      }
    }

    // Pull time entries
    const { data: remoteEntries, error: entriesError } = await supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!entriesError && remoteEntries) {
      for (const re of remoteEntries) {
        const existing = db
          .select()
          .from(timeEntries)
          .where(eq(timeEntries.id, re.id))
          .get();

        if (!existing) {
          db.insert(timeEntries)
            .values({
              id: re.id,
              userId: re.user_id,
              description: re.description,
              startAt: new Date(re.start_at),
              endAt: re.end_at ? new Date(re.end_at) : null,
              projectId: re.project_id,
              billable: re.billable,
              createdAt: new Date(re.created_at),
              syncedAt: new Date(),
              deletedAt: re.deleted_at ? new Date(re.deleted_at) : null,
            })
            .run();
        } else if (new Date(re.updated_at) > existing.createdAt) {
          db.update(timeEntries)
            .set({
              description: re.description,
              startAt: new Date(re.start_at),
              endAt: re.end_at ? new Date(re.end_at) : null,
              projectId: re.project_id,
              billable: re.billable,
              deletedAt: re.deleted_at ? new Date(re.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(timeEntries.id, re.id))
            .run();
        }
      }
    }

    // Pull entry tags
    const { data: remoteEntryTags, error: entryTagsError } = await supabase
      .from("entry_tags")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`created_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!entryTagsError && remoteEntryTags) {
      for (const ret of remoteEntryTags) {
        const existing = db
          .select()
          .from(entryTags)
          .where(eq(entryTags.id, ret.id))
          .get();

        if (!existing) {
          db.insert(entryTags)
            .values({
              id: ret.id,
              userId: ret.user_id,
              entryId: ret.entry_id,
              tagId: ret.tag_id,
              syncedAt: new Date(),
              deletedAt: ret.deleted_at ? new Date(ret.deleted_at) : null,
            })
            .run();
        } else if (ret.deleted_at && !existing.deletedAt) {
          db.update(entryTags)
            .set({
              deletedAt: new Date(ret.deleted_at),
              syncedAt: new Date(),
            })
            .where(eq(entryTags.id, ret.id))
            .run();
        }
      }
    }

    syncStore.set("lastPulledAt", Date.now());
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
