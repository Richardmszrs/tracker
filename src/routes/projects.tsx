import { createFileRoute } from "@tanstack/react-router";

function ProjectsPage() {
  return (
    <div className="flex size-full items-center justify-center text-lg text-muted-foreground">
      Projects
    </div>
  );
}

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});
