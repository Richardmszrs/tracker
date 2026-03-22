"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PlusIcon, FileTextIcon, MoreHorizontalIcon, TrashIcon, SendIcon, CheckIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvoices,
  useInvoiceDelete,
  useInvoiceUpdate,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type StatusFilter = "all" | "draft" | "sent" | "paid" | "overdue";

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "paid":
      return "default";
    case "sent":
      return "secondary";
    case "overdue":
      return "destructive";
    default:
      return "outline";
  }
}

function InvoicesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = statusFilter !== "all" ? { status: statusFilter as "draft" | "sent" | "paid" | "overdue" } : undefined;
  const { data: invoices, isLoading } = useInvoices(filters);
  const deleteInvoice = useInvoiceDelete();
  const updateInvoice = useInvoiceUpdate();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteInvoice.mutateAsync({ id: deleteId });
      setDeleteId(null);
    }
  };

  const handleMarkAs = async (id: string, status: "sent" | "paid") => {
    await updateInvoice.mutateAsync({ id, status });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track your invoices
          </p>
        </div>
        <Button
          onClick={() => navigate({ to: "/invoices/new" })}
        >
          <PlusIcon className="size-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2">
        {(["all", "draft", "sent", "paid", "overdue"] as const).map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[60px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))}
                </>
              ) : invoices?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FileTextIcon className="size-8" />
                      <p>No invoices found</p>
                      <Button
                        variant="link"
                        onClick={() => navigate({ to: "/invoices/new" })}
                      >
                        Create your first invoice
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                invoices?.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    onClick={() => navigate({ to: "/invoices/$id", params: { id: invoice.id } })}
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{invoice.number}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.issueDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invoice.dueDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(0, invoice.currency)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate({ to: "/invoices/$id", params: { id: invoice.id } })}
                          >
                            View
                          </DropdownMenuItem>
                          {invoice.status === "draft" && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAs(invoice.id, "sent")}
                            >
                              <SendIcon className="size-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === "sent" || invoice.status === "overdue") && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAs(invoice.id, "paid")}
                            >
                              <CheckIcon className="size-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDeleteId(invoice.id)}
                            className="text-destructive"
                          >
                            <TrashIcon className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const Route = createFileRoute("/invoices/")({
  component: InvoicesIndexRouteComponent,
});

function InvoicesIndexRouteComponent() {
  return (
    <ErrorBoundary>
      <InvoicesPage />
    </ErrorBoundary>
  );
}
