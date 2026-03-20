"use client";

import { useState, useEffect } from "react";
import { PlayIcon, SquareIcon } from "lucide-react";
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
  useTimerState,
  useTimerStart,
  useTimerStop,
  useProjects,
} from "@/lib/queries";

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

  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [elapsed, setElapsed] = useState("00:00:00");

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
      projectId: projectId || null,
    });
    setDescription("");
    setProjectId("");
    setOpen(false);
  };

  const handleStop = () => {
    stopMutation.mutate();
  };

  const isRunning = state?.running ?? false;

  return (
    <div className="flex items-center gap-3">
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
          <PopoverContent className="w-72" align="end">
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
                    <SelectItem value="">No project</SelectItem>
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
