import { cn } from "@/lib/utils";
import type { JobStatus, ModelStatus } from "@/types";

const jobStatusConfig: Record<
  JobStatus,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  queued: { label: "Queued", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  loading_model: { label: "Loading Model", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  processing: { label: "Processing", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  post_processing: { label: "Post Processing", className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelled: { label: "Cancelled", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
};

const modelStatusConfig: Record<
  ModelStatus,
  { label: string; className: string }
> = {
  available: { label: "Available", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  loaded: { label: "Loaded", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  loading: { label: "Loading", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  disabled: { label: "Disabled", className: "bg-gray-500/10 text-gray-400 border-gray-500/20" },
  error: { label: "Error", className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

interface StatusBadgeProps {
  status: JobStatus | ModelStatus;
  type?: "job" | "model";
  className?: string;
}

export function StatusBadge({ status, type = "job", className }: StatusBadgeProps) {
  const config = type === "job"
    ? jobStatusConfig[status as JobStatus]
    : modelStatusConfig[status as ModelStatus];

  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
