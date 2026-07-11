"use client";

import { useWorkers } from "@/features/dashboard/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import { Activity, Loader2 } from "lucide-react";

export default function WorkersPage() {
  const { data: workers, isLoading } = useWorkers();
  const workerList = workers || [];
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Workers</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your GPU workers
        </p>
      </div>

      {/* Workers Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Worker
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Hostname
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  GPU
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  GPU Util
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  VRAM
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Current Job
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Last Heartbeat
                </th>
              </tr>
            </thead>
            <tbody>
              {workerList.map((worker) => (
                <tr
                  key={worker.id}
                  className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
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
                      <span className="text-sm font-medium text-foreground">
                        {worker.id}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {worker.hostname}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
                        worker.status === "online"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : worker.status === "busy"
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}
                    >
                      {worker.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-foreground">
                    {worker.gpu.name.replace("NVIDIA ", "")}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden max-w-[80px]">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            worker.gpu.utilization_percent > 70
                              ? "bg-yellow-400"
                              : "bg-emerald-400"
                          )}
                          style={{
                            width: `${worker.gpu.utilization_percent}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-foreground">
                        {worker.gpu.utilization_percent}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-foreground">
                    {worker.gpu.vram_used_gb} / {worker.gpu.vram_total_gb} GB
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {worker.current_job_id ? (
                      <span className="text-primary font-mono">
                        #{worker.current_job_id.slice(0, 8)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Idle</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {new Date(worker.last_heartbeat).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
