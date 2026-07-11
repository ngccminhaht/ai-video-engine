"use client";

import { StatsCards } from "@/features/dashboard/components/stats-cards";
import { GpuStatus } from "@/features/dashboard/components/gpu-status";
import { RecentJobs } from "@/features/dashboard/components/recent-jobs";
import { mockDashboardStats, mockRecentJobs, mockWorkers } from "@/mocks/dashboard";

export default function DashboardPage() {
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
      <StatsCards stats={mockDashboardStats} />

      {/* GPU & Workers Status */}
      <GpuStatus stats={mockDashboardStats} workers={mockWorkers} />

      {/* Recent Jobs */}
      <RecentJobs jobs={mockRecentJobs} />
    </div>
  );
}
