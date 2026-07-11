"use client";

import { useState, useCallback } from "react";
import { useModels, useGenerateVideo, useUploadFile } from "@/features/generation/hooks/use-generation";
import { cn } from "@/lib/utils";
import {
  Sparkles,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  CheckCircle,
  Upload,
  X,
  Clock,
  Cpu,
  Zap,
  ChevronDown,
  ChevronUp,
  FileVideo,
  Wand2,
  ImagePlay,
  Info,
} from "lucide-react";
import type { TaskType } from "@/types";
import Link from "next/link";

export default function GenerateVideoPage() {
  // Form state
  const [activeTab, setActiveTab] = useState<TaskType>("text_to_video");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [resolution, setResolution] = useState("720p");
  const [fps, setFps] = useState(24);
  const [duration, setDuration] = useState(5);
  const [seed, setSeed] = useState<string>("");
  const [useSeed, setUseSeed] = useState(false);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [steps, setSteps] = useState(30);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string>("");
  const [imagePreview, setImagePreview] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastJobId, setLastJobId] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Hooks
  const { data: models, isLoading: modelsLoading } = useModels();
  const { generate, isPending: isSubmitting } = useGenerateVideo();
  const uploadFile = useUploadFile();

  // Model logic
  const modelList = models || [];
  const availableModels = modelList.filter((m) => m.status !== "disabled");
  const filteredModels = activeTab === "image_to_video"
    ? availableModels.filter((m) => m.capabilities.includes("image_to_video"))
    : availableModels;

  const currentModelId = selectedModel || filteredModels[0]?.id || "";
  const selectedModelData = modelList.find((m) => m.id === currentModelId);
  const vramRequired = selectedModelData?.recommended_vram_gb || 0;
  const estimatedTime = selectedModelData?.avg_inference_time_seconds
    ? `${Math.ceil(selectedModelData.avg_inference_time_seconds / 60)}–${Math.ceil(selectedModelData.avg_inference_time_seconds / 60) + 1} minutes`
    : "—";

  // Validation
  const isPromptValid = prompt.trim().length > 0;
  const isImageValid = activeTab === "text_to_video" || !!imagePath;
  const isModelReady = selectedModelData?.status === "available" || selectedModelData?.status === "loaded";
  const canSubmit = isPromptValid && isImageValid && !isSubmitting && !uploadFile.isPending;

  // Handlers
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    try {
      const result = await uploadFile.mutateAsync(file);
      setImagePath(result.path);
    } catch {
      setImageFile(null);
      setImagePreview("");
      setImagePath("");
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImagePath("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitSuccess(false);

    try {
      const job = await generate({
        task_type: activeTab,
        model_id: currentModelId || null,
        prompt,
        negative_prompt: negativePrompt || undefined,
        image_path: activeTab === "image_to_video" ? imagePath : undefined,
        duration,
        resolution,
        fps,
        seed: useSeed && seed ? parseInt(seed, 10) : null,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
      });
      setSubmitSuccess(true);
      setLastJobId(job.id);
      setPrompt("");
      setNegativePrompt("");
      setImageFile(null);
      setImagePreview("");
      setImagePath("");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-[32px] font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Generate video
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Create, configure and run AI video generations.
          </p>
        </div>
        <div className="flex items-center gap-2 max-sm:hidden shrink-0">
          <Link
            href="/admin/jobs"
            className="px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-150"
            style={{
              color: "var(--primary)",
              background: "var(--primary-soft)",
            }}
          >
            View recent jobs
          </Link>
        </div>
      </div>

      {/* Success Banner */}
      {submitSuccess && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{
            background: "var(--success-soft)",
            border: "1px solid var(--success-border)",
          }}
        >
          <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--success)" }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: "var(--success)" }}>
              Generation submitted successfully!
            </p>
            <Link
              href={`/admin/jobs/${lastJobId}`}
              className="text-[13px] font-medium hover:underline"
              style={{ color: "var(--success)" }}
            >
              View job #{lastJobId.slice(0, 8)} →
            </Link>
          </div>
          <button
            onClick={() => setSubmitSuccess(false)}
            className="p-1 rounded-md transition-colors"
            style={{ color: "var(--success)" }}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Workflow Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("text_to_video")}
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left",
          )}
          style={
            activeTab === "text_to_video"
              ? {
                  background: "var(--primary-soft)",
                  borderColor: "var(--primary)",
                }
              : {
                  background: "var(--card)",
                  borderColor: "var(--border-default)",
                }
          }
          aria-selected={activeTab === "text_to_video"}
          role="tab"
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{
              background: activeTab === "text_to_video" ? "var(--primary)" : "var(--surface-tertiary)",
            }}
          >
            <Wand2
              className="w-5 h-5"
              style={{
                color: activeTab === "text_to_video" ? "white" : "var(--text-tertiary)",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold"
              style={{
                color: activeTab === "text_to_video" ? "var(--primary)" : "var(--text-primary)",
              }}
            >
              Text to Video
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Generate a new video from a written scene description.
            </p>
          </div>
          {activeTab === "text_to_video" && (
            <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("image_to_video")}
          className={cn(
            "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-150 text-left",
          )}
          style={
            activeTab === "image_to_video"
              ? {
                  background: "var(--primary-soft)",
                  borderColor: "var(--primary)",
                }
              : {
                  background: "var(--card)",
                  borderColor: "var(--border-default)",
                }
          }
          aria-selected={activeTab === "image_to_video"}
          role="tab"
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{
              background: activeTab === "image_to_video" ? "var(--primary)" : "var(--surface-tertiary)",
            }}
          >
            <ImagePlay
              className="w-5 h-5"
              style={{
                color: activeTab === "image_to_video" ? "white" : "var(--text-tertiary)",
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold"
              style={{
                color: activeTab === "image_to_video" ? "var(--primary)" : "var(--text-primary)",
              }}
            >
              Image to Video
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              Animate a reference image using a motion prompt.
            </p>
          </div>
          {activeTab === "image_to_video" && (
            <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "var(--primary)" }} />
          )}
        </button>
      </div>

      {/* Main Content: Form + Summary */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Left Column: Form Sections */}
        <div className="flex flex-col gap-8">
          {/* Section 1: Creative Input */}
          <section
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: "var(--primary-soft)" }}
              >
                <Sparkles className="w-4 h-4" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Creative input
                </h2>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Describe the video you want to create.
                </p>
              </div>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <label
                htmlFor="prompt"
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Prompt <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Describe the subject, motion, environment, lighting and camera movement.
              </p>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Example: A cinematic close-up of a luxury perfume bottle on reflective marble. Soft golden light moves across the glass while the camera slowly pushes forward..."
                className="w-full min-h-[160px] px-4 py-3 rounded-xl text-sm resize-y transition-all duration-150"
                style={{
                  background: "var(--input-background)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                  e.currentTarget.style.boxShadow = "0 0 0 4px var(--focus-ring)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                required
                aria-describedby="prompt-helper"
              />
              <div className="flex justify-between items-center">
                <span id="prompt-helper" className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {!isPromptValid && prompt.length === 0 ? "" : !isPromptValid ? "Prompt is required" : ""}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {prompt.length} characters
                </span>
              </div>
            </div>

            {/* Negative Prompt */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="negative-prompt"
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Negative prompt
                </label>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{ background: "var(--surface-tertiary)", color: "var(--text-tertiary)" }}
                >
                  Optional
                </span>
              </div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Specify visual artifacts, objects or styles the model should avoid.
              </p>
              <textarea
                id="negative-prompt"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="blurry, distorted hands, flickering, text artifacts, low detail..."
                className="w-full h-20 px-4 py-3 rounded-xl text-sm resize-y transition-all duration-150"
                style={{
                  background: "var(--input-background)",
                  border: "1px solid var(--border-default)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-focus)";
                  e.currentTarget.style.boxShadow = "0 0 0 4px var(--focus-ring)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                aria-describedby="neg-prompt-helper"
              />
            </div>
          </section>

          {/* Section 2: Reference Image (only for I2V) */}
          {activeTab === "image_to_video" && (
            <section
              className="rounded-2xl p-6 md:p-8"
              style={{
                background: "var(--card)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ background: "var(--primary-soft)" }}
                >
                  <ImageIcon className="w-4 h-4" style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Reference image
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Upload an image to animate with your motion prompt.
                  </p>
                </div>
              </div>

              {/* Upload Zone */}
              {!imageFile ? (
                <label
                  className={cn(
                    "flex flex-col items-center justify-center min-h-[220px] rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150",
                  )}
                  style={{
                    background: dragActive ? "var(--primary-soft)" : "var(--surface-secondary)",
                    borderColor: dragActive ? "var(--primary)" : "var(--border-default)",
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  tabIndex={0}
                  role="button"
                  aria-label="Upload reference image"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      (e.currentTarget.querySelector("input") as HTMLInputElement)?.click();
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-xl mb-3"
                    style={{ background: "var(--primary-soft)" }}
                  >
                    <Upload className="w-5 h-5" style={{ color: "var(--primary)" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Drop a reference image here
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                    or click to browse from your computer
                  </p>
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    PNG, JPG or WebP &middot; Maximum 100 MB
                  </p>
                </label>
              ) : uploadFile.isPending ? (
                /* Uploading State */
                <div
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: "var(--primary)" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {imageFile.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Uploading... {(imageFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                    <div
                      className="w-full h-1.5 rounded-full mt-2 overflow-hidden"
                      style={{ background: "#F2E3E4" }}
                    >
                      <div
                        className="h-full rounded-full animate-pulse"
                        style={{ background: "var(--primary)", width: "60%" }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Uploaded State */
                <div
                  className="flex gap-4 p-4 rounded-xl"
                  style={{
                    background: "var(--surface-secondary)",
                    border: "1px solid var(--border-default)",
                  }}
                >
                  {imagePreview && (
                    <div
                      className="w-24 h-24 rounded-lg overflow-hidden shrink-0"
                      style={{ border: "1px solid var(--border-default)" }}
                    >
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        style={{ background: "var(--background)" }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                      {imageFile.name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {(imageFile.size / (1024 * 1024)).toFixed(2)} MB &middot; {imageFile.type.split("/")[1].toUpperCase()}
                    </p>
                    {imagePath && (
                      <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--success)" }}>
                        <CheckCircle className="w-3 h-3" /> Uploaded
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      <label
                        className="text-[13px] font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        style={{
                          background: "var(--primary-soft)",
                          color: "var(--primary)",
                          border: "1px solid var(--primary-border)",
                        }}
                      >
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileInput} className="hidden" />
                        Replace
                      </label>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="text-[13px] font-medium px-3 py-1.5 rounded-lg transition-colors"
                        style={{
                          background: "var(--danger-soft)",
                          color: "var(--danger)",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {uploadFile.isError && (
                <div
                  className="mt-3 p-3 rounded-lg flex items-center gap-2"
                  style={{
                    background: "var(--danger-soft)",
                    border: "1px solid var(--danger-border)",
                  }}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "var(--danger)" }} />
                  <p className="text-xs" style={{ color: "var(--danger)" }}>
                    Upload failed. Please try again.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Section 3: Video Settings */}
          <section
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{ background: "var(--primary-soft)" }}
              >
                <FileVideo className="w-4 h-4" style={{ color: "var(--primary)" }} />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  Video settings
                </h2>
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Configure output format and model.
                </p>
              </div>
            </div>

            {/* Model Selector */}
            <div className="space-y-2 mb-5">
              <label
                htmlFor="model-select"
                className="text-[13px] font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Model
              </label>
              {modelsLoading ? (
                <div
                  className="flex items-center gap-2 h-11 px-4 rounded-xl"
                  style={{ background: "var(--surface-secondary)", border: "1px solid var(--border-default)" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--primary)" }} />
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Loading models...</span>
                </div>
              ) : (
                <select
                  id="model-select"
                  value={currentModelId}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-sm transition-all duration-150 appearance-none cursor-pointer"
                  style={{
                    background: "var(--input-background)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px var(--focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {filteredModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.version} — {model.recommended_vram_gb} GB VRAM
                    </option>
                  ))}
                </select>
              )}
              {selectedModelData && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background:
                        selectedModelData.status === "available" || selectedModelData.status === "loaded"
                          ? "var(--success)"
                          : selectedModelData.status === "loading"
                          ? "var(--warning)"
                          : "var(--danger)",
                    }}
                  />
                  {selectedModelData.status === "loaded" ? "Ready" : selectedModelData.status}
                  {" · "}
                  {selectedModelData.capabilities.map((c) => c === "text_to_video" ? "T2V" : "I2V").join(" / ")}
                  {" · "}
                  {selectedModelData.recommended_vram_gb} GB VRAM
                </p>
              )}
            </div>

            {/* Grid: Resolution, FPS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div className="space-y-2">
                <label
                  htmlFor="resolution-select"
                  className="text-[13px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Resolution
                </label>
                <select
                  id="resolution-select"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl text-sm transition-all duration-150 appearance-none cursor-pointer"
                  style={{
                    background: "var(--input-background)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px var(--focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <option value="480p">480p — Fast</option>
                  <option value="720p">720p — Recommended</option>
                  <option value="1080p">1080p — High quality</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  FPS
                </label>
                <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
                  {[16, 24, 30].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFps(val)}
                      className="flex-1 h-11 text-sm font-medium transition-all duration-150"
                      style={{
                        background: fps === val ? "var(--primary)" : "var(--input-background)",
                        color: fps === val ? "white" : "var(--text-secondary)",
                        borderRight: val !== 30 ? "1px solid var(--border-default)" : "none",
                      }}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Duration + Seed */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Duration
                  </label>
                  <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                    {duration}s
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full"
                  aria-label={`Duration: ${duration} seconds`}
                />
                <div className="flex justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <span>1s</span>
                  <span>6s</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Seed
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseSeed(!useSeed)}
                    className="text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
                    style={{
                      background: useSeed ? "var(--primary-soft)" : "var(--surface-tertiary)",
                      color: useSeed ? "var(--primary)" : "var(--text-tertiary)",
                    }}
                  >
                    {useSeed ? "Fixed" : "Random"}
                  </button>
                </div>
                <input
                  type="text"
                  value={useSeed ? seed : ""}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random seed"
                  disabled={!useSeed}
                  className="w-full h-11 px-4 rounded-xl text-sm transition-all duration-150"
                  style={{
                    background: useSeed ? "var(--input-background)" : "var(--input-disabled-background)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-focus)";
                    e.currentTarget.style.boxShadow = "0 0 0 4px var(--focus-ring)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-default)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  Use the same seed to reproduce a similar result.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Advanced Settings (Collapsible) */}
          <section
            className="rounded-2xl overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-6 md:p-8 transition-colors duration-150"
              style={{ color: "var(--text-primary)" }}
              aria-expanded={showAdvanced}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg"
                  style={{ background: "var(--surface-tertiary)" }}
                >
                  <Zap className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                </div>
                <div className="text-left">
                  <h2 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                    Advanced generation settings
                  </h2>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                    Fine-tune model behavior and reproducibility.
                  </p>
                </div>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              ) : (
                <ChevronDown className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              )}
            </button>

            {showAdvanced && (
              <div
                className="px-6 md:px-8 pb-6 md:pb-8 space-y-5"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <div className="pt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Guidance Scale */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        Guidance Scale
                      </label>
                      <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                        {guidanceScale}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      step={0.5}
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(Number(e.target.value))}
                      className="w-full"
                      aria-label={`Guidance scale: ${guidanceScale}`}
                    />
                    <div className="flex justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span>1</span>
                      <span>20</span>
                    </div>
                  </div>

                  {/* Inference Steps */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        Inference Steps
                      </label>
                      <span className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                        {steps}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={steps}
                      onChange={(e) => setSteps(Number(e.target.value))}
                      className="w-full"
                      aria-label={`Inference steps: ${steps}`}
                    />
                    <div className="flex justify-between text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span>10</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Summary + CTA */}
        <div className="lg:sticky lg:top-6 space-y-8 min-w-0">
          {/* Generation Summary */}
          <div
            className="rounded-2xl p-6 md:p-8 overflow-hidden"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
              Generation summary
            </h3>

            <div className="space-y-3">
              {/* Task */}
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Task
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {activeTab === "text_to_video" ? "Text to Video" : "Image to Video"}
                </span>
              </div>

              <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

              {/* Model */}
              <div className="flex justify-between items-start">
                <span className="text-[13px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Model
                </span>
                <div className="text-right">
                  {selectedModelData ? (
                    <>
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {selectedModelData.name}
                      </p>
                      <p className="text-xs flex items-center gap-1 justify-end mt-0.5" style={{ color: "var(--success)" }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--success)" }} />
                        Ready
                      </p>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      Not selected
                    </p>
                  )}
                </div>
              </div>

              <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

              {/* Output */}
              <div className="flex justify-between items-center">
                <span className="text-[13px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Output
                </span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {resolution} &middot; {duration}s &middot; {fps} FPS
                </span>
              </div>

              <div style={{ borderTop: "1px solid var(--border-subtle)" }} />

              {/* Resource Estimate */}
              <div>
                <span className="text-[13px] font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Resource estimate
                </span>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                      <Cpu className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                      VRAM
                    </span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {vramRequired > 0 ? `${vramRequired} GB` : "—"}
                    </span>
                  </div>
                  {vramRequired > 0 && (
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden"
                      style={{ background: "#F2E3E4" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          background: "var(--primary)",
                          width: `${Math.min((vramRequired / 24) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-xs flex items-center gap-2" style={{ color: "var(--text-tertiary)" }}>
                      <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--primary)" }} />
                      Estimated
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {estimatedTime}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Warning */}
            {selectedModelData && (
              <div
                className="mt-4 p-3 rounded-lg flex gap-2 overflow-hidden"
                style={{
                  background: "var(--warning-soft)",
                  border: "1px solid var(--warning-border)",
                }}
              >
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
                <p className="text-[11px] leading-relaxed min-w-0 break-words" style={{ color: "var(--warning)" }}>
                  Estimates are approximate. Actual time may vary depending on model and system load.
                </p>
              </div>
            )}

            {!selectedModelData && !modelsLoading && (
              <div
                className="mt-4 p-3 rounded-lg flex gap-2 overflow-hidden"
                style={{
                  background: "var(--info-soft)",
                  border: "1px solid var(--info-border)",
                }}
              >
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "var(--info)" }} />
                <p className="text-[11px] leading-relaxed min-w-0 break-words" style={{ color: "var(--info)" }}>
                  Select a model to see estimated resource usage.
                </p>
              </div>
            )}
          </div>

          {/* Generate CTA */}
          <div
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full h-[50px] rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2"
              style={{
                background: canSubmit ? "var(--primary)" : "var(--input-disabled-background)",
                color: canSubmit ? "var(--primary-foreground)" : "var(--text-muted)",
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
              onMouseEnter={(e) => {
                if (canSubmit) e.currentTarget.style.background = "var(--primary-hover)";
              }}
              onMouseLeave={(e) => {
                if (canSubmit) e.currentTarget.style.background = "var(--primary)";
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting generation...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate video
                </>
              )}
            </button>

            {/* Helper text for disabled state */}
            {!canSubmit && !isSubmitting && (
              <p className="text-xs text-center mt-2.5" style={{ color: "var(--text-muted)" }}>
                {!isPromptValid
                  ? "Add a prompt to continue."
                  : !isImageValid
                  ? "Upload a reference image to continue."
                  : uploadFile.isPending
                  ? "Wait for upload to complete."
                  : ""}
              </p>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
