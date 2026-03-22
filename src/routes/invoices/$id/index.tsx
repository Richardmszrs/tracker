"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, SendIcon, CheckIcon, TrashIcon, PrinterIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInvoice,
  useInvoiceUpdate,
  useInvoiceDelete,
  type InvoiceWithDetails,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
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

function InvoiceDetailPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const { data: invoice, isLoading } = useInvoice(id!) as { data: InvoiceWithDetails | undefined; isLoading: boolean };
  const updateInvoice = useInvoiceUpdate();
  const deleteInvoice = useInvoiceDelete();

  const handleMarkAs = async (status: "sent" | "paid") => {
    if (id) {
      await updateInvoice.mutateAsync({ id, status });
    }
  };

  const handleDelete = async () => {
    if (id) {
      await deleteInvoice.mutateAsync({ id });
      navigate({ to: "/invoices" });
    }
  };

  const calculateSubtotal = (): number => {
    if (!invoice?.items) return 0;
    return invoice.items.reduce((sum, item) => sum + item.amount, 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * (invoice?.taxRate || 0) / 100;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax() - (invoice?.discount || 0);
  };

  // Generate PDF blob URL for preview
  useEffect(() => {
    if (invoice) {
      setPdfUrl("ready");
    }
    return () => {
      setPdfUrl(null);
    };
  }, [invoice]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] w-full" />
          </div>
          <div>
            <Skeleton className="h-[200px] w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button
          variant="link"
          onClick={() => navigate({ to: "/invoices" })}
        >
          Back to Invoices
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/invoices" })}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{invoice.number}</h1>
              <Badge variant={getStatusBadgeVariant(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {invoice.client?.name || "No client"} • Created {formatDate(invoice.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              onClick={() => handleMarkAs("sent")}
            >
              <SendIcon className="size-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button
              variant="outline"
              onClick={() => handleMarkAs("paid")}
            >
              <CheckIcon className="size-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          <Button variant="outline">
            <PrinterIcon className="size-4 mr-2" />
            Print
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <TrashIcon className="size-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              {/* Invoice Header */}
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-blue-600">INVOICE</h2>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{invoice.number}</p>
                  <p className="text-sm text-muted-foreground">
                    Issue: {formatDate(invoice.issueDate)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Due: {formatDate(invoice.dueDate)}
                  </p>
                </div>
              </div>

              {/* Bill To */}
              <div className="mb-8">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Bill To
                </p>
                <p className="font-semibold">{invoice.client?.name || "No client specified"}</p>
              </div>

              {/* Items Table */}
              <div className="mb-8">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">
                        Description
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">
                        Qty
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">
                        Rate
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-3 px-2">{item.description}</td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {item.quantity.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 text-right text-muted-foreground">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(calculateSubtotal(), invoice.currency)}</span>
                  </div>
                  {invoice.taxRate > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        Tax ({invoice.taxRate}%)
                      </span>
                      <span>{formatCurrency(calculateTax(), invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.discount > 0 && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="text-green-600">
                        -{formatCurrency(invoice.discount, invoice.currency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
                    <span>Total</span>
                    <span className="text-blue-600">
                      {formatCurrency(calculateTotal(), invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="mt-8 p-4 bg-muted rounded-md">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={getStatusBadgeVariant(invoice.status)} className="mt-1">
                  {invoice.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Issue Date</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              {invoice.paidAt && (
                <div>
                  <p className="text-xs text-muted-foreground">Paid On</p>
                  <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">Currency</p>
                <p className="font-medium">{invoice.currency}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Items</span>
                <span className="font-medium">{invoice.items?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(calculateSubtotal(), invoice.currency)}
                </span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium">
                    {formatCurrency(calculateTax(), invoice.currency)}
                  </span>
                </div>
              )}
              {invoice.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-green-600">
                    -{formatCurrency(invoice.discount, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-t pt-3">
                <span className="font-semibold">Total</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(calculateTotal(), invoice.currency)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete invoice {invoice.number}? This action cannot be undone.
              The linked time entries will be unlinked but not deleted.
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

export const Route = createFileRoute("/invoices/$id/")({
  component: () => (
    <ErrorBoundary>
      <InvoiceDetailPage />
    </ErrorBoundary>
  ),
});
