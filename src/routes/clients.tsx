import { createFileRoute } from "@tanstack/react-router";

function ClientsPage() {
  return (
    <div className="flex size-full items-center justify-center text-lg text-muted-foreground">
      Clients
    </div>
  );
}

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});
