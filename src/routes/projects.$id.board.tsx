"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { PlusIcon, LayoutGridIcon, ListIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KanbanColumn } from "@/components/board/kanban-column";
import { TaskCard } from "@/components/board/task-card";
import { TaskDetailSheet } from "@/components/board/task-detail-sheet";
import { ColumnDialog } from "@/components/board/column-dialog";
import { useBoard, useBoards, useBoardCreate, useColumnCreate, useTaskMove, useTaskReorder, useProjects } from "@/lib/queries";
import type { Task, Column } from "@/components/board/types";

type ViewMode = "kanban" | "list";

interface BoardPageProps {
  params: { id: string };
}

export function BoardPage({ params }: BoardPageProps) {
  const projectId = params.id;

  const { data: projects = [] } = useProjects();
  const project = projects.find((p) => p.id === projectId);

  // Get first board for this project or create one
  const { data: boards = [], isLoading } = useBoards(projectId);
  const board = boards[0];

  const boardQuery = useBoard(board?.id ?? null);

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeColumn, setActiveColumn] = useState<Column | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [addingColumnOpen, setAddingColumnOpen] = useState(false);

  const createBoardMutation = useBoardCreate();
  const createColumnMutation = useColumnCreate();
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
    const activeType = active.data.current?.type;

    if (activeType === "task") {
      const task = data.columns
        .flatMap((col) => col.tasks)
        .find((t) => t.id === active.id);
      setActiveTask(task ?? null);
    } else if (activeType === "column") {
      const column = data.columns.find((col) => col.id === active.id);
      setActiveColumn(column ?? null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for task reordering between columns
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveTask(null);
      setActiveColumn(null);
      return;
    }

    const activeType = active.data.current?.type;

    if (activeType === "task") {
      const taskId = active.id as string;
      const overType = over.data.current?.type;

      if (overType === "column") {
        // Dropped on a column - move to that column at the end
        const targetColumnId = over.id as string;
        const targetColumn = data.columns.find((col) => col.id === targetColumnId);
        if (targetColumn) {
          const newOrder = targetColumn.tasks.length;
          await taskMoveMutation.mutateAsync({
            id: taskId,
            targetColumnId,
            newOrder,
          });
          boardQuery.refetch();
        }
      } else if (overType === "task") {
        // Dropped on another task - reorder within the same or different column
        const overTaskId = over.id as string;
        const sourceColumn = data.columns.find((col) =>
          col.tasks.some((t) => t.id === taskId)
        );
        const targetColumn = data.columns.find((col) =>
          col.tasks.some((t) => t.id === overTaskId)
        );

        if (sourceColumn && targetColumn) {
          const sourceTasks = [...sourceColumn.tasks];
          const targetTasks = sourceColumn.id === targetColumn.id
            ? sourceTasks
            : [...targetColumn.tasks];

          const oldIndex = sourceTasks.findIndex((t) => t.id === taskId);
          const newIndex = targetTasks.findIndex((t) => t.id === overTaskId);

          if (sourceColumn.id === targetColumn.id) {
            // Reorder within same column
            sourceTasks.splice(oldIndex, 1);
            sourceTasks.splice(newIndex, 0, sourceTasks[oldIndex] || sourceColumn.tasks[oldIndex]);

            await taskReorderMutation.mutateAsync({
              columnId: sourceColumn.id,
              orderedIds: sourceTasks.map((t) => t.id),
            });
          } else {
            // Move to different column
            await taskMoveMutation.mutateAsync({
              id: taskId,
              targetColumnId: targetColumn.id,
              newOrder: newIndex,
            });
          }
          boardQuery.refetch();
        }
      }
    } else if (activeType === "column") {
      const columnId = active.id as string;
      const overColumnId = over.id as string;

      if (columnId !== overColumnId) {
        const columns = [...data.columns];
        const oldIndex = columns.findIndex((col) => col.id === columnId);
        const newIndex = columns.findIndex((col) => col.id === overColumnId);

        columns.splice(oldIndex, 1);
        columns.splice(newIndex, 0, data.columns[oldIndex]);

        // Note: Column reorder would require a separate endpoint
        boardQuery.refetch();
      }
    }

    setActiveTask(null);
    setActiveColumn(null);
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
            style={{ backgroundColor: project?.color }}
          />
          <h2 className="font-medium text-sm">{project?.name}</h2>
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
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
            <SortableContext
              items={data.columns.map((col) => col.id)}
              strategy={horizontalListSortingStrategy}
            >
              {data.columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  boardId={board.id}
                  projectColor={project?.color ?? "#6B7280"}
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
              <TaskCard
                task={activeTask}
                projectColor={project?.color ?? "#6B7280"}
                isDragging
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

// Export as default for use in parent component
export default BoardPage;
