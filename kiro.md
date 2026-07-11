# AI Video Platform - Project Structure

## Tổng quan

AI Video Platform là nền tảng backend self-hosted dùng để tích hợp, quản lý và vận hành nhiều model AI tạo video mã nguồn mở thông qua một API thống nhất.

**Tech Stack:**
- Python 3.11 + FastAPI + Uvicorn
- SQLAlchemy 2.0 (async) + Alembic (migrations)
- SQLite (dev) / PostgreSQL 16 (production)
- Redis 7 + arq (job queue)
- Docker Compose (infrastructure)

---

## Cấu trúc thư mục

```
C:\AHT\ai-video-platform\
│
├── apps/                          # Application layer
│   ├── api/                       # FastAPI REST API server
│   │   ├── main.py                # App entry point, lifespan, router registration
│   │   ├── config.py              # Pydantic Settings (load from .env)
│   │   ├── routers/               # API route handlers
│   │   │   ├── health.py          # GET /health, GET /
│   │   │   ├── models.py          # CRUD /api/v1/models (Model Registry)
│   │   │   └── jobs.py            # /api/v1/jobs (Job management - WIP)
│   │   ├── schemas/               # Pydantic request/response schemas
│   │   │   └── model_schemas.py   # ModelCreate, ModelUpdate, ModelResponse
│   │   └── dependencies/          # FastAPI dependencies (auth, etc.)
│   │
│   └── worker/                    # GPU Worker process (WIP)
│                                  # Nhận job từ queue, chạy inference
│
├── core/                          # Core business logic
│   ├── database.py                # SQLAlchemy engine, session factory, Base
│   ├── model_registry/            # Model Registry module
│   │   └── models.py              # AIModel ORM (ai_models table)
│   ├── job_queue/                 # Job Queue module
│   │   └── models.py              # Job ORM (jobs table)
│   ├── model_manager/             # Model load/unload logic (WIP)
│   ├── scheduler/                 # GPU scheduling, routing (WIP)
│   ├── storage/                   # File storage abstraction (WIP)
│   └── monitoring/                # Metrics, logging (WIP)
│
├── model_adapters/                # Model adapter plugins
│   ├── base/                      # BaseModelAdapter abstract class (WIP)
│   └── mock/                      # Mock adapter for testing (WIP)
│   # Future: wan/, cogvideo/, ltx_video/, hunyuan/
│
├── pipelines/                     # Video generation pipelines (WIP)
│   ├── text_to_video/             # T2V pipeline
│   └── image_to_video/            # I2V pipeline
│   # Future: reference_to_video/, storyboard/, video_to_video/, etc.
│
├── postprocessing/                # Post-processing modules (WIP)
│   └── ffmpeg/                    # FFmpeg encode, resize, compose
│   # Future: upscaling/, frame_interpolation/, audio_mixing/
│
├── configs/                       # Configuration files
│   ├── models/                    # Model-specific configs (YAML)
│   └── environments/              # Environment-specific configs
│
├── alembic/                       # Database migrations
│   ├── env.py                     # Alembic async config
│   ├── versions/                  # Migration files
│   │   └── b558c2d2cfc6_initial_schema.py
│   └── script.py.mako             # Migration template
│
├── scripts/                       # Utility scripts
│   ├── setup.ps1                  # Project setup (venv + install + .env)
│   ├── dev.ps1                    # Start dev environment
│   ├── seed_models.py             # Seed sample models into DB
│   └── test_crud.py               # Quick CRUD test script
│
├── tests/                         # Test suites
│   ├── api/                       # API endpoint tests
│   ├── worker/                    # Worker tests
│   └── adapters/                  # Adapter tests
│
├── uploads/                       # Input file storage (images, videos)
├── outputs/                       # Generated video outputs
├── logs/                          # Application logs
├── data/                          # SQLite database (dev only)
│   └── ai_video_platform.db
├── docker/                        # Dockerfiles (WIP)
│
├── docker-compose.dev.yml         # Dev infrastructure (PostgreSQL + Redis)
├── pyproject.toml                 # Python project config + dependencies
├── alembic.ini                    # Alembic migration config
├── .env                           # Environment variables (not committed)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── MASTER_PLAN.md                 # Development roadmap & decisions
└── kiro.md                        # This file - project structure docs
```

---

## API Endpoints (hiện tại)

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/` | Root - links to docs | Done |
| GET | `/health` | Health check | Done |
| GET | `/docs` | Swagger UI | Done |
| POST | `/api/v1/models` | Register model | Done |
| GET | `/api/v1/models` | List models (filter, paginate) | Done |
| GET | `/api/v1/models/{id}` | Get model detail | Done |
| PATCH | `/api/v1/models/{id}` | Update model | Done |
| DELETE | `/api/v1/models/{id}` | Delete model | Done |
| POST | `/api/v1/jobs` | Create video generation job | WIP |
| GET | `/api/v1/jobs` | List jobs | WIP |
| GET | `/api/v1/jobs/{id}` | Get job status + result | WIP |

---

## Database Schema

### ai_models
| Column | Type | Description |
|--------|------|-------------|
| id | String(50) PK | Model ID (e.g. "cogvideox-5b") |
| name | String(200) | Display name |
| version | String(50) | Model version |
| description | Text | Description |
| source | String(500) | HuggingFace URL |
| adapter_name | String(100) | Adapter to use (e.g. "wan", "cogvideo") |
| capabilities | JSON | List of task types supported |
| minimum_vram_gb | Float | Min VRAM requirement |
| recommended_vram_gb | Float | Recommended VRAM |
| supports_quantization | Boolean | Quantization support |
| supports_cpu_offload | Boolean | CPU offload support |
| supports_lora | Boolean | LoRA support |
| max_resolution_width | Integer | Max output width |
| max_resolution_height | Integer | Max output height |
| max_duration_seconds | Integer | Max video duration |
| max_fps | Integer | Max FPS |
| status | String(20) | available/loading/loaded/error/disabled |
| avg_inference_time_seconds | Float | Average inference time |
| avg_vram_usage_gb | Float | Average VRAM usage |
| total_jobs_completed | Integer | Total successful jobs |
| created_at | DateTime | Created timestamp |
| updated_at | DateTime | Last updated |

### jobs
| Column | Type | Description |
|--------|------|-------------|
| id | String(26) PK | ULID |
| task_type | String(50) | text_to_video, image_to_video, etc. |
| status | String(20) | pending/queued/loading_model/processing/completed/failed/cancelled |
| model_id | String(50) | Target model (or "auto") |
| inputs | JSON | Prompt, image path, etc. |
| generation_params | JSON | Duration, resolution, fps, seed |
| output_path | String(500) | Path to generated video |
| thumbnail_path | String(500) | Path to thumbnail |
| output_metadata | JSON | Width, height, file size, etc. |
| error_message | Text | Error details if failed |
| retry_count | Integer | Current retry count |
| max_retries | Integer | Max allowed retries |
| queue_time_seconds | Float | Time spent in queue |
| load_model_time_seconds | Float | Model loading time |
| inference_time_seconds | Float | Inference time |
| postprocess_time_seconds | Float | Post-processing time |
| total_time_seconds | Float | Total job time |
| peak_vram_gb | Float | Peak VRAM during job |
| priority | Integer | Job priority (lower = higher) |
| created_at | DateTime | Job created |
| started_at | DateTime | Processing started |
| completed_at | DateTime | Job completed |
| updated_at | DateTime | Last status update |

---

## Seeded Models

| ID | Name | Capabilities | VRAM |
|----|------|-------------|------|
| cogvideox-5b | CogVideoX-5B | text_to_video, image_to_video | 12-18 GB |
| wan2.1-t2v-1.3b | Wan 2.1 T2V 1.3B | text_to_video | 6-8 GB |

---

## Commands

```powershell
# Setup lần đầu
.\scripts\setup.ps1

# Hoặc manual:
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env

# Chạy migration
alembic upgrade head

# Seed data
python scripts\seed_models.py

# Start dev server
python -m uvicorn apps.api.main:app --reload --port 8000

# Start infrastructure (cần Docker Desktop)
docker compose -f docker-compose.dev.yml up -d

# Test CRUD
python scripts\test_crud.py

# Lint
ruff check .
```

---

## Tiến độ phát triển

- [x] Phase 1.1: Project structure + environment
- [x] Phase 1.2: Database schema + Model Registry CRUD
- [ ] Phase 1.3: Job API + Job Queue
- [ ] Phase 1.4: GPU Worker + Model Adapter Interface
- [ ] Phase 1.5: Storage layer
- [ ] Phase 1.6: Tích hợp Model T2V thật
- [ ] Phase 1.7: Tích hợp Model I2V thật
- [ ] Phase 2: Model Platform (scheduler, router, benchmark)
- [ ] Phase 3: Post-processing + Pipelines
- [ ] Phase 4: Admin Frontend
- [ ] Phase 5: Advanced features

---

## Ghi chú

- Database dev dùng SQLite (`data/ai_video_platform.db`), production dùng PostgreSQL
- Docker Desktop cần bật để dùng PostgreSQL + Redis qua Docker Compose
- Khi chưa có Redis, job queue sẽ cần fallback mechanism
- Xem chi tiết roadmap tại `MASTER_PLAN.md`
