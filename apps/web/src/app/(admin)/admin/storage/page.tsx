"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { storageApi } from "@/lib/api/client";
import { HardDrive, Film, Image, Boxes, Loader2 } from "lucide-react";
import type { StorageStats } from "@/types";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";
const mockStorageStats: StorageStats = { uploads: { size_mb: 184, count: 42 }, outputs: { size_mb: 840, count: 128 }, models: { size_mb: 245 }, total_size_mb: 1269 };

export default function StoragePage() {
  const { data: stats, isLoading } = useQuery<StorageStats>({
    queryKey: queryKeys.system.storage(),
    queryFn: async () => { if (useMock) return mockStorageStats; return storageApi.stats(); },
  });

  const storage = stats || mockStorageStats;
  const totalGb = storage.total_size_mb / 1024;
  const maxGb = 6;
  const usedPercent = (totalGb / maxGb) * 100;

  return (
    <div className="flex flex-col gap-8">
      <div >
        <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Storage</h1>
        <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>Monitor storage usage</p>
      </div>

      {isLoading && <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Loading...</span></div>}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2"><HardDrive className="w-4 h-4" style={{ color: "var(--primary)" }} /><span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Total Used</span></div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{totalGb >= 1 ? `${totalGb.toFixed(2)} GB` : `${storage.total_size_mb} MB`}</p>
          <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "#F2E3E4" }}><div className="h-full rounded-full" style={{ background: "var(--primary)", width: `${Math.min(usedPercent, 100)}%` }} /></div>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>of {maxGb} GB allocated</p>
        </div>
        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2"><Image className="w-4 h-4" style={{ color: "var(--primary)" }} /><span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Uploads</span></div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{storage.uploads.size_mb} MB</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{storage.uploads.count} files</p>
        </div>
        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2"><Film className="w-4 h-4" style={{ color: "var(--primary)" }} /><span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Outputs</span></div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{storage.outputs.size_mb} MB</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{storage.outputs.count} files</p>
        </div>
        <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex items-center gap-2 mb-2"><Boxes className="w-4 h-4" style={{ color: "var(--primary)" }} /><span className="text-xs" style={{ color: "var(--text-tertiary)" }}>Models</span></div>
          <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{storage.models.size_mb} MB</p>
        </div>
      </div>
    </div>
  );
}
