"use client";

import { useState } from "react";
import { PlusIcon, ArchiveIcon, EyeIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectFormSheet } from "@/components/projects/project-form-sheet";
import {
  useProjects,
  useProjectUpdate,
  useProjectDelete,
  useClients,
} from "@/lib/queries";

function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const updateMutation = useProjectUpdate();
  const deleteMutation = useProjectDelete();

  const [showArchived, setShowArchived] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<{
    id: string;
    name: string;
    color: string;
    clientId: string | null;
    hourlyRate: number | null;
    archived: boolean;
  } | null>(null);

  const clientMap = new Map(clients.map((c) => [c.id, c.name]));

  const visibleProjects = showArchived
    ? projects
    : projects.filter((p) => !p.archived);

  const handleArchive = async (project: (typeof projects)[0]) => {
    await updateMutation.mutateAsync({
      id: project.id,
      archived: !project.archived,
    });
  };

  const openEdit = (project: (typeof projects)[0]) => {
    setEditingProject(project);
    setSheetOpen(true);
  };

  const openCreate = () => {
    setEditingProject(null);
    setSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditingProject(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Projects</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              size="sm"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <label htmlFor="show-archived" className="text-xs text-muted-foreground">
              Show archived
            </label>
          </div>
          <Button size="sm" onClick={openCreate}>
            <PlusIcon className="size-3" />
            New project
          </Button>
        </div>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs">
          No projects yet. Create one to get started!
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProjects.map((project) => (
              <TableRow
                key={project.id}
                className="cursor-pointer"
                onClick={() => openEdit(project)}
              >
                <TableCell>
                  <span
                    className="size-3 rounded-full block"
                    style={{ backgroundColor: project.color }}
                  />
                </TableCell>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {project.clientId
                    ? clientMap.get(project.clientId) ?? "—"
                    : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {project.hourlyRate != null
                    ? `$${project.hourlyRate.toFixed(2)}`
                    : "—"}
                </TableCell>
                <TableCell>
                  {project.archived ? (
                    <Badge variant="outline" className="text-[0.625rem]">
                      <ArchiveIcon className="size-2 mr-1" />
                      Archived
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[0.625rem]">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchive(project);
                    }}
                    title={project.archived ? "Unarchive" : "Archive"}
                  >
                    {project.archived ? (
                      <EyeIcon className="size-3" />
                    ) : (
                      <ArchiveIcon className="size-3" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ProjectFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetClose}
        project={editingProject}
      />
    </div>
  );
}

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});
