"use client";

import { cn } from "@/lib/utils";
import { Activity, Cpu, HardDrive, MemoryStick, Bell, Search, User } from "lucide-react";

interface SystemStatus {
  healthy: boolean;
  gpuUtil: number;
  vramUsed: number;
  vramTotal: number;
}

export function Header() {
  // Mock system status - will be replaced with real data
  const status: SystemStatus = {
    healthy: true,
    gpuUtil: 45,
    vramUsed: 12.4,
    vramTotal: 24,
  };

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-border bg-card">
      {/* Left - Breadcrumb/Search area */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="h-8 w-64 pl-9 pr-4 rounded-md bg-secondary border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Right - System Status + Actions */}
      <div className="flex items-center gap-4">
        {/* System Status Indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">System Status:</span>
            <span
              className={cn(
                "flex items-center gap-1",
                status.healthy ? "text-emerald-400" : "text-red-400"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full",
                  status.healthy ? "bg-emerald-400" : "bg-red-400"
                )}
              />
              {status.healthy ? "Healthy" : "Unhealthy"}
            </span>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            <span>GPU U:</span>
            <span className="text-foreground">{status.gpuUtil}%</span>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1.5">
            <MemoryStick className="w-3.5 h-3.5" />
            <span>VRAM:</span>
            <span className="text-foreground">
              {status.vramUsed} / {status.vramTotal} GB
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <User className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
