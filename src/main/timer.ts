import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { entryTags, timeEntries } from "./db/schema";

export interface TimerState {
  running: boolean;
  startAt: number | null;
  entryId: string | null;
  description: string;
  projectId: string | null;
  tagIds: string[];
}

interface PersistedTimerState {
  description: string;
  projectId: string | null;
}

const defaultState: TimerState = {
  running: false,
  startAt: null,
  entryId: null,
  description: "",
  projectId: null,
  tagIds: [],
};

class TimerStateMachine {
  private state: TimerState;

  constructor() {
    this.state = this.loadState();
    // If timer was running on previous launch, it should be stopped
    // since the app was closed. Recover the entry but don't auto-resume.
    if (this.state.running && this.state.entryId) {
      this.state.running = false;
      this.state.startAt = null;
      // Keep entryId, description, projectId for reference
    }
  }

  private getStateFilePath(): string {
    return path.join(app.getPath("userData"), "timer-state.json");
  }

  private loadState(): TimerState {
    try {
      const filePath = this.getStateFilePath();
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(
          fs.readFileSync(filePath, "utf-8")
        ) as PersistedTimerState;
        return {
          ...defaultState,
          description: data.description ?? "",
          projectId: data.projectId ?? null,
        };
      }
    } catch {
      // ignore
    }
    return { ...defaultState };
  }

  private persistState(): void {
    try {
      const filePath = this.getStateFilePath();
      const toSave: PersistedTimerState = {
        description: this.state.description,
        projectId: this.state.projectId,
      };
      fs.writeFileSync(filePath, JSON.stringify(toSave));
    } catch {
      // ignore
    }
  }

  start(description: string, projectId: string | null, tagIds: string[] = []): string {
    if (this.state.running) {
      throw new Error("Timer is already running");
    }

    const db = getDb();
    const id = crypto.randomUUID();
    const startAt = new Date();

    db.insert(timeEntries)
      .values({
        id,
        description,
        startAt,
        endAt: null,
        projectId: projectId ?? null,
        billable: true,
        createdAt: startAt,
      })
      .returning();

    if (tagIds.length > 0) {
      db.insert(entryTags).values(
        tagIds.map((tagId) => ({ entryId: id, tagId }))
      );
    }

    this.state = {
      running: true,
      startAt: startAt.getTime(),
      entryId: id,
      description,
      projectId,
      tagIds,
    };
    this.persistState();
    return id;
  }

  stop(): { entryId: string; duration: number } | null {
    if (!this.state.running || !this.state.entryId || !this.state.startAt) {
      return null;
    }

    const db = getDb();
    const endAt = new Date();

    db.update(timeEntries)
      .set({ endAt })
      .where(eq(timeEntries.id, this.state.entryId));

    const duration = endAt.getTime() - this.state.startAt;
    const entryId = this.state.entryId;

    this.state = {
      running: false,
      startAt: null,
      entryId: null,
      description: this.state.description,
      projectId: this.state.projectId,
      tagIds: [],
    };
    this.persistState();

    return { entryId, duration };
  }

  getState(): TimerState {
    return { ...this.state };
  }
}

export const timerStateMachine = new TimerStateMachine();
