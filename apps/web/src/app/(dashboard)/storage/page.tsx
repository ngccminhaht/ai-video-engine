"use client";

import { HardDrive, Film, Image, Boxes } from "lucide-react";

const storageData = {
  total: 6,
  used: 1.24,
  uploads: 0.18,
  outputs: 0.82,
  models: 0.24,
};

export default function StoragePage() {
  const usedPercent = (storageData.used / storageData.total) * 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Storage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor storage usage
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total Used</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storageData.used} TB</p>
          <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            of {storageData.total} TB total
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Image className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Uploads</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storageData.uploads} TB</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Film className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Outputs</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storageData.outputs} TB</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Boxes className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Models</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{storageData.models} TB</p>
        </div>
      </div>
    </div>
  );
}
