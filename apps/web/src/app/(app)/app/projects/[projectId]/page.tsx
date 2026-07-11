"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Video, Download, Copy, Shuffle, Trash2, Loader2, Play } from "lucide-react";
import Link from "next/link";

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  generation_count: number;
  recent_jobs: Array<{
    id: string;
    task_type: string;
    status: string;
    prompt: string | null;
    output_path: string | null;
    thumbnail_path: string | null;
    created_at: string;
  }>;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function fetchProject() {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/projects/${projectId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setProject(data);
      // Select first completed job
      const first = data.recent_jobs.find((j: { status: string }) => j.status === "completed");
      if (first) setSelectedJob(first.id);
    } else {
      router.push("/app/projects");
    }
    setLoading(false);
  }

  async function handleDuplicate(jobId: string) {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/generations/${jobId}/duplicate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/app/generate/processing/${data.id}`);
    }
  }

  async function handleVariation(jobId: string) {
    const token = localStorage.getItem("access_token");
    const res = await fetch(`/api/v1/generations/${jobId}/variations`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/app/generate/processing/${data.id}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#8A8A8A]" />
      </div>
    );
  }

  if (!project) return null;

  const completedJobs = project.recent_jobs.filter((j) => j.status === "completed");
  const selected = completedJobs.find((j) => j.id === selectedJob);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/app/projects"
          className="p-2 rounded-lg border border-[#E5E5E5] text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-[#0A0A0A]">{project.name}</h1>
          {project.description && (
            <p className="text-sm text-[#666666] mt-0.5">{project.description}</p>
          )}
        </div>
      </div>

      {/* Video Player */}
      {selected && selected.output_path && (
        <div className="rounded-xl border border-[#E5E5E5] overflow-hidden bg-black">
          <video
            key={selected.id}
            src={`/api/v1/files/${selected.output_path.replace(/\\/g, "/")}`}
            controls
            className="w-full max-h-[500px] object-contain"
          />
          <div className="p-4 bg-white border-t border-[#E5E5E5]">
            <p className="text-sm text-[#0A0A0A] font-medium truncate">
              {selected.prompt || "Untitled"}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <a
                href={`/api/v1/files/${selected.output_path.replace(/\\/g, "/")}`}
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </a>
              <button
                onClick={() => handleDuplicate(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
              <button
                onClick={() => handleVariation(selected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E5E5] text-xs font-medium text-[#666666] hover:text-[#0A0A0A] hover:border-[#111111] transition-colors"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Variation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Grid */}
      {completedJobs.length > 0 ? (
        <div>
          <h2 className="text-lg font-medium text-[#0A0A0A] mb-3">
            Outputs ({completedJobs.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {completedJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job.id)}
                className={`relative rounded-lg border overflow-hidden aspect-video bg-[#F7F7F7] transition-all ${
                  selectedJob === job.id
                    ? "border-[#111111] ring-2 ring-[#111111]/20"
                    : "border-[#E5E5E5] hover:border-[#111111]"
                }`}
              >
                {job.thumbnail_path ? (
                  <img
                    src={`/api/v1/files/${job.thumbnail_path.replace(/\\/g, "/")}`}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Video className="w-6 h-6 text-[#8A8A8A]" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/30 transition-opacity">
                  <Play className="w-8 h-8 text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border border-[#E5E5E5]">
          <Video className="w-10 h-10 text-[#8A8A8A] mx-auto mb-2" />
          <p className="text-sm text-[#666666]">No completed videos in this project yet</p>
          <Link
            href="/app/generate"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A]"
          >
            Generate Video
          </Link>
        </div>
      )}
    </div>
  );
}
