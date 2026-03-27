import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  FileText,
  FolderKanban,
  KeyboardIcon,
  LayoutDashboard,
  Settings,
  Tag,
  Users,
} from "lucide-react";
import { cn } from "@/utils/tailwind";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { SyncIndicator } from "@/components/sync/sync-indicator";

const lightLogoSrc = new URL("../../../images/logo.svg", import.meta.url).href;
const darkLogoSrc = new URL("../../../images/logo_white.svg", import.meta.url).href;

const navItems = [
  { label: "Dashboard", to: "/", icon: LayoutDashboard },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Tags", to: "/tags", icon: Tag },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Invoices", to: "/invoices", icon: FileText },
];

const shortcuts = [
  { keys: ["⌘", "K"], desc: "Open command palette" },
  { keys: ["⌘", "Shift", "T"], desc: "Toggle timer (global)" },
  { keys: ["⌘", "N"], desc: "New manual entry (when focused)" },
  { keys: ["⌘", "B"], desc: "Toggle sidebar (if implemented)" },
];

export default function Sidebar() {
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <aside className="flex h-full w-48 flex-col border-border border-r bg-sidebar pb-4 pt-6">
        <div className="mb-6 pl-6 pr-4">
          <img
            src={lightLogoSrc}
            alt="Time Tracker"
            className="h-8 w-auto dark:hidden"
          />
          <img
            src={darkLogoSrc}
            alt="Time Tracker"
            className="hidden h-8 w-auto dark:block"
          />
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
        <div className="flex flex-col gap-0.5 px-2">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-muted-foreground">Sync</span>
            <SyncIndicator />
          </div>
          <Link
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              location.pathname === "/settings"
                ? "bg-accent font-medium text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            to="/settings"
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </Link>
          <button
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground w-full"
            onClick={() => setShortcutsOpen(true)}
          >
            <KeyboardIcon className="size-4 shrink-0" />
            Shortcuts
          </button>
        </div>
      </aside>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>
              Quick reference for all available shortcuts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            {shortcuts.map((s) => (
              <div key={s.desc} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.desc}</span>
                <div className="flex gap-1">
                  {s.keys.map((k) => (
                    <Badge key={k} variant="outline" className="text-[0.625rem] h-5 px-1.5 font-mono">
                      {k}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
