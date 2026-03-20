import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/main/db/client";
import { projects } from "@/main/db/schema";

const projectCreateSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  clientId: z.string().optional(),
  hourlyRate: z.number().optional(),
});

const projectUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
  clientId: z.string().nullable().optional(),
  hourlyRate: z.number().nullable().optional(),
  archived: z.boolean().optional(),
});

const projectDeleteSchema = z.object({
  id: z.string().min(1),
});

export const projectCreate = os
  .input(projectCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();
    await db
      .insert(projects)
      .values({
        id,
        name: opt.input.name,
        color: opt.input.color,
        clientId: opt.input.clientId ?? null,
        hourlyRate: opt.input.hourlyRate ?? null,
        createdAt,
      })
      .returning();
    return { id, ...opt.input, createdAt };
  });

export const projectList = os.handler(() => {
  const db = getDb();
  return db.select().from(projects).all();
});

export const projectUpdate = os
  .input(projectUpdateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (opt.input.name !== undefined) {
      updates.name = opt.input.name;
    }
    if (opt.input.color !== undefined) {
      updates.color = opt.input.color;
    }
    if (opt.input.clientId !== undefined) {
      updates.clientId = opt.input.clientId;
    }
    if (opt.input.hourlyRate !== undefined) {
      updates.hourlyRate = opt.input.hourlyRate;
    }
    if (opt.input.archived !== undefined) {
      updates.archived = opt.input.archived;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, opt.input.id));
    }
    const [result] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, opt.input.id));
    return result;
  });

export const projectDelete = os
  .input(projectDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();
    await db.delete(projects).where(eq(projects.id, opt.input.id));
    return { success: true };
  });
