"use client";

import type { DashboardStats } from "@/types";
import { ListVideo, Clock, Play, CheckCircle2, XCircle, Boxes, Cpu, HardDrive } from "lucide-react";
import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

function StatsCard({ title, value, subtitle, icon, trend, trendUp }: StatsCardProps) {
  return (
    <div
      className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6 flex flex-col gap-3 transition-all duration-200 hover:shadow-md"
      style={{ boxShadow: "0 1px 2px rgba(71,24,29,0.04), 0 8px 24px rgba(71,24,29,0.05)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium" style={{ color: "#847174" }}>{title}</span>
        <div className="p-2 rounded-lg" style={{ background: "#FFF0F0", color: "#C5242D" }}>{icon}</div>
      </div>
      <div>
        <span className="text-2xl font-bold" style={{ color: "#241719" }}>{value}</span>
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-1.5">
          {trend && <span className={cn("text-xs", trendUp ? "text-[#178553]" : "text-[#847174]")}>{trend}</span>}
          {subtitle && <span className="text-xs" style={{ color: "#847174" }}>{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

interface StatsCardsProps { stats: DashboardStats; }

export function StatsCards({ stats }: StatsCardsProps) {
  const t = useTranslations("DashboardStats");
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-5">
      <StatsCard title={t("total_jobs")} value={stats.total_jobs.toLocaleString()} icon={<ListVideo className="w-4 h-4" />} trend="+14% from last 7 days" trendUp />
      <StatsCard title={t("pending")} value={stats.pending_jobs} icon={<Clock className="w-4 h-4" />} subtitle={t("in_active_processing")} />
      <StatsCard title={t("running")} value={stats.running_jobs} icon={<Play className="w-4 h-4" />} subtitle="5 Free workers 7 days" />
      <StatsCard title={t("completed")} value={stats.completed_jobs.toLocaleString()} icon={<CheckCircle2 className="w-4 h-4" />} trend="+8.5% from last 7 days" trendUp />
      <StatsCard title={t("failed")} value={stats.failed_jobs} icon={<XCircle className="w-4 h-4" />} subtitle="+4 from last 7 days" />
      <StatsCard title={t("models_installed")} value={stats.total_models} icon={<Boxes className="w-4 h-4" />} subtitle="+2 new" />
      <StatsCard title={t("workers_online")} value={`${stats.loaded_models} / ${stats.total_models_available}`} icon={<Cpu className="w-4 h-4" />} subtitle={t("all_active")} />
      <StatsCard title={t("storage_used")} value={`${stats.storage_used_tb} TB`} icon={<HardDrive className="w-4 h-4" />} subtitle="+5 of 6 TB" />
    </div>
  );
}
