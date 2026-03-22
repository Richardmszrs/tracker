import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// Auth
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
}

export function useAuthUser() {
  return useQuery({
    queryKey: ["auth", "user"],
    queryFn: () => api.auth.getUser(),
    staleTime: 60_000,
  });
}

export function useAuthSignIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.auth.signIn(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    },
  });
}

export function useAuthSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      api.auth.signUp(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    },
  });
}

export function useAuthSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.auth.signOut(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth"] });
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    },
  });
}

// Sync
export interface SyncStatus {
  lastSyncedAt: number | null;
  isSyncing: boolean;
  isOnline: boolean;
  pendingCount: number;
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: () => api.sync.getStatus(),
    refetchInterval: 30_000,
  });
}

export function useSyncTrigger() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.sync.trigger(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync"] });
    },
  });
}

export function useSyncSettings() {
  return useQuery({
    queryKey: ["sync", "settings"],
    queryFn: () => api.sync.getSettings(),
    staleTime: Infinity,
  });
}

export function useSyncUpdateFrequency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { frequency: "1" | "5" | "15" | "manual" }) =>
      api.sync.updateFrequency(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "settings"] });
    },
  });
}

export function useSyncUpdateOnFocus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { enabled: boolean }) => api.sync.updateOnFocus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "settings"] });
    },
  });
}

// Timer
export function useTimerState() {
  return useQuery({
    queryKey: ["timer", "state"],
    queryFn: () => api.timer.getState(),
    refetchInterval: 1000,
  });
}

export function useTimerStart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { description: string; projectId?: string | null; tagIds?: string[] }) =>
      api.timer.start(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timer"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useTimerStop() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.timer.stop(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timer"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

// Projects
export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useProjectCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      color: string;
      clientId?: string;
      hourlyRate?: number;
    }) => api.projects.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      name?: string;
      color?: string;
      clientId?: string | null;
      hourlyRate?: number | null;
      archived?: boolean;
    }) => api.projects.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useProjectDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string }) => api.projects.delete(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Clients
export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients.list(),
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useClientCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => api.clients.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useClientUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; name: string }) =>
      api.clients.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useClientDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string }) => api.clients.delete(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

// Tags
export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => api.tags.list(),
    staleTime: 30_000,
    gcTime: 300_000,
  });
}

export function useTagCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string }) => api.tags.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}

export function useTagDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string }) => api.tags.delete(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

// Entries
export interface EntriesFilters {
  startDate?: number;
  endDate?: number;
  projectIds?: string[];
  clientIds?: string[];
  billable?: "all" | "billable" | "non-billable";
}

export function useEntries(filters?: EntriesFilters) {
  return useQuery({
    queryKey: ["entries", filters],
    queryFn: () => api.entries.list({
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    }),
    staleTime: 10_000,
  });
}

export function useEntryCreate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      description: string;
      startAt: number;
      endAt?: number;
      projectId?: string;
      billable?: boolean;
      tagIds?: string[];
    }) => api.entries.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useEntryUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      description?: string;
      startAt?: number;
      endAt?: number | null;
      projectId?: string | null;
      billable?: boolean;
      tagIds?: string[];
    }) => api.entries.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useEntryDelete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string }) => api.entries.delete(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });
}

export function useExportEntries() {
  return useMutation({
    mutationFn: (input: {
      format: "csv" | "json";
      filters?: {
        startDate?: number;
        endDate?: number;
        projectIds?: string[];
        clientIds?: string[];
        billable?: "all" | "billable" | "non-billable";
      };
    }) => api.entries.export(input),
  });
}

// Settings
export interface AppSettings {
  idleThresholdMinutes: number;
  defaultBillable: boolean;
  weekStartsOn: 0 | 1;
  currencySymbol: string;
  theme: "light" | "dark" | "system";
  onboardingComplete: boolean;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => api.settings.get(),
    staleTime: Infinity,
  });
}

export function useSettingsUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<AppSettings>) => api.settings.update(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
