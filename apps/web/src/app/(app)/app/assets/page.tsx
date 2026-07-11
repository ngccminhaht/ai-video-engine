"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Video, Upload, Trash2, Loader2, Grid, List } from "lucide-react";

interface AssetItem {
  id: string;
  type: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  size_mb: number;
  preview_url: string;
  created_at: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAssets();
  }, [typeFilter]);

  async function fetchAssets() {
    setLoading(true);
    const token = localStorage.getItem("access_token");
    const params = new URLSearchParams({ page_size: "50" });
    if (typeFilter !== "all") params.set("type", typeFilter);

    const res = await fetch(`/api/v1/assets?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (res.ok) {
      const data = await res.json();
      setAssets(data.items);
      setTotal(data.total);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const token = localStorage.getItem("access_token");
    // Upload file
    const formData = new FormData();
    formData.append("file", file);
    const uploadRes = await fetch("/api/v1/upload", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      // Register as asset
      await fetch("/api/v1/assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          filename: file.name,
          storage_path: uploadData.path,
          content_type: file.type || "application/octet-stream",
          size_bytes: uploadData.size_bytes || file.size,
          type: file.type.startsWith("video") ? "video" : "image",
        }),
      });
      await fetchAssets();
    }
    setUploading(false);
    e.target.value = "";
  }

  async function handleDelete(assetId: string) {
    if (!confirm("Delete this asset?")) return;
    const token = localStorage.getItem("access_token");
    await fetch(`/api/v1/assets/${assetId}`, {
      method: "DELETE",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    await fetchAssets();
  }

  const totalStorageMb = assets.reduce((sum, a) => sum + a.size_mb, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#0A0A0A]">Assets</h1>
          <p className="text-sm text-[#666666] mt-1">
            {total} files · {totalStorageMb.toFixed(1)} MB used
          </p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] transition-colors cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? "Uploading..." : "Upload"}
          <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 rounded-lg bg-[#F7F7F7]">
          {["all", "image", "video"].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                typeFilter === t ? "bg-white text-[#0A0A0A] shadow-sm" : "text-[#666666]"
              }`}
            >
              {t === "all" ? "All" : t === "image" ? "Images" : "Videos"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-[#F7F7F7] text-[#0A0A0A]" : "text-[#8A8A8A]"}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg ${viewMode === "list" ? "bg-[#F7F7F7] text-[#0A0A0A]" : "text-[#8A8A8A]"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-video rounded-lg bg-[#F7F7F7] animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-[#E5E5E5]">
          <ImageIcon className="w-10 h-10 text-[#8A8A8A] mx-auto mb-2" />
          <p className="text-sm text-[#666666] mb-4">No assets yet</p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] cursor-pointer">
            <Upload className="w-4 h-4" />
            Upload your first file
            <input type="file" accept="image/*,video/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="group relative rounded-lg border border-[#E5E5E5] overflow-hidden aspect-video bg-[#F7F7F7]">
              {asset.type === "image" ? (
                <img src={asset.preview_url} alt={asset.filename} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Video className="w-8 h-8 text-[#8A8A8A]" />
                </div>
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end">
                <div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <p className="text-xs text-white truncate">{asset.filename}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-white/70">{asset.size_mb} MB</span>
                    <button
                      onClick={() => handleDelete(asset.id)}
                      className="ml-auto p-1 rounded bg-red-500/80 text-white hover:bg-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div key={asset.id} className="flex items-center gap-4 p-3 rounded-lg border border-[#E5E5E5]">
              <div className="w-10 h-10 rounded bg-[#F7F7F7] flex items-center justify-center shrink-0">
                {asset.type === "image" ? <ImageIcon className="w-5 h-5 text-[#666666]" /> : <Video className="w-5 h-5 text-[#666666]" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#0A0A0A] truncate">{asset.filename}</p>
                <p className="text-xs text-[#8A8A8A]">{asset.size_mb} MB · {new Date(asset.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => handleDelete(asset.id)} className="p-2 text-[#8A8A8A] hover:text-[#DC2626]">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
