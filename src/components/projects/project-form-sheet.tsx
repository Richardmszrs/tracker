"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ColorPicker } from "./color-picker";
import { useClients, useProjectCreate, useProjectUpdate } from "@/lib/queries";

interface Project {
  id: string;
  name: string;
  color: string;
  clientId: string | null;
  hourlyRate: number | null;
  archived: boolean;
}

interface ProjectFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
}

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6",
  "#06B6D4", "#0EA5E9", "#3B82F6", "#6366F1",
];

export function ProjectFormSheet({
  open,
  onOpenChange,
  project,
}: ProjectFormSheetProps) {
  const { data: clients = [] } = useClients();
  const createMutation = useProjectCreate();
  const updateMutation = useProjectUpdate();

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [clientId, setClientId] = useState<string>("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [billable, setBillable] = useState(true);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setColor(project.color);
      setClientId(project.clientId ?? "");
      setHourlyRate(project.hourlyRate?.toString() ?? "");
      setBillable(!project.archived);
    } else {
      setName("");
      setColor(PRESET_COLORS[0]);
      setClientId("");
      setHourlyRate("");
      setBillable(true);
    }
  }, [project, open]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const rate = hourlyRate ? parseFloat(hourlyRate) : undefined;

    if (project) {
      await updateMutation.mutateAsync({
        id: project.id,
        name: name.trim(),
        color,
        clientId: clientId || null,
        hourlyRate: rate ?? null,
        archived: !billable,
      });
    } else {
      await createMutation.mutateAsync({
        name: name.trim(),
        color,
        clientId: clientId || undefined,
        hourlyRate: rate,
      });
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>{project ? "Edit Project" : "New Project"}</SheetTitle>
          <SheetDescription>
            {project
              ? "Update the project details."
              : "Create a new project to track time against."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              placeholder="Project name"
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="project-client">
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-rate">Hourly Rate</Label>
            <Input
              id="project-rate"
              type="number"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>
          {project && (
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="project-billable">Billable</Label>
                <span className="text-[0.625rem] text-muted-foreground">
                  Active projects are billable
                </span>
              </div>
              <Switch
                id="project-billable"
                checked={billable}
                onCheckedChange={setBillable}
              />
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isPending}
          >
            {project ? "Save Changes" : "Create Project"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
