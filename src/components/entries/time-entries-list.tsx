"use client";

import { PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEntries, useEntryDelete, useProjects } from "@/lib/queries";

function formatDuration(startAt: Date, endAt: Date | null): string {
  if (!endAt) return "—";
  const ms = endAt.getTime() - startAt.getTime();
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface TimeEntryRowProps {
  entry: {
    id: string;
    description: string;
    startAt: Date;
    endAt: Date | null;
    projectId: string | null;
    billable: boolean;
  };
  project?: {
    id: string;
    name: string;
    color: string;
  } | null;
  onDelete: (id: string) => void;
}

function TimeEntryRow({ entry, project, onDelete }: TimeEntryRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50">
      <div
        className="size-2 rounded-full shrink-0"
        style={{ backgroundColor: project?.color ?? "#888" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{entry.description}</p>
        <p className="text-muted-foreground text-[0.625rem]">
          {formatTime(entry.startAt)}
          {entry.endAt ? ` – ${formatTime(entry.endAt)}` : " – running"}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {project && (
          <Badge variant="outline" className="text-[0.625rem]">
            {project.name}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDuration(entry.startAt, entry.endAt)}
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          className="opacity-0 group-hover:opacity-100"
          onClick={() => onDelete(entry.id)}
        >
          <TrashIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}

export function TimeEntriesList() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: entries = [] } = useEntries({
    startDate: today.getTime(),
    endDate: tomorrow.getTime(),
  });
  const { data: projects = [] } = useProjects();
  const deleteMutation = useEntryDelete();

  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // Sort entries by startAt descending
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(b.startAt).getTime() - new Date(a.startAt).getTime()
  );

  if (sortedEntries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs">
        No entries today. Start the timer to track time!
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {sortedEntries.map((entry) => (
        <div key={entry.id} className="group">
          <TimeEntryRow
            entry={entry as (typeof entry) & { id: string }}
            project={entry.projectId ? projectMap.get(entry.projectId) ?? null : null}
            onDelete={(id) => deleteMutation.mutate({ id })}
          />
        </div>
      ))}
    </div>
  );
}
