"use client";

import { use } from "react";
import { useJob, useCancelJob } from "@/features/jobs/hooks/use-jobs";
import { getFileUrl } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Download, XCircle, Loader2 } from "lucide-react";

const timelineSteps = [
  { key: "pending", label: "Pending" },
  { key: "queued", label: "Queued" },
  { key: "loading_model", label: "Loading Model" },
  { key: "processing", label: "Processing" },
  { key: "post_processing", label: "Post Processing" },
  { key: "completed", label: "Completed" },
] as const;

function getStepStatus(
  jobStatus: string,
  stepKey: string
): "completed" | "active" | "pending" {
  const order = timelineSteps.map((s) => s.key);
  const jobIdx = order.indexOf(jobStatus as (typeof order)[number]);
  const stepIdx = order.indexOf(stepKey as (typeof order)[number]);
  if (stepIdx < jobIdx) return "completed";
  if (stepIdx === jobIdx) return "active";
  return "pending";
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { data: job, isLoading, error } = useJob(jobId);
  const cancelJob = useCancelJob();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--primary)" }} />
        <span className="ml-3 text-sm" style={{ color: "var(--text-muted)" }}>Loading job...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-lg" style={{ color: "var(--text-tertiary)" }}>Job not found</p>
        <Link href="/admin/jobs" className="text-sm hover:underline" style={{ color: "var(--primary)" }}>Back to Jobs</Link>
      </div>
    );
  }

  const isFailed = job.status === "failed";
  const isCompleted = job.status === "completed";
  const isCancellable = ["pending", "queued"].includes(job.status);
  const videoUrl = getFileUrl(job.output_path);
  const thumbnailUrl = getFileUrl(job.thumbnail_path);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/jobs" className="p-2 rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Job #{job.id.slice(0, 8)}</h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              {job.task_type.replace("_", " ")} &bull; {job.model_id || "auto"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isCancellable && (
            <button onClick={() => cancelJob.mutate(job.id)} disabled={cancelJob.isPending} className="btn btn-default flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Cancel
            </button>
          )}
          {isCompleted && videoUrl && (
            <a href={videoUrl} download className="btn btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" /> Download
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Output + Input */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Output Video</h3>
            {isCompleted && videoUrl ? (
              <div className="relative aspect-video bg-[#241719] rounded-xl overflow-hidden">
                <video src={videoUrl} poster={thumbnailUrl || undefined} controls className="w-full h-full object-contain" />
              </div>
            ) : isFailed ? (
              <div className="aspect-video rounded-xl flex items-center justify-center" style={{ background: "var(--danger-soft)", border: "1px solid var(--danger-border)" }}>
                <div className="text-center px-8">
                  <p className="text-sm font-medium" style={{ color: "var(--danger)" }}>Generation Failed</p>
                  <p className="text-xs mt-2 break-words" style={{ color: "var(--danger)", opacity: 0.7 }}>{job.error_message}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-xl flex items-center justify-center" style={{ background: "var(--surface-secondary)" }}>
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: "var(--primary)", borderTopColor: "transparent" }} />
                  <p className="text-sm capitalize" style={{ color: "var(--text-tertiary)" }}>{job.status.replace("_", " ")}...</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Input Information</h3>
            <div className="flex flex-col gap-6">
              {job.inputs.prompt && (
                <div>
                  <span className="text-xs block mb-2" style={{ color: "var(--text-tertiary)" }}>Prompt</span>
                  <p className="text-sm rounded-xl p-4" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>{job.inputs.prompt}</p>
                </div>
              )}
              {job.inputs.negative_prompt && (
                <div>
                  <span className="text-xs block mb-2" style={{ color: "var(--text-tertiary)" }}>Negative Prompt</span>
                  <p className="text-sm rounded-xl p-4" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>{job.inputs.negative_prompt}</p>
                </div>
              )}
              {job.inputs.image_path && (
                <div>
                  <span className="text-xs block mb-2" style={{ color: "var(--text-tertiary)" }}>Input Image</span>
                  <p className="text-sm rounded-xl p-4 font-mono" style={{ color: "var(--text-secondary)", background: "var(--surface-secondary)" }}>{job.inputs.image_path}</p>
                </div>
              )}
            </div>
          </div>

          {(job.total_time_seconds || job.inference_time_seconds) && (
            <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {job.queue_time_seconds != null && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Queue Time</p>
                    <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{job.queue_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.load_model_time_seconds != null && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Load Model</p>
                    <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{job.load_model_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.inference_time_seconds != null && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Inference</p>
                    <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{job.inference_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.total_time_seconds != null && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Total Time</p>
                    <p className="text-lg font-semibold" style={{ color: "var(--primary)" }}>{job.total_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.peak_vram_gb != null && (
                  <div>
                    <p className="text-xs mb-1" style={{ color: "var(--text-tertiary)" }}>Peak VRAM</p>
                    <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{job.peak_vram_gb} GB</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info + Timeline */}
        <div className="flex flex-col gap-8">
          <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Generation Settings</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Model</span><span style={{ color: "var(--text-primary)" }}>{job.model_id || "auto"}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Resolution</span><span style={{ color: "var(--text-primary)" }}>{job.generation_params.resolution}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Duration</span><span style={{ color: "var(--text-primary)" }}>{job.generation_params.duration}s</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>FPS</span><span style={{ color: "var(--text-primary)" }}>{job.generation_params.fps}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Guidance</span><span style={{ color: "var(--text-primary)" }}>{job.generation_params.guidance_scale}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Steps</span><span style={{ color: "var(--text-primary)" }}>{job.generation_params.num_inference_steps}</span></div>
              <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Seed</span><span style={{ color: "var(--text-primary)" }}>{job.generation_params.seed || "Random"}</span></div>
            </div>
          </div>

          <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h3 className="text-[15px] font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Timeline</h3>
            <div className="space-y-0">
              {timelineSteps.map((step, idx) => {
                const stepStatus = isFailed && step.key !== "completed"
                  ? (idx <= timelineSteps.findIndex((s) => s.key === job.status) ? "completed" : "pending")
                  : getStepStatus(job.status, step.key);
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={cn("w-3 h-3 rounded-full border-2",
                        stepStatus === "completed" ? "bg-[#178553] border-[#178553]"
                          : stepStatus === "active" ? "border-[#C5242D] bg-[#C5242D]"
                          : "bg-transparent border-[#DABFC1]"
                      )} />
                      {idx < timelineSteps.length - 1 && (
                        <div className={cn("w-0.5 h-7", stepStatus === "completed" ? "bg-[#178553]" : "bg-[#EBDCDD]")} />
                      )}
                    </div>
                    <span className={cn("text-[13px] -mt-0.5",
                      stepStatus === "active" ? "font-medium" : "",
                    )} style={{ color: stepStatus === "active" ? "var(--primary)" : stepStatus === "completed" ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {job.output_metadata && (
            <div className="bg-white border border-[#EBDCDD] rounded-2xl p-5 md:p-6" style={{ boxShadow: "var(--shadow-card)" }}>
              <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Output Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Resolution</span><span style={{ color: "var(--text-primary)" }}>{job.output_metadata.width}x{job.output_metadata.height}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>Duration</span><span style={{ color: "var(--text-primary)" }}>{job.output_metadata.duration}s</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>FPS</span><span style={{ color: "var(--text-primary)" }}>{job.output_metadata.fps}</span></div>
                <div className="flex justify-between"><span style={{ color: "var(--text-tertiary)" }}>File Size</span><span style={{ color: "var(--text-primary)" }}>{job.output_metadata.file_size_mb} MB</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
