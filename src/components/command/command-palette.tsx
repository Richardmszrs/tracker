"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PlayIcon, SquareIcon, FolderIcon, UsersIcon, BarChart3Icon } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useTimerState, useTimerStart, useTimerStop, useProjects } from "@/lib/queries";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: state } = useTimerState();
  const { data: projects = [] } = useProjects();
  const startMutation = useTimerStart();
  const stopMutation = useTimerStop();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isRunning = state?.running ?? false;
  const recentProjects = projects.slice(0, 5);

  const handleStartTimer = async () => {
    if (!isRunning) {
      await startMutation.mutateAsync({
        description: "Quick timer",
        projectId: null,
      });
    }
    setOpen(false);
  };

  const handleStopTimer = () => {
    stopMutation.mutate();
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Timer">
          <CommandItem onSelect={isRunning ? handleStopTimer : handleStartTimer}>
            {isRunning ? (
              <>
                <SquareIcon className="size-4 mr-2" />
                Stop Timer
              </>
            ) : (
              <>
                <PlayIcon className="size-4 mr-2" />
                Start Timer
              </>
            )}
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => { navigate({ to: "/projects" }); setOpen(false); }}>
            <FolderIcon className="size-4 mr-2" />
            Go to Projects
          </CommandItem>
          <CommandItem onSelect={() => { navigate({ to: "/clients" }); setOpen(false); }}>
            <UsersIcon className="size-4 mr-2" />
            Go to Clients
          </CommandItem>
          <CommandItem onSelect={() => { navigate({ to: "/tags" }); setOpen(false); }}>
            <span className="size-4 mr-2 inline-block" />
            Go to Tags
          </CommandItem>
          <CommandItem onSelect={() => { navigate({ to: "/reports" }); setOpen(false); }}>
            <BarChart3Icon className="size-4 mr-2" />
            Go to Reports
          </CommandItem>
          <CommandItem onSelect={() => { navigate({ to: "/" }); setOpen(false); }}>
            <span className="size-4 mr-2 inline-block" />
            Go to Dashboard
          </CommandItem>
        </CommandGroup>

        {recentProjects.length > 0 && (
          <CommandGroup heading="Recent Projects">
            {recentProjects.map((project) => (
              <CommandItem
                key={project.id}
                onSelect={() => {
                  navigate({ to: "/projects" });
                  setOpen(false);
                }}
              >
                <span
                  className="size-3 rounded-full mr-2"
                  style={{ backgroundColor: project.color }}
                />
                {project.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
