"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useSettings, useSettingsUpdate, type AppSettings } from "@/lib/queries";
import { setTheme } from "@/actions/theme";

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

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <h3 className="text-sm font-medium">Settings</h3>

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
