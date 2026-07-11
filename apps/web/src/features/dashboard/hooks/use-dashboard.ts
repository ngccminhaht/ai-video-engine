"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { dashboardApi, jobsApi } from "@/lib/api/client";
import { mockDashboardStats, mockRecentJobs, mockWorkers } from "@/mocks/dashboard";
import type { DashboardStats, Job, Worker } from "@/types";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      if (useMock) return mockDashboardStats;
      return dashboardApi.getStats();
    },
    refetchInterval: 10000, // Refresh every 10s
  });
}

export function useRecentJobs(limit = 5) {
  return useQuery<Job[]>({
    queryKey: [...queryKeys.jobs.all, "recent", limit],
    queryFn: async () => {
      if (useMock) return mockRecentJobs.slice(0, limit);
      const data = await jobsApi.list({ limit });
      return data.jobs;
    },
    refetchInterval: 5000, // Refresh every 5s
  });
}

export function useWorkers() {
  return useQuery<Worker[]>({
    queryKey: queryKeys.workers.list(),
    queryFn: async () => {
      if (useMock) return mockWorkers;
      // Phase 2 will have a real workers endpoint
      // For now, return empty array from real API
      try {
        const { workersApi } = await import("@/lib/api/client");
        return workersApi.list();
      } catch {
        return [];
      }
    },
    refetchInterval: 10000,
  });
}
