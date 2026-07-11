/**
 * API Client — handles all HTTP communication with the FastAPI backend.
 *
 * Uses Next.js rewrites to proxy /api/* → backend,
 * so requests go to the same origin (no CORS issues in production).
 */

const API_BASE = "/api/v1";

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || body.message || detail;
    } catch {
      // Response body isn't JSON
    }
    throw new ApiError(response.status, detail);
  }
  return response.json();
}

// --- Auth header helper ---

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

// --- Generic fetch helpers ---

async function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const response = await fetch(url.toString(), {
    headers: getAuthHeaders(),
  });
  return handleResponse<T>(response);
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

async function del<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  return handleResponse<T>(response);
}

// --- API Methods ---

import type {
  Job,
  JobCreateRequest,
  JobListResponse,
  Model,
  DashboardStats,
  Worker,
  StorageStats,
} from "@/types";

// Jobs
export const jobsApi = {
  list: (params?: {
    status?: string;
    task_type?: string;
    model_id?: string;
    skip?: number;
    limit?: number;
  }) =>
    get<JobListResponse>("/jobs", params),

  get: (id: string) => get<Job>(`/jobs/${id}`),

  create: (data: JobCreateRequest) => post<Job>("/jobs", data),

  cancel: (id: string) =>
    post<{ id: string; status: string; message: string }>(`/jobs/${id}/cancel`),
};

// Models
export const modelsApi = {
  list: (params?: { skip?: number; limit?: number }) =>
    get<Model[]>("/models", params),

  get: (id: string) => get<Model>(`/models/${id}`),

  create: (data: Partial<Model>) => post<Model>("/models", data),

  update: (id: string, data: Partial<Model>) =>
    patch<Model>(`/models/${id}`, data),

  delete: (id: string) => del<void>(`/models/${id}`),
};

// Workers (Phase 2 — currently returns mock or from stats)
export const workersApi = {
  list: () => get<Worker[]>("/workers"),
};

// Storage
export const storageApi = {
  stats: () => get<StorageStats>("/storage/stats"),

  upload: async (file: File): Promise<{ path: string; filename: string; size_mb: number }> => {
    const formData = new FormData();
    formData.append("file", file);
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    return handleResponse(response);
  },

  outputs: (limit?: number) =>
    get<{ files: Array<{ path: string; filename: string; size_mb: number }>; total: number }>(
      "/storage/outputs",
      { limit }
    ),
};

// Health / System
export const systemApi = {
  health: () =>
    fetch("/health")
      .then((r) => r.json())
      .catch(() => ({ status: "unreachable" })),
};

// Dashboard stats (aggregated from multiple endpoints)
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // Fetch jobs and models to compute stats
    const [jobsData, models, storageData] = await Promise.all([
      jobsApi.list({ limit: 1 }),
      modelsApi.list().catch(() => []),
      storageApi.stats().catch(() => null),
    ]);

    // Get job counts by status
    const [pending, running, completed, failed] = await Promise.all([
      jobsApi.list({ status: "pending", limit: 1 }).then((r) => r.total).catch(() => 0),
      jobsApi.list({ status: "processing", limit: 1 }).then((r) => r.total).catch(() => 0),
      jobsApi.list({ status: "completed", limit: 1 }).then((r) => r.total).catch(() => 0),
      jobsApi.list({ status: "failed", limit: 1 }).then((r) => r.total).catch(() => 0),
    ]);

    const modelList = Array.isArray(models) ? models : [];

    return {
      total_jobs: jobsData.total,
      pending_jobs: pending,
      running_jobs: running,
      completed_jobs: completed,
      failed_jobs: failed,
      total_models: modelList.length,
      loaded_models: modelList.filter((m) => m.status === "loaded").length,
      total_models_available: modelList.filter((m) => m.status === "available").length,
      workers_online: 1, // Phase 2 will provide real worker count
      gpu_utilization: 0, // Phase 2
      vram_used_gb: 0, // Phase 2
      vram_total_gb: 0, // Phase 2
      storage_used_tb: storageData
        ? storageData.total_size_mb / 1024 / 1024
        : 0,
    };
  },
};

// File URL helper
export function getFileUrl(path: string | null): string | null {
  if (!path) return null;
  // Handle paths like "outputs/xxx.mp4" → "/api/v1/files/outputs/xxx.mp4"
  const cleanPath = path.replace(/^\//, "").replace(/\\/g, "/");
  return `${API_BASE}/files/${cleanPath}`;
}
