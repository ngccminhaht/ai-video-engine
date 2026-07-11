"use client";

import { useState } from "react";
import { useJobs } from "@/features/jobs/hooks/use-jobs";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Search, Download, Loader2 } from "lucide-react";
import { JobActionsMenu } from "@/components/shared/job-actions-menu";
import { useTranslations } from "next-intl";

export default function JobsPage() {
  const t = useTranslations("JobsPage");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading, error } = useJobs({
    status: statusFilter !== "all" ? statusFilter : undefined,
    task_type: typeFilter !== "all" ? typeFilter : undefined,
    skip: page * limit,
    limit,
  });

  const jobs = data?.jobs || [];
  const totalJobs = data?.total || 0;
  const totalPages = Math.ceil(totalJobs / limit);

  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    return job.id.includes(searchQuery) || job.inputs.prompt?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col gap-8">
      <div >
        <h1 className="text-[32px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{t("title")}</h1>
        <p className="text-[15px] mt-2.5" style={{ color: "var(--text-secondary)" }}>{t("subtitle")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-default)" }}>
          {["all", "pending", "processing", "completed", "failed"].map((status) => (
            <button key={status} onClick={() => { setStatusFilter(status); setPage(0); }}
              className={cn("px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors capitalize",
                statusFilter === status ? "text-white shadow-sm" : "hover:bg-white"
              )}
              style={statusFilter === status ? { background: "var(--primary)" } : { color: "var(--text-tertiary)" }}>
              {status === "all" ? t("all_status") : t(status)}
            </button>
          ))}
        </div>

        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="h-9 px-3 rounded-lg text-xs" style={{ background: "var(--card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
          <option value="all">{t("all_task_types")}</option>
          <option value="text_to_video">{t("text_to_video")}</option>
          <option value="image_to_video">{t("image_to_video")}</option>
        </select>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder={t("search_jobs")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-56 pl-9 pr-4 rounded-lg text-xs" style={{ background: "var(--card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
          <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>{t("loading")}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "var(--danger-soft)", border: "1px solid var(--danger-border)", color: "var(--danger)" }}>
          Failed to load jobs: {(error as Error).message}
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "var(--border-default)", boxShadow: "var(--shadow-card)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)", background: "var(--surface-secondary)" }}>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("job_id")}</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("type")}</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("model")}</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("status")}</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>Duration</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("created")}</th>
                  <th className="text-left py-4 px-5 text-[13px] font-medium" style={{ color: "var(--text-tertiary)" }}>{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr><td colSpan={7} className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>{t("no_jobs_found")}</td></tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="transition-colors hover:bg-[#FFF8F7]" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td className="py-4 px-5"><Link href={`/admin/jobs/${job.id}`} className="font-mono text-xs hover:underline" style={{ color: "var(--primary)" }}>#{job.id.slice(0, 8)}</Link></td>
                      <td className="py-4 px-5 text-xs capitalize" style={{ color: "var(--text-tertiary)" }}>{job.task_type.replace("_to_", " → ")}</td>
                      <td className="py-4 px-5 text-xs" style={{ color: "var(--text-primary)" }}>{job.model_id || "auto"}</td>
                      <td className="py-4 px-5"><StatusBadge status={job.status} /></td>
                      <td className="py-4 px-5 text-xs" style={{ color: "var(--text-tertiary)" }}>{job.total_time_seconds ? `${job.total_time_seconds.toFixed(1)}s` : "—"}</td>
                      <td className="py-4 px-5 text-xs" style={{ color: "var(--text-tertiary)" }}>{new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-1">
                          {job.status === "completed" && job.output_path && (
                            <a href={`/api/v1/files/${job.output_path.replace(/^\//, "").replace(/\\/g, "/")}`} download className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <JobActionsMenu job={job} />
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid var(--border-default)" }}>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalJobs)} of {totalJobs}</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                <button key={i} onClick={() => setPage(i)} className={cn("w-8 h-8 rounded-lg text-[13px] font-medium transition-colors", page === i ? "text-white" : "")}
                  style={page === i ? { background: "var(--primary)" } : { color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => { if (page !== i) e.currentTarget.style.background = "var(--surface-hover)"; }}
                  onMouseLeave={(e) => { if (page !== i) e.currentTarget.style.background = "transparent"; }}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
