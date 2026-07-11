"use client";

import type { Worker, DashboardStats } from "@/types";
import { cn } from "@/lib/utils";

interface GpuStatusProps {
  stats: DashboardStats;
  workers: Worker[];
}

export function GpuStatus({ stats, workers }: GpuStatusProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* GPU Utilization Chart */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">GPU & System</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">GPU Utilization</span>
              <span className="text-sm font-semibold text-foreground">{stats.gpu_utilization}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${stats.gpu_utilization}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">VRAM Usage</span>
              <span className="text-sm font-semibold text-foreground">
                {stats.vram_used_gb} / {stats.vram_total_gb} GB
              </span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${(stats.vram_used_gb / stats.vram_total_gb) * 100}%` }}
              />
            </div>
          </div>
          {/* GPU memory bar visualization */}
          <div className="flex items-center gap-2 mt-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-6 rounded-sm",
                  i < Math.round(stats.gpu_utilization / 5)
                    ? "bg-primary/80"
                    : "bg-secondary"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Workers Status */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-foreground mb-4">Workers Status</h3>
        <div className="space-y-3">
          {workers.map((worker) => (
            <div
              key={worker.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full",
                    worker.status === "online"
                      ? "bg-emerald-400"
                      : worker.status === "busy"
                      ? "bg-yellow-400"
                      : "bg-red-400"
                  )}
                />
                <span className="text-sm text-foreground">{worker.id}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{worker.gpu.name.replace("NVIDIA ", "")}</span>
                <span>{worker.gpu.utilization_percent}%</span>
                <span>
                  {worker.gpu.vram_used_gb} / {worker.gpu.vram_total_gb} GB
                </span>
                <span
                  className={cn(
                    "capitalize",
                    worker.status === "online"
                      ? "text-emerald-400"
                      : worker.status === "busy"
                      ? "text-yellow-400"
                      : "text-red-400"
                  )}
                >
                  {worker.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
