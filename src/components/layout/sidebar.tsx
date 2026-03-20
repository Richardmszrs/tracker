import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  FolderKanban,
  LayoutDashboard,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/utils/tailwind";

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Tags", to: "/tags", icon: Tag },
  { label: "Reports", to: "/reports", icon: BarChart3 },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="flex h-full w-48 flex-col border-border border-r bg-sidebar py-4">
      <div className="mb-6 px-4">
        <h1 className="font-semibold text-lg">Time Tracker</h1>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              key={item.to}
              to={item.to}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
