"use client";

import { useState } from "react";
import { useModels, useGenerateVideo, useUploadFile } from "@/features/generation/hooks/use-generation";
import { cn } from "@/lib/utils";
import { Sparkles, Image as ImageIcon, AlertTriangle, Loader2, CheckCircle } from "lucide-react";
import type { TaskType } from "@/types";

export default function GenerateVideoPage() {
  const [activeTab, setActiveTab] = useState<TaskType>("text_to_video");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [resolution, setResolution] = useState("720p");
  const [fps, setFps] = useState(24);
  const [duration, setDuration] = useState(5);
  const [seed, setSeed] = useState<string>("");
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [steps, setSteps] = useState(30);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePath, setImagePath] = useState<string>("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [lastJobId, setLastJobId] = useState<string>("");

  const { data: models, isLoading: modelsLoading } = useModels();
  const { generate, isPending: isSubmitting } = useGenerateVideo();
  const uploadFile = useUploadFile();

  // Set default model when models load
  const modelList = models || [];
  const availableModels = modelList.filter((m) => m.status !== "disabled");
  const filteredModels = activeTab === "image_to_video"
    ? availableModels.filter((m) => m.capabilities.includes("image_to_video"))
    : availableModels;

  const currentModelId = selectedModel || filteredModels[0]?.id || "";
  const selectedModelData = modelList.find((m) => m.id === currentModelId);
  const vramRequired = selectedModelData?.recommended_vram_gb || 0;
  const estimatedTime = selectedModelData?.avg_inference_time_seconds
    ? `~${Math.ceil(selectedModelData.avg_inference_time_seconds / 60)} min ${Math.round(selectedModelData.avg_inference_time_seconds % 60)}s`
    : "Unknown";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    try {
      const result = await uploadFile.mutateAsync(file);
      setImagePath(result.path);
    } catch (err) {
      alert(`Upload failed: ${(err as Error).message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        seed: seed ? parseInt(seed, 10) : null,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
      });
      setSubmitSuccess(true);
      setLastJobId(job.id);
      // Reset form
      setPrompt("");
      setNegativePrompt("");
      setImageFile(null);
      setImagePath("");
    } catch (err) {
      alert(`Generation failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generate Video</h1>
        <p className="text-sm text-muted-foreground mt-1">Create videos using AI models</p>
      </div>

      {/* Success Banner */}
      {submitSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-sm text-emerald-400 font-medium">Job submitted successfully!</p>
            <a href={`/jobs/${lastJobId}`} className="text-xs text-emerald-400/70 hover:underline">
              View job #{lastJobId.slice(0, 8)} →
            </a>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-secondary p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("text_to_video")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "text_to_video"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Sparkles className="w-4 h-4" />
              Text to Video
            </button>
            <button
              onClick={() => setActiveTab("image_to_video")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === "image_to_video"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="w-4 h-4" />
              Image to Video
            </button>
          </div>

          {/* Form Card */}
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-5">
            {/* Prompt */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Prompt *</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a detailed description of the video you want to create..."
                className="w-full h-24 px-4 py-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                required
              />
            </div>

            {/* Negative Prompt */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Negative Prompt</label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder="Things to avoid in the generation..."
                className="w-full h-16 px-4 py-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Image Upload (only for image_to_video) */}
            {activeTab === "image_to_video" && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Input Image *</label>
                <label className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {imageFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm text-foreground">{imageFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Drop an image here or click to browse</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 100MB</p>
                    </>
                  )}
                </label>
                {uploadFile.isPending && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                  </p>
                )}
              </div>
            )}

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Model</label>
              <select
                value={currentModelId}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={modelsLoading}
              >
                {modelsLoading && <option>Loading models...</option>}
                {filteredModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} {model.version}
                  </option>
                ))}
              </select>
            </div>

            {/* Generation Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Resolution</label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="1080p">1920 x 1080 (1080p)</option>
                  <option value="720p">1280 x 720 (720p)</option>
                  <option value="480p">854 x 480 (480p)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">FPS</label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value={16}>16</option>
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Duration (s)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  max={30}
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Seed</label>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random"
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Priority</label>
                <select className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value={5}>Normal (5)</option>
                  <option value={1}>Highest (1)</option>
                  <option value={3}>High (3)</option>
                  <option value={7}>Low (7)</option>
                  <option value={10}>Lowest (10)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Guidance Scale: {guidanceScale}
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={0.5}
                  value={guidanceScale}
                  onChange={(e) => setGuidanceScale(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Steps: {steps}
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={steps}
                  onChange={(e) => setSteps(Number(e.target.value))}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!prompt.trim() || isSubmitting || (activeTab === "image_to_video" && !imagePath)}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-secondary disabled:text-muted-foreground text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Generation Summary */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Generation Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Task Type</span>
                <span className="text-foreground capitalize">{activeTab.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground">
                  {selectedModelData ? `${selectedModelData.name} ${selectedModelData.version}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Resolution</span>
                <span className="text-foreground">{resolution}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-foreground">{duration}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">FPS</span>
                <span className="text-foreground">{fps}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Seed</span>
                <span className="text-foreground">{seed || "Random"}</span>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-medium text-foreground">Model Requirements</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VRAM Required</span>
                  <span className="text-foreground">{vramRequired} GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Time</span>
                  <span className="text-foreground">{estimatedTime}</span>
                </div>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400/80">
                Estimates are approximate. Actual time may vary depending on the model and system load.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
