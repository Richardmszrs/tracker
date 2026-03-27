import { os } from "@orpc/server";
import { eq, isNull, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/main/db/client";
import { boards, columns, tasks, taskTags, tags, timeEntries } from "@/main/db/schema";

// Board schemas
const boardCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
});

const boardGetSchema = z.object({
  id: z.string().min(1),
});

const boardListSchema = z.object({
  projectId: z.string().min(1),
});

// Column schemas
const columnCreateSchema = z.object({
  boardId: z.string().min(1),
  name: z.string().min(1),
  color: z.string().min(1),
});

const columnUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});

const columnDeleteSchema = z.object({
  id: z.string().min(1),
});

const columnReorderSchema = z.object({
  boardId: z.string().min(1),
  orderedIds: z.array(z.string()),
});

// Task schemas
const taskCreateSchema = z.object({
  columnId: z.string().min(1),
  boardId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  dueDate: z.number().optional(),
  assignee: z.string().optional(),
  estimatedMinutes: z.number().optional(),
  tagIds: z.array(z.string()).optional(),
});

const taskGetSchema = z.object({
  id: z.string().min(1),
});

const taskUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  columnId: z.string().min(1).optional(),
  boardId: z.string().min(1).optional(),
  priority: z.enum(["none", "low", "medium", "high", "urgent"]).optional(),
  dueDate: z.number().optional().nullable(),
  assignee: z.string().optional().nullable(),
  estimatedMinutes: z.number().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

const taskDeleteSchema = z.object({
  id: z.string().min(1),
});

const taskMoveSchema = z.object({
  id: z.string().min(1),
  targetColumnId: z.string().min(1),
  newOrder: z.number(),
});

const taskReorderSchema = z.object({
  columnId: z.string().min(1),
  orderedIds: z.array(z.string()),
});

// Board handlers
export const boardCreate = os
  .input(boardCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();

    // Create the board
    await db
      .insert(boards)
      .values({
        id,
        projectId: opt.input.projectId,
        name: opt.input.name,
        createdAt,
      })
      .returning();

    // Auto-create default columns: "To do", "In progress", "Done"
    const defaultColumns = [
      { name: "To do", color: "#6B7280", order: 0 },
      { name: "In progress", color: "#3B82F6", order: 1 },
      { name: "Done", color: "#22C55E", order: 2 },
    ];

    for (const col of defaultColumns) {
      await db
        .insert(columns)
        .values({
          id: nanoid(),
          boardId: id,
          name: col.name,
          color: col.color,
          order: col.order,
          createdAt,
        })
        .returning();
    }

    return { id, ...opt.input, createdAt };
  });

export const boardGet = os
  .input(boardGetSchema)
  .handler(async (opt) => {
    const db = getDb();

    const board = db
      .select()
      .from(boards)
      .where(and(eq(boards.id, opt.input.id), isNull(boards.deletedAt)))
      .get();

    if (!board) {
      throw new Error("Board not found");
    }

    // Get columns ordered by order
    const boardColumns = db
      .select()
      .from(columns)
      .where(and(eq(columns.boardId, board.id), isNull(columns.deletedAt)))
      .orderBy(asc(columns.order))
      .all();

    // Get tasks for each column
    const columnsWithTasks = await Promise.all(
      boardColumns.map(async (col) => {
        const columnTasks = db
          .select()
          .from(tasks)
          .where(and(eq(tasks.columnId, col.id), isNull(tasks.deletedAt)))
          .orderBy(asc(tasks.order))
          .all();

        // Get task tags for each task
        const tasksWithTags = await Promise.all(
          columnTasks.map(async (task) => {
            const taskTagRecords = db
              .select()
              .from(taskTags)
              .where(and(eq(taskTags.taskId, task.id), isNull(taskTags.deletedAt)))
              .all();

            const tagIds = taskTagRecords.map((tt) => tt.tagId);

            const taskTagsList = tagIds.length > 0
              ? db.select().from(tags).all().filter(t => tagIds.includes(t.id))
              : [];

            // Get tracked time for this task
            const entries = db
              .select()
              .from(timeEntries)
              .where(eq(timeEntries.taskId, task.id))
              .all();

            const trackedMinutes = entries.reduce((sum, e) => {
              if (e.startAt && e.endAt) {
                return sum + Math.round((e.endAt.getTime() - e.startAt.getTime()) / 60000);
              }
              return sum;
            }, 0);

            return {
              ...task,
              tags: taskTagsList,
              trackedMinutes,
            };
          })
        );

        return {
          ...col,
          tasks: tasksWithTags,
        };
      })
    );

    return {
      ...board,
      columns: columnsWithTasks,
    };
  });

export const boardList = os
  .input(boardListSchema)
  .handler(async (opt) => {
    const db = getDb();
    return db
      .select()
      .from(boards)
      .where(
        and(
          eq(boards.projectId, opt.input.projectId),
          isNull(boards.deletedAt)
        )
      )
      .all();
  });

// Column handlers
export const columnCreate = os
  .input(columnCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();

    // Get the highest order for this board
    const lastColumn = db
      .select()
      .from(columns)
      .where(and(eq(columns.boardId, opt.input.boardId), isNull(columns.deletedAt)))
      .orderBy(asc(columns.order))
      .get();

    const order = lastColumn ? lastColumn.order + 1 : 0;

    await db
      .insert(columns)
      .values({
        id,
        boardId: opt.input.boardId,
        name: opt.input.name,
        color: opt.input.color,
        order,
        createdAt,
      })
      .returning();

    return { id, ...opt.input, order, createdAt };
  });

export const columnUpdate = os
  .input(columnUpdateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const updates: Record<string, unknown> = {};

    if (opt.input.name !== undefined) {
      updates.name = opt.input.name;
    }
    if (opt.input.color !== undefined) {
      updates.color = opt.input.color;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(columns)
        .set(updates)
        .where(eq(columns.id, opt.input.id));
    }

    const [result] = await db
      .select()
      .from(columns)
      .where(eq(columns.id, opt.input.id));
    return result;
  });

export const columnDelete = os
  .input(columnDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();

    // Get the column and check if it has tasks
    const column = db
      .select()
      .from(columns)
      .where(eq(columns.id, opt.input.id))
      .get();

    if (!column) {
      throw new Error("Column not found");
    }

    const tasksInColumn = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.columnId, opt.input.id), isNull(tasks.deletedAt)))
      .all();

    if (tasksInColumn.length > 0) {
      throw new Error("Cannot delete column with tasks. Move or delete tasks first.");
    }

    // Get the first column of the board to move tasks to (if any exist)
    const firstColumn = db
      .select()
      .from(columns)
      .where(
        and(
          eq(columns.boardId, column.boardId),
          isNull(columns.deletedAt),
        )
      )
      .orderBy(asc(columns.order))
      .get();

    if (firstColumn && tasksInColumn.length > 0) {
      // Move tasks to first column
      for (const task of tasksInColumn) {
        await db
          .update(tasks)
          .set({ columnId: firstColumn.id })
          .where(eq(tasks.id, task.id));
      }
    }

    // Soft delete the column
    await db
      .update(columns)
      .set({ deletedAt: new Date() })
      .where(eq(columns.id, opt.input.id));

    return { success: true };
  });

export const columnReorder = os
  .input(columnReorderSchema)
  .handler(async (opt) => {
    const db = getDb();

    // Update order for each column
    for (let i = 0; i < opt.input.orderedIds.length; i++) {
      await db
        .update(columns)
        .set({ order: i })
        .where(eq(columns.id, opt.input.orderedIds[i]));
    }

    return { success: true };
  });

// Task handlers
export const taskCreate = os
  .input(taskCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();

    // Get the highest order for this column
    const lastTask = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.columnId, opt.input.columnId), isNull(tasks.deletedAt)))
      .orderBy(asc(tasks.order))
      .get();

    const order = lastTask ? lastTask.order + 1 : 0;

    await db
      .insert(tasks)
      .values({
        id,
        columnId: opt.input.columnId,
        boardId: opt.input.boardId,
        title: opt.input.title,
        description: opt.input.description ?? null,
        priority: opt.input.priority ?? "none",
        dueDate: opt.input.dueDate ? new Date(opt.input.dueDate) : null,
        assignee: opt.input.assignee ?? null,
        estimatedMinutes: opt.input.estimatedMinutes ?? null,
        order,
        createdAt,
      })
      .returning();

    // Add tags if provided
    if (opt.input.tagIds && opt.input.tagIds.length > 0) {
      await db.insert(taskTags).values(
        opt.input.tagIds.map((tagId) => ({
          id: nanoid(),
          taskId: id,
          tagId,
        }))
      ).run();
    }

    return {
      id,
      columnId: opt.input.columnId,
      boardId: opt.input.boardId,
      title: opt.input.title,
      description: opt.input.description ?? null,
      priority: opt.input.priority ?? "none",
      dueDate: opt.input.dueDate ?? null,
      assignee: opt.input.assignee ?? null,
      estimatedMinutes: opt.input.estimatedMinutes ?? null,
      order,
      createdAt,
    };
  });

export const taskGet = os
  .input(taskGetSchema)
  .handler(async (opt) => {
    const db = getDb();

    const task = db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, opt.input.id), isNull(tasks.deletedAt)))
      .get();

    if (!task) {
      throw new Error("Task not found");
    }

    // Get task tags
    const taskTagRecords = db
      .select()
      .from(taskTags)
      .where(and(eq(taskTags.taskId, task.id), isNull(taskTags.deletedAt)))
      .all();

    const tagIds = taskTagRecords.map((tt) => tt.tagId);
    const taskTagsList = tagIds.length > 0
      ? db.select().from(tags).all().filter(t => tagIds.includes(t.id))
      : [];

    // Get time entries for this task
    const entries = db
      .select()
      .from(timeEntries)
      .where(eq(timeEntries.taskId, task.id))
      .all();

    const trackedMinutes = entries.reduce((sum, e) => {
      if (e.startAt && e.endAt) {
        return sum + Math.round((e.endAt.getTime() - e.startAt.getTime()) / 60000);
      }
      return sum;
    }, 0);

    return {
      ...task,
      tags: taskTagsList,
      trackedMinutes,
      timeEntries: entries,
    };
  });

export const taskUpdate = os
  .input(taskUpdateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const updates: Record<string, unknown> = {};

    if (opt.input.title !== undefined) {
      updates.title = opt.input.title;
    }
    if (opt.input.description !== undefined) {
      updates.description = opt.input.description;
    }
    if (opt.input.columnId !== undefined) {
      updates.columnId = opt.input.columnId;
    }
    if (opt.input.boardId !== undefined) {
      updates.boardId = opt.input.boardId;
    }
    if (opt.input.priority !== undefined) {
      updates.priority = opt.input.priority;
    }
    if (opt.input.dueDate !== undefined) {
      updates.dueDate = opt.input.dueDate ? new Date(opt.input.dueDate) : null;
    }
    if (opt.input.assignee !== undefined) {
      updates.assignee = opt.input.assignee;
    }
    if (opt.input.estimatedMinutes !== undefined) {
      updates.estimatedMinutes = opt.input.estimatedMinutes;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.id, opt.input.id));
    }

    // Update tags if provided
    if (opt.input.tagIds !== undefined) {
      // Remove existing tags
      await db
        .update(taskTags)
        .set({ deletedAt: new Date() })
        .where(eq(taskTags.taskId, opt.input.id));

      // Add new tags
      if (opt.input.tagIds.length > 0) {
        await db.insert(taskTags).values(
          opt.input.tagIds.map((tagId) => ({
            id: nanoid(),
            taskId: opt.input.id,
            tagId,
          }))
        ).run();
      }
    }

    const [result] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, opt.input.id));
    return result;
  });

export const taskDelete = os
  .input(taskDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();

    // Soft delete the task
    await db
      .update(tasks)
      .set({ deletedAt: new Date() })
      .where(eq(tasks.id, opt.input.id));

    // Soft delete task tags
    await db
      .update(taskTags)
      .set({ deletedAt: new Date() })
      .where(eq(taskTags.taskId, opt.input.id));

    return { success: true };
  });

export const taskMove = os
  .input(taskMoveSchema)
  .handler(async (opt) => {
    const db = getDb();

    await db
      .update(tasks)
      .set({
        columnId: opt.input.targetColumnId,
        order: opt.input.newOrder,
      })
      .where(eq(tasks.id, opt.input.id));

    const [result] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, opt.input.id));
    return result;
  });

export const taskReorder = os
  .input(taskReorderSchema)
  .handler(async (opt) => {
    const db = getDb();

    // Update order for each task
    for (let i = 0; i < opt.input.orderedIds.length; i++) {
      await db
        .update(tasks)
        .set({ order: i })
        .where(eq(tasks.id, opt.input.orderedIds[i]));
    }

    return { success: true };
  });
