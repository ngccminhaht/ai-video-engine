"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FolderOpen, Loader2 } from "lucide-react";

interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  generation_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    const token = localStorage.getItem("access_token");
    const res = await fetch("/api/v1/projects", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setProjects(data.items);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const token = localStorage.getItem("access_token");
    const res = await fetch("/api/v1/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name: newName }),
    });
    if (res.ok) {
      setNewName("");
      setShowCreate(false);
      await fetchProjects();
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#8A8A8A]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A0A0A]">Projects</h1>
          <p className="text-sm text-[#666666] mt-1">Organize your video generations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="flex gap-3 p-4 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7]">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg border border-[#E5E5E5] bg-white text-sm focus:outline-none focus:border-[#111111]"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create"}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="px-4 py-2 rounded-lg border border-[#E5E5E5] text-sm text-[#666666] hover:text-[#0A0A0A]"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Project grid */}
      {projects.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[#E5E5E5]">
          <FolderOpen className="w-12 h-12 text-[#8A8A8A] mx-auto mb-3" />
          <h3 className="text-lg font-medium text-[#0A0A0A] mb-1">No projects yet</h3>
          <p className="text-sm text-[#666666] mb-4">Create a project to organize your videos</p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A]"
          >
            <Plus className="w-4 h-4" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              className="p-5 rounded-xl border border-[#E5E5E5] bg-white hover:border-[#111111] transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#F7F7F7] flex items-center justify-center">
                  <FolderOpen className="w-5 h-5 text-[#666666]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-[#0A0A0A] truncate">{p.name}</h3>
                  <p className="text-xs text-[#8A8A8A]">{p.generation_count} generations</p>
                </div>
              </div>
              {p.description && (
                <p className="text-xs text-[#666666] line-clamp-2">{p.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
