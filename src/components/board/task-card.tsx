"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Task } from "./types";

interface TaskCardProps {
  task: Task;
  projectColor: string;
  onClick?: () => void;
  isDragging?: boolean;
}

const priorityColors = {
  none: "",
  low: "bg-gray-100 text-gray-700 border-gray-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

export function TaskCard({ task, projectColor, onClick, isDragging }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = task.dueDate
    ? new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
    : false;
  const isDueToday = task.dueDate
    ? new Date(task.dueDate).toDateString() === new Date().toDateString()
    : false;

  const trackedHours = Math.floor((task.trackedMinutes || 0) / 60);
  const trackedMins = (task.trackedMinutes || 0) % 60;
  const estimatedHours = Math.floor((task.estimatedMinutes || 0) / 60);
  const estimatedMins = (task.estimatedMinutes || 0) % 60;

  const progress =
    task.estimatedMinutes && task.estimatedMinutes > 0
      ? Math.min(100, Math.round(((task.trackedMinutes || 0) / task.estimatedMinutes) * 100))
      : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative p-3 border rounded-md bg-card cursor-grab active:cursor-grabbing hover:bg-accent/50 transition-colors ${
        isSortableDragging || isDragging ? "opacity-50 shadow-lg" : ""
      }`}
      onClick={(e) => {
        // Don't trigger click if we're dragging
        if (!isSortableDragging && !isDragging && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      {/* Title */}
      <p className="font-medium text-sm line-clamp-2 mb-2">{task.title}</p>

      {/* Priority Badge */}
      {task.priority !== "none" && (
        <Badge
          variant="outline"
          className={`text-[0.625rem] mb-2 ${priorityColors[task.priority]}`}
        >
          {task.priority}
        </Badge>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-[0.625rem] px-1.5 py-0"
            >
              {tag.name}
            </Badge>
          ))}
          {task.tags.length > 2 && (
            <Badge
              variant="secondary"
              className="text-[0.625rem] px-1.5 py-0"
            >
              +{task.tags.length - 2}
            </Badge>
          )}
        </div>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <div
          className={`flex items-center gap-1 text-[0.625rem] mb-2 ${
            isOverdue
              ? "text-red-600"
              : isDueToday
              ? "text-orange-600"
              : "text-muted-foreground"
          }`}
        >
          <CalendarIcon className="size-3" />
          <span>
            {isOverdue
              ? "Overdue"
              : isDueToday
              ? "Today"
              : new Date(task.dueDate).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Tracked Time / Estimate */}
      {(task.trackedMinutes || task.estimatedMinutes) && (
        <div className="flex items-center justify-between text-[0.625rem]">
          <div className="flex items-center gap-1 text-muted-foreground">
            <ClockIcon className="size-3" />
            <span>
              {trackedHours > 0 ? `${trackedHours}h ` : ""}
              {trackedMins > 0 ? `${trackedMins}m` : ""}
              {task.estimatedMinutes ? (
                <>
                  {" / "}
                  {estimatedHours > 0 ? `${estimatedHours}h ` : ""}
                  {estimatedMins > 0 ? `${estimatedMins}m` : "0m"}
                </>
              ) : (
                " tracked"
              )}
            </span>
          </div>
          {progress !== null && (
            <div
              className={`text-xs ${
                progress >= 100
                  ? "text-green-600"
                  : progress >= 80
                  ? "text-orange-600"
                  : ""
              }`}
            >
              {progress}%
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {progress !== null && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              progress >= 100
                ? "bg-green-500"
                : progress >= 80
                ? "bg-orange-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}

      {/* Project Color Dot */}
      <div
        className="absolute bottom-2 left-2 size-2 rounded-full"
        style={{ backgroundColor: projectColor }}
      />
    </div>
  );
}
