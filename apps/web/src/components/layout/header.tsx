"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Cpu, MemoryStick, Bell, Search, User, X, ListVideo, Boxes, LogOut, Settings, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { jobsApi, modelsApi } from "@/lib/api/client";
import { mockJobs } from "@/mocks/jobs";
import { mockModels } from "@/mocks/models";
import type { Job, Model } from "@/types";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

interface SystemStatus {
  healthy: boolean;
  gpuUtil: number;
  vramUsed: number;
  vramTotal: number;
}

// --- Global Search Component ---
function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search jobs and models
  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return { jobs: [], models: [] };

      const q = query.toLowerCase();

      let jobs: Job[] = [];
      let models: Model[] = [];

      if (useMock) {
        jobs = mockJobs.filter(
          (j) =>
            j.id.toLowerCase().includes(q) ||
            j.inputs.prompt?.toLowerCase().includes(q) ||
            j.model_id?.toLowerCase().includes(q)
        );
        models = mockModels.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.adapter_name.toLowerCase().includes(q)
        );
      } else {
        const [jobsData, modelsData] = await Promise.all([
          jobsApi.list({ limit: 50 }).catch(() => ({ jobs: [], total: 0 })),
          modelsApi.list().catch(() => []),
        ]);
        jobs = jobsData.jobs.filter(
          (j) =>
            j.id.toLowerCase().includes(q) ||
            j.inputs.prompt?.toLowerCase().includes(q) ||
            j.model_id?.toLowerCase().includes(q)
        );
        const modelList = Array.isArray(modelsData) ? modelsData : [];
        models = modelList.filter(
          (m) =>
            m.id.toLowerCase().includes(q) ||
            m.name.toLowerCase().includes(q) ||
            m.adapter_name.toLowerCase().includes(q)
        );
      }

      return { jobs: jobs.slice(0, 5), models: models.slice(0, 5) };
    },
    enabled: query.trim().length > 0,
    staleTime: 2000,
  });

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcut: Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const hasResults =
    (searchResults?.jobs?.length ?? 0) > 0 || (searchResults?.models?.length ?? 0) > 0;

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search jobs, models... (Ctrl+K)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="h-8 w-72 pl-9 pr-8 rounded-md bg-secondary border-none text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {query && (
        <button
          onClick={() => { setQuery(""); setOpen(false); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Search Results Dropdown */}
      {open && query.trim() && (
        <div className="absolute top-full left-0 mt-2 w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : !hasResults ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {/* Jobs Results */}
              {searchResults!.jobs.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 flex items-center gap-1.5">
                    <ListVideo className="w-3 h-3" />
                    Jobs
                  </div>
                  {searchResults!.jobs.map((job) => (
                    <button
                      key={job.id}
                      onClick={() => handleSelect(`/jobs/${job.id}`)}
                      className="w-full px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-primary">#{job.id.slice(0, 8)}</span>
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded border",
                            job.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            job.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                            "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          )}>
                            {job.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {job.inputs.prompt?.slice(0, 60) || "No prompt"}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* Models Results */}
              {searchResults!.models.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-secondary/50 flex items-center gap-1.5">
                    <Boxes className="w-3 h-3" />
                    Models
                  </div>
                  {searchResults!.models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => handleSelect(`/models/${model.id}`)}
                      className="w-full px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-foreground">{model.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {model.capabilities.map(c => c === "text_to_video" ? "T2V" : "I2V").join(", ")} &bull; {model.recommended_vram_gb} GB VRAM
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Notifications Dropdown ---
function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch recent jobs for notifications (completed/failed in last hour)
  const { data: recentJobs } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (useMock) {
        return mockJobs
          .filter((j) => ["completed", "failed"].includes(j.status))
          .slice(0, 8);
      }
      const [completed, failed] = await Promise.all([
        jobsApi.list({ status: "completed", limit: 5 }).catch(() => ({ jobs: [] })),
        jobsApi.list({ status: "failed", limit: 5 }).catch(() => ({ jobs: [] })),
      ]);
      return [...completed.jobs, ...failed.jobs]
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, 8);
    },
    refetchInterval: 15000,
  });

  const notifications = recentJobs || [];
  const unreadCount = notifications.filter((j) => j.status === "completed" || j.status === "failed").length;

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium text-foreground">Notifications</h3>
            <span className="text-xs text-muted-foreground">{notifications.length} recent</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifications.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    job.status === "completed" ? "bg-emerald-400" : "bg-red-400"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground">
                      Job <span className="font-mono text-primary">#{job.id.slice(0, 8)}</span>{" "}
                      {job.status === "completed" ? "completed successfully" : "failed"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {job.inputs.prompt?.slice(0, 50) || job.task_type.replace("_", " ")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatTimeAgo(job.updated_at)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/jobs"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-xs text-center text-primary hover:bg-secondary/50 border-t border-border transition-colors"
          >
            View all jobs
          </Link>
        </div>
      )}
    </div>
  );
}

// --- User Menu Dropdown ---
function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <User className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-foreground">Admin</p>
            <p className="text-xs text-muted-foreground">Local Administrator</p>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); router.push("/settings"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              Settings
            </button>
            <button
              onClick={() => { setOpen(false); window.open("/docs", "_blank"); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              <ListVideo className="w-4 h-4 text-muted-foreground" />
              API Documentation
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-border py-1">
            <button
              onClick={() => { setOpen(false); /* No auth yet - placeholder */ }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-400 hover:bg-secondary/50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Time Ago Helper ---
function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

// --- Main Header ---
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
      {/* Left - Search */}
      <div className="flex items-center gap-4">
        <GlobalSearch />
      </div>

      {/* Right - System Status + Actions */}
      <div className="flex items-center gap-4">
        {/* System Status Indicators */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">System:</span>
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
            <span>GPU:</span>
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
        <div className="flex items-center gap-1">
          <NotificationsDropdown />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
