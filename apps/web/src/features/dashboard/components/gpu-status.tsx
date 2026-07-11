"use client";

import type { Worker, DashboardStats } from "@/types";
import { cn } from "@/lib/utils";

import { useTranslations } from "next-intl";

interface GpuStatusProps { stats: DashboardStats; workers: Worker[]; }

export function GpuStatus({ stats, workers }: GpuStatusProps) {
  const t = useTranslations("Dashboard");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="text-[15px] font-semibold mb-5" style={{ color: "#241719" }}>{t("gpu_status")}</h3>
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "#847174" }}>GPU Utilization</span>
              <span className="text-sm font-semibold" style={{ color: "#241719" }}>{stats.gpu_utilization}%</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#F2E3E4" }}>
              <div className="h-full rounded-full transition-all" style={{ background: "#C5242D", width: `${stats.gpu_utilization}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "#847174" }}>VRAM Usage</span>
              <span className="text-sm font-semibold" style={{ color: "#241719" }}>{stats.vram_used_gb} / {stats.vram_total_gb} GB</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#F2E3E4" }}>
              <div className="h-full rounded-full transition-all" style={{ background: "#178553", width: `${(stats.vram_used_gb / stats.vram_total_gb) * 100}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5 pt-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className={cn("flex-1 h-6 rounded-sm", i < Math.round(stats.gpu_utilization / 5) ? "bg-[#C5242D]/80" : "bg-[#F2E3E4]")} />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="text-[15px] font-semibold mb-5" style={{ color: "#241719" }}>{t("workers_status")}</h3>
        <div className="space-y-0">
          {workers.map((worker) => (
            <div key={worker.id} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #F3E9E9" }}>
              <div className="flex items-center gap-3">
                <span className={cn("w-2.5 h-2.5 rounded-full", worker.status === "online" ? "bg-[#178553]" : worker.status === "busy" ? "bg-[#B66A00]" : "bg-[#D92D20]")} />
                <span className="text-sm font-medium" style={{ color: "#241719" }}>{worker.id}</span>
              </div>
              <div className="flex items-center gap-5 text-xs" style={{ color: "#847174" }}>
                <span>{worker.gpu.name.replace("NVIDIA ", "")}</span>
                <span>{worker.gpu.utilization_percent}%</span>
                <span>{worker.gpu.vram_used_gb} / {worker.gpu.vram_total_gb} GB</span>
                <span className={cn("capitalize font-medium", worker.status === "online" ? "text-[#178553]" : worker.status === "busy" ? "text-[#B66A00]" : "text-[#D92D20]")}>{worker.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
