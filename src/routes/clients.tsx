"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon, AlertTriangleIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  useClients,
  useClientCreate,
  useClientDelete,
  useProjects,
} from "@/lib/queries";

function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const { data: projects = [] } = useProjects();
  const createMutation = useClientCreate();
  const deleteMutation = useClientDelete();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState("");

  const projectsByClient = new Map<string, number>();
  for (const p of projects) {
    if (p.clientId) {
      projectsByClient.set(p.clientId, (projectsByClient.get(p.clientId) ?? 0) + 1);
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createMutation.mutateAsync({ name: name.trim() });
    setName("");
    setDialogOpen(false);
  };

  const handleDeleteClick = (client: { id: string; name: string }) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!clientToDelete) return;
    await deleteMutation.mutateAsync({ id: clientToDelete.id });
    setDeleteDialogOpen(false);
    setClientToDelete(null);
  };

  const clientToDeleteProjects = clientToDelete
    ? projectsByClient.get(clientToDelete.id) ?? 0
    : 0;

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
        <h3 className="text-sm font-medium">Clients</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <PlusIcon className="size-3" />
          New client
        </Button>
      </div>

      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs">
          No clients yet. Create one to organize your projects!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <div
              key={client.id}
              className="flex flex-col gap-2 rounded-lg border p-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{client.name}</span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  onClick={() => handleDeleteClick(client)}
                >
                  <TrashIcon className="size-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[0.625rem] h-5">
                  {projectsByClient.get(client.id) ?? 0} projects
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create client dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Client</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client-name">Name</Label>
              <Input
                id="client-name"
                placeholder="Client name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createMutation.isPending}
            >
              Create Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Client</DialogTitle>
            <DialogDescription>
              {clientToDeleteProjects > 0 ? (
                <span className="flex items-center gap-2 text-destructive">
                  <AlertTriangleIcon className="size-4" />
                  Cannot delete — {clientToDeleteProjects} project
                  {clientToDeleteProjects !== 1 ? "s" : ""} linked to this client.
                  Delete or reassign the projects first.
                </span>
              ) : (
                `Are you sure you want to delete "${clientToDelete?.name}"?`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={clientToDeleteProjects > 0 || deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});
