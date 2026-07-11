export const queryKeys = {
  jobs: {
    all: ["jobs"] as const,
    list: (filters?: Record<string, unknown>) =>
      ["jobs", "list", filters] as const,
    detail: (id: string) => ["jobs", "detail", id] as const,
  },
  models: {
    all: ["models"] as const,
    list: () => ["models", "list"] as const,
    detail: (id: string) => ["models", "detail", id] as const,
  },
  workers: {
    all: ["workers"] as const,
    list: () => ["workers", "list"] as const,
  },
  dashboard: {
    stats: () => ["dashboard", "stats"] as const,
  },
  system: {
    health: () => ["system", "health"] as const,
    storage: () => ["system", "storage"] as const,
  },
};
