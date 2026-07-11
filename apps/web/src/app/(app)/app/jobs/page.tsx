"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video, Clock, CheckCircle2, XCircle, Loader2, Download, RotateCcw, Search } from "lucide-react";

interface Generation {
  id: string;
  task_type: string;
  status: string;
  prompt: string | null;
  progress: number;
  output_path: string | null;
  credits_charged: number;
  created_at: string;
  completed_at: string | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, label: "Pending", color: "text-[#D97706] bg-[#D97706]/10" },
  queued: { icon: <Clock className="w-3.5 h-3.5" />, label: "Queued", color: "text-[#D97706] bg-[#D97706]/10" },
  loading_model: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Loading", color: "text-[#2563EB] bg-[#2563EB]/10" },
  processing: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Processing", color: "text-[#2563EB] bg-[#2563EB]/10" },
  post_processing: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, label: "Finalizing", color: "text-[#2563EB] bg-[#2563EB]/10" },
  completed: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: "Completed", color: "text-[#16A34A] bg-[#16A34A]/10" },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Failed", color: "text-[#DC2626] bg-[#DC2626]/10" },
  cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Cancelled", color: "text-[#8A8A8A] bg-[#8A8A8A]/10" },
};

const TABS = ["all", "processing", "completed", "failed"];

export default function JobsPage() {
  const [jobs, setJobs] = useState<Generation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchJobs();
  }, [tab, page]);

  async function fetchJobs() {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    const params = new URLSearchParams({ page: String(page), page_size: "20" });
    if (tab === "processing") params.set("status", "processing");
    else if (tab === "completed") params.set("status", "completed");
    else if (tab === "failed") params.set("status", "failed");
    if (search) params.set("search", search);

    const res = await fetch(`/api/v1/generations?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setJobs(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">My Jobs</h1>
        <p className="text-sm text-[#666666] mt-1">Your generation history</p>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg bg-[#F7F7F7]">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#666666] hover:text-[#0A0A0A]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A8A8A]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="pl-9 pr-3 py-2 rounded-lg border border-[#E5E5E5] text-sm w-64 focus:outline-none focus:border-[#111111]"
          />
        </form>
      </div>

      {/* Jobs list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl border border-[#E5E5E5] animate-pulse bg-[#F7F7F7]" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[#E5E5E5]">
          <Video className="w-10 h-10 text-[#8A8A8A] mx-auto mb-2" />
          <p className="text-sm text-[#666666]">No generations found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
            return (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#111111]/20 transition-colors"
              >
                {/* Status */}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
                  {config.icon}
                  {config.label}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#0A0A0A] truncate font-medium">
                    {job.prompt || "Untitled generation"}
                  </p>
                  <p className="text-xs text-[#8A8A8A] mt-0.5">
                    {job.task_type === "text_to_video" ? "Text to Video" : "Image to Video"}
                    {" · "}
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {job.status === "completed" && job.output_path && (
                    <Link
                      href={`/app/generate/result/${job.id}`}
                      className="px-3 py-1.5 rounded-lg bg-[#111111] text-white text-xs font-medium hover:bg-[#2A2A2A] transition-colors"
                    >
                      View
                    </Link>
                  )}
                  {job.status === "completed" && job.output_path && (
                    <a
                      href={`/api/v1/files/${job.output_path.replace(/\\/g, "/")}`}
                      download
                      className="p-2 rounded-lg border border-[#E5E5E5] text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  {job.status === "failed" && (
                    <Link
                      href="/app/generate"
                      className="p-2 rounded-lg border border-[#E5E5E5] text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
                      title="Retry"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Link>
                  )}
                  {["pending", "queued", "processing", "loading_model"].includes(job.status) && (
                    <Link
                      href={`/app/generate/processing/${job.id}`}
                      className="px-3 py-1.5 rounded-lg bg-[#F7F7F7] text-xs font-medium text-[#0A0A0A] hover:bg-[#E5E5E5] transition-colors"
                    >
                      View Progress
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[#666666]">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
