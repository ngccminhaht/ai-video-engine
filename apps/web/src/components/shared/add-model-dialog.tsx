"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { modelsApi } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

interface AddModelDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddModelDialog({ open, onClose }: AddModelDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    version: "1.0",
    description: "",
    source: "",
    adapter_name: "mock",
    capabilities: ["text_to_video"] as string[],
    minimum_vram_gb: 8,
    recommended_vram_gb: 16,
    supports_quantization: true,
    supports_cpu_offload: true,
    supports_lora: false,
    max_resolution_width: 1280,
    max_resolution_height: 720,
    max_duration_seconds: 6,
    max_fps: 24,
  });

  const createModel = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (useMock) {
        // Simulate creation
        return { ...data, status: "available", total_jobs_completed: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      }
      return modelsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.models.all });
      onClose();
      resetForm();
    },
  });

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      version: "1.0",
      description: "",
      source: "",
      adapter_name: "mock",
      capabilities: ["text_to_video"],
      minimum_vram_gb: 8,
      recommended_vram_gb: 16,
      supports_quantization: true,
      supports_cpu_offload: true,
      supports_lora: false,
      max_resolution_width: 1280,
      max_resolution_height: 720,
      max_duration_seconds: 6,
      max_fps: 24,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createModel.mutate(formData);
  };

  const toggleCapability = (cap: string) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap],
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold text-foreground">Add Model</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Model ID *
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                placeholder="e.g. cogvideox-5b"
                required
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. CogVideoX-5B"
                required
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Adapter
              </label>
              <select
                value={formData.adapter_name}
                onChange={(e) => setFormData({ ...formData, adapter_name: e.target.value })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mock">Mock (test)</option>
                <option value="cogvideo">CogVideoX</option>
                <option value="wan">Wan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of the model..."
              className="w-full h-16 px-3 py-2 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Source URL (HuggingFace)
            </label>
            <input
              type="url"
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              placeholder="https://huggingface.co/..."
              className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Capabilities
            </label>
            <div className="flex gap-2">
              {["text_to_video", "image_to_video"].map((cap) => (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapability(cap)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    formData.capabilities.includes(cap)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-secondary text-muted-foreground border-border hover:border-primary/30"
                  }`}
                >
                  {cap === "text_to_video" ? "Text to Video" : "Image to Video"}
                </button>
              ))}
            </div>
          </div>

          {/* Hardware Requirements */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Min VRAM (GB)
              </label>
              <input
                type="number"
                value={formData.minimum_vram_gb}
                onChange={(e) => setFormData({ ...formData, minimum_vram_gb: Number(e.target.value) })}
                min={0}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Recommended VRAM (GB)
              </label>
              <input
                type="number"
                value={formData.recommended_vram_gb}
                onChange={(e) => setFormData({ ...formData, recommended_vram_gb: Number(e.target.value) })}
                min={0}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Max Width
              </label>
              <input
                type="number"
                value={formData.max_resolution_width}
                onChange={(e) => setFormData({ ...formData, max_resolution_width: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Max Height
              </label>
              <input
                type="number"
                value={formData.max_resolution_height}
                onChange={(e) => setFormData({ ...formData, max_resolution_height: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Max FPS
              </label>
              <input
                type="number"
                value={formData.max_fps}
                onChange={(e) => setFormData({ ...formData, max_fps: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Max Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.max_duration_seconds}
                onChange={(e) => setFormData({ ...formData, max_duration_seconds: Number(e.target.value) })}
                className="w-full h-9 px-3 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Feature Toggles */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Features
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                { key: "supports_quantization", label: "Quantization" },
                { key: "supports_cpu_offload", label: "CPU Offload" },
                { key: "supports_lora", label: "LoRA" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[key as keyof typeof formData] as boolean}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-border bg-secondary accent-primary"
                  />
                  <span className="text-xs text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {createModel.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400">
              {(createModel.error as Error).message}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.id || !formData.name || createModel.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {createModel.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
