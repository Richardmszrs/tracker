"use client";

import { useState, useMemo } from "react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { DownloadIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useEntries,
  useProjects,
  useClients,
  useExportEntries,
  type EntriesFilters,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DatePreset = "today" | "this_week" | "this_month" | "last_month" | "custom";

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatDurationHours(ms: number): string {
  const h = ms / 3600000;
  return `${h.toFixed(1)}h`;
}

interface EnrichedEntry {
  id: string;
  description: string;
  startAt: Date;
  endAt: Date | null;
  projectId: string | null;
  billable: boolean;
  projectName: string | null;
  projectColor: string | null;
  clientName: string | null;
  hourlyRate: number | null;
  tagNames: string[];
}

interface ReportFilters {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  projectIds: string[];
  clientIds: string[];
  billable: "all" | "billable" | "non-billable";
}

function getPresetRange(preset: DatePreset): { start: Date; end: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { start: startOfDay(now), end: endOfDay(now) };
    case "this_week":
      return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    case "this_month":
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case "last_month": {
      const last = subMonths(now, 1);
      return { start: startOfMonth(last), end: endOfMonth(last) };
    }
    default:
      return { start: startOfDay(now), end: endOfDay(now) };
  }
}

function FilterBar({ filters, onChange }: { filters: ReportFilters; onChange: (f: ReportFilters) => void }) {
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const [projectOpen, setProjectOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const presets: { label: string; value: DatePreset }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "this_week" },
    { label: "This Month", value: "this_month" },
    { label: "Last Month", value: "last_month" },
    { label: "Custom", value: "custom" },
  ];

  const selectedProjects = projects.filter((p) => filters.projectIds.includes(p.id));
  const selectedClients = clients.filter((c) => filters.clientIds.includes(c.id));

  const handlePresetChange = (preset: DatePreset) => {
    if (preset !== "custom") {
      const range = getPresetRange(preset);
      onChange({ ...filters, preset, startDate: range.start, endDate: range.end });
    } else {
      onChange({ ...filters, preset });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          {presets.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={filters.preset === p.value ? "default" : "outline"}
              onClick={() => handlePresetChange(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <Separator orientation="vertical" className="h-5" />

        {filters.preset === "custom" && (
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline">
                {filters.startDate.toLocaleDateString()} – {filters.endDate.toLocaleDateString()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: filters.startDate, to: filters.endDate }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    onChange({ ...filters, startDate: range.from, endDate: range.to });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        )}

        <Separator orientation="vertical" className="h-5" />

        <Popover open={projectOpen} onOpenChange={setProjectOpen}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              {selectedProjects.length > 0 ? (
                <span className="flex gap-1 flex-wrap">
                  {selectedProjects.slice(0, 2).map((p) => (
                    <span key={p.id} className="flex items-center gap-1">
                      <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  ))}
                  {selectedProjects.length > 2 && `+${selectedProjects.length - 2}`}
                </span>
              ) : (
                "All Projects"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search projects..." />
              <CommandList>
                <CommandEmpty>No projects found.</CommandEmpty>
                <CommandGroup>
                  {projects.map((p) => (
                    <CommandItem
                      key={p.id}
                      onSelect={() => {
                        const ids = filters.projectIds.includes(p.id)
                          ? filters.projectIds.filter((id) => id !== p.id)
                          : [...filters.projectIds, p.id];
                        onChange({ ...filters, projectIds: ids });
                      }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`size-2 rounded-full border ${filters.projectIds.includes(p.id) ? "bg-primary" : "border-border"}`}
                      />
                      <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              {selectedClients.length > 0
                ? selectedClients.map((c) => c.name).join(", ")
                : "All Clients"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search clients..." />
              <CommandList>
                <CommandEmpty>No clients found.</CommandEmpty>
                <CommandGroup>
                  {clients.map((c) => (
                    <CommandItem
                      key={c.id}
                      onSelect={() => {
                        const ids = filters.clientIds.includes(c.id)
                          ? filters.clientIds.filter((id) => id !== c.id)
                          : [...filters.clientIds, c.id];
                        onChange({ ...filters, clientIds: ids });
                      }}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`size-2 rounded-full border ${filters.clientIds.includes(c.id) ? "bg-primary" : "border-border"}`}
                      />
                      {c.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          <Switch
            size="sm"
            checked={filters.billable === "billable"}
            onCheckedChange={(v) =>
              onChange({ ...filters, billable: v ? "billable" : "all" })
            }
          />
          <label className="text-xs text-muted-foreground">Billable only</label>
        </div>
      </div>

      {(filters.projectIds.length > 0 || filters.clientIds.length > 0 || filters.billable !== "all") && (
        <div className="flex flex-wrap gap-1">
          {selectedProjects.map((p) => (
            <Badge key={p.id} variant="secondary" className="text-[0.625rem] h-5 gap-1">
              <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
              {p.name}
              <button
                onClick={() => onChange({ ...filters, projectIds: filters.projectIds.filter((id) => id !== p.id) })}
                className="ml-0.5 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
          {selectedClients.map((c) => (
            <Badge key={c.id} variant="secondary" className="text-[0.625rem] h-5">
              {c.name}
              <button
                onClick={() => onChange({ ...filters, clientIds: filters.clientIds.filter((id) => id !== c.id) })}
                className="ml-0.5 hover:text-destructive"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCards({ entries, projectMap }: { entries: EnrichedEntry[]; projectMap: Map<string, { name: string; color: string; hourlyRate: number | null }> }) {
  const totalMs = entries.reduce((sum, e) => {
    if (!e.endAt) return sum;
    return sum + (e.endAt.getTime() - e.startAt.getTime());
  }, 0);

  const billableMs = entries.reduce((sum, e) => {
    if (!e.endAt || !e.billable) return sum;
    return sum + (e.endAt.getTime() - e.startAt.getTime());
  }, 0);

  const nonBillableMs = totalMs - billableMs;

  const billableAmount = entries.reduce((sum, e) => {
    if (!e.endAt || !e.billable) return sum;
    const durationH = (e.endAt.getTime() - e.startAt.getTime()) / 3600000;
    const rate = e.hourlyRate ?? projectMap.get(e.projectId ?? "")?.hourlyRate ?? 0;
    return sum + durationH * rate;
  }, 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card size="sm">
        <CardContent className="px-4 py-3">
          <p className="text-muted-foreground text-[0.625rem]">Total Time</p>
          <p className="text-xl font-semibold tabular-nums">{formatDurationHours(totalMs)}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="px-4 py-3">
          <p className="text-muted-foreground text-[0.625rem]">Billable</p>
          <p className="text-xl font-semibold tabular-nums">{formatDurationHours(billableMs)}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="px-4 py-3">
          <p className="text-muted-foreground text-[0.625rem]">Non-billable</p>
          <p className="text-xl font-semibold tabular-nums">{formatDurationHours(nonBillableMs)}</p>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent className="px-4 py-3">
          <p className="text-muted-foreground text-[0.625rem]">Billable Amount</p>
          <p className="text-xl font-semibold tabular-nums">${billableAmount.toFixed(2)}</p>
        </CardContent>
      </Card>
    </div>
  );
}

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];

function BarChartView({ entries }: { entries: EnrichedEntry[] }) {
  const byDay = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const e of entries) {
      if (!e.endAt) continue;
      const dateKey = e.startAt.toISOString().split("T")[0];
      if (!map.has(dateKey)) map.set(dateKey, new Map());
      const dayMap = map.get(dateKey)!;
      const key = e.projectId ?? "unassigned";
      dayMap.set(key, (dayMap.get(key) ?? 0) + (e.endAt.getTime() - e.startAt.getTime()) / 3600000);
    }
    const projectIds = [...new Set(entries.map((e) => e.projectId).filter(Boolean))];
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayMap]) => {
        const result: Record<string, string | number> = {
          date: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        };
        for (const [pid, hours] of dayMap) {
          result[pid ?? "unassigned"] = Math.round(hours * 10) / 10;
        }
        return result;
      });
  }, [entries]);

  const projectIds = [...new Set(entries.map((e) => e.projectId).filter(Boolean))];

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
        No data to display
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={byDay} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        {projectIds.map((pid, i) => {
          const p = entries.find((e) => e.projectId === pid)?.projectName;
          return (
            <Bar
              key={pid}
              dataKey={pid ?? "unassigned"}
              name={p ?? "No Project"}
              stackId="stack"
              fill={CHART_COLORS[i % CHART_COLORS.length]}
            />
          );
        })}
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieChartView({ entries, projectMap }: { entries: EnrichedEntry[]; projectMap: Map<string, { name: string; color: string; hourlyRate: number | null }> }) {
  const byProject = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (!e.endAt) continue;
      const key = e.projectId ?? "unassigned";
      map.set(key, (map.get(key) ?? 0) + (e.endAt.getTime() - e.startAt.getTime()) / 3600000);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
    return Array.from(map.entries())
      .map(([pid, hours]) => {
        const proj = projectMap.get(pid);
        return {
          id: pid,
          name: proj?.name ?? "No Project",
          color: proj?.color ?? "#888",
          hours: Math.round(hours * 10) / 10,
          percent: total > 0 ? Math.round((hours / total) * 100) : 0,
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [entries, projectMap]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
        No data to display
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <ResponsiveContainer width={160} height={160}>
        <PieChart>
          <Pie
            data={byProject}
            dataKey="hours"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={70}
          >
            {byProject.map((entry) => (
              <Cell key={entry.id} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 justify-center flex-1">
        {byProject.map((entry) => (
          <div key={entry.id} className="flex items-center gap-2 text-xs">
            <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="flex-1 truncate">{entry.name}</span>
            <span className="tabular-nums text-muted-foreground">{entry.hours}h ({entry.percent}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_SIZE = 25;

function EntriesTable({ entries, projectMap }: { entries: EnrichedEntry[]; projectMap: Map<string, { name: string; color: string; hourlyRate: number | null }> }) {
  const columns: ColumnDef<EnrichedEntry>[] = [
    {
      accessorKey: "startAt",
      header: "Date",
      cell: ({ row }) => row.original.startAt.toLocaleDateString(),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="truncate max-w-48">{row.original.description}</span>,
    },
    {
      accessorKey: "projectName",
      header: "Project",
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: row.original.projectColor ?? "#888" }} />
          {row.original.projectName ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "clientName",
      header: "Client",
      cell: ({ row }) => row.original.clientName ?? "—",
    },
    {
      accessorKey: "tagNames",
      header: "Tags",
      cell: ({ row }) => (
        <span className="flex gap-0.5 flex-wrap">
          {row.original.tagNames.map((t) => (
            <Badge key={t} variant="outline" className="text-[0.625rem] h-3.5">{t}</Badge>
          ))}
        </span>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const e = row.original;
        if (!e.endAt) return "—";
        return formatDuration(e.endAt.getTime() - e.startAt.getTime());
      },
    },
    {
      accessorKey: "billable",
      header: "Billable",
      cell: ({ row }) => (
        <Badge variant={row.original.billable ? "secondary" : "outline"} className="text-[0.625rem] h-5">
          {row.original.billable ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const e = row.original;
        if (!e.endAt) return "—";
        const durationH = (e.endAt.getTime() - e.startAt.getTime()) / 3600000;
        const rate = e.hourlyRate ?? projectMap.get(e.projectId ?? "")?.hourlyRate ?? 0;
        return rate > 0 ? `$${(durationH * rate).toFixed(2)}` : "—";
      },
    },
  ];

  const [sorting, setSorting] = useState<SortingState>([{ id: "startAt", desc: true }]);
  const [pageIndex, setPageIndex] = useState(0);

  const table = useReactTable({
    data: entries,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater as SortingState);
      setPageIndex(0);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const sorted = table.getRowModel().rows;
  const pageCount = Math.ceil(sorted.length / PAGE_SIZE);
  const paginatedRows = sorted.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-2">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="cursor-pointer select-none"
                  onClick={() => {
                    const col = header.column;
                    const current = sorting.find((s) => s.id === col.id);
                    if (current && !current.desc) {
                      col.clearSorting();
                    } else {
                      col.toggleSorting(current?.desc ?? false);
                    }
                    setPageIndex(0);
                  }}
                >
                  <span className="flex items-center gap-1">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    {sorting.find((s) => s.id === header.id)?.desc && <ArrowDownIcon className="size-3" />}
                    {sorting.find((s) => s.id === header.id) && !sorting.find((s) => s.id === header.id)?.desc && <ArrowUpIcon className="size-3" />}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {paginatedRows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {paginatedRows.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                No entries found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Page {pageIndex + 1} of {pageCount || 1} · {entries.length} entries
        </span>
        <div className="flex gap-1">
          <Button size="icon-sm" variant="outline" onClick={() => setPageIndex(0)} disabled={pageIndex === 0}>«</Button>
          <Button size="icon-sm" variant="outline" onClick={() => setPageIndex((p) => p - 1)} disabled={pageIndex === 0}>‹</Button>
          <Button size="icon-sm" variant="outline" onClick={() => setPageIndex((p) => p + 1)} disabled={pageIndex >= pageCount - 1}>›</Button>
          <Button size="icon-sm" variant="outline" onClick={() => setPageIndex(pageCount - 1)} disabled={pageIndex >= pageCount - 1}>»</Button>
        </div>
      </div>
    </div>
  );
}

function ReportsPage() {
  const now = new Date();
  const [filters, setFilters] = useState<ReportFilters>({
    preset: "this_month",
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
    projectIds: [],
    clientIds: [],
    billable: "all",
  });

  const { data: allEntries = [] } = useEntries();
  const { data: projects = [] } = useProjects();
  const { data: clients = [] } = useClients();
  const exportMutation = useExportEntries();

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const clientIdMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.name])),
    [clients]
  );

  const enrichedEntries = useMemo<EnrichedEntry[]>(() => {
    let filtered = allEntries.map((e) => ({
      ...e,
      startAt: new Date(e.startAt),
      endAt: e.endAt ? new Date(e.endAt) : null,
      projectName: e.projectId ? projectMap.get(e.projectId)?.name ?? null : null,
      projectColor: e.projectId ? projectMap.get(e.projectId)?.color ?? null : null,
      clientName: e.projectId
        ? (() => {
            const clientId = projectMap.get(e.projectId!)?.clientId;
            return clientId ? clientIdMap.get(clientId) ?? null : null;
          })()
        : null,
      hourlyRate: e.projectId ? projectMap.get(e.projectId)?.hourlyRate ?? null : null,
      tagNames: (e as { tags?: { tagId: string }[] }).tags?.map((t) => t.tagId) ?? [],
    }));

    filtered = filtered.filter(
      (e) =>
        e.startAt >= filters.startDate &&
        e.startAt <= filters.endDate
    );

    if (filters.projectIds.length > 0) {
      filtered = filtered.filter((e) => e.projectId && filters.projectIds.includes(e.projectId));
    }

    if (filters.clientIds.length > 0) {
      filtered = filtered.filter((e) => {
        if (!e.clientName) return false;
        const cid = clients.find((c) => c.name === e.clientName)?.id;
        return cid && filters.clientIds.includes(cid);
      });
    }

    if (filters.billable === "billable") {
      filtered = filtered.filter((e) => e.billable);
    } else if (filters.billable === "non-billable") {
      filtered = filtered.filter((e) => !e.billable);
    }

    return filtered;
  }, [allEntries, filters, projects, clients, projectMap, clientIdMap]);

  const handleExportCSV = () => {
    exportMutation.mutate({
      format: "csv",
      filters: {
        startDate: filters.startDate.getTime(),
        endDate: filters.endDate.getTime(),
        projectIds: filters.projectIds,
        clientIds: filters.clientIds,
        billable: filters.billable,
      },
    });
  };

  const handleExportJSON = () => {
    exportMutation.mutate({
      format: "json",
      filters: {
        startDate: filters.startDate.getTime(),
        endDate: filters.endDate.getTime(),
        projectIds: filters.projectIds,
        clientIds: filters.clientIds,
        billable: filters.billable,
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Reports</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={exportMutation.isPending}>
              <DownloadIcon className="size-3 mr-1" />
              Export
              <ChevronDownIcon className="size-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCSV}>Export CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportJSON}>Export JSON</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <FilterBar filters={filters} onChange={setFilters} />

      <SummaryCards entries={enrichedEntries} projectMap={projectMap} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium mb-3">Hours by Day</p>
            <BarChartView entries={enrichedEntries} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="px-4 py-3">
            <p className="text-xs font-medium mb-3">Time by Project</p>
            <PieChartView entries={enrichedEntries} projectMap={projectMap} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="px-0 py-3">
          <EntriesTable entries={enrichedEntries} projectMap={projectMap} />
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});
