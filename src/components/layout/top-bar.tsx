import { useLocation } from "@tanstack/react-router";
import { TimerDisplay } from "@/components/timer/timer-display";

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
    <header className="flex h-20 items-start justify-between border-b border-border/60 bg-background/55 px-6 pt-4 backdrop-blur-xl [-webkit-app-region:drag]">
      <div className="space-y-0.5 [-webkit-app-region:no-drag]">
        <div className="text-[0.625rem] font-medium uppercase tracking-[0.24em] text-muted-foreground">
          Upweb Time Tracker
        </div>
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="flex items-center gap-4 [-webkit-app-region:no-drag]">
        <TimerDisplay />
      </div>
    </header>
  );
}
