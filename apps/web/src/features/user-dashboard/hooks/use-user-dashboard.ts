"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";

const API_BASE = "/api/v1";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export interface DashboardStats {
  total_videos: number;
  completed_videos: number;
  processing_jobs: number;
  failed_jobs: number;
  credits: number;
}

export interface ActiveJob {
  id: string;
  task_type: string;
  status: string;
  progress: number;
  stage: string | null;
  prompt: string | null;
  created_at: string;
}

export interface UserDashboardData {
  stats: DashboardStats;
  active_jobs: ActiveJob[];
  recent_completed: ActiveJob[];
}

export function useUserDashboard() {
  return useQuery<UserDashboardData>({
    queryKey: ["user", "dashboard"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/me/dashboard`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        throw new Error("Failed to fetch dashboard");
      }
      return res.json();
    },
    refetchInterval: 10000,
  });
}
