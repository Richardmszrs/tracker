import { useState } from "react";
import { Cloud, CloudOff, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/utils/tailwind";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAuthUser,
  useAuthSignIn,
  useAuthSignUp,
  useAuthSignOut,
  useSyncStatus,
  useSyncTrigger,
} from "@/lib/queries";

export function SyncIndicator() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const { data: authData } = useAuthUser();
  const { data: syncStatus } = useSyncStatus();

  const signInMutation = useAuthSignIn();
  const signUpMutation = useAuthSignUp();
  const signOutMutation = useAuthSignOut();
  const syncTriggerMutation = useSyncTrigger();

  const user = authData?.user;
  const isAuthenticated = !!user;
  const isOnline = syncStatus?.isOnline ?? true;
  const isSyncing = syncStatus?.isSyncing ?? false;
  const pendingCount = syncStatus?.pendingCount ?? 0;
  const lastSyncedAt = syncStatus?.lastSyncedAt;

  const getTimeSinceSync = () => {
    if (!lastSyncedAt) return null;
    const minutes = Math.floor((Date.now() - lastSyncedAt) / 60000);
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 min ago";
    return `${minutes} min ago`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signin") {
      await signInMutation.mutateAsync({ email, password });
    } else {
      await signUpMutation.mutateAsync({ email, password });
    }
    setEmail("");
    setPassword("");
  };

  const handleSignOut = async () => {
    await signOutMutation.mutateAsync();
  };

  const handleSyncNow = async () => {
    await syncTriggerMutation.mutateAsync();
  };

  const getStatusIcon = () => {
    if (!isAuthenticated) {
      return <CloudOff className="size-3.5 text-muted-foreground" />;
    }
    if (isSyncing) {
      return <Loader2 className="size-3.5 animate-spin text-blue-500" />;
    }
    if (!isOnline || pendingCount > 0) {
      return <Cloud className="size-3.5 text-orange-500" />;
    }
    return <Cloud className="size-3.5 text-green-500" />;
  };

  const getStatusText = () => {
    if (!isAuthenticated) return "Local only";
    if (isSyncing) return "Syncing...";
    if (!isOnline) return "Offline";
    if (pendingCount > 0) return `${pendingCount} pending`;
    const timeSince = getTimeSinceSync();
    return timeSince ? `Synced ${timeSince}` : "Synced";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {getStatusIcon()}
          <span className="hidden sm:inline">{getStatusText()}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start" side="top">
        {isAuthenticated ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Sync Status</p>
              <p className="text-xs text-muted-foreground">
                {lastSyncedAt
                  ? `Last synced: ${new Date(lastSyncedAt).toLocaleString()}`
                  : "Never synced"}
              </p>
              {pendingCount > 0 && (
                <p className="text-xs text-orange-500">
                  {pendingCount} changes pending
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSyncNow}
                disabled={isSyncing || !isOnline}
                className="flex-1"
              >
                {isSyncing ? (
                  <Loader2 className="mr-1 size-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 size-3" />
                )}
                Sync now
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSignOut}
                disabled={signOutMutation.isPending}
              >
                <LogOut className="size-3" />
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Sign in to sync</p>
              <p className="text-xs text-muted-foreground">
                Your data will be backed up to Supabase
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-email" className="text-xs">
                Email
              </Label>
              <Input
                id="sync-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sync-password" className="text-xs">
                Password
              </Label>
              <Input
                id="sync-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-8 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                className="flex-1"
                disabled={signInMutation.isPending || signUpMutation.isPending}
              >
                {mode === "signin" ? "Sign in" : "Sign up"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              >
                {mode === "signin" ? "Sign up" : "Sign in"}
              </Button>
            </div>

            {(signInMutation.error || signUpMutation.error) && (
              <p className="text-xs text-red-500">
                {signInMutation.error?.message || signUpMutation.error?.message}
              </p>
            )}
          </form>
        )}
      </PopoverContent>
    </Popover>
  );
}
