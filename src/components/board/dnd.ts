export type DndItemType = "column" | "column-drop" | "task";

export const columnDndId = (columnId: string) => `column:${columnId}`;

export const columnDropDndId = (columnId: string) => `column-drop:${columnId}`;

export const taskDndId = (taskId: string) => `task:${taskId}`;
