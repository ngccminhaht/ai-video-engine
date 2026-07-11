// === Job Types ===

export type JobStatus =
  | "pending"
  | "queued"
  | "loading_model"
  | "processing"
  | "post_processing"
  | "completed"
  | "failed"
  | "cancelled";

export type TaskType = "text_to_video" | "image_to_video";

export interface GenerationParams {
  duration: number;
  resolution: string;
  fps: number;
  seed: number | null;
  guidance_scale: number;
  num_inference_steps: number;
}

export interface JobInputs {
  prompt?: string;
  negative_prompt?: string;
  image_path?: string;
}

export interface OutputMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
  file_size_mb: number;
}

export interface Job {
  id: string;
  task_type: TaskType;
  status: JobStatus;
  model_id: string | null;
  inputs: JobInputs;
  generation_params: GenerationParams;
  output_path: string | null;
  thumbnail_path: string | null;
  output_metadata: OutputMetadata | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  priority: number;
  queue_time_seconds: number | null;
  load_model_time_seconds: number | null;
  inference_time_seconds: number | null;
  postprocess_time_seconds: number | null;
  total_time_seconds: number | null;
  peak_vram_gb: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface JobCreateRequest {
  task_type: TaskType;
  model_id: string | null;
  inputs: JobInputs;
  generation_params: Partial<GenerationParams>;
  priority?: number;
}

// === Model Types ===

export type ModelStatus = "available" | "loaded" | "loading" | "disabled" | "error";

export interface Model {
  id: string;
  name: string;
  version: string;
  description: string | null;
  source: string | null;
  adapter_name: string;
  capabilities: string[];
  minimum_vram_gb: number;
  recommended_vram_gb: number;
  supports_quantization: boolean;
  supports_cpu_offload: boolean;
  supports_lora: boolean;
  max_resolution_width: number;
  max_resolution_height: number;
  max_duration_seconds: number;
  max_fps: number;
  status: ModelStatus;
  avg_inference_time_seconds: number | null;
  avg_vram_usage_gb: number | null;
  total_jobs_completed: number;
  created_at: string;
  updated_at: string;
}

// === Worker Types ===

export interface GpuInfo {
  name: string;
  utilization_percent: number;
  vram_used_gb: number;
  vram_total_gb: number;
  temperature_celsius: number | null;
}

export interface Worker {
  id: string;
  hostname: string;
  status: "online" | "offline" | "busy" | "draining";
  gpu: GpuInfo;
  current_job_id: string | null;
  loaded_model_id: string | null;
  last_heartbeat: string;
}

// === API Types ===

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface JobListResponse {
  jobs: Job[];
  total: number;
}

export interface ModelListResponse {
  models: Model[];
  total: number;
}

// === Dashboard Types ===

export interface DashboardStats {
  total_jobs: number;
  pending_jobs: number;
  running_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  total_models: number;
  loaded_models: number;
  total_models_available: number;
  workers_online: number;
  gpu_utilization: number;
  vram_used_gb: number;
  vram_total_gb: number;
  storage_used_tb: number;
}

// === Storage Types ===

export interface StorageStats {
  total_size_gb: number;
  uploads_size_gb: number;
  outputs_size_gb: number;
  models_size_gb: number;
}
