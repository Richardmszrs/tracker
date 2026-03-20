"use client";

import { useState, useRef, useEffect } from "react";
import { XIcon, CheckIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTags, useTagCreate, useTagDelete } from "@/lib/queries";

function TagsPage() {
  const { data: tags = [], isLoading } = useTags();
  const createMutation = useTagCreate();
  const deleteMutation = useTagDelete();

  const [newTagName, setNewTagName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    await createMutation.mutateAsync({ name: newTagName.trim() });
    setNewTagName("");
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleEntryKeyDown = async (e: React.KeyboardEvent, tagId: string) => {
    if (e.key === "Enter") {
      // Save would need a tag update mutation - for now just cancel
      cancelEdit();
    } else if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync({ id });
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
        <h3 className="text-sm font-medium">Tags</h3>
      </div>

      {/* Add tag input */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Add a new tag..."
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddTag();
          }}
          className="h-8"
        />
        <Button
          size="sm"
          onClick={handleAddTag}
          disabled={!newTagName.trim() || createMutation.isPending}
        >
          Add
        </Button>
      </div>

      {tags.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs">
          No tags yet. Add one above to organize your entries!
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="h-7 gap-1 pl-3 pr-1 group/tag"
            >
              {editingId === tag.id ? (
                <Input
                  ref={editInputRef}
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => handleEntryKeyDown(e, tag.id)}
                  onBlur={cancelEdit}
                  className="h-4 w-24 py-0 px-1"
                />
              ) : (
                <button
                  className="hover:text-foreground/80"
                  onClick={() => startEdit(tag.id, tag.name)}
                >
                  {tag.name}
                </button>
              )}
              <Button
                size="icon-xs"
                variant="ghost"
                className="opacity-0 group-hover/tag:opacity-100"
                onClick={() => handleDelete(tag.id)}
              >
                <XIcon className="size-2.5" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/tags")({
  component: TagsPage,
});
