"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  useSettings,
  useSettingsUpdate,
  useAuthUser,
  useAuthSignIn,
  useAuthSignUp,
  useAuthSignOut,
  useSyncStatus,
  useSyncTrigger,
  useSyncSettings,
  useSyncUpdateFrequency,
  useSyncUpdateOnFocus,
  type AppSettings,
} from "@/lib/queries";
import { setTheme } from "@/actions/theme";
import { Loader2 } from "lucide-react";

const IDLE_OPTIONS = [
  { label: "Disabled", value: 0 },
  { label: "5 min", value: 5 },
  { label: "10 min", value: 10 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
];

const WEEK_OPTIONS = [
  { label: "Monday", value: 1 as const },
  { label: "Sunday", value: 0 as const },
];

const THEME_OPTIONS: { label: string; value: AppSettings["theme"] }[] = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateMutation = useSettingsUpdate();

  // Auth and sync state
  const { data: authData } = useAuthUser();
  const { data: syncStatus } = useSyncStatus();
  const { data: syncSettings } = useSyncSettings();
  const signInMutation = useAuthSignIn();
  const signUpMutation = useAuthSignUp();
  const signOutMutation = useAuthSignOut();
  const syncTriggerMutation = useSyncTrigger();
  const syncFrequencyMutation = useSyncUpdateFrequency();
  const syncOnFocusMutation = useSyncUpdateOnFocus();

  const [syncEmail, setSyncEmail] = useState("");
  const [syncPassword, setSyncPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const user = authData?.user;
  const isAuthenticated = !!user;

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-xs">
        Loading...
      </div>
    );
  }

  const handleUpdate = (key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
    updateMutation.mutate({ [key]: value });
    if (key === "theme" && typeof value === "string") {
      setTheme(value as "light" | "dark" | "system");
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === "signin") {
      await signInMutation.mutateAsync({ email: syncEmail, password: syncPassword });
    } else {
      await signUpMutation.mutateAsync({ email: syncEmail, password: syncPassword });
    }
    setSyncEmail("");
    setSyncPassword("");
  };

  const handleSyncNow = () => {
    syncTriggerMutation.mutate();
  };

  const handleFrequencyChange = (value: string) => {
    syncFrequencyMutation.mutate({ frequency: value as "1" | "5" | "15" | "manual" });
  };

  const handleOnFocusChange = (enabled: boolean) => {
    syncOnFocusMutation.mutate({ enabled });
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h3 className="text-sm font-medium">Settings</h3>

      {/* Account & Sync */}
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-medium mb-3">Account & Sync</h4>

          {isAuthenticated ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label>Signed in as</Label>
                  <span className="text-[0.625rem] text-muted-foreground truncate max-w-[200px]">
                    {user?.email}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => signOutMutation.mutate()}
                  disabled={signOutMutation.isPending}
                >
                  Sign out
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label>Last synced</Label>
                  <span className="text-[0.625rem] text-muted-foreground">
                    {syncStatus?.lastSyncedAt
                      ? new Date(syncStatus.lastSyncedAt).toLocaleString()
                      : "Never"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSyncNow}
                  disabled={syncTriggerMutation.isPending || !syncStatus?.isOnline}
                >
                  {syncTriggerMutation.isPending ? (
                    <Loader2 className="size-3 animate-spin mr-1" />
                  ) : null}
                  Sync now
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="sync-frequency">Sync frequency</Label>
                </div>
                <select
                  id="sync-frequency"
                  className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                  value={
                    syncSettings?.frequency === 60000
                      ? "1"
                      : syncSettings?.frequency === 300000
                        ? "5"
                        : syncSettings?.frequency === 900000
                          ? "15"
                          : "manual"
                  }
                  onChange={(e) => handleFrequencyChange(e.target.value)}
                >
                  <option value="1">Every 1 min</option>
                  <option value="5">Every 5 min</option>
                  <option value="15">Every 15 min</option>
                  <option value="manual">Manual only</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <Label htmlFor="sync-on-focus">Sync on app focus</Label>
                  <span className="text-[0.625rem] text-muted-foreground">
                    Sync when switching to the app
                  </span>
                </div>
                <Switch
                  id="sync-on-focus"
                  checked={syncSettings?.syncOnFocus ?? true}
                  onCheckedChange={handleOnFocusChange}
                />
              </div>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="sync-email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="sync-email"
                  type="email"
                  placeholder="you@example.com"
                  value={syncEmail}
                  onChange={(e) => setSyncEmail(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="sync-password" className="text-xs">
                  Password
                </Label>
                <Input
                  id="sync-password"
                  type="password"
                  placeholder="••••••••"
                  value={syncPassword}
                  onChange={(e) => setSyncPassword(e.target.value)}
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
                  {authMode === "signin" ? "Sign in" : "Sign up"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setAuthMode(authMode === "signin" ? "signup" : "signin")
                  }
                >
                  {authMode === "signin" ? "Sign up" : "Sign in"}
                </Button>
              </div>
              {(signInMutation.error || signUpMutation.error) && (
                <p className="text-xs text-red-500">
                  {signInMutation.error?.message || signUpMutation.error?.message}
                </p>
              )}
            </form>
          )}
        </div>
      </div>

      <Separator />

      {/* Timer */}
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-medium mb-3">Timer</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="idle-threshold">Idle detection</Label>
                <span className="text-[0.625rem] text-muted-foreground">
                  Notify when idle for this long while timer is running
                </span>
              </div>
              <select
                id="idle-threshold"
                className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs"
                value={settings.idleThresholdMinutes}
                onChange={(e) => handleUpdate("idleThresholdMinutes", Number(e.target.value))}
              >
                {IDLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="default-billable">Default billable</Label>
                <span className="text-[0.625rem] text-muted-foreground">
                  New entries are billable by default
                </span>
              </div>
              <Switch
                id="default-billable"
                checked={settings.defaultBillable}
                onCheckedChange={(v) => handleUpdate("defaultBillable", v)}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Reports */}
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-medium mb-3">Reports</h4>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label>Week starts on</Label>
                <span className="text-[0.625rem] text-muted-foreground">
                  Used for weekly report grouping
                </span>
              </div>
              <div className="flex gap-1">
                {WEEK_OPTIONS.map((o) => (
                  <Button
                    key={o.value}
                    size="sm"
                    variant={settings.weekStartsOn === o.value ? "default" : "outline"}
                    onClick={() => handleUpdate("weekStartsOn", o.value)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="currency">Currency symbol</Label>
              </div>
              <input
                id="currency"
                className="h-7 w-16 rounded-md border border-input bg-input/20 px-2 text-xs text-center"
                value={settings.currencySymbol}
                maxLength={3}
                onChange={(e) => handleUpdate("currencySymbol", e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Appearance */}
      <div className="flex flex-col gap-4">
        <div>
          <h4 className="text-xs font-medium mb-3">Appearance</h4>
          <div className="flex gap-1">
            {THEME_OPTIONS.map((o) => (
              <Button
                key={o.value}
                size="sm"
                variant={settings.theme === o.value ? "default" : "outline"}
                onClick={() => handleUpdate("theme", o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Keyboard Shortcuts */}
      <div className="flex flex-col gap-3">
        <h4 className="text-xs font-medium">Keyboard Shortcuts</h4>
        <div className="flex flex-col gap-2 text-xs">
          {[
            { keys: ["⌘", "K"], desc: "Command palette" },
            { keys: ["⌘", "Shift", "T"], desc: "Toggle timer (global)" },
            { keys: ["⌘", "N"], desc: "New manual entry" },
          ].map((shortcut) => (
            <div key={shortcut.desc} className="flex items-center justify-between">
              <span className="text-muted-foreground">{shortcut.desc}</span>
              <div className="flex gap-0.5">
                {shortcut.keys.map((k) => (
                  <Badge key={k} variant="outline" className="text-[0.625rem] h-5 px-1.5">{k}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});
