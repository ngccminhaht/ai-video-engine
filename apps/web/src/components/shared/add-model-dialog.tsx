"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { modelsApi } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/keys";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

interface AddModelDialogProps { open: boolean; onClose: () => void; }

export function AddModelDialog({ open, onClose }: AddModelDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    id: "", name: "", version: "1.0", description: "", source: "", adapter_name: "mock",
    capabilities: ["text_to_video"] as string[], minimum_vram_gb: 8, recommended_vram_gb: 16,
    supports_quantization: true, supports_cpu_offload: true, supports_lora: false,
    max_resolution_width: 1280, max_resolution_height: 720, max_duration_seconds: 6, max_fps: 24,
  });

  const createModel = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (useMock) return { ...data, status: "available", total_jobs_completed: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      return modelsApi.create(data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: queryKeys.models.all }); onClose(); },
  });

  const toggleCapability = (cap: string) => {
    setFormData((prev) => ({ ...prev, capabilities: prev.capabilities.includes(cap) ? prev.capabilities.filter((c) => c !== cap) : [...prev.capabilities, cap] }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto mx-4" style={{ border: "1px solid var(--border-default)", boxShadow: "var(--shadow-floating)" }}>
        <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10 rounded-t-2xl" style={{ borderBottom: "1px solid var(--border-default)" }}>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Add Model</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors" style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createModel.mutate(formData); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Model ID *</label><input type="text" value={formData.id} onChange={(e) => setFormData({ ...formData, id: e.target.value })} placeholder="e.g. cogvideox-5b" required className="input-admin" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Display Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. CogVideoX-5B" required className="input-admin" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Version</label><input type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} className="input-admin" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Adapter</label><select value={formData.adapter_name} onChange={(e) => setFormData({ ...formData, adapter_name: e.target.value })} className="input-admin"><option value="mock">Mock</option><option value="cogvideo">CogVideoX</option><option value="wan">Wan</option></select></div>
          </div>
          <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Capabilities</label>
            <div className="flex gap-2">
              {["text_to_video", "image_to_video"].map((cap) => (
                <button key={cap} type="button" onClick={() => toggleCapability(cap)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
                  style={formData.capabilities.includes(cap) ? { background: "var(--primary-soft)", color: "var(--primary)", borderColor: "var(--primary-border)" } : { background: "var(--card)", color: "var(--text-tertiary)", borderColor: "var(--border-default)" }}>
                  {cap === "text_to_video" ? "Text to Video" : "Image to Video"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Min VRAM (GB)</label><input type="number" value={formData.minimum_vram_gb} onChange={(e) => setFormData({ ...formData, minimum_vram_gb: Number(e.target.value) })} className="input-admin" /></div>
            <div><label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-tertiary)" }}>Recommended VRAM (GB)</label><input type="number" value={formData.recommended_vram_gb} onChange={(e) => setFormData({ ...formData, recommended_vram_gb: Number(e.target.value) })} className="input-admin" /></div>
          </div>
          {createModel.error && <div className="rounded-xl p-3 text-xs" style={{ background: "var(--danger-soft)", border: "1px solid var(--danger-border)", color: "var(--danger)" }}>{(createModel.error as Error).message}</div>}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-default">Cancel</button>
            <button type="submit" disabled={!formData.id || !formData.name || createModel.isPending} className="btn btn-primary flex items-center gap-2 disabled:opacity-50">
              {createModel.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Model
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
