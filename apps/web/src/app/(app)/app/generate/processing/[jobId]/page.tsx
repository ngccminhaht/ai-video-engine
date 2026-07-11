"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, X, RefreshCw } from "lucide-react";

interface GenerationStatus {
  id: string;
  status: string;
  progress: number;
  stage: string | null;
  prompt: string | null;
  output_path: string | null;
  error_message: string | null;
}

const STAGE_LABELS: Record<string, string> = {
  pending: "Waiting in queue...",
  queued: "Queued for processing...",
  loading_model: "Loading AI model...",
  processing: "Generating video...",
  post_processing: "Finalizing video...",
  completed: "Complete!",
  failed: "Generation failed",
  cancelled: "Cancelled",
};

export default function ProcessingPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [data, setData] = useState<GenerationStatus | null>(null);
  const [error, setError] = useState("");
  const [useSSE, setUseSSE] = useState(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial state
  const fetchStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v1/generations/${jobId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const job = await res.json();
      setData(job);
      return job;
    } catch {
      setError("Failed to fetch generation status");
      return null;
    }
  }, [jobId]);

  // SSE connection
  useEffect(() => {
    if (!useSSE) return;

    const token = localStorage.getItem("access_token");
    // SSE doesn't support custom headers, so we pass token as query param
    // For now, fall back to polling since our SSE endpoint needs Bearer auth
    setUseSSE(false);
    return;
  }, [useSSE, jobId]);

  // Polling fallback (primary for now until SSE auth is resolved)
  useEffect(() => {
    let active = true;

    async function poll() {
      const job = await fetchStatus();
      if (!active) return;
      if (job && ["completed", "failed", "cancelled"].includes(job.status)) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        // Auto-redirect to result page on completion
        if (job.status === "completed") {
          setTimeout(() => router.push(`/app/generate/result/${jobId}`), 1500);
        }
      }
    }

    poll(); // Initial fetch
    pollingRef.current = setInterval(poll, 2000);

    return () => {
      active = false;
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStatus]);

  // Cancel handler
  async function handleCancel() {
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/generations/${jobId}/cancel`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    await fetchStatus();
  }

  const isTerminal = data && ["completed", "failed", "cancelled"].includes(data.status);
  const isSuccess = data?.status === "completed";
  const isFailed = data?.status === "failed";
  const isCancelled = data?.status === "cancelled";

  return (
    <div className="max-w-lg mx-auto text-center py-12">
      {/* Progress Circle */}
      <div className="relative w-36 h-36 mx-auto mb-8">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#E5E5E5"
            strokeWidth="7"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={isSuccess ? "#16A34A" : isFailed ? "#DC2626" : "#2563EB"}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - (data?.progress ?? 0) / 100)}`}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isSuccess ? (
            <CheckCircle2 className="w-12 h-12 text-[#16A34A]" />
          ) : isFailed ? (
            <XCircle className="w-12 h-12 text-[#DC2626]" />
          ) : isCancelled ? (
            <X className="w-12 h-12 text-[#8A8A8A]" />
          ) : (
            <span className="text-3xl font-semibold text-[#0A0A0A]">
              {data?.progress ?? 0}%
            </span>
          )}
        </div>
      </div>

      {/* Stage Label */}
      <h2 className="text-xl font-medium text-[#0A0A0A] mb-2">
        {data ? (data.stage || STAGE_LABELS[data.status] || data.status) : "Loading..."}
      </h2>

      {/* Status subtitle */}
      {!isTerminal && data && (
        <p className="text-sm text-[#666666] mb-2">
          {data.status === "queued" && "Your video will start generating shortly"}
          {data.status === "loading_model" && "This may take a moment for the first generation"}
          {data.status === "processing" && "AI is creating your video frame by frame"}
        </p>
      )}

      {/* Prompt */}
      {data?.prompt && (
        <p className="text-sm text-[#8A8A8A] mb-6 max-w-sm mx-auto truncate italic">
          &ldquo;{data.prompt}&rdquo;
        </p>
      )}

      {/* Error message */}
      {isFailed && data?.error_message && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 mb-6 text-left">
          <p className="font-medium mb-1">Generation failed</p>
          <p className="text-red-600">
            {data.error_message.includes("CUDA")
              ? "The system is currently experiencing high load. Please try again."
              : data.error_message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 mt-6">
        {!isTerminal && (
          <>
            <Loader2 className="w-5 h-5 text-[#2563EB] animate-spin" />
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E5E5E5] text-sm text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </>
        )}
        {isSuccess && (
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/app/generate/result/${jobId}`)}
              className="px-5 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
            >
              View Result
            </button>
            <button
              onClick={() => router.push("/app/generate")}
              className="px-5 py-2.5 rounded-lg border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] hover:border-[#111111] transition-colors"
            >
              Generate Another
            </button>
          </div>
        )}
        {(isFailed || isCancelled) && (
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/app/generate")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={() => router.push("/app/dashboard")}
              className="px-5 py-2.5 rounded-lg border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] hover:border-[#111111] transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {error && !data && (
        <p className="mt-6 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
