"use client";

import { StatsCards } from "@/features/dashboard/components/stats-cards";
import { GpuStatus } from "@/features/dashboard/components/gpu-status";
import { RecentJobs } from "@/features/dashboard/components/recent-jobs";
import { useDashboardStats, useRecentJobs, useWorkers } from "@/features/dashboard/hooks/use-dashboard";

import { useTranslations } from "next-intl";
export default function DashboardPage() {
  const t = useTranslations("Dashboard");
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: recentJobs } = useRecentJobs(5);
  const { data: workers } = useWorkers();

  if (statsLoading || !stats) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
          <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>{t("subtitle")}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-white border border-[#EBDCDD] rounded-2xl animate-pulse" style={{ boxShadow: "var(--shadow-card)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
        <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>{t("subtitle")}</p>
      </div>
      <StatsCards stats={stats} />
      <GpuStatus stats={stats} workers={workers || []} />
      <RecentJobs jobs={recentJobs || []} />
    </div>
  );
}
