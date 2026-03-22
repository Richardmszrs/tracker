import { os } from "@orpc/server";
import { and, eq, gte, isNull, lte, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getDb } from "@/main/db/client";
import { clients, invoices, invoiceItems, projects, timeEntries } from "@/main/db/schema";

const invoiceCreateSchema = z.object({
  clientId: z.string(),
  entryIds: z.array(z.string()),
  issueDate: z.number(),
  dueDate: z.number(),
  notes: z.string().optional(),
  taxRate: z.number().default(0),
  discount: z.number().default(0),
  currency: z.string().default("USD"),
});

const invoiceUpdateSchema = z.object({
  id: z.string(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  issueDate: z.number().optional(),
  dueDate: z.number().optional(),
  notes: z.string().optional(),
  taxRate: z.number().optional(),
  discount: z.number().optional(),
  currency: z.string().optional(),
});

const invoiceDeleteSchema = z.object({
  id: z.string(),
});

const invoiceListSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  startDate: z.number().optional(),
  endDate: z.number().optional(),
  clientId: z.string().optional(),
});

export const invoiceCreate = os
  .input(invoiceCreateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const id = nanoid();
    const createdAt = new Date();

    // Get next invoice number
    const lastInvoice = db
      .select({ number: invoices.number })
      .from(invoices)
      .orderBy(invoices.createdAt)
      .get();

    let nextNumber = 1;
    if (lastInvoice?.number) {
      const lastNum = parseInt(lastInvoice.number.split("-")[1] || "0", 10);
      nextNumber = lastNum + 1;
    }
    const number = `INV-${String(nextNumber).padStart(3, "0")}`;

    // Create invoice
    await db.insert(invoices).values({
      id,
      number,
      clientId: opt.input.clientId,
      status: "draft",
      issueDate: new Date(opt.input.issueDate),
      dueDate: new Date(opt.input.dueDate),
      notes: opt.input.notes || null,
      taxRate: opt.input.taxRate,
      discount: opt.input.discount,
      currency: opt.input.currency,
      createdAt,
    }).returning();

    // Get entries with their projects
    const entries = db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        startAt: timeEntries.startAt,
        endAt: timeEntries.endAt,
        projectId: timeEntries.projectId,
        billable: timeEntries.billable,
        projectName: projects.name,
        projectHourlyRate: projects.hourlyRate,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(inArray(timeEntries.id, opt.input.entryIds))
      .all();

    // Group by project and create invoice items
    const projectGroups = new Map<string, { entries: typeof entries; totalHours: number; rate: number }>();

    for (const entry of entries) {
      if (!entry.projectId) {
        // Create item for entry without project
        const hours = entry.endAt
          ? (new Date(entry.endAt).getTime() - new Date(entry.startAt).getTime()) / (1000 * 60 * 60)
          : 0;
        const rate = entry.projectHourlyRate || 0;

        await db.insert(invoiceItems).values({
          id: nanoid(),
          invoiceId: id,
          entryId: entry.id,
          description: entry.description,
          quantity: hours,
          unitPrice: rate,
          amount: hours * rate,
        });
      } else {
        const group = projectGroups.get(entry.projectId) || {
          entries: [],
          totalHours: 0,
          rate: entry.projectHourlyRate || 0,
        };
        const hours = entry.endAt
          ? (new Date(entry.endAt).getTime() - new Date(entry.startAt).getTime()) / (1000 * 60 * 60)
          : 0;
        group.entries.push(entry);
        group.totalHours += hours;
        projectGroups.set(entry.projectId, group);
      }
    }

    // Create items for grouped entries
    for (const [projectId, group] of projectGroups) {
      const amount = group.totalHours * group.rate;
      const projectName = group.entries[0]?.projectName || "Unknown Project";

      await db.insert(invoiceItems).values({
        id: nanoid(),
        invoiceId: id,
        entryId: null,
        description: `${projectName} (${group.totalHours.toFixed(2)} hours @ $${group.rate}/hr)`,
        quantity: group.totalHours,
        unitPrice: group.rate,
        amount,
      });
    }

    // Mark entries as invoiced
    await db
      .update(timeEntries)
      .set({ invoiceId: id, syncedAt: new Date() })
      .where(inArray(timeEntries.id, opt.input.entryIds));

    return { id, number };
  });

export const invoiceList = os.input(invoiceListSchema).handler((opt) => {
  const db = getDb();
  const conditions: ReturnType<typeof eq>[] = [isNull(invoices.deletedAt)];

  if (opt.input.status) {
    conditions.push(eq(invoices.status, opt.input.status));
  }
  if (opt.input.clientId) {
    conditions.push(eq(invoices.clientId, opt.input.clientId));
  }
  if (opt.input.startDate) {
    conditions.push(gte(invoices.issueDate, new Date(opt.input.startDate)));
  }
  if (opt.input.endDate) {
    conditions.push(lte(invoices.issueDate, new Date(opt.input.endDate)));
  }

  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      taxRate: invoices.taxRate,
      discount: invoices.discount,
      notes: invoices.notes,
      clientId: invoices.clientId,
      paidAt: invoices.paidAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .where(and(...conditions))
    .all();
});

export const invoiceGet = os
  .input(z.object({ id: z.string() }))
  .handler((opt) => {
    const db = getDb();

    const invoice = db
      .select()
      .from(invoices)
      .where(eq(invoices.id, opt.input.id))
      .get();

    if (!invoice) return null;

    const items = db
      .select()
      .from(invoiceItems)
      .where(and(eq(invoiceItems.invoiceId, opt.input.id), isNull(invoiceItems.deletedAt)))
      .all();

    const client = invoice.clientId
      ? db.select().from(clients).where(eq(clients.id, invoice.clientId)).get()
      : null;

    return { ...invoice, items, client };
  });

export const invoiceUpdate = os
  .input(invoiceUpdateSchema)
  .handler(async (opt) => {
    const db = getDb();
    const { id, status, issueDate, dueDate, notes, taxRate, discount, currency } = opt.input;

    const updates: Record<string, unknown> = {};
    if (status !== undefined) {
      updates.status = status;
      if (status === "paid") {
        updates.paidAt = new Date();
      }
    }
    if (issueDate !== undefined) updates.issueDate = new Date(issueDate);
    if (dueDate !== undefined) updates.dueDate = new Date(dueDate);
    if (notes !== undefined) updates.notes = notes;
    if (taxRate !== undefined) updates.taxRate = taxRate;
    if (discount !== undefined) updates.discount = discount;
    if (currency !== undefined) updates.currency = currency;

    if (Object.keys(updates).length > 0) {
      await db.update(invoices).set(updates).where(eq(invoices.id, id)).run();
    }

    const [result] = await db.select().from(invoices).where(eq(invoices.id, id)).all();
    return result;
  });

export const invoiceDelete = os
  .input(invoiceDeleteSchema)
  .handler(async (opt) => {
    const db = getDb();

    // Unlink entries
    await db
      .update(timeEntries)
      .set({ invoiceId: null })
      .where(eq(timeEntries.invoiceId, opt.input.id));

    // Soft delete invoice
    await db
      .update(invoices)
      .set({ deletedAt: new Date() })
      .where(eq(invoices.id, opt.input.id))
      .run();

    // Soft delete items
    await db
      .update(invoiceItems)
      .set({ deletedAt: new Date() })
      .where(eq(invoiceItems.invoiceId, opt.input.id))
      .run();

    return { success: true };
  });

export const invoiceGetNextNumber = os.handler(() => {
  const db = getDb();

  const lastInvoice = db
    .select({ number: invoices.number })
    .from(invoices)
    .orderBy(invoices.createdAt)
    .get();

  let nextNumber = 1;
  if (lastInvoice?.number) {
    const lastNum = parseInt(lastInvoice.number.split("-")[1] || "0", 10);
    nextNumber = lastNum + 1;
  }

  return { number: `INV-${String(nextNumber).padStart(3, "0")}` };
});

export const invoiceGetUnbilledEntries = os
  .input(z.object({ clientId: z.string() }))
  .handler((opt) => {
    const db = getDb();

    return db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        startAt: timeEntries.startAt,
        endAt: timeEntries.endAt,
        billable: timeEntries.billable,
        invoiceId: timeEntries.invoiceId,
        projectId: timeEntries.projectId,
        projectName: projects.name,
        projectHourlyRate: projects.hourlyRate,
      })
      .from(timeEntries)
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(
        and(
          eq(timeEntries.billable, true),
          isNull(timeEntries.invoiceId),
          isNull(timeEntries.deletedAt),
          opt.input.clientId ? eq(projects.clientId, opt.input.clientId) : undefined
        )
      )
      .all();
  });
