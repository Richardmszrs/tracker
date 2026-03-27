"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  useInvoiceCreate,
  useInvoiceNextNumber,
  useClients,
  useUnbilledEntries,
  useSettings,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function formatDate(date: Date): string {
  return format(date, "PPP");
}

function NewInvoicePage() {
  const navigate = useNavigate();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [notes, setNotes] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [currency, setCurrency] = useState("USD");

  const { data: nextNumber } = useInvoiceNextNumber();
  const { data: clients, isLoading: clientsLoading } = useClients();
  const { data: unbilledEntries, isLoading: entriesLoading } = useUnbilledEntries(selectedClientId);
  const { data: settings } = useSettings();
  const createInvoice = useInvoiceCreate();

  // Set defaults from settings
  useState(() => {
    if (settings) {
      const symbolToCode: Record<string, string> = {
        "$": "USD",
        "€": "EUR",
        "£": "GBP",
        "¥": "JPY",
        "₹": "INR",
      };
      setCurrency(symbolToCode[settings.currencySymbol] || "USD");
    }
  });

  const selectedEntries = useMemo(() => {
    if (!unbilledEntries) return [];
    return unbilledEntries.filter((e) => selectedEntryIds.includes(e.id));
  }, [unbilledEntries, selectedEntryIds]);

  const calculateSubtotal = (): number => {
    return selectedEntries.reduce((sum, entry) => {
      const hours = entry.endAt
        ? (new Date(entry.endAt).getTime() - new Date(entry.startAt).getTime()) / (1000 * 60 * 60)
        : 0;
      const amount = hours * (entry.projectHourlyRate || 0);
      return sum + amount;
    }, 0);
  };

  const calculateTax = (): number => {
    return calculateSubtotal() * taxRate / 100;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateTax() - discount;
  };

  const handleToggleEntry = (entryId: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(entryId)
        ? prev.filter((id) => id !== entryId)
        : [...prev, entryId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEntryIds.length === unbilledEntries?.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(unbilledEntries?.map((e) => e.id) || []);
    }
  };

  const handleCreate = async () => {
    if (!selectedClientId || selectedEntryIds.length === 0) return;

    await createInvoice.mutateAsync({
      clientId: selectedClientId,
      entryIds: selectedEntryIds,
      issueDate: issueDate.getTime(),
      dueDate: dueDate.getTime(),
      notes: notes || undefined,
      taxRate,
      discount,
      currency,
    });

    navigate({ to: "/invoices" });
  };

  const getEntryHours = (entry: NonNullable<typeof unbilledEntries>[number]): number => {
    if (!entry.endAt) return 0;
    return (new Date(entry.endAt).getTime() - new Date(entry.startAt).getTime()) / (1000 * 60 * 60);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/invoices" })}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">New Invoice</h1>
          <p className="text-sm text-muted-foreground">
            Invoice #{nextNumber?.number || "..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill To</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clientsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading...
                    </SelectItem>
                  ) : clients?.length === 0 ? (
                    <SelectItem value="no-clients" disabled>
                      No clients available
                    </SelectItem>
                  ) : (
                    clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Entries Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Time Entries</CardTitle>
                {selectedClientId && unbilledEntries && unbilledEntries.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedEntryIds.length === unbilledEntries.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedClientId ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Select a client to see unbilled time entries
                </p>
              ) : entriesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : unbilledEntries?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No unbilled time entries for this client
                </p>
              ) : (
                <div className="space-y-3">
                  {unbilledEntries?.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 border rounded-lg"
                    >
                      <Checkbox
                        checked={selectedEntryIds.includes(entry.id)}
                        onCheckedChange={() => handleToggleEntry(entry.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">
                              {entry.description || "No description"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.projectName || "No project"} •{" "}
                              {format(new Date(entry.startAt), "MMM d")} -{" "}
                              {entry.endAt
                                ? format(new Date(entry.endAt), "MMM d, h:mm a")
                                : "Running"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              {formatCurrency(
                                getEntryHours(entry) * (entry.projectHourlyRate || 0),
                                currency
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {getEntryHours(entry).toFixed(2)} hrs @{" "}
                              {formatCurrency(entry.projectHourlyRate || 0, currency)}/hr
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Payment terms, special instructions, etc."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-1.5"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Issue Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-1"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {formatDate(issueDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={issueDate}
                      onSelect={(date) => date && setIssueDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal mt-1"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {formatDate(dueDate)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => date && setDueDate(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedEntryIds.length} entries selected
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(calculateSubtotal(), currency)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tax Rate (%)</span>
                  <Input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-right"
                    min={0}
                    max={100}
                    step={0.5}
                  />
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatCurrency(calculateTax(), currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 h-8 text-right"
                    min={0}
                    step={0.01}
                  />
                </div>
                <div className="flex justify-between border-t pt-3 font-semibold">
                  <span>Total</span>
                  <span className="text-blue-600">
                    {formatCurrency(calculateTotal(), currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Currency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Create Button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreate}
            disabled={
              !selectedClientId ||
              selectedEntryIds.length === 0 ||
              createInvoice.isPending
            }
          >
            {createInvoice.isPending ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/invoices/new")({
  component: () => (
    <ErrorBoundary>
      <NewInvoicePage />
    </ErrorBoundary>
  ),
});
