"use client";

import type { Job } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import Link from "next/link";

import { useTranslations } from "next-intl";

interface RecentJobsProps { jobs: Job[]; }

export function RecentJobs({ jobs }: RecentJobsProps) {
  const t = useTranslations("Dashboard");
  
  return (
    <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[15px] font-semibold" style={{ color: "#241719" }}>{t("recent_jobs")}</h3>
        <Link href="/admin/jobs" className="text-xs font-medium hover:underline" style={{ color: "#C5242D" }}>{t("view_all")}</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #EBDCDD" }}>
              <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: "#847174" }}>{t("job_id")}</th>
              <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: "#847174" }}>{t("type")}</th>
              <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: "#847174" }}>{t("model")}</th>
              <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: "#847174" }}>{t("status")}</th>
              <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: "#847174" }}>{t("progress")}</th>
              <th className="text-left py-3 px-3 text-xs font-medium" style={{ color: "#847174" }}>{t("created")}</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="transition-colors hover:bg-[#FFF8F7]" style={{ borderBottom: "1px solid #F3E9E9" }}>
                <td className="py-3 px-3"><Link href={`/admin/jobs/${job.id}`} className="font-mono text-xs hover:underline" style={{ color: "#C5242D" }}>#{job.id.slice(0, 8)}</Link></td>
                <td className="py-3 px-3 text-xs capitalize" style={{ color: "#847174" }}>{job.task_type.replace("_", " ")}</td>
                <td className="py-3 px-3 text-xs" style={{ color: "#241719" }}>{job.model_id || "—"}</td>
                <td className="py-3 px-3"><StatusBadge status={job.status} /></td>
                <td className="py-3 px-3 text-xs" style={{ color: "#847174" }}>{job.status === "completed" ? "100%" : job.status === "processing" ? "65%" : "—"}</td>
                <td className="py-3 px-3 text-xs" style={{ color: "#847174" }}>{new Date(job.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
