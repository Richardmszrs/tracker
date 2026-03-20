import { os } from "@orpc/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/main/db/client";
import { tags } from "@/main/db/schema";

const tagCreateSchema = z.object({
  name: z.string().min(1),
});

const tagDeleteSchema = z.object({
  id: z.string().min(1),
});

export const tagCreate = os
  .input(tagCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    await db.insert(tags).values({ id, name: opt.input.name }).returning();
    return { id, name: opt.input.name };
  });

export const tagList = os.handler(() => {
  const db = getDb();
  return db.select().from(tags).all();
});

export const tagDelete = os
  .input(tagDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();
    await db.delete(tags).where(eq(tags.id, opt.input.id));
    return { success: true };
  });
