export interface Tag {
  id: string;
  name: string;
}

export interface TimeEntry {
  id: string;
  description: string;
  startAt: Date;
  endAt: Date | null;
  projectId: string | null;
  taskId: string | null;
  billable: boolean;
  createdAt: Date;
}

export interface Task {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string | null;
  order: number;
  priority: "none" | "low" | "medium" | "high" | "urgent";
  dueDate: Date | null;
  assignee: string | null;
  estimatedMinutes: number | null;
  createdAt: Date;
  tags?: Tag[];
  trackedMinutes?: number;
  timeEntries?: TimeEntry[];
}

export interface Column {
  id: string;
  boardId: string;
  name: string;
  order: number;
  color: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  columns: Column[];
}
