"use client";

import { use } from "react";
import { useJob, useCancelJob } from "@/features/jobs/hooks/use-jobs";
import { getFileUrl } from "@/lib/api/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  Download,
  XCircle,
  Clock,
  Play,
  Loader2,
} from "lucide-react";

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
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading job...</span>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <p className="text-lg text-muted-foreground">Job not found</p>
        <Link href="/jobs" className="text-primary hover:underline text-sm">
          Back to Jobs
        </Link>
      </div>
    );
  }

  const isFailed = job.status === "failed";
  const isCompleted = job.status === "completed";
  const isCancellable = ["pending", "queued"].includes(job.status);
  const videoUrl = getFileUrl(job.output_path);
  const thumbnailUrl = getFileUrl(job.thumbnail_path);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/jobs"
            className="p-2 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">
                Job #{job.id.slice(0, 8)}
              </h1>
              <StatusBadge status={job.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {job.task_type.replace("_", " ")} &bull; {job.model_id || "auto"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCancellable && (
            <button
              onClick={() => cancelJob.mutate(job.id)}
              disabled={cancelJob.isPending}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
          {isCompleted && videoUrl && (
            <a
              href={videoUrl}
              download
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Output + Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Output Video / Preview */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Output Video</h3>
            {isCompleted && videoUrl ? (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  src={videoUrl}
                  poster={thumbnailUrl || undefined}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            ) : isFailed ? (
              <div className="aspect-video bg-red-500/5 border border-red-500/20 rounded-lg flex items-center justify-center">
                <div className="text-center px-6">
                  <p className="text-sm text-red-400 font-medium">Generation Failed</p>
                  <p className="text-xs text-red-400/70 mt-1 break-words">{job.error_message}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground capitalize">{job.status.replace("_", " ")}...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input Information */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Input Information</h3>
            <div className="space-y-3">
              {job.inputs.prompt && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Prompt</span>
                  <p className="text-sm text-foreground bg-secondary rounded-lg p-3">
                    {job.inputs.prompt}
                  </p>
                </div>
              )}
              {job.inputs.negative_prompt && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Negative Prompt</span>
                  <p className="text-sm text-foreground bg-secondary rounded-lg p-3">
                    {job.inputs.negative_prompt}
                  </p>
                </div>
              )}
              {job.inputs.image_path && (
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Input Image</span>
                  <p className="text-sm text-foreground bg-secondary rounded-lg p-3 font-mono">
                    {job.inputs.image_path}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          {(job.total_time_seconds || job.inference_time_seconds) && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {job.queue_time_seconds != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Queue Time</p>
                    <p className="text-lg font-semibold text-foreground">{job.queue_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.load_model_time_seconds != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Load Model</p>
                    <p className="text-lg font-semibold text-foreground">{job.load_model_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.inference_time_seconds != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Inference</p>
                    <p className="text-lg font-semibold text-foreground">{job.inference_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.total_time_seconds != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Total Time</p>
                    <p className="text-lg font-semibold text-primary">{job.total_time_seconds.toFixed(1)}s</p>
                  </div>
                )}
                {job.peak_vram_gb != null && (
                  <div>
                    <p className="text-xs text-muted-foreground">Peak VRAM</p>
                    <p className="text-lg font-semibold text-foreground">{job.peak_vram_gb} GB</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Info + Timeline */}
        <div className="space-y-4">
          {/* Generation Settings */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Generation Settings</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground">{job.model_id || "auto"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution</span>
                <span className="text-foreground">{job.generation_params.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{job.generation_params.duration}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FPS</span>
                <span className="text-foreground">{job.generation_params.fps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Guidance</span>
                <span className="text-foreground">{job.generation_params.guidance_scale}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Steps</span>
                <span className="text-foreground">{job.generation_params.num_inference_steps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seed</span>
                <span className="text-foreground">{job.generation_params.seed || "Random"}</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-4">Timeline</h3>
            <div className="space-y-0">
              {timelineSteps.map((step, idx) => {
                const stepStatus = isFailed && step.key !== "completed"
                  ? (idx <= timelineSteps.findIndex((s) => s.key === job.status) ? "completed" : "pending")
                  : getStepStatus(job.status, step.key);
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border-2",
                          stepStatus === "completed"
                            ? "bg-emerald-400 border-emerald-400"
                            : stepStatus === "active"
                            ? "bg-primary border-primary"
                            : "bg-transparent border-muted-foreground/30"
                        )}
                      />
                      {idx < timelineSteps.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-6",
                            stepStatus === "completed"
                              ? "bg-emerald-400"
                              : "bg-muted-foreground/20"
                          )}
                        />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs -mt-0.5",
                        stepStatus === "active"
                          ? "text-primary font-medium"
                          : stepStatus === "completed"
                          ? "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Output Metadata */}
          {job.output_metadata && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-medium text-foreground mb-3">Output Info</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolution</span>
                  <span className="text-foreground">{job.output_metadata.width}x{job.output_metadata.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="text-foreground">{job.output_metadata.duration}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FPS</span>
                  <span className="text-foreground">{job.output_metadata.fps}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">File Size</span>
                  <span className="text-foreground">{job.output_metadata.file_size_mb} MB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
