"use client";

import type { DashboardStats } from "@/types";
import {
  ListVideo,
  Clock,
  Play,
  CheckCircle2,
  XCircle,
  Boxes,
  Cpu,
  HardDrive,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">{title}</span>
        <div className="p-1.5 rounded-md bg-secondary text-muted-foreground">
          {icon}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
      </div>
      {(subtitle || trend) && (
        <div className="flex items-center gap-1">
          {trend && (
            <span
              className={cn(
                "text-xs",
                trendUp ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              {trend}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-muted-foreground">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Jobs"
        value={stats.total_jobs.toLocaleString()}
        icon={<ListVideo className="w-4 h-4" />}
        trend="+14% from last 7 days"
        trendUp
      />
      <StatsCard
        title="Pending"
        value={stats.pending_jobs}
        icon={<Clock className="w-4 h-4" />}
        subtitle="in active processing"
      />
      <StatsCard
        title="Running"
        value={stats.running_jobs}
        icon={<Play className="w-4 h-4" />}
        subtitle="5 Free workers 7 days"
      />
      <StatsCard
        title="Completed"
        value={stats.completed_jobs.toLocaleString()}
        icon={<CheckCircle2 className="w-4 h-4" />}
        trend="+8.5% from last 7 days"
        trendUp
      />
      <StatsCard
        title="Failed"
        value={stats.failed_jobs}
        icon={<XCircle className="w-4 h-4" />}
        subtitle="+4 from last 7 days"
      />
      <StatsCard
        title="Models Installed"
        value={stats.total_models}
        icon={<Boxes className="w-4 h-4" />}
        subtitle="+2 new"
      />
      <StatsCard
        title="Workers Online"
        value={`${stats.loaded_models} / ${stats.total_models_available}`}
        icon={<Cpu className="w-4 h-4" />}
        subtitle="all active"
      />
      <StatsCard
        title="Storage Used"
        value={`${stats.storage_used_tb} TB`}
        icon={<HardDrive className="w-4 h-4" />}
        subtitle="+5 of 6 TB"
      />
    </div>
  );
}
