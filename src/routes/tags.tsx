import { createFileRoute } from "@tanstack/react-router";

function TagsPage() {
  return (
    <div className="flex size-full items-center justify-center text-lg text-muted-foreground">
      Tags
    </div>
  );
}

export const Route = createFileRoute("/tags")({
  component: TagsPage,
});
