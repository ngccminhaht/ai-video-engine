"use client";

import { useWorkers } from "@/features/dashboard/hooks/use-dashboard";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export default function WorkersPage() {
  const { data: workers, isLoading } = useWorkers();
  const workerList = workers || [];

  return (
    <div className="flex flex-col gap-8">
      <div >
        <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Workers</h1>
        <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>Monitor your GPU workers</p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>Loading workers...</span>
        </div>
      )}

      {!isLoading && (
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-secondary)" }}>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Worker</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Hostname</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Status</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>GPU</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>GPU Util</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>VRAM</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Current Job</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Last Heartbeat</th>
                </tr>
              </thead>
              <tbody>
                {workerList.map((worker) => (
                  <tr key={worker.id} className="transition-colors hover:bg-[#FFF8F7]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", worker.status === "online" ? "bg-[#178553]" : worker.status === "busy" ? "bg-[#B66A00]" : "bg-[#D92D20]")} />
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{worker.id}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs" style={{ color: "var(--text-tertiary)" }}>{worker.hostname}</td>
                    <td className="py-4 px-5">
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[13px] font-medium border",
                        worker.status === "online" ? "bg-[#EAF8F1] text-[#178553] border-[#B8E3CF]" :
                        worker.status === "busy" ? "bg-[#FFF5DF] text-[#B66A00] border-[#F2D49B]" :
                        "bg-[#FFF0EF] text-[#D92D20] border-[#F4B8B3]"
                      )}>{worker.status}</span>
                    </td>
                    <td className="py-4 px-5 text-xs" style={{ color: "var(--text-primary)" }}>{worker.gpu.name.replace("NVIDIA ", "")}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden max-w-[80px]" style={{ background: "#F2E3E4" }}>
                          <div className={cn("h-full rounded-full transition-all", worker.gpu.utilization_percent > 70 ? "bg-[#B66A00]" : "bg-[#C5242D]")} style={{ width: `${worker.gpu.utilization_percent}%` }} />
                        </div>
                        <span className="text-xs" style={{ color: "var(--text-primary)" }}>{worker.gpu.utilization_percent}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-xs" style={{ color: "var(--text-primary)" }}>{worker.gpu.vram_used_gb} / {worker.gpu.vram_total_gb} GB</td>
                    <td className="py-4 px-5 text-xs">
                      {worker.current_job_id ? <span className="font-mono" style={{ color: "var(--primary)" }}>#{worker.current_job_id.slice(0, 8)}</span> : <span style={{ color: "var(--text-muted)" }}>Idle</span>}
                    </td>
                    <td className="py-4 px-5 text-xs" style={{ color: "var(--text-tertiary)" }}>{new Date(worker.last_heartbeat).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
