# AI Video Platform - Project Structure & Documentation

## Tổng quan

AI Video Platform là nền tảng self-hosted tích hợp, quản lý và vận hành nhiều model AI tạo video mã nguồn mở thông qua một API thống nhất. Hệ thống bao gồm backend (FastAPI + GPU Worker) và frontend dashboard (Next.js).

**Kiến trúc:**

```
┌─────────────────────┐         ┌─────────────────────┐
│   Next.js Frontend  │  HTTP   │   FastAPI Backend    │
│   (apps/web)        │ ──────→ │   (apps/api)         │
│   Port 3000         │         │   Port 8000          │
└─────────────────────┘         └──────────┬──────────┘
                                           │
                                    ┌──────┴──────┐
                                    │  Redis Queue │
                                    └──────┬──────┘
                                           │
                                  ┌────────┴────────┐
                                  │   GPU Worker    │
                                  │   (apps/worker) │
                                  └─────────────────┘
```

---

## Tech Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Language | Python | 3.11+ |
| API Framework | FastAPI + Uvicorn | 0.115.6 |
| ORM | SQLAlchemy 2.0 (async) | 2.0.36 |
| Migrations | Alembic | 1.14.1 |
| Database (dev) | SQLite | — |
| Database (prod) | PostgreSQL | 16 |
| Cache & Queue | Redis + arq | 5.2.1 / 0.26.1 |
| Validation | Pydantic | 2.10.4 |
| File Upload | python-multipart | 0.0.19 |
| ID Generation | python-ulid | 3.0.0 |
| Linting | Ruff | 0.8.6 |

### Frontend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 15.5 |
| Language | TypeScript | 5.7 |
| Styling | Tailwind CSS v4 | 4.0 |
| State / Data | TanStack Query | 5.62 |
| Forms | React Hook Form + Zod | 7.54 / 3.24 |
| Icons | Lucide React | 0.468 |
| Notifications | Sonner | 1.7 |
| UI Primitives | Radix UI | various |
| Class Utils | clsx + tailwind-merge | 2.1 / 2.6 |

---

## Cấu trúc thư mục

```
C:\AHT\ai-video-platform\
│
├── apps/                              # Application layer
│   ├── api/                           # ── FastAPI REST API Server ──
│   │   ├── main.py                    # App entry, lifespan, router mount
│   │   ├── config.py                  # Pydantic Settings (env vars)
│   │   ├── __init__.py
│   │   ├── routers/                   # API route handlers
│   │   │   ├── health.py             #   GET /, GET /health
│   │   │   ├── models.py             #   CRUD /api/v1/models
│   │   │   └── jobs.py               #   CRUD /api/v1/jobs + cancel
│   │   ├── schemas/                   # Pydantic request/response models
│   │   │   ├── model_schemas.py      #   ModelCreate, ModelUpdate, ModelResponse
│   │   │   └── job_schemas.py        #   JobCreate, JobResponse, JobList
│   │   └── dependencies/             # Shared dependencies (DB session, auth)
│   │
│   ├── worker/                        # ── GPU Worker Process ──
│   │   └── __init__.py               # arq worker config, job handlers
│   │
│   └── web/                           # ── Next.js Frontend Dashboard ──
│       ├── src/
│       │   ├── app/                   # Next.js App Router
│       │   │   ├── layout.tsx         #   Root layout (providers, fonts)
│       │   │   ├── globals.css        #   Tailwind + dark theme CSS vars
│       │   │   └── (dashboard)/       #   Route group (shared layout)
│       │   │       ├── layout.tsx     #     Dashboard shell (sidebar+header)
│       │   │       ├── page.tsx       #     / — Dashboard overview
│       │   │       ├── generate/      #     /generate — Video generation form
│       │   │       ├── jobs/          #     /jobs — Job list + [jobId] detail
│       │   │       ├── models/        #     /models — Model list + [modelId]
│       │   │       ├── workers/       #     /workers — GPU worker monitoring
│       │   │       ├── storage/       #     /storage — Storage overview
│       │   │       └── settings/      #     /settings — App preferences
│       │   │
│       │   ├── components/            # UI Components
│       │   │   ├── layout/            #   Sidebar, Header, NavItem
│       │   │   ├── shared/            #   StatusBadge, DataTable, etc.
│       │   │   └── ui/               #   shadcn/ui primitives (future)
│       │   │
│       │   ├── features/              # Domain-specific logic
│       │   │   ├── dashboard/         #   StatsCards, GpuStatus, RecentJobs
│       │   │   ├── generation/        #   T2V/I2V forms (future hooks)
│       │   │   ├── jobs/              #   Job table, filters, timeline
│       │   │   ├── models/            #   Model grid, detail (future)
│       │   │   └── workers/           #   Worker table, GPU meters (future)
│       │   │
│       │   ├── lib/                   # Shared utilities
│       │   │   ├── api/              #   API client (future real integration)
│       │   │   ├── query/            #   TanStack Query provider + keys
│       │   │   ├── utils/            #   cn(), formatters
│       │   │   └── validators/       #   Zod schemas (future)
│       │   │
│       │   ├── types/                 # TypeScript type definitions
│       │   │   └── index.ts          #   Job, Model, Worker, API types
│       │   │
│       │   ├── mocks/                 # Mock data for development
│       │   │   ├── dashboard.ts      #   Stats, recent jobs, workers
│       │   │   ├── jobs.ts           #   8 sample jobs various statuses
│       │   │   ├── models.ts         #   7 sample models
│       │   │   └── workers.ts        #   3 GPU workers
│       │   │
│       │   ├── config/                # App configuration
│       │   │   └── site.ts           #   Nav items, site metadata
│       │   │
│       │   └── hooks/                 # Shared React hooks (future)
│       │
│       ├── public/icons/              # Static assets
│       ├── package.json               # Node.js dependencies
│       ├── next.config.ts             # Next.js config (API proxy)
│       ├── tsconfig.json              # TypeScript config
│       ├── postcss.config.mjs         # PostCSS + Tailwind
│       ├── components.json            # shadcn/ui config
│       ├── .env.local                 # Frontend env vars
│       └── .env.example               # Template
│
├── core/                              # Core business logic
│   ├── database.py                    # SQLAlchemy engine, session, Base model
│   ├── __init__.py
│   ├── model_registry/                # Model Registry domain
│   │   └── models.py                 #   AIModel ORM (ai_models table)
│   ├── job_queue/                     # Job Queue domain
│   │   └── models.py                 #   Job ORM (jobs table)
│   ├── model_manager/                 # Model load/unload logic (WIP)
│   ├── scheduler/                     # GPU scheduling, routing (WIP)
│   ├── storage/                       # File storage abstraction (WIP)
│   └── monitoring/                    # Metrics, health checks (WIP)
│
├── model_adapters/                    # Model adapter plugins
│   ├── __init__.py
│   ├── base/                          # BaseModelAdapter abstract class (WIP)
│   │   └── __init__.py
│   └── mock/                          # Mock adapter (FFmpeg fake video) (WIP)
│       └── __init__.py
│   # Future: wan/, cogvideo/, ltx_video/, hunyuan/, animatediff/
│
├── pipelines/                         # Video generation pipelines (WIP)
│   ├── __init__.py
│   ├── text_to_video/                 # T2V pipeline orchestration
│   └── image_to_video/               # I2V pipeline orchestration
│   # Future: reference_to_video/, storyboard/, video_to_video/
│
├── postprocessing/                    # Post-processing modules (WIP)
│   ├── __init__.py
│   └── ffmpeg/                        # Encode, resize, thumbnail, audio
│       └── __init__.py
│   # Future: upscaling/, frame_interpolation/
│
├── configs/                           # Configuration files
│   ├── models/                        # Per-model YAML configs (future)
│   └── environments/                  # Per-env settings (future)
│
├── alembic/                           # Database migrations
│   ├── env.py                         # Async Alembic config
│   ├── script.py.mako                 # Migration template
│   └── versions/
│       └── b558c2d2cfc6_initial_schema.py  # Initial: ai_models + jobs tables
│
├── scripts/                           # Utility scripts
│   ├── setup.ps1                      # First-time setup (venv + deps + .env)
│   ├── dev.ps1                        # Start dev environment
│   ├── seed_models.py                 # Seed sample models into DB
│   └── test_crud.py                   # Quick CRUD test
│
├── tests/                             # Test suites
│   ├── __init__.py
│   ├── api/                           # API endpoint tests
│   ├── worker/                        # Worker tests
│   └── adapters/                      # Adapter tests
│
├── uploads/                           # Input files (images, reference videos)
├── outputs/                           # Generated video outputs
├── logs/                              # Application logs
├── data/                              # Dev database
│   └── ai_video_platform.db          #   SQLite file
├── docker/                            # Dockerfiles (future)
│
├── docker-compose.dev.yml             # Dev infra (PostgreSQL + Redis)
├── pyproject.toml                     # Python project + dependencies
├── alembic.ini                        # Alembic config
├── .env                               # Environment variables (git-ignored)
├── .env.example                       # Env template
├── .gitignore                         # Git ignore (Python + Node.js)
├── MASTER_PLAN.md                     # Development roadmap
├── FRONTEND_PLAN.md                   # Frontend architecture detail
└── kiro.md                            # This file
```

---

## API Endpoints

### Health & System
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/` | Root — links to docs | ✅ Done |
| GET | `/health` | Health check (DB + Redis) | ✅ Done |
| GET | `/docs` | Swagger UI (auto-generated) | ✅ Done |

### Model Registry (`/api/v1/models`)
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| POST | `/api/v1/models` | Register new model | ✅ Done |
| GET | `/api/v1/models` | List models (filter, paginate) | ✅ Done |
| GET | `/api/v1/models/{id}` | Get model detail | ✅ Done |
| PATCH | `/api/v1/models/{id}` | Update model (status, config) | ✅ Done |
| DELETE | `/api/v1/models/{id}` | Remove model | ✅ Done |

### Job Management (`/api/v1/jobs`)
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| POST | `/api/v1/jobs` | Create generation job → enqueue | ✅ Done |
| GET | `/api/v1/jobs` | List jobs (filter status/type/model, paginate) | ✅ Done |
| GET | `/api/v1/jobs/{id}` | Get job status + result | ✅ Done |
| POST | `/api/v1/jobs/{id}/cancel` | Cancel job (pending/queued only) | ✅ Done |

### Future Endpoints (planned)
| Method | Path | Description | Phase |
|--------|------|-------------|-------|
| POST | `/api/v1/jobs/{id}/retry` | Retry failed job | 1.4 |
| DELETE | `/api/v1/jobs/{id}` | Delete job + cleanup files | 1.4 |
| POST | `/api/v1/upload` | Upload input file (image/video) | 1.5 |
| GET | `/api/v1/files/{path}` | Serve output files | 1.5 |
| GET | `/api/v1/workers` | List active workers + GPU status | 1.4 |
| GET | `/api/v1/stats` | Dashboard aggregate stats | 2.3 |
| POST | `/api/v1/models/{id}/load` | Load model into GPU memory | 2.1 |
| POST | `/api/v1/models/{id}/unload` | Unload model from memory | 2.1 |

---

## Database Schema

### Table: `ai_models`

Quản lý registry các model AI đã đăng ký trong hệ thống.

| Column | Type | Description |
|--------|------|-------------|
| id | String(50) PK | Model ID slug (e.g. "cogvideox-5b") |
| name | String(200) | Display name |
| version | String(50) | Model version |
| description | Text | Mô tả model |
| source | String(500) | HuggingFace / source URL |
| adapter_name | String(100) | Adapter class để sử dụng |
| capabilities | JSON | Task types: ["text_to_video", "image_to_video"] |
| minimum_vram_gb | Float | VRAM tối thiểu (GB) |
| recommended_vram_gb | Float | VRAM khuyến nghị (GB) |
| supports_quantization | Boolean | Hỗ trợ quantization? |
| supports_cpu_offload | Boolean | Hỗ trợ CPU offload? |
| supports_lora | Boolean | Hỗ trợ LoRA? |
| max_resolution_width | Integer | Resolution tối đa (width) |
| max_resolution_height | Integer | Resolution tối đa (height) |
| max_duration_seconds | Integer | Thời lượng video tối đa |
| max_fps | Integer | FPS tối đa |
| status | String(20) | available / loading / loaded / error / disabled |
| avg_inference_time_seconds | Float | Thời gian inference trung bình |
| avg_vram_usage_gb | Float | VRAM usage trung bình |
| total_jobs_completed | Integer | Tổng jobs thành công |
| created_at | DateTime | Ngày tạo |
| updated_at | DateTime | Cập nhật lần cuối |

### Table: `jobs`

Mỗi row là 1 job tạo video, tracking từ khi tạo đến khi hoàn thành/fail.

| Column | Type | Description |
|--------|------|-------------|
| id | String(26) PK | ULID (sortable, unique) |
| task_type | String(50) | text_to_video / image_to_video |
| status | String(20) | pending → queued → loading_model → processing → post_processing → completed / failed / cancelled |
| model_id | String(50) FK | Target model (hoặc "auto") |
| inputs | JSON | {prompt, negative_prompt, image_path} |
| generation_params | JSON | {duration, resolution, fps, seed, guidance_scale, num_inference_steps} |
| output_path | String(500) | Path to generated video file |
| thumbnail_path | String(500) | Path to thumbnail image |
| output_metadata | JSON | {width, height, duration, fps, file_size_mb} |
| error_message | Text | Chi tiết lỗi nếu failed |
| retry_count | Integer | Số lần retry hiện tại |
| max_retries | Integer | Giới hạn retry (default: 3) |
| priority | Integer | Priority (1-10, lower = higher priority) |
| queue_time_seconds | Float | Thời gian chờ trong queue |
| load_model_time_seconds | Float | Thời gian load model |
| inference_time_seconds | Float | Thời gian inference |
| postprocess_time_seconds | Float | Thời gian post-processing |
| total_time_seconds | Float | Tổng thời gian job |
| peak_vram_gb | Float | Peak VRAM sử dụng |
| created_at | DateTime | Job được tạo |
| started_at | DateTime | Bắt đầu processing |
| completed_at | DateTime | Hoàn thành / fail |
| updated_at | DateTime | Status update cuối |

---

## Frontend Pages & Routes

| Route | Page | Mô tả | Data Source |
|-------|------|-------|-------------|
| `/` | Dashboard | Tổng quan: stats, GPU, workers, recent jobs | Mock → GET /stats, /jobs, /workers |
| `/generate` | Generate Video | Form T2V/I2V + generation summary | Mock → GET /models, POST /jobs |
| `/jobs` | Jobs List | Table + filter status/type/model + pagination | Mock → GET /jobs |
| `/jobs/[jobId]` | Job Detail | Output video, input, timeline, settings | Mock → GET /jobs/{id} |
| `/models` | Models | Table: capabilities, status, VRAM, jobs | Mock → GET /models |
| `/models/[modelId]` | Model Detail | Hardware req, limits, performance | Mock → GET /models/{id} |
| `/workers` | Workers | GPU util, VRAM, temperature, current job | Mock → GET /workers |
| `/storage` | Storage | Disk usage breakdown (uploads/outputs/models) | Mock (local) |
| `/settings` | Settings | API URL, mock toggle, polling interval, theme | localStorage |

### Frontend Design
- **Theme:** Dark mode mặc định (deep navy/charcoal)
- **Layout:** Sidebar (240px, collapsible) + Header (system status) + Main content
- **Color palette:** Primary (blue/purple), success (emerald), warning (yellow), error (red)
- **Typography:** Inter font
- **Components:** Custom (no shadcn/ui installed yet, using Radix primitives)
- **Data:** Hiện tại 100% mock data, sẵn sàng switch sang real API

---

## Frontend Key Types (TypeScript)

```typescript
// Job status flow
type JobStatus = "pending" | "queued" | "loading_model" | "processing" 
               | "post_processing" | "completed" | "failed" | "cancelled";

type TaskType = "text_to_video" | "image_to_video";
type ModelStatus = "available" | "loaded" | "loading" | "disabled" | "error";

// Core interfaces
interface Job { id, task_type, status, model_id, inputs, generation_params, 
               output_path, error_message, timing fields, timestamps }
interface Model { id, name, version, capabilities, vram, status, performance }
interface Worker { id, hostname, status, gpu: GpuInfo, current_job_id }
interface DashboardStats { total_jobs, pending, running, completed, failed, 
                          models, workers, gpu_utilization, vram, storage }
```

---

## Commands

### Backend

```powershell
# ─── First-time setup ───
.\scripts\setup.ps1
# Hoặc manual:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env

# ─── Database ───
alembic upgrade head              # Run migrations
python scripts\seed_models.py     # Seed sample models

# ─── Development ───
python -m uvicorn apps.api.main:app --reload --port 8000   # API server
arq apps.worker.WorkerSettings                              # Worker (needs Redis)

# ─── Infrastructure ───
docker compose -f docker-compose.dev.yml up -d   # PostgreSQL + Redis

# ─── Testing & Linting ───
python scripts\test_crud.py       # Quick CRUD test
ruff check .                      # Lint
pytest                            # Run tests
```

### Frontend

```powershell
# ─── Setup ───
cd apps\web
npm install

# ─── Development ───
npm run dev          # → http://localhost:3000 (hoặc 3001 nếu 3000 busy)

# ─── Build ───
npm run build        # Production build
npm run start        # Start production server

# ─── Lint ───
npm run lint         # Next.js lint
```

### Environment Variables

**Backend (`.env`):**
```env
DATABASE_URL=sqlite+aiosqlite:///./data/ai_video_platform.db
REDIS_URL=redis://localhost:6379
API_HOST=0.0.0.0
API_PORT=8000
```

**Frontend (`apps/web/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_USE_MOCK_API=false   # true để dùng mock data
```

---

## Tiến độ phát triển

### Backend (Phase 1: Foundation)
- [x] 1.1: Project structure + environment + FastAPI setup
- [x] 1.2: Database schema (SQLAlchemy) + Model Registry CRUD API
- [x] 1.3: Job API + arq Job Queue + Worker skeleton
- [x] 1.4: GPU Worker + Model Adapter Interface
- [x] 1.5: Storage layer (upload, serve, thumbnails)
- [x] 1.6: CogVideoX-5B T2V Adapter (real model)
- [x] 1.7: CogVideoX-5B I2V Adapter (same adapter)

### Model Platform (Phase 2)
- [x] 2.1: GPU Resource Management (pynvml + LRU cache)
- [x] 2.2: Model Router (auto mode, scoring)
- [x] 2.3: Monitoring + Stats API (GET /workers, GET /stats)

### Post-processing (Phase 3)
- [x] 3.1: FFmpeg post-processing (encode, resize, interpolate, audio, concat)
- [x] 3.2: Pipeline Engine (composable steps, default + lightweight pipelines)

### Frontend (Phase 4)
- [x] F1: Next.js project foundation
- [x] F2: Layout & navigation (dark sidebar + header)
- [x] F3: Types + mock data + API layer
- [x] F4: Dashboard page
- [x] F5: Generate Video page (T2V + I2V forms)
- [x] F6: Jobs pages (list + detail + timeline)
- [x] F7: Models & Workers pages
- [x] F8: Storage & Settings pages
- [x] F9: Backend integration (real API, TanStack Query hooks)
- [ ] F10: Polish (error states, responsive, a11y)

### Future Phases
- [ ] Phase 5: Advanced features (storyboard, V2V, lip-sync, ComfyUI)

---

## Seeded Models (dev database)

| ID | Name | Capabilities | VRAM |
|----|------|-------------|------|
| cogvideox-5b | CogVideoX-5B | text_to_video, image_to_video | 12-18 GB |
| wan2.1-t2v-1.3b | Wan 2.1 T2V 1.3B | text_to_video | 6-8 GB |
| mock-test-model | Mock Test Model | text_to_video, image_to_video | 0 GB |

---

## Conventions & Patterns

### Backend
- **Async everywhere:** SQLAlchemy async sessions, async API handlers
- **ID format:** ULID cho jobs (sortable), slug cho models
- **Error handling:** HTTPException với status codes chuẩn
- **Validation:** Pydantic schemas validate input, ORM models cho DB
- **Config:** Pydantic Settings load từ `.env`

### Frontend
- **File organization:** Feature-based (`features/{domain}/components/` + `hooks/`)
- **Routing:** Next.js App Router with route groups `(dashboard)`
- **Styling:** Tailwind CSS v4, CSS custom properties cho theme colors
- **State:** TanStack Query cho server state, React state cho local UI
- **Mock-first:** Tất cả data từ `mocks/`, toggle qua env var
- **Component pattern:** Server components default, `"use client"` khi cần interactivity

### Naming
- **Files:** kebab-case (`status-badge.tsx`, `use-jobs.ts`)
- **Components:** PascalCase (`StatsCards`, `StatusBadge`)
- **Hooks:** camelCase with `use` prefix (`useJobs`, `useBackendStatus`)
- **Types:** PascalCase (`Job`, `Model`, `DashboardStats`)
- **API paths:** lowercase with hyphens (`/api/v1/jobs`)
- **Database columns:** snake_case (`created_at`, `task_type`)

---

## Ghi chú quan trọng

1. **Database dev:** SQLite (`data/ai_video_platform.db`), production sẽ dùng PostgreSQL
2. **Docker Desktop** cần bật cho PostgreSQL + Redis (hoặc dùng SQLite + skip Redis trong dev)
3. **Frontend mock mode:** Set `NEXT_PUBLIC_USE_MOCK_API=true` để dev frontend độc lập
4. **CORS:** Backend đã config `allow_origins=["*"]` — OK cho dev, cần restrict ở production
5. **Port:** Backend 8000, Frontend 3000 (hoặc 3001) — không conflict
6. **Roadmap chi tiết:** Xem `MASTER_PLAN.md`
7. **Frontend architecture chi tiết:** Xem `FRONTEND_PLAN.md`
