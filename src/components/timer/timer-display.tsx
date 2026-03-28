"use client";

import { useState, useEffect } from "react";
import { PlayIcon, SquareIcon, LinkIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  useTimerState,
  useTimerStart,
  useTimerStop,
  useProjects,
  useTasks,
} from "@/lib/queries";
import { TagMultiSelect } from "@/components/entries/tag-multi-select";

function formatElapsed(startAt: number | null): string {
  if (!startAt) return "00:00:00";
  const elapsed = Date.now() - startAt;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);
  return [hours, minutes, seconds]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export function TimerDisplay() {
  const { data: state } = useTimerState();
  const startMutation = useTimerStart();
  const stopMutation = useTimerStop();
  const { data: projects = [] } = useProjects();
  const { data: allTasks = [] } = useTasks();
  const [taskSearch, setTaskSearch] = useState("");
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);

  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("__none__");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");

  const selectedProject = projects.find((p) => p.id === projectId);
  const selectedTask = allTasks.find((t) => t.id === taskId);

  // Filter tasks by search
  const filteredTasks = taskSearch
    ? allTasks.filter((t) =>
        t.title.toLowerCase().includes(taskSearch.toLowerCase())
      )
    : allTasks.slice(0, 10);

  useEffect(() => {
    if (state?.running && state?.startAt) {
      setElapsed(formatElapsed(state.startAt));
      const interval = setInterval(() => {
        setElapsed(formatElapsed(state.startAt!));
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setElapsed("00:00:00");
    }
  }, [state?.running, state?.startAt]);

  const handleStart = async () => {
    if (!description.trim()) return;
    await startMutation.mutateAsync({
      description: description.trim(),
      projectId: projectId === "__none__" ? null : projectId,
      tagIds,
      taskId: taskId,
    });
    setDescription("");
    setProjectId("__none__");
    setTagIds([]);
    setTaskId(null);
    setOpen(false);
  };

  const handleStop = () => {
    stopMutation.mutate();
  };

  const isRunning = state?.running ?? false;

  return (
    <div className="flex items-center gap-3">
      {selectedProject && (
        <span
          className="size-2.5 rounded-full shrink-0"
          style={{ backgroundColor: selectedProject.color }}
        />
      )}
      <span className="font-mono text-sm tabular-nums">{elapsed}</span>
      {isRunning ? (
        <Button
          size="icon-sm"
          variant="destructive"
          onClick={handleStop}
          disabled={stopMutation.isPending}
        >
          <SquareIcon className="size-3" />
        </Button>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button size="icon-sm" variant="default">
              <PlayIcon className="size-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timer-description">Description</Label>
                <Input
                  id="timer-description"
                  placeholder="What are you working on?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleStart();
                  }}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="timer-project">Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="timer-project">
                    <SelectValue placeholder="No project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1">
                  <LinkIcon className="size-3" />
                  Link to task
                </Label>
                <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs h-7 w-full font-normal"
                    >
                      {selectedTask ? (
                        <span className="truncate">{selectedTask.title}</span>
                      ) : (
                        <span className="text-muted-foreground">No task linked</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search tasks..."
                        value={taskSearch}
                        onValueChange={setTaskSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No tasks found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setTaskId(null);
                              setTaskSearch("");
                              setTaskPopoverOpen(false);
                            }}
                            className="text-xs"
                          >
                            No task linked
                          </CommandItem>
                          {filteredTasks.map((task) => (
                            <CommandItem
                              key={task.id}
                              value={task.id}
                              onSelect={() => {
                                setTaskId(task.id);
                                setTaskSearch("");
                                setTaskPopoverOpen(false);
                              }}
                              className="text-xs"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="truncate">{task.title}</span>
                                {task.columnName && (
                                  <span className="text-[0.625rem] text-muted-foreground truncate">
                                    {task.columnName} {task.boardName && `• ${task.boardName}`}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tags</Label>
                <TagMultiSelect value={tagIds} onChange={setTagIds} />
              </div>
              <Button
                size="sm"
                onClick={handleStart}
                disabled={!description.trim() || startMutation.isPending}
              >
                Start
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
