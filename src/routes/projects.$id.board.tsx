"use client";

import { useState, useCallback } from "react";
import { createFileRoute, useParams } from "@tanstack/react-router";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon, LayoutGridIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "@/components/board/kanban-column";
import { TaskCardPreview } from "@/components/board/task-card";
import { TaskDetailSheet } from "@/components/board/task-detail-sheet";
import { ColumnDialog } from "@/components/board/column-dialog";
import { columnDndId } from "@/components/board/dnd";
import { useBoard, useBoards, useBoardCreate, useColumnCreate, useColumnReorder, useTaskMove, useTaskReorder } from "@/lib/queries";
import type { Task } from "@/components/board/types";

type ViewMode = "kanban" | "list";

type DragData =
  | { type: "task"; taskId: string; columnId: string }
  | { type: "column"; columnId: string }
  | { type: "column-drop"; columnId: string };

function getDragData(item: { data: { current?: unknown } }) {
  return item.data.current as DragData | undefined;
}

function orderedIdsMatch(first: string[], second: string[]) {
  return first.length === second.length && first.every((id, index) => id === second[index]);
}

export function BoardPage() {
  const params = useParams({ strict: false }) as { id: string };
  const projectId = params.id;

  // Get first board for this project or create one
  const { data: boards = [], isLoading } = useBoards(projectId);
  const board = boards[0];

  const boardQuery = useBoard(board?.id ?? null);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingColumnOpen, setAddingColumnOpen] = useState(false);

  const createBoardMutation = useBoardCreate();
  const createColumnMutation = useColumnCreate();
  const columnReorderMutation = useColumnReorder();
  const taskMoveMutation = useTaskMove();
  const taskReorderMutation = useTaskReorder();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Create board if none exists
  const ensureBoard = useCallback(async () => {
    if (!board && projectId) {
      await createBoardMutation.mutateAsync({
        projectId,
        name: "Board",
      });
    }
  }, [board, projectId, createBoardMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  // If no board exists, show create button
  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground text-sm">No board found for this project.</p>
        <Button
          onClick={() => ensureBoard()}
          disabled={createBoardMutation.isPending}
        >
          <PlusIcon className="size-4 mr-2" />
          Create Board
        </Button>
      </div>
    );
  }

  const data = boardQuery.data;
  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading board...
      </div>
    );
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = getDragData(active);

    if (activeData?.type === "task") {
      const task = data.columns
        .flatMap((col) => col.tasks)
        .find((t) => t.id === activeData.taskId);
      setActiveTask(task ?? null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      return;
    }

    const activeData = getDragData(active);
    const overData = getDragData(over);

    try {
      if (!activeData || !overData) {
        return;
      }

      if (activeData.type === "task") {
        const sourceColumn = data.columns.find((col) =>
          col.tasks.some((task) => task.id === activeData.taskId)
        );
        const targetColumn = data.columns.find((col) => col.id === overData.columnId);

        if (!sourceColumn || !targetColumn) {
          return;
        }

        const targetIndex =
          overData.type === "task"
            ? targetColumn.tasks.findIndex((task) => task.id === overData.taskId)
            : targetColumn.tasks.length;

        if (targetIndex === -1) {
          return;
        }

        if (sourceColumn.id === targetColumn.id) {
          const oldIndex = sourceColumn.tasks.findIndex((task) => task.id === activeData.taskId);
          if (oldIndex === -1 || oldIndex === targetIndex) {
            return;
          }

          const reorderedTasks = arrayMove(sourceColumn.tasks, oldIndex, targetIndex);
          const orderedIds = reorderedTasks.map((task) => task.id);
          if (orderedIdsMatch(orderedIds, sourceColumn.tasks.map((task) => task.id))) {
            return;
          }

          await taskReorderMutation.mutateAsync({
            columnId: sourceColumn.id,
            orderedIds,
          });
        } else {
          await taskMoveMutation.mutateAsync({
            id: activeData.taskId,
            targetColumnId: targetColumn.id,
            newOrder: targetIndex,
          });
        }

        await boardQuery.refetch();
      } else if (activeData.type === "column") {
        const oldIndex = data.columns.findIndex((column) => column.id === activeData.columnId);
        const newIndex = data.columns.findIndex((column) => column.id === overData.columnId);

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
          return;
        }

        const reorderedColumns = arrayMove(data.columns, oldIndex, newIndex);
        await columnReorderMutation.mutateAsync({
          boardId: board.id,
          orderedIds: reorderedColumns.map((col) => col.id),
        });
        await boardQuery.refetch();
      }
    } finally {
      setActiveTask(null);
    }
  };

  const handleAddColumn = async (name: string, color: string) => {
    if (!board) return;
    await createColumnMutation.mutateAsync({
      boardId: board.id,
      name,
      color,
    });
    boardQuery.refetch();
    setAddingColumnOpen(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <div
            className="size-3 rounded-full"
            style={{ backgroundColor: "#6B7280" }}
          />
          <h2 className="font-medium text-sm">Project Board</h2>
          <span className="text-muted-foreground text-xs">/ Board</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "kanban" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGridIcon className="size-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Board */}
      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragCancel={() => setActiveTask(null)}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
            <SortableContext
              items={data.columns.map((col) => columnDndId(col.id))}
              strategy={horizontalListSortingStrategy}
            >
              {data.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  boardId={board.id}
                  projectColor="#6B7280"
                  onTaskClick={setSelectedTaskId}
                />
              ))}
            </SortableContext>

            {/* Add Column Button */}
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                className="h-fit whitespace-nowrap"
                onClick={() => setAddingColumnOpen(true)}
              >
                <PlusIcon className="size-4 mr-1" />
                Add column
              </Button>
            </div>
          </div>

          <DragOverlay>
            {activeTask && (
              <TaskCardPreview
                task={activeTask}
                projectColor="#6B7280"
              />
            )}
          </DragOverlay>
        </DndContext>
      ) : (
        // List view
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            {data.columns.map((column) => (
              <div key={column.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-medium text-sm">{column.name}</h3>
                  <span className="text-muted-foreground text-xs">
                    ({column.tasks.length})
                  </span>
                </div>
                <div className="space-y-1">
                  {column.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-2 border rounded-md bg-card cursor-pointer hover:bg-accent/50"
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <span className="text-sm truncate">{task.title}</span>
                      <div className="flex items-center gap-2">
                        {task.priority !== "none" && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              task.priority === "urgent"
                                ? "bg-red-100 text-red-700"
                                : task.priority === "high"
                                ? "bg-orange-100 text-orange-700"
                                : task.priority === "medium"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {task.priority}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        taskId={selectedTaskId}
        projectId={projectId}
        open={!!selectedTaskId}
        onOpenChange={(open) => !open && setSelectedTaskId(null)}
        onUpdate={() => boardQuery.refetch()}
      />

      {/* Add Column Dialog */}
      <ColumnDialog
        open={addingColumnOpen}
        onOpenChange={setAddingColumnOpen}
        onSubmit={handleAddColumn}
      />
    </div>
  );
}

export const Route = createFileRoute("/projects/$id/board")({
  component: BoardPage,
});
