import { cn } from "@/lib/utils";
import type { JobStatus, ModelStatus } from "@/types";

const jobStatusConfig: Record<JobStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-[#FFF5DF] text-[#B66A00] border-[#F2D49B]" },
  queued: { label: "Queued", className: "bg-[#EEF4FF] text-[#3568B8] border-[#C8D8F1]" },
  loading_model: { label: "Loading Model", className: "bg-[#FFF0F0] text-[#C5242D] border-[#F3C4C6]" },
  processing: { label: "Processing", className: "bg-[#EEF4FF] text-[#3568B8] border-[#C8D8F1]" },
  post_processing: { label: "Post Processing", className: "bg-[#FFF0F0] text-[#9F1D26] border-[#F3C4C6]" },
  completed: { label: "Completed", className: "bg-[#EAF8F1] text-[#178553] border-[#B8E3CF]" },
  failed: { label: "Failed", className: "bg-[#FFF0EF] text-[#D92D20] border-[#F4B8B3]" },
  cancelled: { label: "Cancelled", className: "bg-[#F3E9E9] text-[#847174] border-[#EBDCDD]" },
};

const modelStatusConfig: Record<ModelStatus, { label: string; className: string }> = {
  available: { label: "Available", className: "bg-[#EAF8F1] text-[#178553] border-[#B8E3CF]" },
  loaded: { label: "Loaded", className: "bg-[#EEF4FF] text-[#3568B8] border-[#C8D8F1]" },
  loading: { label: "Loading", className: "bg-[#FFF5DF] text-[#B66A00] border-[#F2D49B]" },
  disabled: { label: "Disabled", className: "bg-[#F3E9E9] text-[#847174] border-[#EBDCDD]" },
  error: { label: "Error", className: "bg-[#FFF0EF] text-[#D92D20] border-[#F4B8B3]" },
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
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border", config.className, className)}>
      {config.label}
    </span>
  );
}
