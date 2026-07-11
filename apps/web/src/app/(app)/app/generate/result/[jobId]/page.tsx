"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Download,
  Copy,
  RefreshCw,
  Shuffle,
  ArrowLeft,
  Video,
  Clock,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface GenerationResult {
  id: string;
  task_type: string;
  status: string;
  prompt: string | null;
  model_id: string | null;
  output_path: string | null;
  thumbnail_path: string | null;
  output_metadata: {
    width?: number;
    height?: number;
    duration?: number;
    fps?: number;
    file_size_mb?: number;
  } | null;
  credits_held: number;
  credits_charged: number;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export default function ResultPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;
  const [data, setData] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [duplicating, setDuplicating] = useState(false);
  const [variating, setVariating] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [jobId]);

  async function fetchResult() {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/generations/${jobId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const job = await res.json();
      setData(job);
      // If not completed, redirect to processing
      if (!["completed", "failed", "cancelled"].includes(job.status)) {
        router.replace(`/app/generate/processing/${jobId}`);
      }
    }
    setLoading(false);
  }

  async function handleDownload() {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/outputs/${jobId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const { download_url, filename } = await res.json();
      const a = document.createElement("a");
      a.href = download_url;
      a.download = filename;
      a.click();
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/generations/${jobId}/duplicate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/app/generate/processing/${id}`);
    }
    setDuplicating(false);
  }

  async function handleVariation() {
    setVariating(true);
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/generations/${jobId}/variations`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/app/generate/processing/${id}`);
    }
    setVariating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#8A8A8A]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto mb-3" />
        <h2 className="text-lg font-medium text-[#0A0A0A] mb-1">Not found</h2>
        <p className="text-sm text-[#666666]">This generation doesn&apos;t exist or was deleted.</p>
      </div>
    );
  }

  const isCompleted = data.status === "completed";
  const videoUrl = data.output_path
    ? `/api/v1/files/${data.output_path.replace(/\\/g, "/")}`
    : null;
  const meta = data.output_metadata;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back nav */}
      <Link
        href="/app/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#0A0A0A] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E5E5E5] overflow-hidden bg-black aspect-video relative">
            {isCompleted && videoUrl ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                className="w-full h-full object-contain"
                poster={
                  data.thumbnail_path
                    ? `/api/v1/files/${data.thumbnail_path.replace(/\\/g, "/")}`
                    : undefined
                }
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  {data.status === "failed" ? (
                    <>
                      <AlertCircle className="w-10 h-10 text-[#DC2626] mx-auto mb-2" />
                      <p className="text-sm text-white/80">Generation failed</p>
                    </>
                  ) : (
                    <>
                      <Video className="w-10 h-10 text-white/40 mx-auto mb-2" />
                      <p className="text-sm text-white/60">No video output</p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Error message */}
          {data.status === "failed" && data.error_message && (
            <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm font-medium text-red-800 mb-1">Error</p>
              <p className="text-sm text-red-700">{data.error_message}</p>
            </div>
          )}

          {/* Prompt */}
          {data.prompt && (
            <div className="mt-4 p-4 rounded-xl border border-[#E5E5E5]">
              <p className="text-xs font-medium text-[#8A8A8A] mb-1">Prompt</p>
              <p className="text-sm text-[#0A0A0A]">{data.prompt}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Status */}
          <div className="p-4 rounded-xl border border-[#E5E5E5]">
            <div className="flex items-center gap-2 mb-3">
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              ) : (
                <AlertCircle className="w-4 h-4 text-[#DC2626]" />
              )}
              <span className="text-sm font-medium text-[#0A0A0A] capitalize">
                {data.status}
              </span>
            </div>

            {/* Metadata */}
            {meta && (
              <div className="space-y-2 text-sm">
                {meta.duration && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Duration</span>
                    <span className="text-[#0A0A0A]">{meta.duration}s</span>
                  </div>
                )}
                {meta.width && meta.height && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">Resolution</span>
                    <span className="text-[#0A0A0A]">{meta.width}x{meta.height}</span>
                  </div>
                )}
                {meta.fps && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">FPS</span>
                    <span className="text-[#0A0A0A]">{meta.fps}</span>
                  </div>
                )}
                {meta.file_size_mb && (
                  <div className="flex justify-between">
                    <span className="text-[#666666]">File size</span>
                    <span className="text-[#0A0A0A]">{meta.file_size_mb} MB</span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-[#E5E5E5] space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#666666]">Type</span>
                <span className="text-[#0A0A0A]">
                  {data.task_type === "text_to_video" ? "Text to Video" : "Image to Video"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Credits</span>
                <span className="text-[#0A0A0A]">{data.credits_charged || data.credits_held}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666666]">Created</span>
                <span className="text-[#0A0A0A]">
                  {new Date(data.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {isCompleted && (
              <button
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Video
              </button>
            )}

            <button
              onClick={handleDuplicate}
              disabled={duplicating}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] hover:border-[#111111] transition-colors disabled:opacity-50"
            >
              {duplicating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              Regenerate (Same Settings)
            </button>

            <button
              onClick={handleVariation}
              disabled={variating}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] hover:border-[#111111] transition-colors disabled:opacity-50"
            >
              {variating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Shuffle className="w-4 h-4" />
              )}
              Generate Variation
            </button>

            <Link
              href="/app/generate"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] text-sm font-medium text-[#0A0A0A] hover:border-[#111111] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              New Generation
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
