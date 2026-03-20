import { os } from "@orpc/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/main/db/client";
import { entryTags, timeEntries } from "@/main/db/schema";

const entryCreateSchema = z.object({
  description: z.string().min(1),
  startAt: z.number(),
  endAt: z.number().optional(),
  projectId: z.string().optional(),
  billable: z.boolean().default(true),
  tagIds: z.array(z.string()).optional(),
});

const entryUpdateSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).optional(),
  startAt: z.number().optional(),
  endAt: z.number().nullable().optional(),
  projectId: z.string().nullable().optional(),
  billable: z.boolean().optional(),
  tagIds: z.array(z.string()).optional(),
});

const entryDeleteSchema = z.object({
  id: z.string().min(1),
});

const entryListSchema = z.object({
  startDate: z.number().optional(),
  endDate: z.number().optional(),
});

export const entryCreate = os
  .input(entryCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();
    const startAt = new Date(opt.input.startAt);
    const endAt = opt.input.endAt ? new Date(opt.input.endAt) : null;

    await db
      .insert(timeEntries)
      .values({
        id,
        description: opt.input.description,
        startAt,
        endAt,
        projectId: opt.input.projectId ?? null,
        billable: opt.input.billable,
        createdAt,
      })
      .returning();

    if (opt.input.tagIds && opt.input.tagIds.length > 0) {
      await db
        .insert(entryTags)
        .values(
          opt.input.tagIds.map((tagId: string) => ({ entryId: id, tagId }))
        );
    }

    return { id, ...opt.input, createdAt };
  });

export const entryList = os.input(entryListSchema).handler((opt) => {
  const db = getDb();
  const conditions: ReturnType<typeof eq>[] = [];

  if (opt.input.startDate) {
    conditions.push(gte(timeEntries.startAt, new Date(opt.input.startDate)));
  }
  if (opt.input.endDate) {
    conditions.push(lte(timeEntries.startAt, new Date(opt.input.endDate)));
  }

  if (conditions.length > 0) {
    return db
      .select()
      .from(timeEntries)
      .where(and(...conditions))
      .all();
  }

  return db.select().from(timeEntries).all();
});

export const entryUpdate = os
  .input(entryUpdateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const { id, tagIds, description, startAt, endAt, projectId, billable } =
      opt.input;

    const dbUpdates: Record<string, unknown> = {};
    if (description !== undefined) dbUpdates.description = description;
    if (startAt !== undefined) dbUpdates.startAt = new Date(startAt);
    if (endAt !== undefined)
      dbUpdates.endAt = endAt ? new Date(endAt) : null;
    if (projectId !== undefined) dbUpdates.projectId = projectId;
    if (billable !== undefined) dbUpdates.billable = billable;

    if (Object.keys(dbUpdates).length > 0) {
      await db
        .update(timeEntries)
        .set(dbUpdates)
        .where(eq(timeEntries.id, id));
    }

    if (tagIds !== undefined) {
      await db.delete(entryTags).where(eq(entryTags.entryId, id));
      if (tagIds.length > 0) {
        await db
          .insert(entryTags)
          .values(tagIds.map((tagId: string) => ({ entryId: id, tagId })));
      }
    }

    const [result] = await db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.id, id));
    return result;
  });

export const entryDelete = os
  .input(entryDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();
    await db.delete(entryTags).where(eq(entryTags.entryId, opt.input.id));
    await db.delete(timeEntries).where(eq(timeEntries.id, opt.input.id));
    return { success: true };
  });
