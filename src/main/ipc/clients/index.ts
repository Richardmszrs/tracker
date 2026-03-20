import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/main/db/client";
import { clients } from "@/main/db/schema";

const clientCreateSchema = z.object({
  name: z.string().min(1),
});

const clientUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
});

const clientDeleteSchema = z.object({
  id: z.string().min(1),
});

export const clientCreate = os
  .input(clientCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();
    await db
      .insert(clients)
      .values({ id, name: opt.input.name, createdAt })
      .returning();
    return { id, name: opt.input.name, createdAt };
  });

export const clientList = os.handler(() => {
  const db = getDb();
  return db.select().from(clients).all();
});

export const clientUpdate = os
  .input(clientUpdateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const updates: Record<string, unknown> = {};
    if (opt.input.name !== undefined) updates.name = opt.input.name;
    if (Object.keys(updates).length > 0) {
      await db
        .update(clients)
        .set(updates)
        .where(eq(clients.id, opt.input.id));
    }
    const [result] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, opt.input.id));
    return result;
  });

export const clientDelete = os
  .input(clientDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();
    await db.delete(clients).where(eq(clients.id, opt.input.id));
    return { success: true };
  });
