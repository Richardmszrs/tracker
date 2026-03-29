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
  { keys: ["E"], desc: "Edit focused entry" },
  { keys: ["R"], desc: "Resume focused entry" },
  { keys: ["Delete"], desc: "Delete focused entry" },
];

export default function Sidebar() {
  const location = useLocation();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <aside className="mr-3 flex h-full w-56 flex-col rounded-[2rem] border border-sidebar-border bg-sidebar/90 pb-4 pt-6 shadow-[0_28px_72px_-42px_rgba(15,23,42,0.45)] ring-1 ring-white/40 backdrop-blur-xl">
        <div className="mb-8 px-6">
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
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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
        <div className="flex flex-col gap-1 px-3">
          <div className="mx-1 mb-2 rounded-2xl border border-sidebar-border/80 bg-background/55 px-3.5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[0.625rem] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Sync
              </span>
              <SyncIndicator />
            </div>
          </div>
          <Link
            className={cn(
              "flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm transition-all",
              location.pathname === "/settings"
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            to="/settings"
          >
            <Settings className="size-4 shrink-0" />
            Settings
          </Link>
          <button
            className="flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setShortcutsOpen(true)}
          >
            <KeyboardIcon className="size-4 shrink-0" />
            Shortcuts
          </button>
        </div>
      </aside>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-lg">
          <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.82))] px-6 pb-6 pt-8 sm:px-8">
            <DialogHeader className="gap-2">
              <DialogTitle className="text-lg">Keyboard Shortcuts</DialogTitle>
              <DialogDescription className="max-w-md">
                Quick reference for the fastest paths through the app.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid gap-3 px-6 py-6 sm:px-8">
            {shortcuts.map((s) => (
              <div
                key={s.desc}
                className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3"
              >
                <span className="text-xs text-muted-foreground">{s.desc}</span>
                <div className="flex gap-1">
                  {s.keys.map((k) => (
                    <Badge key={k} variant="outline" className="h-6 rounded-full bg-background/80 px-2 font-mono text-[0.625rem]">
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
