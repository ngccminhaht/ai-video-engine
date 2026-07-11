"use client";

import { use } from "react";
import { mockJobs } from "@/mocks/jobs";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  RotateCcw,
  Download,
  Trash2,
  Clock,
  Cpu,
  MemoryStick,
  Timer,
  Play,
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
  const job = mockJobs.find((j) => j.id === jobId);

  if (!job) {
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
              {job.task_type.replace("_", " ")} &bull; {job.model_id || "Unknown model"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors">
            <RotateCcw className="w-4 h-4" />
            Retry
          </button>
          {isCompleted && (
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-sm text-primary-foreground hover:bg-primary/90 transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
          )}
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive text-sm text-destructive-foreground hover:bg-destructive/90 transition-colors">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Output + Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Output Video / Preview */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Output Video</h3>
            {isCompleted ? (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors">
                    <Play className="w-6 h-6 text-white ml-1" />
                  </div>
                </div>
                {/* Placeholder for video thumbnail */}
                <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50" />
                {/* Time indicator */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                  <span className="text-xs text-white/80">0:00 / {job.generation_params.duration}:00</span>
                  <div className="flex-1 h-1 bg-white/20 rounded-full">
                    <div className="h-full w-0 bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            ) : isFailed ? (
              <div className="aspect-video bg-red-500/5 border border-red-500/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <p className="text-sm text-red-400 font-medium">Generation Failed</p>
                  <p className="text-xs text-red-400/70 mt-1">{job.error_message}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-video bg-secondary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Processing...</p>
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
            </div>
          </div>
        </div>

        {/* Right: Info + Timeline */}
        <div className="space-y-4">
          {/* Job Information */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Job Information</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Task Type</span>
                <span className="text-foreground capitalize">{job.task_type.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground">{job.model_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution</span>
                <span className="text-foreground">{job.generation_params.resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FPS</span>
                <span className="text-foreground">{job.generation_params.fps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="text-foreground">
                  {new Date(job.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {job.started_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started At</span>
                  <span className="text-foreground">
                    {new Date(job.started_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {job.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed At</span>
                  <span className="text-foreground">
                    {new Date(job.completed_at).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Generation Settings */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-medium text-foreground mb-3">Generation Settings</h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground">{job.model_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution</span>
                <span className="text-foreground">{job.generation_params.resolution}</span>
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
        </div>
      </div>
    </div>
  );
}
