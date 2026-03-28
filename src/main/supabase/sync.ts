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
  invoices,
  invoiceItems,
  boards,
  columns,
  tasks,
  taskTags,
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
      this.countUnsyncedEntries() +
      this.countUnsyncedInvoices() +
      this.countUnsyncedInvoiceItems() +
      this.countUnsyncedBoards() +
      this.countUnsyncedColumns() +
      this.countUnsyncedTasks() +
      this.countUnsyncedTaskTags();

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

  private countUnsyncedInvoices(): number {
    const db = getDb();
    return db
      .select()
      .from(invoices)
      .where(
        or(
          isNull(invoices.syncedAt),
          lt(invoices.syncedAt, invoices.createdAt)
        )
      )
      .all().length;
  }

  private countUnsyncedInvoiceItems(): number {
    const db = getDb();
    return db
      .select()
      .from(invoiceItems)
      .where(isNull(invoiceItems.syncedAt))
      .all().length;
  }

  private countUnsyncedBoards(): number {
    const db = getDb();
    return db
      .select()
      .from(boards)
      .where(
        or(
          isNull(boards.syncedAt),
          lt(boards.syncedAt, boards.createdAt)
        )
      )
      .all().length;
  }

  private countUnsyncedColumns(): number {
    const db = getDb();
    return db
      .select()
      .from(columns)
      .where(
        or(
          isNull(columns.syncedAt),
          lt(columns.syncedAt, columns.createdAt)
        )
      )
      .all().length;
  }

  private countUnsyncedTasks(): number {
    const db = getDb();
    return db
      .select()
      .from(tasks)
      .where(
        or(
          isNull(tasks.syncedAt),
          lt(tasks.syncedAt, tasks.createdAt)
        )
      )
      .all().length;
  }

  private countUnsyncedTaskTags(): number {
    const db = getDb();
    return db
      .select()
      .from(taskTags)
      .where(isNull(taskTags.syncedAt))
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
        task_id: e.taskId,
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

    // Push invoices
    const unsyncedInvoices = db
      .select()
      .from(invoices)
      .where(
        or(
          isNull(invoices.syncedAt),
          lt(invoices.syncedAt, invoices.createdAt)
        )
      )
      .all();

    if (unsyncedInvoices.length > 0) {
      const invoicesToPush = unsyncedInvoices.map((inv) => ({
        id: inv.id,
        user_id: this.user!.id,
        number: inv.number,
        client_id: inv.clientId,
        status: inv.status,
        issue_date: inv.issueDate,
        due_date: inv.dueDate,
        notes: inv.notes,
        tax_rate: inv.taxRate,
        discount: inv.discount,
        currency: inv.currency,
        paid_at: inv.paidAt,
        created_at: inv.createdAt,
        synced_at: new Date(),
        deleted_at: inv.deletedAt,
        updated_at: inv.createdAt,
      }));

      const { error } = await supabase.from("invoices").upsert(invoicesToPush);
      if (error) {
        console.error("SyncEngine: Failed to push invoices:", error);
      } else {
        for (const inv of unsyncedInvoices) {
          db.update(invoices)
            .set({ syncedAt: new Date() })
            .where(eq(invoices.id, inv.id))
            .run();
        }
      }
    }

    // Push invoice items
    const unsyncedInvoiceItems = db
      .select()
      .from(invoiceItems)
      .where(isNull(invoiceItems.syncedAt))
      .all();

    if (unsyncedInvoiceItems.length > 0) {
      const itemsToPush = unsyncedInvoiceItems.map((item) => ({
        id: item.id,
        user_id: this.user!.id,
        invoice_id: item.invoiceId,
        entry_id: item.entryId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        amount: item.amount,
        synced_at: new Date(),
        deleted_at: item.deletedAt,
      }));

      const { error } = await supabase
        .from("invoice_items")
        .upsert(itemsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push invoice items:", error);
      } else {
        for (const item of unsyncedInvoiceItems) {
          db.update(invoiceItems)
            .set({ syncedAt: new Date() })
            .where(eq(invoiceItems.id, item.id))
            .run();
        }
      }
    }

    // Push boards
    const unsyncedBoards = db
      .select()
      .from(boards)
      .where(
        or(
          isNull(boards.syncedAt),
          lt(boards.syncedAt, boards.createdAt)
        )
      )
      .all();

    if (unsyncedBoards.length > 0) {
      const boardsToPush = unsyncedBoards.map((b) => ({
        id: b.id,
        user_id: this.user!.id,
        project_id: b.projectId,
        name: b.name,
        created_at: b.createdAt,
        synced_at: new Date(),
        deleted_at: b.deletedAt,
        updated_at: b.createdAt,
      }));

      const { error } = await supabase.from("boards").upsert(boardsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push boards:", error);
      } else {
        for (const board of unsyncedBoards) {
          db.update(boards)
            .set({ syncedAt: new Date() })
            .where(eq(boards.id, board.id))
            .run();
        }
      }
    }

    // Push columns
    const unsyncedColumns = db
      .select()
      .from(columns)
      .where(
        or(
          isNull(columns.syncedAt),
          lt(columns.syncedAt, columns.createdAt)
        )
      )
      .all();

    if (unsyncedColumns.length > 0) {
      const columnsToPush = unsyncedColumns.map((c) => ({
        id: c.id,
        user_id: this.user!.id,
        board_id: c.boardId,
        name: c.name,
        order: c.order,
        color: c.color,
        created_at: c.createdAt,
        synced_at: new Date(),
        deleted_at: c.deletedAt,
        updated_at: c.createdAt,
      }));

      const { error } = await supabase.from("columns").upsert(columnsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push columns:", error);
      } else {
        for (const col of unsyncedColumns) {
          db.update(columns)
            .set({ syncedAt: new Date() })
            .where(eq(columns.id, col.id))
            .run();
        }
      }
    }

    // Push tasks
    const unsyncedTasks = db
      .select()
      .from(tasks)
      .where(
        or(
          isNull(tasks.syncedAt),
          lt(tasks.syncedAt, tasks.createdAt)
        )
      )
      .all();

    if (unsyncedTasks.length > 0) {
      const tasksToPush = unsyncedTasks.map((t) => ({
        id: t.id,
        user_id: this.user!.id,
        column_id: t.columnId,
        board_id: t.boardId,
        title: t.title,
        description: t.description,
        order: t.order,
        priority: t.priority,
        due_date: t.dueDate,
        assignee: t.assignee,
        estimated_minutes: t.estimatedMinutes,
        created_at: t.createdAt,
        synced_at: new Date(),
        deleted_at: t.deletedAt,
        updated_at: t.createdAt,
      }));

      const { error } = await supabase.from("tasks").upsert(tasksToPush);
      if (error) {
        console.error("SyncEngine: Failed to push tasks:", error);
      } else {
        for (const task of unsyncedTasks) {
          db.update(tasks)
            .set({ syncedAt: new Date() })
            .where(eq(tasks.id, task.id))
            .run();
        }
      }
    }

    // Push task tags
    const unsyncedTaskTags = db
      .select()
      .from(taskTags)
      .where(isNull(taskTags.syncedAt))
      .all();

    if (unsyncedTaskTags.length > 0) {
      const taskTagsToPush = unsyncedTaskTags.map((tt) => ({
        id: tt.id,
        user_id: this.user!.id,
        task_id: tt.taskId,
        tag_id: tt.tagId,
        synced_at: new Date(),
        deleted_at: tt.deletedAt,
        created_at: new Date(),
      }));

      const { error } = await supabase
        .from("task_tags")
        .upsert(taskTagsToPush);
      if (error) {
        console.error("SyncEngine: Failed to push task tags:", error);
      } else {
        for (const tt of unsyncedTaskTags) {
          db.update(taskTags)
            .set({ syncedAt: new Date() })
            .where(eq(taskTags.id, tt.id))
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

    // Pull invoices
    const { data: remoteInvoices, error: invoicesError } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!invoicesError && remoteInvoices) {
      for (const ri of remoteInvoices) {
        const existing = db
          .select()
          .from(invoices)
          .where(eq(invoices.id, ri.id))
          .get();

        if (!existing) {
          db.insert(invoices)
            .values({
              id: ri.id,
              userId: ri.user_id,
              number: ri.number,
              clientId: ri.client_id,
              status: ri.status,
              issueDate: new Date(ri.issue_date),
              dueDate: new Date(ri.due_date),
              notes: ri.notes,
              taxRate: ri.tax_rate,
              discount: ri.discount,
              currency: ri.currency,
              paidAt: ri.paid_at ? new Date(ri.paid_at) : null,
              createdAt: new Date(ri.created_at),
              syncedAt: new Date(),
              deletedAt: ri.deleted_at ? new Date(ri.deleted_at) : null,
            })
            .run();
        } else if (new Date(ri.updated_at) > existing.createdAt) {
          db.update(invoices)
            .set({
              number: ri.number,
              clientId: ri.client_id,
              status: ri.status,
              issueDate: new Date(ri.issue_date),
              dueDate: new Date(ri.due_date),
              notes: ri.notes,
              taxRate: ri.tax_rate,
              discount: ri.discount,
              currency: ri.currency,
              paidAt: ri.paid_at ? new Date(ri.paid_at) : null,
              deletedAt: ri.deleted_at ? new Date(ri.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(invoices.id, ri.id))
            .run();
        }
      }
    }

    // Pull invoice items
    const { data: remoteInvoiceItems, error: invoiceItemsError } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`created_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!invoiceItemsError && remoteInvoiceItems) {
      for (const rii of remoteInvoiceItems) {
        const existing = db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.id, rii.id))
          .get();

        if (!existing) {
          db.insert(invoiceItems)
            .values({
              id: rii.id,
              userId: rii.user_id,
              invoiceId: rii.invoice_id,
              entryId: rii.entry_id,
              description: rii.description,
              quantity: rii.quantity,
              unitPrice: rii.unit_price,
              amount: rii.amount,
              syncedAt: new Date(),
              deletedAt: rii.deleted_at ? new Date(rii.deleted_at) : null,
              createdAt: new Date(rii.created_at),
            })
            .run();
        } else if (rii.deleted_at && !existing.deletedAt) {
          db.update(invoiceItems)
            .set({
              deletedAt: new Date(rii.deleted_at),
              syncedAt: new Date(),
            })
            .where(eq(invoiceItems.id, rii.id))
            .run();
        }
      }
    }

    // Pull boards
    const { data: remoteBoards, error: boardsError } = await supabase
      .from("boards")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!boardsError && remoteBoards) {
      for (const rb of remoteBoards) {
        const existing = db
          .select()
          .from(boards)
          .where(eq(boards.id, rb.id))
          .get();

        if (!existing) {
          db.insert(boards)
            .values({
              id: rb.id,
              userId: rb.user_id,
              projectId: rb.project_id,
              name: rb.name,
              createdAt: new Date(rb.created_at),
              syncedAt: new Date(),
              deletedAt: rb.deleted_at ? new Date(rb.deleted_at) : null,
            })
            .run();
        } else if (new Date(rb.updated_at) > existing.createdAt) {
          db.update(boards)
            .set({
              name: rb.name,
              projectId: rb.project_id,
              deletedAt: rb.deleted_at ? new Date(rb.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(boards.id, rb.id))
            .run();
        }
      }
    }

    // Pull columns
    const { data: remoteColumns, error: columnsError } = await supabase
      .from("columns")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!columnsError && remoteColumns) {
      for (const rc of remoteColumns) {
        const existing = db
          .select()
          .from(columns)
          .where(eq(columns.id, rc.id))
          .get();

        if (!existing) {
          db.insert(columns)
            .values({
              id: rc.id,
              userId: rc.user_id,
              boardId: rc.board_id,
              name: rc.name,
              order: rc.order,
              color: rc.color,
              createdAt: new Date(rc.created_at),
              syncedAt: new Date(),
              deletedAt: rc.deleted_at ? new Date(rc.deleted_at) : null,
            })
            .run();
        } else if (new Date(rc.updated_at) > existing.createdAt) {
          db.update(columns)
            .set({
              name: rc.name,
              order: rc.order,
              color: rc.color,
              deletedAt: rc.deleted_at ? new Date(rc.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(columns.id, rc.id))
            .run();
        }
      }
    }

    // Pull tasks
    const { data: remoteTasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`updated_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!tasksError && remoteTasks) {
      for (const rt of remoteTasks) {
        const existing = db
          .select()
          .from(tasks)
          .where(eq(tasks.id, rt.id))
          .get();

        if (!existing) {
          db.insert(tasks)
            .values({
              id: rt.id,
              userId: rt.user_id,
              columnId: rt.column_id,
              boardId: rt.board_id,
              title: rt.title,
              description: rt.description,
              order: rt.order,
              priority: rt.priority,
              dueDate: rt.due_date ? new Date(rt.due_date) : null,
              assignee: rt.assignee,
              estimatedMinutes: rt.estimated_minutes,
              createdAt: new Date(rt.created_at),
              syncedAt: new Date(),
              deletedAt: rt.deleted_at ? new Date(rt.deleted_at) : null,
            })
            .run();
        } else if (new Date(rt.updated_at) > existing.createdAt) {
          db.update(tasks)
            .set({
              columnId: rt.column_id,
              boardId: rt.board_id,
              title: rt.title,
              description: rt.description,
              order: rt.order,
              priority: rt.priority,
              dueDate: rt.due_date ? new Date(rt.due_date) : null,
              assignee: rt.assignee,
              estimatedMinutes: rt.estimated_minutes,
              deletedAt: rt.deleted_at ? new Date(rt.deleted_at) : null,
              syncedAt: new Date(),
            })
            .where(eq(tasks.id, rt.id))
            .run();
        }
      }
    }

    // Pull task tags
    const { data: remoteTaskTags, error: taskTagsError } = await supabase
      .from("task_tags")
      .select("*")
      .eq("user_id", this.user.id)
      .or(`created_at.gt.${lastPulledDate},deleted_at.gt.${lastPulledDate}`);

    if (!taskTagsError && remoteTaskTags) {
      for (const rtt of remoteTaskTags) {
        const existing = db
          .select()
          .from(taskTags)
          .where(eq(taskTags.id, rtt.id))
          .get();

        if (!existing) {
          db.insert(taskTags)
            .values({
              id: rtt.id,
              userId: rtt.user_id,
              taskId: rtt.task_id,
              tagId: rtt.tag_id,
              syncedAt: new Date(),
              deletedAt: rtt.deleted_at ? new Date(rtt.deleted_at) : null,
            })
            .run();
        } else if (rtt.deleted_at && !existing.deletedAt) {
          db.update(taskTags)
            .set({
              deletedAt: new Date(rtt.deleted_at),
              syncedAt: new Date(),
            })
            .where(eq(taskTags.id, rtt.id))
            .run();
        }
      }
    }

    syncStore.set("lastPulledAt", Date.now());
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
