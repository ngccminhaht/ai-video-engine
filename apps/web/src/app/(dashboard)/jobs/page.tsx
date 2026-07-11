"use client";

import { useState } from "react";
import { mockJobs } from "@/mocks/jobs";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Search, Filter, Download, MoreHorizontal } from "lucide-react";
import type { JobStatus, TaskType } from "@/types";

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredJobs = mockJobs.filter((job) => {
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (typeFilter !== "all" && job.task_type !== typeFilter) return false;
    if (
      searchQuery &&
      !job.id.includes(searchQuery) &&
      !job.inputs.prompt?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
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
                onClick={() => setStatusFilter(status)}
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
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-8 px-3 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Task Types</option>
          <option value="text_to_video">Text to Video</option>
          <option value="image_to_video">Image to Video</option>
        </select>

        <select className="h-8 px-3 bg-secondary border border-border rounded-md text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option>All Models</option>
          <option>realisticVL_v4.0</option>
          <option>cogVideoX_5B</option>
          <option>animateDiff_v3</option>
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

      {/* Jobs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Job ID
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Type
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Model
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Progress
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Duration
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Created
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
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
                    {job.model_id || "—"}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {job.status === "completed"
                      ? "100%"
                      : job.status === "processing"
                      ? "65%"
                      : job.status === "loading_model"
                      ? "20%"
                      : "—"}
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
                      year: "numeric",
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
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Showing 1 to {filteredJobs.length} of {mockJobs.length} results
          </span>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((page) => (
              <button
                key={page}
                className={cn(
                  "w-8 h-8 rounded-md text-xs font-medium transition-colors",
                  page === 1
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
