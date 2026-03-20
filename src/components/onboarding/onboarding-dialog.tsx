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
  const { data: projects = [] } = useProjects();
  const { data: settings } = useSettings();
  const updateSettings = useSettingsUpdate();
  const createProject = useProjectCreate();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  useEffect(() => {
    if (!settings?.onboardingComplete && projects.length === 0) {
      setOpen(true);
    }
  }, [settings?.onboardingComplete, projects.length]);

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome to Time Tracker</DialogTitle>
          <DialogDescription>
            Create your first project to start tracking time. You can add
            clients, tags, and more later.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
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
          <div className="flex flex-col gap-1.5">
            <Label>Color</Label>
            <div className="flex items-center gap-2">
              <ColorPicker value={color} onChange={setColor} />
              <span className="text-xs text-muted-foreground">{color}</span>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
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
