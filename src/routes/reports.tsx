import { createFileRoute } from "@tanstack/react-router";

function ReportsPage() {
  return (
    <div className="flex size-full items-center justify-center text-lg text-muted-foreground">
      Reports
    </div>
  );
}

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});
