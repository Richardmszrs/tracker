import { createFileRoute, Outlet } from "@tanstack/react-router";

function InvoicesLayout() {
  return <Outlet />;
}

export const Route = createFileRoute("/invoices")({
  component: InvoicesLayout,
});
