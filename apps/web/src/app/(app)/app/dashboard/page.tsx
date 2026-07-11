"use client";

import { Video, Plus, Clock, Sparkles, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/provider";
import { useUserDashboard } from "@/features/user-dashboard/hooks/use-user-dashboard";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const { data, isLoading, error } = useUserDashboard();

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
        </h1>
        <p className="text-sm text-[#666666] mt-1">
          Create AI-generated videos from text or images
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/app/generate"
          className="flex items-center gap-4 p-5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#111111] transition-colors group"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#111111] group-hover:bg-[#2A2A2A] transition-colors">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#0A0A0A]">
              Generate Video
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              Text to Video or Image to Video
            </p>
          </div>
        </Link>

        <Link
          href="/app/jobs"
          className="flex items-center gap-4 p-5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#111111] transition-colors group"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#F7F7F7] group-hover:bg-[#E5E5E5] transition-colors">
            <Video className="w-5 h-5 text-[#0A0A0A]" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-[#0A0A0A]">
              My Videos
            </h3>
            <p className="text-xs text-[#666666] mt-0.5">
              View your generation history
            </p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-[#E5E5E5] bg-white animate-pulse">
              <div className="h-4 bg-[#F7F7F7] rounded w-16 mb-2" />
              <div className="h-8 bg-[#F7F7F7] rounded w-12" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-sm text-red-700">Failed to load dashboard data</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Sparkles className="w-4 h-4" />}
            label="Credits"
            value={String(data?.stats.credits ?? user?.credits ?? 0)}
          />
          <StatCard
            icon={<CheckCircle2 className="w-4 h-4" />}
            label="Completed"
            value={String(data?.stats.completed_videos ?? 0)}
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Processing"
            value={String(data?.stats.processing_jobs ?? 0)}
          />
          <StatCard
            icon={<Video className="w-4 h-4" />}
            label="Total"
            value={String(data?.stats.total_videos ?? 0)}
          />
        </div>
      )}

      {/* Active Jobs */}
      {data?.active_jobs && data.active_jobs.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-[#0A0A0A] mb-3">Active Generations</h2>
          <div className="space-y-2">
            {data.active_jobs.map((job) => (
              <Link
                key={job.id}
                href={`/app/generate/processing/${job.id}`}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#111111] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {job.prompt || "Untitled generation"}
                  </p>
                  <p className="text-xs text-[#666666] mt-0.5">
                    {job.stage || job.status} {job.progress > 0 && `— ${job.progress}%`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-[#F7F7F7] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed */}
      {data?.recent_completed && data.recent_completed.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-[#0A0A0A] mb-3">Recent Videos</h2>
          <div className="space-y-2">
            {data.recent_completed.map((job) => (
              <div
                key={job.id}
                className="flex items-center gap-4 p-4 rounded-xl border border-[#E5E5E5] bg-white"
              >
                <div className="w-10 h-10 rounded-lg bg-[#F7F7F7] flex items-center justify-center">
                  <Video className="w-5 h-5 text-[#666666]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#0A0A0A] truncate">
                    {job.prompt || "Untitled"}
                  </p>
                  <p className="text-xs text-[#666666] mt-0.5">
                    {job.task_type === "text_to_video" ? "Text to Video" : "Image to Video"}
                  </p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State (only when no data at all) */}
      {!isLoading && data?.stats.total_videos === 0 && (
        <div className="rounded-xl border border-[#E5E5E5] p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F7F7F7] flex items-center justify-center">
              <Video className="w-8 h-8 text-[#8A8A8A]" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-[#0A0A0A] mb-1">
            No videos yet
          </h3>
          <p className="text-sm text-[#666666] mb-6 max-w-md mx-auto">
            Create your first AI-generated video by describing what you want to
            see, or upload an image to animate.
          </p>
          <Link
            href="/app/generate"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate your first video
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-[#E5E5E5] bg-white">
      <div className="flex items-center gap-2 text-[#666666] mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-[#0A0A0A]">{value}</p>
    </div>
  );
}
