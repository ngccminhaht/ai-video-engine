"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { modelsApi, storageApi } from "@/lib/api/client";
import { useCreateJob } from "@/features/jobs/hooks/use-jobs";
import { mockModels } from "@/mocks/models";
import type { Model, JobCreateRequest, TaskType } from "@/types";

const useMock = process.env.NEXT_PUBLIC_USE_MOCK_API === "true";

export function useModels() {
  return useQuery<Model[]>({
    queryKey: queryKeys.models.list(),
    queryFn: async () => {
      if (useMock) return mockModels;
      return modelsApi.list();
    },
  });
}

export function useModel(id: string) {
  return useQuery<Model>({
    queryKey: queryKeys.models.detail(id),
    queryFn: async () => {
      if (useMock) {
        const model = mockModels.find((m) => m.id === id);
        if (!model) throw new Error("Model not found");
        return model;
      }
      return modelsApi.get(id);
    },
    enabled: !!id,
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      if (useMock) {
        return {
          path: `uploads/mock_${file.name}`,
          filename: file.name,
          size_mb: file.size / (1024 * 1024),
        };
      }
      return storageApi.upload(file);
    },
  });
}

export function useGenerateVideo() {
  const createJob = useCreateJob();

  return {
    ...createJob,
    generate: (params: {
      task_type: TaskType;
      model_id: string | null;
      prompt: string;
      negative_prompt?: string;
      image_path?: string;
      duration: number;
      resolution: string;
      fps: number;
      seed?: number | null;
      guidance_scale: number;
      num_inference_steps: number;
      priority?: number;
    }) => {
      const request: JobCreateRequest = {
        task_type: params.task_type,
        model_id: params.model_id,
        inputs: {
          prompt: params.prompt,
          negative_prompt: params.negative_prompt,
          image_path: params.image_path,
        },
        generation_params: {
          duration: params.duration,
          resolution: params.resolution,
          fps: params.fps,
          seed: params.seed ?? null,
          guidance_scale: params.guidance_scale,
          num_inference_steps: params.num_inference_steps,
        },
        priority: params.priority,
      };

      return createJob.mutateAsync(request);
    },
  };
}
