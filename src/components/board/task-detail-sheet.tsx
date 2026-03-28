"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, ClockIcon, PlayIcon, TrashIcon } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTask, useTaskUpdate, useTaskDelete, useTags, useTimerStart } from "@/lib/queries";
import type { Task } from "./types";

interface TaskDetailSheetProps {
  taskId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

const priorities = ["none", "low", "medium", "high", "urgent"] as const;

const priorityLabels: Record<(typeof priorities)[number], string> = {
  none: "None",
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityColors: Record<(typeof priorities)[number], string> = {
  none: "bg-gray-100 text-gray-700 border-gray-200",
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

interface LocalTaskState {
  title?: string;
  description?: string | null;
  priority?: "none" | "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  estimatedMinutes?: number | null;
  assignee?: string | null;
}

export function TaskDetailSheet({
  taskId,
  projectId,
  open,
  onOpenChange,
  onUpdate,
}: TaskDetailSheetProps) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: tags = [] } = useTags();

  const updateMutation = useTaskUpdate();
  const deleteMutation = useTaskDelete();
  const timerStartMutation = useTimerStart();

  const [localTask, setLocalTask] = useState<LocalTaskState>({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (task) {
      setLocalTask({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
        estimatedMinutes: task.estimatedMinutes ?? undefined,
        assignee: task.assignee ?? undefined,
      });
      setSelectedTagIds(task.tags?.map((t) => t.id) ?? []);
    }
  }, [task]);

  const handleSave = async () => {
    if (!taskId || !task) return;

    await updateMutation.mutateAsync({
      id: taskId,
      title: localTask.title,
      description: localTask.description,
      priority: localTask.priority,
      dueDate: localTask.dueDate ? localTask.dueDate.getTime() : null,
      estimatedMinutes: localTask.estimatedMinutes,
      assignee: localTask.assignee,
      tagIds: selectedTagIds,
    });
    onUpdate();
  };

  const handleDelete = async () => {
    if (!taskId) return;
    await deleteMutation.mutateAsync({ id: taskId });
    onOpenChange(false);
    onUpdate();
  };

  const handleStartTimer = async () => {
    if (!task || !localTask.title) return;
    await timerStartMutation.mutateAsync({
      description: localTask.title,
      projectId,
      taskId: task.id,
    });
  };

  const handleEstimateChange = (value: string) => {
    // Parse "2h 30m" format
    const hours = value.match(/(\d+)h/)?.[1] ?? "0";
    const minutes = value.match(/(\d+)m/)?.[1] ?? "0";
    const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
    setLocalTask((prev) => ({
      ...prev,
      estimatedMinutes: totalMinutes || undefined,
    }));
  };

  const formatEstimate = (minutes?: number | null) => {
    if (!minutes) return "";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`.trim();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="sr-only">Task Details</SheetTitle>
        </SheetHeader>

        {isLoading || !task ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Title */}
            <div>
              <Input
                value={localTask.title ?? ""}
                onChange={(e) =>
                  setLocalTask((prev) => ({ ...prev, title: e.target.value }))
                }
                onBlur={handleSave}
                className="text-lg font-semibold border-0 p-0 h-auto focus:ring-0"
                placeholder="Task title"
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Priority</span>
              <div className="flex gap-2">
                {priorities.map((p) => (
                  <Button
                    key={p}
                    variant={localTask.priority === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setLocalTask((prev) => ({ ...prev, priority: p }));
                      updateMutation.mutateAsync({
                        id: task.id,
                        priority: p,
                      });
                      onUpdate();
                    }}
                    className={`${
                      localTask.priority === p ? priorityColors[p] : ""
                    }`}
                  >
                    {priorityLabels[p]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Due Date</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 size-4" />
                    {localTask.dueDate
                      ? format(localTask.dueDate, "PPP")
                      : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localTask.dueDate}
                    onSelect={(date) => {
                      setLocalTask((prev) => ({ ...prev, dueDate: date }));
                      updateMutation.mutateAsync({
                        id: task.id,
                        dueDate: date?.getTime(),
                      });
                      onUpdate();
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Estimate */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">
                Estimated Time
              </span>
              <Input
                value={formatEstimate(localTask.estimatedMinutes)}
                onChange={(e) => handleEstimateChange(e.target.value)}
                onBlur={handleSave}
                placeholder="e.g. 2h 30m"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Description</span>
              <Textarea
                value={localTask.description ?? ""}
                onChange={(e) =>
                  setLocalTask((prev) => ({
                    ...prev,
                    description: e.target.value || null,
                  }))
                }
                onBlur={handleSave}
                placeholder="Add a description..."
                className="min-h-[100px]"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Tags</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant={selectedTagIds.includes(tag.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      toggleTag(tag.id);
                      updateMutation.mutateAsync({
                        id: task.id,
                        tagIds: selectedTagIds.includes(tag.id)
                          ? selectedTagIds.filter((id) => id !== tag.id)
                          : [...selectedTagIds, tag.id],
                      });
                      onUpdate();
                    }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Time Tracked */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Time Tracked
                </span>
                <Button size="sm" onClick={handleStartTimer}>
                  <PlayIcon className="size-3 mr-1" />
                  Start timer
                </Button>
              </div>

              {task.trackedMinutes !== undefined && task.trackedMinutes > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <ClockIcon className="size-4 text-muted-foreground" />
                  <span>
                    {Math.floor(task.trackedMinutes / 60)}h{" "}
                    {task.trackedMinutes % 60}m
                  </span>
                </div>
              )}

              {task.timeEntries && task.timeEntries.length > 0 && (
                <div className="space-y-1 mt-2">
                  {task.timeEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between text-xs p-2 border rounded"
                    >
                      <span>{entry.description}</span>
                      <span className="text-muted-foreground">
                        {entry.startAt && entry.endAt
                          ? `${format(
                              new Date(entry.startAt),
                              "MMM d"
                            )} - ${Math.round(
                              (new Date(entry.endAt).getTime() -
                                new Date(entry.startAt).getTime()) /
                                60000
                            )}m`
                          : "Running"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <TrashIcon className="size-3 mr-1" />
                Delete
              </Button>
              <span className="text-xs text-muted-foreground">
                Created {task.createdAt && format(new Date(task.createdAt), "PPP")}
              </span>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
