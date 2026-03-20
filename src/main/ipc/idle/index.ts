import { os } from "@orpc/server";
import { z } from "zod";
import { timerStateMachine } from "@/main/timer";
import { settingsStore } from "@/main/settings";
import { getDb } from "@/main/db/client";
import { eq } from "drizzle-orm";
import { timeEntries } from "@/main/db/schema";

const idleNotificationSchema = z.object({
  idleStartTime: z.number(),
});

export const idleDiscardTime = os
  .input(idleNotificationSchema)
  .handler(async (opt) => {
    // Trim the current entry's endAt back to when idle started
    const state = timerStateMachine.getState();
    if (!state.running || !state.entryId) return { success: false };

    const idleStartTime = new Date(opt.input.idleStartTime);
    const db = getDb();
    await db
      .update(timeEntries)
      .set({ endAt: idleStartTime })
      .where(eq(timeEntries.id, state.entryId));

    return { success: true };
  });
