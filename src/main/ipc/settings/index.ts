import { os } from "@orpc/server";
import { z } from "zod";
import { settingsStore, type AppSettings } from "@/main/settings";

const settingsUpdateSchema = z.object({
  idleThresholdMinutes: z.number().min(0).max(120).optional(),
  defaultBillable: z.boolean().optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  currencySymbol: z.string().optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  onboardingComplete: z.boolean().optional(),
});

export const settingsGet = os.handler(() => {
  return settingsStore.store as AppSettings;
});

export const settingsUpdate = os
  .input(settingsUpdateSchema)
  .handler(async (opt) => {
    const updates = opt.input;
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        settingsStore.set(key as keyof AppSettings, value as AppSettings[keyof AppSettings]);
      }
    }
    return settingsStore.store as AppSettings;
  });
