"use client";

import { useState } from "react";
import { useJobs } from "@/features/jobs/hooks/use-jobs";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Search, Download, MoreHorizontal, Loader2 } from "lucide-react";

export default function JobsPage() {
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

  // Client-side search filter (on top of server filters)
  const filteredJobs = jobs.filter((job) => {
    if (!searchQuery) return true;
    return (
      job.id.includes(searchQuery) ||
      job.inputs.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and monitor generation jobs
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg">
          {["all", "pending", "processing", "completed", "failed"].map(
            (status) => (
              <button
                key={status}
                onClick={() => { setStatusFilter(status); setPage(0); }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize",
                  statusFilter === status
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {status === "all" ? "All Status" : status}
              </button>
            )
          )}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
          className="h-8 px-3 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Task Types</option>
          <option value="text_to_video">Text to Video</option>
          <option value="image_to_video">Image to Video</option>
        </select>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-56 pl-9 pr-4 bg-secondary border border-border rounded-md text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading jobs...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
          Failed to load jobs: {(error as Error).message}
        </div>
      )}

      {/* Jobs Table */}
      {!isLoading && !error && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Job ID</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Model</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Duration</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Created</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No jobs found
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="text-primary hover:underline font-mono text-xs"
                        >
                          #{job.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground capitalize">
                        {job.task_type.replace("_to_", " → ")}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground">
                        {job.model_id || "auto"}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {job.total_time_seconds
                          ? `${job.total_time_seconds.toFixed(1)}s`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(job.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          {job.status === "completed" && (
                            <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, totalJobs)} of {totalJobs} results
            </span>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    "w-8 h-8 rounded-md text-xs font-medium transition-colors",
                    page === i
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
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
