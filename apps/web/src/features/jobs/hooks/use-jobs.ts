"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { jobsApi } from "@/lib/api/client";
import { mockJobs } from "@/mocks/jobs";
import type { Job, JobCreateRequest, JobListResponse } from "@/types";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export function useJobs(filters?: {
  status?: string;
  task_type?: string;
  model_id?: string;
  skip?: number;
  limit?: number;
}) {
  return useQuery<JobListResponse>({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async () => {
      if (useMock) {
        let filtered = [...mockJobs];
        if (filters?.status && filters.status !== "all") {
          filtered = filtered.filter((j) => j.status === filters.status);
        }
        if (filters?.task_type && filters.task_type !== "all") {
          filtered = filtered.filter((j) => j.task_type === filters.task_type);
        }
        return { jobs: filtered, total: filtered.length };
      }
      return jobsApi.list(filters);
    },
  });
}

export function useJob(id: string) {
  return useQuery<Job>({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: async () => {
      if (useMock) {
        const job = mockJobs.find((j) => j.id === id);
        if (!job) throw new Error("Job not found");
        return job;
      }
      return jobsApi.get(id);
    },
    // Poll active jobs every 2s
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return false;
      const activeStatuses = ["pending", "queued", "loading_model", "processing", "post_processing"];
      return activeStatuses.includes(job.status) ? 2000 : false;
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JobCreateRequest) => {
      if (useMock) {
        // Simulate job creation
        return {
          id: `mock-${Date.now()}`,
          ...data,
          status: "queued" as const,
          output_path: null,
          thumbnail_path: null,
          output_metadata: null,
          error_message: null,
          retry_count: 0,
          max_retries: 3,
          priority: data.priority || 5,
          queue_time_seconds: null,
          load_model_time_seconds: null,
          inference_time_seconds: null,
          postprocess_time_seconds: null,
          total_time_seconds: null,
          peak_vram_gb: null,
          created_at: new Date().toISOString(),
          started_at: null,
          completed_at: null,
          updated_at: new Date().toISOString(),
          generation_params: {
            duration: 5,
            resolution: "720p",
            fps: 24,
            seed: null,
            guidance_scale: 7.5,
            num_inference_steps: 50,
            ...data.generation_params,
          },
        } as Job;
      }
      return jobsApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      if (useMock) {
        return { id: jobId, status: "cancelled", message: "Job cancelled" };
      }
      return jobsApi.cancel(jobId);
    },
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all });
    },
  });
}
