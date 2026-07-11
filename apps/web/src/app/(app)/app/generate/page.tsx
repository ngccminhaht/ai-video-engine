"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Image as ImageIcon,
  Upload,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/provider";

interface ModelOption {
  id: string;
  display_name: string;
  capabilities: string[];
  max_duration_seconds: number;
  max_fps: number;
  estimated_time_seconds: number | null;
  credit_cost_per_second: number;
  style_preset: string | null;
}

interface GenerationOptions {
  models: ModelOption[];
  resolutions: string[];
  fps_options: number[];
  duration_range: { min: number; max: number };
  credit_costs: Record<string, { per_second: number }>;
}

export default function GeneratePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [options, setOptions] = useState<GenerationOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Form state
  const [taskType, setTaskType] = useState<"text_to_video" | "image_to_video">("text_to_video");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(5);
  const [fps, setFps] = useState(24);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [seed, setSeed] = useState("");
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [steps, setSteps] = useState(50);

  // Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch generation options
  useEffect(() => {
    async function fetchOptions() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch("/api/v1/generation-options", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          setOptions(await res.json());
        }
      } catch {
        // Fallback: use defaults
      } finally {
        setOptionsLoading(false);
      }
    }
    fetchOptions();
  }, []);

  // Calculate credit cost
  const creditCost = (() => {
    const costPerSecond = options?.credit_costs[resolution]?.per_second ?? 2;
    return Math.ceil(duration * costPerSecond);
  })();

  // Handle image upload
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  // Submit generation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Upload image first if I2V
      let imagePath: string | undefined;
      if (taskType === "image_to_video" && imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        const token = localStorage.getItem("access_token");
        const uploadRes = await fetch("/api/v1/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error("Failed to upload image");
        }
        const uploadData = await uploadRes.json();
        imagePath = uploadData.path;
      }

      // Create generation
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/v1/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          task_type: taskType,
          prompt,
          negative_prompt: negativePrompt || undefined,
          image_path: imagePath,
          model_id: modelId,
          duration,
          resolution,
          fps,
          seed: seed ? parseInt(seed) : undefined,
          guidance_scale: guidanceScale,
          num_inference_steps: steps,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Generation failed");
      }

      const job = await res.json();
      router.push(`/app/generate/processing/${job.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  // Filter models by task type
  const availableModels = options?.models.filter((m) =>
    m.capabilities.includes(taskType)
  ) ?? [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-[#0A0A0A]">Generate Video</h1>
        <p className="text-sm text-[#666666] mt-1">
          Create AI-generated videos from text descriptions or images
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Task Type Tabs */}
        <div className="flex gap-1 p-1 rounded-lg bg-[#F7F7F7]">
          <button
            type="button"
            onClick={() => setTaskType("text_to_video")}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              taskType === "text_to_video"
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#666666] hover:text-[#0A0A0A]"
            }`}
          >
            <Video className="w-4 h-4" />
            Text to Video
          </button>
          <button
            type="button"
            onClick={() => setTaskType("image_to_video")}
            className={`flex items-center gap-2 flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
              taskType === "image_to_video"
                ? "bg-white text-[#0A0A0A] shadow-sm"
                : "text-[#666666] hover:text-[#0A0A0A]"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image to Video
          </button>
        </div>

        {/* Image Upload (I2V only) */}
        {taskType === "image_to_video" && (
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              Input Image
            </label>
            {imagePreview ? (
              <div className="relative rounded-lg border border-[#E5E5E5] overflow-hidden">
                <img src={imagePreview} alt="Input" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 text-white text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed border-[#E5E5E5] hover:border-[#111111] cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-[#8A8A8A] mb-2" />
                <span className="text-sm text-[#666666]">Click or drag to upload</span>
                <span className="text-xs text-[#8A8A8A] mt-1">PNG, JPG up to 100MB</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Prompt */}
        <div>
          <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              taskType === "text_to_video"
                ? "Describe the video you want to create..."
                : "Describe how the image should animate..."
            }
            required
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm placeholder:text-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111] transition-colors resize-none"
          />
          <p className="text-xs text-[#8A8A8A] mt-1 text-right">
            {prompt.length}/2000
          </p>
        </div>

        {/* Basic Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Resolution */}
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              Resolution
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              Duration ({duration}s)
            </label>
            <input
              type="range"
              min={1}
              max={options?.duration_range.max ?? 30}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#111111]"
            />
          </div>

          {/* FPS */}
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              FPS
            </label>
            <select
              value={fps}
              onChange={(e) => setFps(parseInt(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]"
            >
              {(options?.fps_options ?? [16, 24, 30]).map((f) => (
                <option key={f} value={f}>{f} fps</option>
              ))}
            </select>
          </div>
        </div>

        {/* Model Selection */}
        {availableModels.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
              Model
            </label>
            <select
              value={modelId ?? ""}
              onChange={(e) => setModelId(e.target.value || null)}
              className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]"
            >
              <option value="">Auto (recommended)</option>
              {availableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name}
                  {m.estimated_time_seconds ? ` (~${m.estimated_time_seconds}s)` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Advanced Settings */}
        <div className="border border-[#E5E5E5] rounded-lg">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[#666666] hover:text-[#0A0A0A]"
          >
            Advanced Settings
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-4 border-t border-[#E5E5E5] pt-4">
              <div>
                <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                  Negative Prompt
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Things to avoid (e.g., blurry, low quality)"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm placeholder:text-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111] resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                    Seed
                  </label>
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random"
                    min={0}
                    className="w-full px-3 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#0A0A0A] text-sm placeholder:text-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                    Guidance ({guidanceScale})
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={0.5}
                    value={guidanceScale}
                    onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                    className="w-full h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0A0A0A] mb-1.5">
                    Steps ({steps})
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#E5E5E5] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-[#F7F7F7] border border-[#E5E5E5]">
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-[#666666]">Cost: </span>
              <span className="font-semibold text-[#0A0A0A]">{creditCost} credits</span>
            </div>
            <div className="text-sm">
              <span className="text-[#666666]">Balance: </span>
              <span className="font-semibold text-[#0A0A0A]">{user?.credits ?? 0}</span>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !prompt.trim() || (taskType === "image_to_video" && !imageFile)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111111] text-white text-sm font-medium hover:bg-[#2A2A2A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {submitting ? "Generating..." : "Generate Video"}
          </button>
        </div>
      </form>
    </div>
  );
}
