import type { Worker } from "@/types";

export const mockWorkers: Worker[] = [
  {
    id: "worker-01",
    hostname: "gpu-server-01",
    status: "online",
    gpu: {
      name: "NVIDIA RTX 4090",
      utilization_percent: 45,
      vram_used_gb: 12,
      vram_total_gb: 24,
      temperature_celsius: 62,
    },
    current_job_id: "c8d2e5f3",
    loaded_model_id: "realisticVL_v4.0",
    last_heartbeat: "2024-05-26T14:35:00Z",
  },
  {
    id: "worker-02",
    hostname: "gpu-server-02",
    status: "online",
    gpu: {
      name: "NVIDIA RTX 3090",
      utilization_percent: 22,
      vram_used_gb: 6,
      vram_total_gb: 24,
      temperature_celsius: 48,
    },
    current_job_id: null,
    loaded_model_id: "cogVideoX_5B",
    last_heartbeat: "2024-05-26T14:35:00Z",
  },
  {
    id: "worker-03",
    hostname: "gpu-server-03",
    status: "busy",
    gpu: {
      name: "NVIDIA RTX 4090",
      utilization_percent: 78,
      vram_used_gb: 18,
      vram_total_gb: 24,
      temperature_celsius: 71,
    },
    current_job_id: "d9e3f6a2",
    loaded_model_id: "animateDiff_v3",
    last_heartbeat: "2024-05-26T14:35:00Z",
  },
];
