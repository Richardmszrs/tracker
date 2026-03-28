"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/projects/color-picker";
import {
  useProjects,
  useProjectCreate,
  useSettings,
  useSettingsUpdate,
} from "@/lib/queries";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
];

interface OnboardingDialogProps {
  onComplete?: () => void;
}

export function OnboardingDialog({ onComplete }: OnboardingDialogProps) {
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateSettings = useSettingsUpdate();
  const createProject = useProjectCreate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (settingsLoading || projectsLoading || !settings) {
      return;
    }

    if (projects.length > 0) {
      setOpen(false);
      if (!settings.onboardingComplete) {
        updateSettings.mutate({ onboardingComplete: true });
      }
      return;
    }

    setOpen(!settings.onboardingComplete);
  }, [
    projects.length,
    projectsLoading,
    settings,
    settingsLoading,
    updateSettings,
  ]);

  const handleSkip = async () => {
    await updateSettings.mutateAsync({ onboardingComplete: true });
    setOpen(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createProject.mutateAsync({ name: name.trim(), color });
    await updateSettings.mutateAsync({ onboardingComplete: true });
    setOpen(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
        <div className="relative border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))] px-6 pb-6 pt-8 sm:px-8">
          <div className="mb-4 inline-flex rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[0.625rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            First Start
          </div>
          <DialogHeader className="gap-2">
            <DialogTitle className="text-lg">Welcome to Time Tracker</DialogTitle>
            <DialogDescription className="max-w-md">
              Create your first project to start tracking time. You can add
              clients, tags, and more later.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Client Work"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <div className="flex flex-col gap-1.5">
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <ColorPicker value={color} onChange={setColor} />
                <span className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 font-mono text-[0.625rem] text-muted-foreground">
                  {color}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="border-t border-border/60 bg-muted/20 px-6 py-5 sm:px-8">
          <Button variant="ghost" onClick={handleSkip}>
            Skip for now
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || createProject.isPending}>
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
