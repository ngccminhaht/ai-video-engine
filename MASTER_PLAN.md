# AI Video Platform - Master Plan

## Tổng quan

Plan này chia dự án thành các bước nhỏ, mỗi bước có deliverable rõ ràng.

### 📊 Tiến độ hiện tại

| Phase | Trạng thái | Chi tiết |
|-------|-----------|----------|
| **Phase 1** | ✅ Hoàn thành (7/7) | 1.1 ✅ 1.2 ✅ 1.3 ✅ 1.4 ✅ 1.5 ✅ 1.6 ✅ 1.7 ✅ |
| **Phase 2** | ✅ Hoàn thành (3/3) | 2.1 ✅ 2.2 ✅ 2.3 ✅ |
| **Phase 3** | ✅ Hoàn thành (2/2) | 3.1 ✅ 3.2 ✅ |
| **Phase 4** | ✅ Hoàn thành (F1-F9) | Frontend Dashboard — real API integration |
| **Phase 5** | ⬜ Chưa bắt đầu | Advanced features |

**Bước tiếp theo:** Phase 5 (Advanced) hoặc deploy production

---

## Phase 1: Foundation (Backend Core) ✅ HOÀN THÀNH

### ✅ Bước 1.1: Khởi tạo project structure + environment

**Deliverable:** ✅ FastAPI running, Docker Compose, `.env`, linting

---

### ✅ Bước 1.2: Database schema + Model Registry

**Deliverable:** ✅ CRUD model registry, Alembic migrations, Swagger UI

---

### ✅ Bước 1.3: Job API + Job Queue

**Deliverable:** ✅ API tạo job → queue → worker skeleton

---

### ✅ Bước 1.4: GPU Worker + Model Adapter Interface

**Deliverable:** ✅ Full pipeline: API → Queue → Worker → Mock video output → Job completed

**Implementation:**
- `model_adapters/base/__init__.py` — BaseModelAdapter abstract class, GenerationRequest, GenerationResult, ModelCapabilities
- `model_adapters/mock/__init__.py` — MockAdapter (FFmpeg-based fake video generation)
- `model_adapters/__init__.py` — AdapterRegistry (register/get/cache adapters)
- `apps/worker/__init__.py` — Full worker: resolve adapter → load model → generate → save → update DB
- Error handling + retry (max 3 attempts, arq retry_delay=10s)

---

### ✅ Bước 1.5: Storage Layer

**Deliverable:** ✅ Upload → generate I2V → video output downloadable

**Implementation:**
- `core/storage/__init__.py` — StorageService (save_upload, get_file_path, delete_file, get_storage_stats, list_outputs, cleanup_old_files)
- `apps/api/routers/storage.py` — POST /upload, GET /files/{path}, GET /storage/stats, GET /storage/outputs, DELETE /files/{path}, POST /storage/cleanup

---

### ✅ Bước 1.6: Tích hợp Model thật (Text-to-Video)

**Quyết định:** CogVideoX-5B (THUDM/CogVideoX-5b)
- Hỗ trợ cả T2V và I2V
- Quantization 8-bit (~12GB) và 4-bit (~8GB)
- CPU offload cho máy thiếu VRAM

**Implementation:**
- `model_adapters/cogvideo/__init__.py` — CogVideoXAdapter
- `pyproject.toml [gpu]` — torch, diffusers, transformers, accelerate deps

---

### ✅ Bước 1.7: Tích hợp Model thật (Image-to-Video)

**Quyết định:** CogVideoX-5B (cùng adapter, dùng CogVideoXImageToVideoPipeline)

**Deliverable:** ✅ Multi-model I2V hoạt động qua cùng CogVideoX adapter

---

## Phase 2: Model Platform ✅ HOÀN THÀNH

### ✅ Bước 2.1: Model Scheduler + Resource Management

**Implementation:**
- `core/monitoring/__init__.py` — GpuMonitor (pynvml), ModelLRUCache, GpuResourceManager
- Real-time VRAM/utilization/temperature tracking
- LRU eviction khi hết VRAM
- Job rejection khi GPU quá nóng (>90°C)

---

### ✅ Bước 2.2: Model Router (Auto mode)

**Implementation:**
- `core/scheduler/__init__.py` — ModelRouter
- Scoring: loaded bonus (+50), VRAM fit (+30), performance history (+20), status (+10-15)
- `model_id: "auto"` → tự chọn model tốt nhất

---

### ✅ Bước 2.3: Monitoring + Stats API

**Implementation:**
- `apps/api/routers/workers.py` — GET /api/v1/workers, GET /api/v1/stats
- Dashboard stats: job counts by status, model counts, GPU info, storage usage
- Worker status: GPU util, VRAM, temperature, current job, loaded model

---

## Phase 3: Post-processing + Pipelines ✅ HOÀN THÀNH

### ✅ Bước 3.1: FFmpeg Post-processing Layer

**Implementation:**
- `postprocessing/ffmpeg/__init__.py` — FFmpegProcessor
- Encode (H.264/H.265/VP9), resize, frame interpolation (minterpolate)
- Add audio, trim, concatenate, upscale (lanczos)
- Video probing (ffprobe metadata extraction)
- PostProcessConfig dataclass for all options

---

### ✅ Bước 3.2: Pipeline Engine

**Implementation:**
- `pipelines/__init__.py` — Pipeline, PipelineStep, PipelineContext
- Built-in steps: ValidateInputStep, GenerationStep, PostProcessStep, ThumbnailStep
- Composable: create_default_pipeline(), create_lightweight_pipeline()
- Step dependency: required vs optional steps, conditional skip logic

---

## Phase 4: Admin Frontend ✅ HOÀN THÀNH (F1-F9)

### Tech Stack

```
Next.js 15 (App Router) + TypeScript
Tailwind CSS v4 (dark theme)
TanStack Query (polling, cache)
React Hook Form + Zod (validation)
Lucide React (icons)
Sonner (toast notifications)
```

### Trạng thái Implementation

| Phase | Mô tả | Trạng thái |
|-------|--------|-----------|
| F1 | Project foundation | ✅ Done |
| F2 | Layout & navigation | ✅ Done |
| F3 | Types + mock data + API layer | ✅ Done |
| F4 | Dashboard page | ✅ Done |
| F5 | Generate Video page | ✅ Done |
| F6 | Jobs pages | ✅ Done |
| F7 | Models & Workers pages | ✅ Done |
| F8 | Storage & Settings pages | ✅ Done |
| F9 | Backend integration (real API) | ✅ Done |
| F10 | Polish & testing | ⬜ Chưa |

### F9 Implementation Details:
- `lib/api/client.ts` — Full API client (jobsApi, modelsApi, storageApi, dashboardApi, systemApi)
- `features/jobs/hooks/use-jobs.ts` — useJobs, useJob (with 2s polling), useCreateJob, useCancelJob
- `features/dashboard/hooks/use-dashboard.ts` — useDashboardStats (10s refresh), useRecentJobs, useWorkers
- `features/generation/hooks/use-generation.ts` — useModels, useModel, useUploadFile, useGenerateVideo
- All pages updated: dashboard, jobs list, job detail (video player + cancel), generate (upload + submit), models, workers, storage
- Mock/real toggle via `NEXT_PUBLIC_USE_MOCK_API` env var (default: false)
- Next.js rewrites proxy `/api/*` → backend

---

## Phase 5: Advanced Features (Chưa bắt đầu)

### ⬜ 5.1: Reference-to-Video pipeline
### ⬜ 5.2: First/Last Frame-to-Video
### ⬜ 5.3: Storyboard-to-Video
### ⬜ 5.4: Video-to-Video (style transfer, enhancement)
### ⬜ 5.5: Video Editing (inpainting, object removal)
### ⬜ 5.6: Character Animation / Motion Transfer
### ⬜ 5.7: Audio-to-Video (lip-sync)
### ⬜ 5.8: Voice integration (TTS → lip-sync)
### ⬜ 5.9: ComfyUI integration (workflow-based generation)

---

## Tổng hợp quyết định

| # | Câu hỏi | Trạng thái | Kết quả |
|---|---------|-----------|---------|
| 1 | Python package manager? | ✅ Đã chọn | `pip + pyproject.toml` |
| 2 | Python version? | ✅ Đã chọn | 3.10+ |
| 3 | Job queue library? | ✅ Đã chọn | `arq` (async, Redis-backed) |
| 4 | Model T2V đầu tiên? | ✅ Đã chọn | CogVideoX-5B (diffusers) |
| 5 | Model I2V đầu tiên? | ✅ Đã chọn | CogVideoX-5B (cùng adapter) |
| 6 | Monitoring stack? | ✅ Đã chọn | pynvml + custom (Prometheus later) |
| 7 | Frontend framework? | ✅ Đã chọn | Next.js 15 + Tailwind v4 |
| 8 | Post-processing? | ✅ Đã chọn | FFmpeg subprocess (async) |
| 9 | Pipeline engine? | ✅ Đã chọn | Custom (PipelineStep ABC, composable) |

---

## API Endpoints Hiện Tại

### Health & System
| Method | Path | Status |
|--------|------|--------|
| GET | `/health` | ✅ |
| GET | `/` | ✅ |

### Models (`/api/v1/models`)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/models` | ✅ |
| GET | `/api/v1/models` | ✅ |
| GET | `/api/v1/models/{id}` | ✅ |
| PATCH | `/api/v1/models/{id}` | ✅ |
| DELETE | `/api/v1/models/{id}` | ✅ |

### Jobs (`/api/v1/jobs`)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/jobs` | ✅ |
| GET | `/api/v1/jobs` | ✅ |
| GET | `/api/v1/jobs/{id}` | ✅ |
| POST | `/api/v1/jobs/{id}/cancel` | ✅ |

### Storage
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/v1/upload` | ✅ |
| GET | `/api/v1/files/{path}` | ✅ |
| DELETE | `/api/v1/files/{path}` | ✅ |
| GET | `/api/v1/storage/stats` | ✅ |
| GET | `/api/v1/storage/outputs` | ✅ |
| POST | `/api/v1/storage/cleanup` | ✅ |

### Workers & Stats
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/v1/workers` | ✅ |
| GET | `/api/v1/stats` | ✅ |

---

## Chạy dự án

### Backend
```powershell
# First-time setup
.\scripts\setup.ps1

# Database
alembic upgrade head
python scripts\seed_models.py

# API Server
python -m uvicorn apps.api.main:app --reload --port 8000

# Worker (cần Redis)
arq apps.worker.WorkerSettings

# Infrastructure (PostgreSQL + Redis)
docker compose -f docker-compose.dev.yml up -d
```

### Frontend
```powershell
cd apps\web
npm install
npm run dev   # → http://localhost:3000
```

### GPU Model (cần NVIDIA GPU)
```powershell
pip install -e ".[gpu]"
# Hoặc với quantization:
pip install bitsandbytes
```

---

## Ưu tiên Tiếp Theo

```
┌─────────────────────────────────────────────────────────────────┐
│  DONE: Phase 1-4 — Full platform operational                    │
│        Backend + Worker + Storage + Models + Frontend            │
├─────────────────────────────────────────────────────────────────┤
│  OPTIONAL: Phase F10 — Polish (error boundaries, responsive)    │
├─────────────────────────────────────────────────────────────────┤
│  NEXT: Deploy to production (Docker, HTTPS, PostgreSQL)         │
│        OR Phase 5 — Advanced features                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ghi chú

- **Full pipeline tested:** API → Redis Queue → Worker → MockAdapter → Video + Thumbnail ✓
- **CogVideoX ready:** Adapter written, sẽ chạy khi install `pip install -e ".[gpu]"` trên máy có GPU
- **Frontend đang kết nối real API** (`NEXT_PUBLIC_USE_MOCK_API=false`). Set `true` để dùng mock data.
- **GPU Monitoring** hoạt động nếu có pynvml. Không có GPU → graceful fallback (zeros).
- **Model Router** tự chọn model phù hợp khi `model_id: "auto"`.
- **Pipeline Engine** composable — dễ thêm steps mới (watermark, upscale, audio, etc.)
