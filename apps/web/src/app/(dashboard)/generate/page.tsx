"use client";

import { useState } from "react";
import { mockModels } from "@/mocks/models";
import { cn } from "@/lib/utils";
import { Sparkles, Image as ImageIcon, AlertTriangle } from "lucide-react";

type TabType = "text_to_video" | "image_to_video";

export default function GenerateVideoPage() {
  const [activeTab, setActiveTab] = useState<TabType>("text_to_video");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(mockModels[0].id);
  const [resolution, setResolution] = useState("1280x720");
  const [fps, setFps] = useState(24);
  const [duration, setDuration] = useState(5);
  const [seed, setSeed] = useState<string>("");
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [steps, setSteps] = useState(30);
  const [outputs, setOutputs] = useState(1);

  const selectedModelData = mockModels.find((m) => m.id === selectedModel);
  const vramRequired = selectedModelData?.recommended_vram_gb || 0;
  const estimatedTime = selectedModelData?.avg_inference_time_seconds
    ? `~${Math.ceil(selectedModelData.avg_inference_time_seconds / 60)} min ${Math.round(selectedModelData.avg_inference_time_seconds % 60)}s`
    : "Unknown";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Will integrate with real API
    alert("Job submitted (mock)!");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Generate Video</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create videos using AI models
        </p>
      </div>

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
              <label className="block text-sm font-medium text-foreground mb-2">
                Prompt *
              </label>
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
              <label className="block text-sm font-medium text-foreground mb-2">
                Negative Prompt
              </label>
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Input Image *
                </label>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drop an image here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 10MB
                  </p>
                </div>
              </div>
            )}

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {mockModels
                  .filter((m) => m.status !== "disabled")
                  .filter((m) =>
                    activeTab === "image_to_video"
                      ? m.capabilities.includes("image_to_video")
                      : true
                  )
                  .map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.version}
                    </option>
                  ))}
              </select>
            </div>

            {/* Generation Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Resolution
                </label>
                <select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="1920x1080">1920 x 1080 (1080p)</option>
                  <option value="1280x720">1280 x 720 (720p)</option>
                  <option value="1024x576">1024 x 576</option>
                  <option value="768x512">768 x 512</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Aspect Ratio
                </label>
                <select className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="16:9">16:9</option>
                  <option value="9:16">9:16</option>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (s)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={1}
                  max={10}
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  FPS
                </label>
                <select
                  value={fps}
                  onChange={(e) => setFps(Number(e.target.value))}
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value={24}>24</option>
                  <option value={30}>30</option>
                  <option value={60}>60</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Seed
                </label>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Random"
                  className="w-full h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
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

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Outputs
              </label>
              <input
                type="number"
                value={outputs}
                onChange={(e) => setOutputs(Number(e.target.value))}
                min={1}
                max={4}
                className="w-24 h-10 px-4 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!prompt.trim()}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 disabled:bg-secondary disabled:text-muted-foreground text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate
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
                <span className="text-foreground capitalize">
                  {activeTab.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Model</span>
                <span className="text-foreground">
                  {selectedModelData?.name} {selectedModelData?.version}
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
                <span className="text-muted-foreground">Outputs</span>
                <span className="text-foreground">{outputs}</span>
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
                  <span className="text-muted-foreground">RAM Required</span>
                  <span className="text-foreground">32 GB</span>
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
                Estimates are approximate. Actual time may vary depending on the
                model and system load.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
