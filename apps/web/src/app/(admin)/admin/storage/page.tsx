"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { storageApi } from "@/lib/api/client";
import { HardDrive, Film, Image, Boxes, Loader2 } from "lucide-react";
import type { StorageStats } from "@/types";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

const mockStorageStats: StorageStats = {
  uploads: { size_mb: 184, count: 42 },
  outputs: { size_mb: 840, count: 128 },
  models: { size_mb: 245 },
  total_size_mb: 1269,
};

export default function StoragePage() {
  const { data: stats, isLoading } = useQuery<StorageStats>({
    queryKey: queryKeys.system.storage(),
    queryFn: async () => {
      if (useMock) return mockStorageStats;
      return storageApi.stats();
    },
  });

  const storage = stats || mockStorageStats;
  const totalGb = storage.total_size_mb / 1024;
  const maxGb = 6; // Assume 6 GB total available
  const usedPercent = (totalGb / maxGb) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Storage</h1>
        <p className="text-sm text-muted-foreground mt-1">Monitor storage usage</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading storage stats...</span>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Used</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {totalGb >= 1 ? `${totalGb.toFixed(2)} GB` : `${storage.total_size_mb} MB`}
          </p>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min(usedPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">of {maxGb} GB allocated</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uploads</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storage.uploads.size_mb} MB</p>
          <p className="text-xs text-muted-foreground mt-1">{storage.uploads.count} files</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Outputs</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storage.outputs.size_mb} MB</p>
          <p className="text-xs text-muted-foreground mt-1">{storage.outputs.count} files</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Models</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storage.models.size_mb} MB</p>
        </div>
      </div>
    </div>
  );
}
