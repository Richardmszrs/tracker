"use client";

import { PencilIcon, TrashIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEntries, useEntryDelete, useProjects, useTags } from "@/lib/queries";

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

interface EntryWithRelations {
  id: string;
  description: string;
  startAt: Date;
  endAt: Date | null;
  projectId: string | null;
  billable: boolean;
  tags?: { tagId: string }[];
}

interface TimeEntryRowProps {
  entry: EntryWithRelations;
  project?: {
    id: string;
    name: string;
    color: string;
  } | null;
  tagMap: Map<string, string>;
  onDelete: (id: string) => void;
}

function TimeEntryRow({ entry, project, tagMap, onDelete }: TimeEntryRowProps) {
  const entryTags = entry.tags?.map((t) => tagMap.get(t.tagId)).filter(Boolean) ?? [];

  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 group">
      <div
        className="size-2.5 rounded-full shrink-0"
        style={{ backgroundColor: project?.color ?? "#888" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate">{entry.description}</p>
        <p className="text-muted-foreground text-[0.625rem]">
          {formatTime(entry.startAt)}
          {entry.endAt ? ` – ${formatTime(entry.endAt)}` : " – running"}
          {entryTags.length > 0 && (
            <span className="ml-1.5">
              {entryTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[0.625rem] h-3.5 ml-0.5">
                  {tag}
                </Badge>
              ))}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {project && (
          <Badge variant="outline" className="text-[0.625rem] h-5">
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
  const { data: tags = [] } = useTags();
  const deleteMutation = useEntryDelete();

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

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
        <TimeEntryRow
          key={entry.id}
          entry={entry as EntryWithRelations}
          project={entry.projectId ? projectMap.get(entry.projectId) ?? null : null}
          tagMap={tagMap}
          onDelete={(id) => deleteMutation.mutate({ id })}
        />
      ))}
    </div>
  );
}
