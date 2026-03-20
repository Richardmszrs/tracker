import { os } from "@orpc/server";
import { z } from "zod";
import { timerStateMachine } from "@/main/timer";

const timerStartSchema = z.object({
  description: z.string().min(1),
  projectId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

const timerStopSchema = z.object({});

export const timerStart = os
  .input(timerStartSchema)
  .handler(async (opt) => {
    const entryId = timerStateMachine.start(
      opt.input.description,
      opt.input.projectId ?? null,
      opt.input.tagIds ?? []
    );
    return { entryId, state: timerStateMachine.getState() };
  });

export const timerStop = os.handler(() => {
  const result = timerStateMachine.stop();
  return { result, state: timerStateMachine.getState() };
});

export const timerGetState = os.handler(() => {
  return timerStateMachine.getState();
});
