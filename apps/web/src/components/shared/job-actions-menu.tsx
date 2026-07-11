"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, XCircle, RotateCcw, Trash2, Download } from "lucide-react";
import { useCancelJob } from "@/features/jobs/hooks/use-jobs";
import { getFileUrl } from "@/lib/api/client";
import type { Job } from "@/types";

interface JobActionsMenuProps {
  job: Job;
}

export function JobActionsMenu({ job }: JobActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const cancelJob = useCancelJob();

  const isCancellable = ["pending", "queued"].includes(job.status);
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const videoUrl = getFileUrl(job.output_path);

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
        className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-lg shadow-lg z-50 py-1 overflow-hidden">
          {/* View Detail */}
          <button
            onClick={() => { setOpen(false); router.push(`/jobs/${job.id}`); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
            View Details
          </button>

          {/* Download (completed only) */}
          {isCompleted && videoUrl && (
            <a
              href={videoUrl}
              download
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              Download Video
            </a>
          )}

          {/* Cancel (pending/queued only) */}
          {isCancellable && (
            <button
              onClick={() => {
                cancelJob.mutate(job.id);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-yellow-400 hover:bg-secondary/50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Job
            </button>
          )}

          {/* Retry (failed only) */}
          {isFailed && (
            <button
              onClick={() => {
                // Retry = recreate same job (placeholder for now)
                setOpen(false);
                router.push(`/generate`);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-secondary/50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
              Retry
            </button>
          )}

          {/* Divider */}
          <div className="my-1 border-t border-border" />

          {/* Delete (placeholder - API supports this in future) */}
          <button
            onClick={() => {
              setOpen(false);
              // Future: call delete job API
              if (window.confirm(`Delete job #${job.id.slice(0, 8)}? This cannot be undone.`)) {
                // jobsApi.delete(job.id) — Not yet implemented on backend
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-secondary/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
