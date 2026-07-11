"use client";

import type { Job } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";

interface RecentJobsProps {
  jobs: Job[];
}

export function RecentJobs({ jobs }: RecentJobsProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">Recent Jobs</h3>
        <Link
          href="/jobs"
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                Job ID
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                Model
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                Progress
              </th>
              <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
              >
                <td className="py-2.5 px-2">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-primary hover:underline font-mono text-xs"
                  >
                    #{job.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground capitalize">
                  {job.task_type.replace("_", " ")}
                </td>
                <td className="py-2.5 px-2 text-xs text-foreground">
                  {job.model_id || "—"}
                </td>
                <td className="py-2.5 px-2">
                  <StatusBadge status={job.status} />
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground">
                  {job.status === "completed" ? "100%" : job.status === "processing" ? "65%" : "—"}
                </td>
                <td className="py-2.5 px-2 text-xs text-muted-foreground">
                  {new Date(job.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
