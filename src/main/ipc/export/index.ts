import { os } from "@orpc/server";
import { z } from "zod";
import { dialog } from "electron";
import fs from "node:fs";
import { eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/main/db/client";
import { entryTags, timeEntries, projects, clients, tags } from "@/main/db/schema";

const exportFiltersSchema = z.object({
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  projectIds: z.array(z.string()).optional(),
  clientIds: z.array(z.string()).optional(),
  billable: z.enum(["all", "billable", "non-billable"]).optional(),
});

const exportSchema = z.object({
  format: z.enum(["csv", "json"]),
  filters: exportFiltersSchema.optional(),
});

function buildEntryRows(filters: z.infer<typeof exportFiltersSchema>) {
  const db = getDb();

  const allTags = db.select().from(tags).all();
  const allEntryTags = db.select().from(entryTags).all();
  const tagMap = new Map(allTags.map((t) => [t.id, t.name]));
  const entryTagsMap = new Map<string, string[]>();
  for (const et of allEntryTags) {
    if (!entryTagsMap.has(et.entryId)) {
      entryTagsMap.set(et.entryId, []);
    }
    const tagName = tagMap.get(et.tagId);
    if (tagName) {
      entryTagsMap.get(et.entryId)!.push(tagName);
    }
  }

  let query = db
    .select({
      entry: timeEntries,
      project: projects,
      client: clients,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(timeEntries.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id));

  const entries = query.all();

  const filtered = entries.filter((e) => {
    if (filters.projectIds && filters.projectIds.length > 0) {
      if (!e.entry.projectId || !filters.projectIds.includes(e.entry.projectId)) return false;
    }
    if (filters.clientIds && filters.clientIds.length > 0) {
      if (!e.project?.clientId || !filters.clientIds.includes(e.project.clientId)) return false;
    }
    if (filters.billable === "billable" && !e.entry.billable) return false;
    if (filters.billable === "non-billable" && e.entry.billable) return false;
    return true;
  });

  let dateFiltered = filtered;
  if (filters.startDate) {
    const start = new Date(filters.startDate);
    dateFiltered = dateFiltered.filter((e) => e.entry.startAt >= start);
  }
  if (filters.endDate) {
    const end = new Date(filters.endDate);
    dateFiltered = dateFiltered.filter((e) => e.entry.startAt <= end);
  }

  return dateFiltered.map((e) => ({
    date: e.entry.startAt.toISOString().split("T")[0],
    start: e.entry.startAt.toLocaleTimeString(),
    end: e.entry.endAt?.toLocaleTimeString() ?? "",
    duration_minutes: e.entry.endAt
      ? Math.round((e.entry.endAt.getTime() - e.entry.startAt.getTime()) / 60000)
      : 0,
    description: e.entry.description,
    project: e.project?.name ?? "",
    client: e.client?.name ?? "",
    tags: entryTagsMap.get(e.entry.id)?.join("; ") ?? "",
    billable: e.entry.billable ? "Yes" : "No",
    amount: e.entry.endAt && e.project?.hourlyRate
      ? Math.round(((e.entry.endAt.getTime() - e.entry.startAt.getTime()) / 3600000) * e.project.hourlyRate * 100) / 100
      : 0,
  }));
}

export const exportEntries = os
  .input(exportSchema)
  .handler(async (opt) => {
    const { format, filters } = opt.input;
    const data = buildEntryRows(filters ?? {});

    const result = await dialog.showSaveDialog({
      title: "Export Time Entries",
      defaultPath: `time-entries-${new Date().toISOString().split("T")[0]}.${format}`,
      filters: format === "csv"
        ? [{ name: "CSV", extensions: ["csv"] }]
        : [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    if (format === "csv") {
      const headers = ["date", "start", "end", "duration_minutes", "description", "project", "client", "tags", "billable", "amount"];
      const rows = data.map((d) =>
        headers.map((h) => {
          const val = d[h as keyof typeof d];
          if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        }).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      fs.writeFileSync(result.filePath, csv, "utf-8");
    } else {
      fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), "utf-8");
    }

    return { success: true, filePath: result.filePath };
  });
