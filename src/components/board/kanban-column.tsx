"use client";

import { useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon, MoreVerticalIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { TaskCard } from "./task-card";
import { ColumnDialog } from "./column-dialog";
import { useColumnUpdate, useColumnDelete, useTaskCreate, useBoard } from "@/lib/queries";
import type { Column as ColumnType } from "./types";

interface KanbanColumnProps {
  column: ColumnType;
  boardId: string;
  projectColor: string;
  onTaskClick: (taskId: string) => void;
}

export function KanbanColumn({
  column,
  boardId,
  projectColor,
  onTaskClick,
}: KanbanColumnProps) {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [editingColumn, setEditingColumn] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { setNodeRef } = useDroppable({
    id: column.id,
    data: { type: "column" },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: "column" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const columnUpdateMutation = useColumnUpdate();
  const columnDeleteMutation = useColumnDelete();
  const taskCreateMutation = useTaskCreate();

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    await taskCreateMutation.mutateAsync({
      columnId: column.id,
      boardId,
      title: newTaskTitle.trim(),
    });

    setNewTaskTitle("");
    setIsAddingTask(false);
  };

  const handleUpdateColumn = async (name: string, color: string) => {
    await columnUpdateMutation.mutateAsync({
      id: column.id,
      name,
      color,
    });
    setEditingColumn(false);
  };

  const handleDeleteColumn = async () => {
    try {
      await columnDeleteMutation.mutateAsync({ id: column.id });
    } catch {
      // Error is shown if column has tasks
    }
    setDeleteConfirmOpen(false);
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg max-h-full ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <div
            className="size-2 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <span className="font-medium text-sm">{column.name}</span>
          <span className="text-muted-foreground text-xs">
            ({column.tasks.length})
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsAddingTask(true)}
          >
            <PlusIcon className="size-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <MoreVerticalIcon className="size-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingColumn(true)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteConfirmOpen(true)}
                className="text-destructive"
              >
                <Trash2Icon className="size-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tasks */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto px-2 pb-2 space-y-2"
      >
        <SortableContext
          items={column.tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectColor={projectColor}
              onClick={() => onTaskClick(task.id)}
            />
          ))}
        </SortableContext>

        {/* Add Task Input */}
        {isAddingTask && (
          <div className="p-2 border rounded-md bg-card">
            <Input
              placeholder="Task title..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddTask();
                if (e.key === "Escape") {
                  setIsAddingTask(false);
                  setNewTaskTitle("");
                }
              }}
              onBlur={() => {
                if (!newTaskTitle.trim()) {
                  setIsAddingTask(false);
                }
              }}
              autoFocus
            />
            <div className="flex items-center justify-end gap-1 mt-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTaskTitle("");
                }}
              >
                Cancel
              </Button>
              <Button size="xs" onClick={handleAddTask}>
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Task Button */}
      {!isAddingTask && (
        <Button
          variant="ghost"
          className="mx-2 mb-2 justify-start text-muted-foreground"
          onClick={() => setIsAddingTask(true)}
        >
          <PlusIcon className="size-3 mr-1" />
          Add task
        </Button>
      )}

      {/* Edit Column Dialog */}
      <ColumnDialog
        open={editingColumn}
        onOpenChange={setEditingColumn}
        onSubmit={handleUpdateColumn}
        initialName={column.name}
        initialColor={column.color}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <DeleteColumnConfirm
          columnName={column.name}
          taskCount={column.tasks.length}
          onConfirm={handleDeleteColumn}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
}

function DeleteColumnConfirm({
  columnName,
  taskCount,
  onConfirm,
  onCancel,
}: {
  columnName: string;
  taskCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background p-4 rounded-lg shadow-lg w-80">
        <h3 className="font-medium mb-2">Delete column?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          {taskCount > 0 ? (
            <>Cannot delete column "{columnName}" because it contains {taskCount} task(s). Move or delete the tasks first.</>
          ) : (
            <>Are you sure you want to delete "{columnName}"?</>
          )}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          {taskCount === 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onConfirm}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
