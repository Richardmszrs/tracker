import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

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
    mutationFn: (input: { description: string; projectId?: string | null }) =>
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

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
  });
}

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
