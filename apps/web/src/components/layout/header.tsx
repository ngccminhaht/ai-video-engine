"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  Cpu,
  MemoryStick,
  Bell,
  Search,
  User,
  X,
  ListVideo,
  Boxes,
  LogOut,
  Settings,
  ChevronRight,
  Loader2,
  Activity,
} from "lucide-react";
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

  const { data: searchResults, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return { jobs: [], models: [] };
      const q = query.toLowerCase();
      let jobs: Job[] = [];
      let models: Model[] = [];
      if (useMock) {
        jobs = mockJobs.filter(j => j.id.toLowerCase().includes(q) || j.inputs.prompt?.toLowerCase().includes(q) || j.model_id?.toLowerCase().includes(q));
        models = mockModels.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.adapter_name.toLowerCase().includes(q));
      } else {
        const [jobsData, modelsData] = await Promise.all([
          jobsApi.list({ limit: 50 }).catch(() => ({ jobs: [], total: 0 })),
          modelsApi.list().catch(() => []),
        ]);
        jobs = jobsData.jobs.filter(j => j.id.toLowerCase().includes(q) || j.inputs.prompt?.toLowerCase().includes(q) || j.model_id?.toLowerCase().includes(q));
        const modelList = Array.isArray(modelsData) ? modelsData : [];
        models = modelList.filter(m => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.adapter_name.toLowerCase().includes(q));
      }
      return { jobs: jobs.slice(0, 5), models: models.slice(0, 5) };
    },
    enabled: query.trim().length > 0,
    staleTime: 2000,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (href: string) => { setOpen(false); setQuery(""); router.push(href); };
  const hasResults = (searchResults?.jobs?.length ?? 0) > 0 || (searchResults?.models?.length ?? 0) > 0;

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
      <input
        ref={inputRef}
        type="text"
        placeholder="Search jobs, models... (Ctrl+K)"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        className="h-9 w-80 max-lg:w-60 pl-9 pr-8 rounded-lg text-sm transition-all duration-150"
        style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
        onFocus2-placeholder="var(--input-placeholder)"
      />
      {query && (
        <button onClick={() => { setQuery(""); setOpen(false); }} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {open && query.trim() && (
        <div className="absolute top-full left-0 mt-2 w-96 rounded-xl overflow-hidden z-50" style={{ background: "var(--card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-floating)" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Searching...</span>
            </div>
          ) : !hasResults ? (
            <div className="py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>No results for &quot;{query}&quot;</div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {searchResults!.jobs.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}>
                    <ListVideo className="w-3 h-3" /> Jobs
                  </div>
                  {searchResults!.jobs.map((job) => (
                    <button key={job.id} onClick={() => handleSelect(`/admin/jobs/${job.id}`)} className="w-full px-3 py-2.5 text-left transition-colors flex items-center justify-between" style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono" style={{ color: "var(--primary)" }}>#{job.id.slice(0, 8)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md font-medium" style={job.status === "completed" ? { background: "var(--success-soft)", color: "var(--success)" } : job.status === "failed" ? { background: "var(--danger-soft)", color: "var(--danger)" } : { background: "var(--warning-soft)", color: "var(--warning)" }}>{job.status}</span>
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-tertiary)" }}>{job.inputs.prompt?.slice(0, 60) || "No prompt"}</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
                    </button>
                  ))}
                </div>
              )}
              {searchResults!.models.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-tertiary)", background: "var(--surface-secondary)" }}>
                    <Boxes className="w-3 h-3" /> Models
                  </div>
                  {searchResults!.models.map((model) => (
                    <button key={model.id} onClick={() => handleSelect(`/admin/models/${model.id}`)} className="w-full px-3 py-2.5 text-left transition-colors flex items-center justify-between" style={{ color: "var(--text-primary)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                      <div className="min-w-0">
                        <span className="text-sm">{model.name}</span>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{model.capabilities.map(c => c === "text_to_video" ? "T2V" : "I2V").join(", ")} &bull; {model.recommended_vram_gb} GB VRAM</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--text-muted)" }} />
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

  const { data: recentJobs } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      if (useMock) return mockJobs.filter(j => ["completed", "failed"].includes(j.status)).slice(0, 8);
      const [completed, failed] = await Promise.all([
        jobsApi.list({ status: "completed", limit: 5 }).catch(() => ({ jobs: [] })),
        jobsApi.list({ status: "failed", limit: 5 }).catch(() => ({ jobs: [] })),
      ]);
      return [...completed.jobs, ...failed.jobs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 8);
    },
    refetchInterval: 15000,
  });

  const notifications = recentJobs || [];
  const unreadCount = notifications.filter(j => j.status === "completed" || j.status === "failed").length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg transition-colors duration-150" style={{ color: "var(--text-tertiary)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        aria-label="Notifications">
        <Bell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-white text-[10px] font-semibold rounded-full flex items-center justify-center" style={{ background: "var(--primary)" }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-50" style={{ background: "var(--card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-floating)" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Notifications</h3>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{notifications.length} recent</span>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No notifications yet</div>
            ) : (
              notifications.map((job) => (
                <Link key={job.id} href={`/admin/jobs/${job.id}`} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-3 transition-colors" style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: job.status === "completed" ? "var(--success)" : "var(--danger)" }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs" style={{ color: "var(--text-primary)" }}>Job <span className="font-mono font-medium" style={{ color: "var(--primary)" }}>#{job.id.slice(0, 8)}</span> {job.status === "completed" ? "completed" : "failed"}</p>
                    <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{job.inputs.prompt?.slice(0, 50) || job.task_type.replace("_", " ")}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{formatTimeAgo(job.updated_at)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link href="/admin/jobs" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-xs text-center font-medium transition-colors" style={{ color: "var(--primary)", borderTop: "1px solid var(--border-default)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            View all jobs
          </Link>
        </div>
      )}
    </div>
  );
}

// --- User Menu ---
function UserMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150" style={{ background: "var(--surface-tertiary)", color: "var(--text-secondary)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--primary-soft)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--surface-tertiary)"; }}
        aria-label="User menu">
        <User className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl overflow-hidden z-50" style={{ background: "var(--card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-floating)" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-default)" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Admin</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Local Administrator</p>
          </div>
          <div className="py-1">
            <button onClick={() => { setOpen(false); router.push("/admin/settings"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors" style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <Settings className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} /> Settings
            </button>
            <button onClick={() => { setOpen(false); window.open("/docs", "_blank"); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors" style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <ListVideo className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} /> API Documentation
            </button>
          </div>
          <div className="py-1" style={{ borderTop: "1px solid var(--border-default)" }}>
            <button onClick={() => { setOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors" style={{ color: "var(--danger)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--danger-soft)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

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
  const t = useTranslations("Header");
  const status: SystemStatus = { healthy: true, gpuUtil: 45, vramUsed: 12.4, vramTotal: 24 };

  return (
    <header className="flex items-center justify-between gap-4 md:gap-8 w-full h-16 px-4 md:px-8 lg:px-12 sticky top-0 z-30 transition-all" style={{ background: "var(--header-background)", borderBottom: "1px solid var(--header-border)" }}>
      <div className="flex items-center">
        <GlobalSearch />
      </div>
      <div className="flex items-center gap-3">
        {/* System Status Chip */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-medium max-md:hidden" style={{ background: status.healthy ? "var(--success-soft)" : "var(--danger-soft)", color: status.healthy ? "var(--success)" : "var(--danger)" }}>
          <Activity className="w-4 h-4" />
          <span>{status.healthy ? "System Healthy" : "System Unhealthy"}</span>
        </div>
        {/* GPU Chip */}
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl text-[13px] font-medium max-lg:hidden" style={{ background: "var(--primary-soft)", color: "var(--text-secondary)" }}>
          <Cpu className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <span>GPU {status.gpuUtil}%</span>
          <span style={{ color: "var(--border-strong)" }}>|</span>
          <MemoryStick className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <span>{status.vramUsed}/{status.vramTotal} GB</span>
        </div>
        {/* Divider */}
        <div className="w-px h-6 max-md:hidden" style={{ background: "var(--border-default)" }} />
        {/* Actions */}
        <div className="flex items-center gap-1">
          <NotificationsDropdown />
        </div>
      </div>
    </header>
  );
}
