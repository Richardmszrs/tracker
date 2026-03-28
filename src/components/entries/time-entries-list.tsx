"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PlayIcon, SquareIcon, TrashIcon, CheckIcon, XIcon, DollarSignIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useEntries, useEntryDelete, useEntryUpdate, useProjects, useTags, useTimerState, useTimerStart, useTimerStop } from "@/lib/queries";
import { TagMultiSelect } from "@/components/entries/tag-multi-select";

// ============= Types =============

interface TimeEntry {
  id: string;
  description: string;
  startAt: Date;
  endAt: Date | null;
  projectId: string | null;
  billable: boolean;
}

interface Project {
  id: string;
  name: string;
  color: string;
  hourlyRate?: number | null;
}

// ============= Utility Functions =============

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatElapsedShort(startAt: number | null): string {
  if (!startAt) return "0m";
  const elapsed = Date.now() - startAt;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ============= Project Combobox =============

interface ProjectComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  projects: Project[];
  className?: string;
}

function ProjectCombobox({ value, onChange, projects, className }: ProjectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedProject = projects.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 w-full justify-start text-xs ${className || ""}`}
          onClick={() => setOpen(true)}
        >
          {selectedProject ? (
            <>
              <span
                className="size-2 rounded-full mr-1.5"
                style={{ backgroundColor: selectedProject.color }}
              />
              {selectedProject.name}
            </>
          ) : (
            <span className="text-muted-foreground">No project</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search projects..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__none__"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-xs"
              >
                No project
              </CommandItem>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id}
                  onSelect={() => {
                    onChange(project.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============= Inline Edit Form =============

interface InlineEditFormProps {
  entry: TimeEntry;
  project: Project | null;
  tagIds: string[];
  projects: Project[];
  allTags: Array<{ id: string; name: string }>;
  isRunning: boolean;
  onSave: (data: {
    description: string;
    projectId: string | null;
    tagIds: string[];
    startAt: number;
    endAt: number | null;
    billable: boolean;
  }) => void;
  onCancel: () => void;
  runningStartAt?: number | null;
}

function InlineEditForm({
  entry,
  project: _project,
  tagIds,
  projects,
  allTags,
  isRunning,
  onSave,
  onCancel,
  runningStartAt,
}: InlineEditFormProps) {
  const [description, setDescription] = useState(entry.description);
  const [projectId, setProjectId] = useState<string | null>(entry.projectId);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(tagIds);
  const [startDate, setStartDate] = useState(() => new Date(entry.startAt));
  const [startTime, setStartTime] = useState(() => formatTime(new Date(entry.startAt)));
  const [endTime, setEndTime] = useState(() => entry.endAt ? formatTime(new Date(entry.endAt)) : "");
  const [billable, setBillable] = useState(entry.billable);
  const [error, setError] = useState<string | null>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    descriptionRef.current?.focus();
  }, []);

  // Calculate live duration when editing times
  const calculateDuration = useCallback(() => {
    const start = new Date(`${startDate.toISOString().split("T")[0]}T${startTime}`);
    let end: Date | null = null;

    if (isRunning && runningStartAt) {
      end = new Date(runningStartAt);
    } else if (endTime) {
      end = new Date(`${startDate.toISOString().split("T")[0]}T${endTime}`);
    }

    if (end && start < end) {
      return end.getTime() - start.getTime();
    }
    return null;
  }, [startDate, startTime, endTime, isRunning, runningStartAt]);

  const handleSave = () => {
    const startAtDate = new Date(`${startDate.toISOString().split("T")[0]}T${startTime}`);
    const startAt = startAtDate.getTime();
    let endAt: number | null = null;

    if (isRunning && runningStartAt) {
      endAt = null;
    } else if (endTime) {
      const endAtDate = new Date(`${startDate.toISOString().split("T")[0]}T${endTime}`);
      endAt = endAtDate.getTime();
    }

    // Validate
    if (endAt !== null && startAt >= endAt) {
      setError("End time must be after start time");
      return;
    }

    setError(null);
    onSave({
      description,
      projectId,
      tagIds: selectedTagIds,
      startAt,
      endAt,
      billable,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const duration = calculateDuration();

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-input bg-background p-3 animate-in slide-in-from-top-2"
      onKeyDown={handleKeyDown}
    >
      {/* Description */}
      <div className="flex flex-col gap-1">
        <Input
          ref={descriptionRef}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What did you work on?"
          className="h-7 text-xs"
        />
      </div>

      {/* Project */}
      <div className="flex flex-col gap-1">
        <Label className="text-[0.625rem] text-muted-foreground">Project</Label>
        <ProjectCombobox
          value={projectId}
          onChange={setProjectId}
          projects={projects}
        />
      </div>

      {/* Times */}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 flex-1">
          <Label className="text-[0.625rem] text-muted-foreground">Start</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <Label className="text-[0.625rem] text-muted-foreground">
            End {isRunning && <span className="text-green-600">(running)</span>}
          </Label>
          <Input
            type="time"
            value={isRunning && runningStartAt ? formatTime(new Date(runningStartAt)) : endTime}
            onChange={(e) => setEndTime(e.target.value)}
            disabled={isRunning}
            className="h-7 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[0.625rem] text-muted-foreground">Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs w-auto">
                {startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Duration display */}
      {duration !== null && (
        <div className="text-[0.625rem] text-muted-foreground">
          Duration: {formatDuration(duration)}
        </div>
      )}

      {/* Error */}
      {error && <div className="text-[0.625rem] text-destructive">{error}</div>}

      {/* Tags */}
      <div className="flex flex-col gap-1">
        <Label className="text-[0.625rem] text-muted-foreground">Tags</Label>
        <TagMultiSelect value={selectedTagIds} onChange={setSelectedTagIds} />
      </div>

      {/* Billable */}
      <div className="flex items-center gap-2">
        <Button
          variant={billable ? "default" : "outline"}
          size="icon-xs"
          onClick={() => setBillable(!billable)}
          className="text-xs"
        >
          <DollarSignIcon className="size-2.5" />
        </Button>
        <span className="text-[0.625rem] text-muted-foreground">
          {billable ? "Billable" : "Non-billable"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="icon-xs" onClick={onCancel}>
          <XIcon className="size-3" />
        </Button>
        <Button variant="default" size="icon-xs" onClick={handleSave}>
          <CheckIcon className="size-3" />
        </Button>
      </div>
    </div>
  );
}

// ============= Time Entry Row =============

interface TimeEntryRowProps {
  entry: TimeEntry;
  project: Project | null;
  tagIds: string[];
  tagMap: Map<string, string>;
  projects: Project[];
  allTags: Array<{ id: string; name: string }>;
  isRunning: boolean;
  runningStartAt: number | null;
  onResume: () => void;
  onStop: () => void;
  onDelete: () => void;
  onUpdate: (data: {
    description: string;
    projectId: string | null;
    tagIds: string[];
    startAt: number;
    endAt: number | null;
    billable: boolean;
  }) => void;
  isEditing: boolean;
  onEditStart: () => void;
  onEditCancel: () => void;
  isDeleting: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

function TimeEntryRow({
  entry,
  project,
  tagIds: _tagIds,
  tagMap,
  projects,
  allTags,
  isRunning,
  runningStartAt,
  onResume,
  onStop,
  onDelete,
  onUpdate,
  isEditing,
  onEditStart,
  onEditCancel,
  isDeleting,
  onDeleteConfirm,
  onDeleteCancel,
  onKeyDown,
}: TimeEntryRowProps) {
  const [elapsed, setElapsed] = useState("0m");

  // Update elapsed time for running entries
  useEffect(() => {
    if (isRunning && runningStartAt) {
      setElapsed(formatElapsedShort(runningStartAt));
      const interval = setInterval(() => {
        setElapsed(formatElapsedShort(runningStartAt));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isRunning, runningStartAt]);

  // If editing, show inline edit form
  if (isEditing) {
    return (
      <div onKeyDown={onKeyDown}>
        <InlineEditForm
          entry={entry}
          project={project}
          tagIds={_tagIds}
          projects={projects}
          allTags={allTags}
          isRunning={isRunning}
          onSave={onUpdate}
          onCancel={onEditCancel}
          runningStartAt={runningStartAt}
        />
      </div>
    );
  }

  const duration = isRunning
    ? elapsed
    : entry.endAt
    ? formatDuration(new Date(entry.endAt).getTime() - new Date(entry.startAt).getTime())
    : "—";

  return (
    <div
      className={`flex items-center gap-3 rounded-md px-3 py-2 group transition-opacity ${isDeleting ? "opacity-50" : ""}`}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      {/* Running indicator */}
      {isRunning ? (
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
          <span className="relative inline-flex size-2.5 rounded-full bg-green-500" />
        </span>
      ) : (
        <div
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: project?.color ?? "#888" }}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0" onClick={onEditStart}>
        <p className="text-xs truncate cursor-pointer">{entry.description}</p>
        <p className="text-muted-foreground text-[0.625rem]">
          {isRunning ? (
            <span className="text-green-600">Running · {formatTime(new Date(runningStartAt!))}</span>
          ) : (
            <>
              {formatTime(new Date(entry.startAt))}
              {entry.endAt ? ` – ${formatTime(new Date(entry.endAt))}` : " – running"}
            </>
          )}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {project && (
          <Badge variant="outline" className="text-[0.625rem] h-5">
            {project.name}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground tabular-nums">
          {duration}
        </span>

        {/* Delete confirmation */}
        {isDeleting ? (
          <div className="flex items-center gap-1 text-[0.625rem]">
            <span className="text-muted-foreground">Delete?</span>
            <Button size="icon-xs" variant="ghost" onClick={onDeleteCancel}>
              <XIcon className="size-3" />
            </Button>
            <Button size="icon-xs" variant="destructive" onClick={onDeleteConfirm}>
              <CheckIcon className="size-3" />
            </Button>
          </div>
        ) : (
          <>
            {/* Billable indicator */}
            {entry.billable && (
              <DollarSignIcon className="size-3 text-muted-foreground" />
            )}

            {/* Resume/Stop button */}
            {isRunning ? (
              <Button
                size="icon-xs"
                variant="destructive"
                onClick={onStop}
                title="Stop timer"
              >
                <SquareIcon className="size-3" />
              </Button>
            ) : (
              <Button
                size="icon-xs"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100"
                onClick={onResume}
                title="Resume timer (R)"
              >
                <PlayIcon className="size-3" />
              </Button>
            )}

            {/* Delete button */}
            <Button
              size="icon-xs"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100"
              onClick={onDelete}
              title="Delete entry (Delete)"
            >
              <TrashIcon className="size-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ============= Total Time Summary Bar =============

interface TotalTimeSummaryProps {
  totalMs: number;
  billableMs: number;
  nonBillableMs: number;
  billableAmount: number;
  currency: string;
}

function TotalTimeSummary({ totalMs, billableMs, nonBillableMs, billableAmount, currency }: TotalTimeSummaryProps) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 sticky top-0 z-10">
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium">Total today: {formatDuration(totalMs)}</span>
        <span className="text-[0.625rem] text-muted-foreground">
          {formatDuration(billableMs)} billable · {formatDuration(nonBillableMs)} non-billable
        </span>
      </div>
      {billableAmount > 0 && (
        <span className="text-xs font-medium text-green-600">
          {currency} {billableAmount.toFixed(2)} billable
        </span>
      )}
    </div>
  );
}

// ============= Empty State =============

interface EmptyStateProps {
  onStartTimer: () => void;
}

function EmptyState({ onStartTimer }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <svg
        className="size-12 text-muted-foreground/50"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12,6 12,12 16,14" />
      </svg>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">No time tracked today</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Start the timer to begin tracking
        </p>
      </div>
      <Button onClick={onStartTimer} size="sm">
        <PlayIcon className="size-3 mr-1" />
        Start timer
      </Button>
    </div>
  );
}

// ============= Resume Confirmation Dialog =============

interface ResumeConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function ResumeConfirmDialog({ open, onOpenChange, onConfirm }: ResumeConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>A timer is already running</DialogTitle>
          <DialogDescription>
            Stop it and resume this entry instead?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Stop & Resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Main Time Entries List =============

interface TimeEntriesListProps {
  onStartTimer?: () => void;
}

export function TimeEntriesList({ onStartTimer }: TimeEntriesListProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data: entries = [], isPending } = useEntries({
    startDate: today.getTime(),
    endDate: tomorrow.getTime(),
  });
  const { data: projects = [] } = useProjects();
  const { data: tags = [] } = useTags();
  const { data: timerState } = useTimerState();
  const deleteMutation = useEntryDelete();
  const updateMutation = useEntryUpdate();
  const startMutation = useTimerStart();
  const stopMutation = useTimerStop();

  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const tagMap = new Map(tags.map((t) => [t.id, t.name]));

  // Local state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resumeConfirmEntry, setResumeConfirmEntry] = useState<TimeEntry | null>(null);

  // Sort entries: running first, then by startAt descending
  const sortedEntries = [...entries].sort((a, b) => {
    // Running entry first
    if (!a.endAt && b.endAt) return -1;
    if (a.endAt && !b.endAt) return 1;
    return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
  });

  // Calculate totals
  const calculateTotals = useCallback(() => {
    let totalMs = 0;
    let billableMs = 0;
    let nonBillableMs = 0;
    let billableAmount = 0;

    sortedEntries.forEach((entry) => {
      const startAtMs = new Date(entry.startAt).getTime();
      let endAtMs = entry.endAt ? new Date(entry.endAt).getTime() : null;

      // If this is the running entry, use current time as end
      if (!endAtMs && timerState?.running && timerState.entryId === entry.id && timerState.startAt) {
        endAtMs = Date.now();
      }

      if (endAtMs) {
        const duration = endAtMs - startAtMs;
        totalMs += duration;

        const project = entry.projectId ? projectMap.get(entry.projectId) : null;
        const hourlyRate = project?.hourlyRate ?? null;

        if (entry.billable) {
          billableMs += duration;
          if (hourlyRate) {
            billableAmount += (duration / 3600000) * hourlyRate;
          }
        } else {
          nonBillableMs += duration;
        }
      }
    });

    return { totalMs, billableMs, nonBillableMs, billableAmount };
  }, [sortedEntries, timerState, projectMap]);

  const totals = calculateTotals();

  // Handle resume
  const handleResume = async (entry: TimeEntry) => {
    if (timerState?.running) {
      setResumeConfirmEntry(entry);
      return;
    }

    await startMutation.mutateAsync({
      description: entry.description,
      projectId: entry.projectId ?? undefined,
    });
  };

  const handleResumeConfirm = async () => {
    if (!resumeConfirmEntry) return;

    await stopMutation.mutateAsync();
    await startMutation.mutateAsync({
      description: resumeConfirmEntry.description,
      projectId: resumeConfirmEntry.projectId ?? undefined,
    });
    setResumeConfirmEntry(null);
  };

  // Handle stop
  const handleStop = () => {
    stopMutation.mutate();
  };

  // Handle delete
  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
    setDeletingId(null);
  };

  // Handle update
  const handleUpdate = (id: string, data: {
    description: string;
    projectId: string | null;
    tagIds: string[];
    startAt: number;
    endAt: number | null;
    billable: boolean;
  }) => {
    updateMutation.mutate({
      id,
      description: data.description,
      projectId: data.projectId,
      tagIds: data.tagIds,
      startAt: data.startAt,
      endAt: data.endAt,
      billable: data.billable,
    });
    setEditingId(null);
  };

  // Handle keyboard shortcuts
  const handleRowKeyDown = (e: React.KeyboardEvent, entryId: string, isRunning: boolean) => {
    if (e.key === "e" || e.key === "E") {
      e.preventDefault();
      setEditingId(entryId);
    } else if ((e.key === "r" || e.key === "R") && !isRunning) {
      e.preventDefault();
      const entry = entries.find((en) => en.id === entryId);
      if (entry) handleResume(entry);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      setDeletingId(entryId);
    }
  };

  // Get empty tag IDs for an entry (API doesn't return tags with entries)
  const getEntryTagIds = (): string[] => {
    return [];
  };

  // Check if entry is the running one
  const isRunningEntry = (entry: TimeEntry): boolean => {
    return !entry.endAt && !!(timerState?.running) && timerState?.entryId === entry.id;
  };

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="size-2.5 rounded-full" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-20" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (sortedEntries.length === 0) {
    return <EmptyState onStartTimer={onStartTimer ?? (() => {})} />;
  }

  return (
    <>
      <div className="flex flex-col gap-1">
        {/* Total time summary */}
        <TotalTimeSummary
          totalMs={totals.totalMs}
          billableMs={totals.billableMs}
          nonBillableMs={totals.nonBillableMs}
          billableAmount={totals.billableAmount}
          currency="€"
        />

        {/* Entries */}
        {sortedEntries.map((entry) => {
          const entryProject = entry.projectId ? projectMap.get(entry.projectId) ?? null : null;
          const running = isRunningEntry(entry);

          return (
            <TimeEntryRow
              key={entry.id}
              entry={entry}
              project={entryProject}
              tagIds={getEntryTagIds()}
              tagMap={tagMap}
              projects={projects}
              allTags={tags}
              isRunning={running}
              runningStartAt={running ? timerState?.startAt ?? null : null}
              onResume={() => handleResume(entry)}
              onStop={handleStop}
              onDelete={() => setDeletingId(entry.id)}
              onUpdate={(data) => handleUpdate(entry.id, data)}
              isEditing={editingId === entry.id}
              onEditStart={() => setEditingId(entry.id)}
              onEditCancel={() => setEditingId(null)}
              isDeleting={deletingId === entry.id}
              onDeleteConfirm={() => handleDelete(entry.id)}
              onDeleteCancel={() => setDeletingId(null)}
              onKeyDown={(e) => handleRowKeyDown(e, entry.id, running)}
            />
          );
        })}
      </div>

      {/* Resume confirmation dialog */}
      <ResumeConfirmDialog
        open={!!resumeConfirmEntry}
        onOpenChange={(open) => !open && setResumeConfirmEntry(null)}
        onConfirm={handleResumeConfirm}
      />
    </>
  );
}
