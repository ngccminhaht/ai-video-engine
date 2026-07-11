"use client";

import { StatsCards } from "@/features/dashboard/components/stats-cards";
import { GpuStatus } from "@/features/dashboard/components/gpu-status";
import { RecentJobs } from "@/features/dashboard/components/recent-jobs";
import {
  useDashboardStats,
  useRecentJobs,
  useWorkers,
} from "@/features/dashboard/hooks/use-dashboard";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentJobs, isLoading: jobsLoading } = useRecentJobs(5);
  const { data: workers, isLoading: workersLoading } = useWorkers();

  if (statsLoading || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your AI Video generation system
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* GPU & Workers Status */}
      <GpuStatus stats={stats} workers={workers || []} />

      {/* Recent Jobs */}
      <RecentJobs jobs={recentJobs || []} />
    </div>
  );
}
