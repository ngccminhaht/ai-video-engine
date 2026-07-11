"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, XCircle, RotateCcw, Trash2, Download } from "lucide-react";
import { useCancelJob } from "@/features/jobs/hooks/use-jobs";
import { getFileUrl } from "@/lib/api/client";
import type { Job } from "@/types";

interface JobActionsMenuProps { job: Job; }

export function JobActionsMenu({ job }: JobActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cancelJob = useCancelJob();

  const isCancellable = ["pending", "queued"].includes(job.status);
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const videoUrl = getFileUrl(job.output_path);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl z-50 py-1 overflow-hidden" style={{ background: "var(--card)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-floating)" }}>
          <button onClick={() => { setOpen(false); router.push(`/admin/jobs/${job.id}`); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors" style={{ color: "var(--text-primary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <Eye className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} /> View Details
          </button>
          {isCompleted && videoUrl && (
            <a href={videoUrl} download onClick={() => setOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors" style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <Download className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} /> Download Video
            </a>
          )}
          {isCancellable && (
            <button onClick={() => { cancelJob.mutate(job.id); setOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors" style={{ color: "var(--warning)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--warning-soft)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <XCircle className="w-3.5 h-3.5" /> Cancel Job
            </button>
          )}
          {isFailed && (
            <button onClick={() => { setOpen(false); router.push(`/admin/generate`); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors" style={{ color: "var(--text-primary)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} /> Retry
            </button>
          )}
          <div className="my-1" style={{ borderTop: "1px solid var(--border-subtle)" }} />
          <button onClick={() => { setOpen(false); if (window.confirm(`Delete job #${job.id.slice(0, 8)}?`)) {} }} className="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors" style={{ color: "var(--danger)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--danger-soft)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
