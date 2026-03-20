import { useLocation } from "@tanstack/react-router";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/clients": "Clients",
  "/tags": "Tags",
  "/reports": "Reports",
};

export default function TopBar() {
  const location = useLocation();
  const title = pageTitles[location.pathname] ?? "Time Tracker";

  return (
    <header className="flex h-12 items-center justify-between border-border border-b px-6">
      <h2 className="font-semibold text-sm">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="font-mono text-sm tabular-nums">00:00:00</span>
      </div>
    </header>
  );
}
