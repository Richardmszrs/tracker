import { os } from "@orpc/server";
import { z } from "zod";
import { syncEngine } from "@/main/supabase/sync";

const syncFrequencySchema = z.object({
  frequency: z.enum(["1", "5", "15", "manual"]),
});

export const syncGetStatus = os.handler(() => {
  return syncEngine.getStatus();
});

export const syncTrigger = os.handler(async () => {
  // Fire and forget - returns immediately
  syncEngine.sync().catch((err) =>
    console.error("Manual sync failed:", err)
  );
  return { triggered: true };
});

export const syncUpdateFrequency = os
  .input(syncFrequencySchema)
  .handler((opt) => {
    const frequencyMs: Record<string, number> = {
      "1": 1 * 60 * 1000,
      "5": 5 * 60 * 1000,
      "15": 15 * 60 * 1000,
      manual: 0,
    };

    const ms = frequencyMs[opt.input.frequency];
    syncEngine.setSyncFrequency(ms);

    return { success: true, frequency: opt.input.frequency };
  });

export const syncUpdateOnFocus = os
  .input(z.object({ enabled: z.boolean() }))
  .handler((opt) => {
    syncEngine.setSyncOnFocus(opt.input.enabled);
    return { success: true };
  });

export const syncGetSettings = os.handler(() => {
  return {
    frequency: syncEngine.getSyncFrequency(),
    syncOnFocus: syncEngine.getSyncOnFocus(),
  };
});
