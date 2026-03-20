import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

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
export function useEntries(input?: { startDate?: number; endDate?: number }) {
  return useQuery({
    queryKey: ["entries", input],
    queryFn: () => api.entries.list(input ?? {}),
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
