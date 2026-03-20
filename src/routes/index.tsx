"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ManualEntryDialog } from "@/components/entries/manual-entry-dialog";
import { TimeEntriesList } from "@/components/entries/time-entries-list";

function DashboardPage() {
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Today</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setManualEntryOpen(true)}
        >
          <PlusIcon className="size-3" />
          Add manual entry
        </Button>
      </div>
      <TimeEntriesList />
      <ManualEntryDialog
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
      />
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
