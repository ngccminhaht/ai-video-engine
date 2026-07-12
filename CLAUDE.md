# CLAUDE.md

## 1. Project Overview

**Tên dự án:** Revid.IO (AI Video Platform)
**Phiên bản:** 0.1.0
**Mục tiêu:** Nền tảng tạo video bằng AI, hỗ trợ nhiều model (multi-model), cho phép người dùng tạo video từ text hoặc image thông qua giao diện web.

**Lưu ý quan trọng:** Mặc dù tên ban đầu gợi ý "AI Video Remix", source code hiện tại là một nền tảng **AI Video Generation** (text-to-video, image-to-video). Chưa có bất kỳ tính năng remix, scene detection, transcript, hay video segmentation nào được triển khai.

**Luồng chính hiện tại:**
```
User nhập prompt/upload image → Tạo generation job → Job vào Redis queue → Worker lấy job
→ Load AI model → Inference → Post-process (FFmpeg) → Lưu output → Trả kết quả cho user
```

---

## 2. Product Scope

### Chức năng đã triển khai:
- Authentication (register, login, refresh, logout, change password)
- User management (profile, dashboard stats)
- Admin management (users, models, workers, logs)
- Project management (CRUD, nhóm generations theo project)
- Video generation (text-to-video, image-to-video)
- File upload và storage (local filesystem)
- Job queue (arq/Redis) với worker xử lý background
- Credit system (hold → charge/refund)
- Progress tracking (SSE + polling fallback)
- Model registry và adapter pattern
- GPU monitoring (pynvml)
- Post-processing (FFmpeg: encode, thumbnail, concat, upscale)

### Chức năng chưa triển khai (dự kiến cho Video Remix):
- Video upload → analyze pipeline
- Audio extraction
- Speech-to-text / transcript
- Scene detection (PySceneDetect)
- Video segmentation
- Segment classification
- Dependency graph giữa segments
- Timeline remix generation
- Logic/audio-video sync checking
- Video comparison UI
- Timeline editor UI

---

## 3. Current Repository Status

| Thành phần | Trạng thái |
|---|---|
| Backend API | Completed — hoạt động đầy đủ |
| Frontend (Admin) | Partially implemented — có layout, nhiều trang dùng mock |
| Frontend (End-user) | Partially implemented — có layout, routes, đang kết nối API |
| Database schema | Completed — 11 entities, 9 migrations |
| Authentication | Completed |
| Job Queue (arq) | Completed |
| Worker | Completed — full pipeline với retry |
| Model Adapters | Partially implemented — mock + cogvideo |
| FFmpeg Post-processing | Completed |
| Docker | Completed — dev + production compose |
| Tests | Partially implemented — chỉ có auth integration test |
| Pipelines module | Stub — empty `__init__.py` |
| Configs module | Stub — empty directories |

---

## 4. Technology Stack

### Backend (Python 3.10+)
| Thành phần | Technology | Version |
|---|---|---|
| Framework | FastAPI | 0.115.6 |
| ASGI Server | Uvicorn | 0.34.0 |
| ORM | SQLAlchemy (async) | 2.0.36 |
| DB Driver (Postgres) | asyncpg | 0.30.0 |
| DB Driver (SQLite) | aiosqlite | 0.22.1 |
| Migration | Alembic | 1.14.1 |
| Job Queue | arq | 0.26.1 |
| Validation | Pydantic | 2.10.4 |
| Settings | pydantic-settings | 2.7.1 |
| Auth - JWT | PyJWT | 2.9.0 |
| Auth - Password | bcrypt | 4.2.1 |
| HTTP Client | httpx | 0.28.1 |
| ID Generation | python-ulid | 3.0.0 |
| Redis | redis[hiredis] | 5.2.1 |
| Linter | ruff | 0.8.6 |
| Test | pytest + pytest-asyncio | 8.3.4 / 0.24.0 |

### Frontend (Node.js)
| Thành phần | Technology | Version |
|---|---|---|
| Framework | Next.js | 15.1.0 |
| UI Library | React | 19.0.0 |
| Styling | TailwindCSS | 4.0.0 |
| Component Library | Radix UI | Multiple packages |
| Data Fetching | TanStack Query | 5.62.0 |
| Table | TanStack Table | 8.20.6 |
| Forms | react-hook-form + zod | 7.54.2 / 3.24.1 |
| Icons | lucide-react | 0.468.0 |
| i18n | next-intl | 4.13.2 |
| Toast | sonner | 1.7.1 |
| TypeScript | typescript | 5.7.2 |

### Infrastructure
| Thành phần | Technology |
|---|---|
| Database | PostgreSQL 16 (prod) / SQLite (dev) |
| Cache/Queue | Redis 7 |
| Container | Docker + Docker Compose |
| GPU (optional) | PyTorch + diffusers + CUDA |
| Video Processing | FFmpeg |

---

## 5. Repository Structure

```
ai-video-platform/
├── apps/
│   ├── api/                    # FastAPI backend
│   │   ├── main.py            # Entry point, app factory
│   │   ├── config.py          # Pydantic settings
│   │   ├── dependencies/      # FastAPI dependencies (auth)
│   │   ├── middleware/        # Security, rate limit, request ID
│   │   ├── routers/           # API endpoints
│   │   │   ├── admin/         # Admin-only endpoints
│   │   │   ├── auth.py        # Register, login, refresh, logout
│   │   │   ├── generations.py # User generation CRUD
│   │   │   ├── generation_events.py  # SSE progress
│   │   │   ├── jobs.py        # Job management (legacy/admin)
│   │   │   ├── models.py      # Model registry CRUD
│   │   │   ├── projects.py    # User projects CRUD
│   │   │   ├── assets.py      # User assets CRUD
│   │   │   ├── outputs.py     # Download, preview, duplicate
│   │   │   ├── options.py     # Dynamic generation form config
│   │   │   ├── storage.py     # Upload, file serve, stats
│   │   │   ├── usage.py       # Credits and usage
│   │   │   ├── users.py       # User profile, dashboard
│   │   │   └── workers.py     # Worker status, dashboard stats
│   │   ├── schemas/           # Pydantic request/response models
│   │   └── services/          # Business logic (auth, notification)
│   ├── web/                   # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router
│   │   │   │   ├── (admin)/   # Admin route group
│   │   │   │   ├── (app)/     # End-user route group
│   │   │   │   └── (public)/  # Auth pages (login, register)
│   │   │   ├── components/    # Shared components
│   │   │   ├── features/      # Feature-specific components
│   │   │   ├── lib/           # API client, auth, utils
│   │   │   ├── mocks/         # Mock data for development
│   │   │   ├── types/         # TypeScript type definitions
│   │   │   └── i18n/          # Internationalization
│   │   └── messages/          # Translation files (en, vi)
│   └── worker/                # arq worker process
│       └── __init__.py        # Worker settings + job handler
├── core/                      # Shared Python modules
│   ├── database.py            # SQLAlchemy engine + session
│   ├── auth/models.py         # User, RefreshToken
│   ├── job_queue/             # arq pool + Job model
│   ├── model_registry/        # AIModel ORM
│   ├── projects/              # Project, GenerationOutput
│   ├── assets/                # Asset model
│   ├── billing/               # UsageRecord, CreditTransaction, Subscription
│   ├── audit/                 # AuditLog model
│   ├── storage/               # StorageService (local filesystem)
│   ├── monitoring/            # GPU monitor, LRU cache, resource manager
│   ├── scheduler/             # Stub (empty)
│   └── model_manager/         # Stub (empty)
├── model_adapters/            # AI model adapter implementations
│   ├── base/                  # Abstract BaseModelAdapter interface
│   ├── mock/                  # MockAdapter (FFmpeg test videos)
│   └── cogvideo/              # CogVideoX adapter (HuggingFace diffusers)
├── pipelines/                 # Generation pipeline orchestration
│   ├── text_to_video/         # Stub (empty)
│   └── image_to_video/        # Stub (empty)
├── postprocessing/
│   └── ffmpeg/                # FFmpegProcessor (encode, thumbnail, concat)
├── docker/                    # Dockerfiles
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── Dockerfile.worker
├── alembic/                   # Database migrations
├── configs/                   # Empty config directories
├── scripts/                   # Dev scripts, seeds
├── tests/                     # Test suite
├── docker-compose.yml         # Full production stack
├── docker-compose.dev.yml     # Dev (postgres + redis only)
├── pyproject.toml             # Python project config
└── .env.example               # Environment template
```

---

## 6. Frontend Architecture

### Framework: Next.js 15 (App Router)
- **Output mode:** Standalone (cho Docker deployment)
- **Font:** Manrope (Google Fonts)
- **Styling:** TailwindCSS 4 + class-variance-authority
- **State:** TanStack Query (server state), React Context (auth state)
- **Forms:** react-hook-form + zod validation
- **i18n:** next-intl (en + vi)
- **Toast:** sonner
- **Icons:** lucide-react

### Route Groups
| Group | Path | Layout | Guard |
|---|---|---|---|
| `(public)` | `/login`, `/register`, `/forgot-password` | Centered card | Không |
| `(app)` | `/app/*` | Header nav + content | `AuthGuard` |
| `(admin)` | `/admin/*` | Sidebar + Header | `AdminGuard` |

### API Communication
- Frontend proxy `/api/*` → backend qua Next.js rewrites
- API client: `src/lib/api/client.ts` — fetch wrapper với auth headers
- Token lưu trong localStorage (`access_token`, `refresh_token`)
- Mock mode: `NEXT_PUBLIC_USE_MOCK_API=true` → bypass API calls

### Auth System (Frontend)
- **Provider:** `src/lib/auth/provider.tsx` — React Context
- **Guard:** `src/lib/auth/guard.tsx` — `AuthGuard` và `AdminGuard`
- **Storage:** `src/lib/auth/storage.ts` — localStorage helpers
- Login → redirect admin to `/admin`, user to `/app`
- Token refresh via `/api/v1/auth/refresh`

---

## 7. Frontend Routes and Pages

### Public Pages
| Route | File | Mục đích | Trạng thái |
|---|---|---|---|
| `/login` | `(public)/login/` | Đăng nhập | Completed |
| `/register` | `(public)/register/` | Đăng ký | Completed |
| `/forgot-password` | `(public)/forgot-password/` | Quên mật khẩu | UI only (backend stub) |

### End-user Pages (`/app/*`)
| Route | Mục đích | Trạng thái |
|---|---|---|
| `/app` | User dashboard | Partially implemented |
| `/app/generate` | Tạo video mới | Partially implemented |
| `/app/projects` | Quản lý projects | Partially implemented |
| `/app/jobs` | Lịch sử jobs | Partially implemented |
| `/app/assets` | Quản lý assets | Partially implemented |
| `/app/usage` | Usage & billing | Partially implemented |
| `/app/billing` | Billing/subscription | UI stub |
| `/app/settings` | Cài đặt tài khoản | Partially implemented |

### Admin Pages (`/admin/*`)
| Route | Mục đích | Trạng thái |
|---|---|---|
| `/admin` | Admin dashboard | Partially implemented (uses mock data) |
| `/admin/generate` | Admin generate video | Partially implemented |
| `/admin/jobs` | Quản lý all jobs | Partially implemented |
| `/admin/models` | Quản lý AI models | Partially implemented |
| `/admin/users` | Quản lý users | Partially implemented |
| `/admin/workers` | Quản lý workers/GPU | Partially implemented (mock data) |
| `/admin/storage` | Storage stats | Partially implemented |
| `/admin/logs` | Audit logs | Partially implemented |
| `/admin/settings` | System settings | UI stub |

### Mock Data
Frontend có mock data tại `src/mocks/`:
- `dashboard.ts` — DashboardStats, RecentJobs, Workers
- `jobs.ts` — Job list
- `models.ts` — Model list
- `workers.ts` — Worker list

Khi `NEXT_PUBLIC_USE_MOCK_API=true`, login bypass API và dùng mock user (SUPER_ADMIN).

---

## 8. Backend Architecture

### Entry Point
```
apps/api/main.py → create_app() → FastAPI instance
```

### Startup (lifespan):
1. Tạo upload/output directories
2. Connect Redis (arq pool)
3. Cleanup on shutdown: close Redis + dispose engine

### Middleware Stack (applied in reverse order):
1. `SecurityHeadersMiddleware` — X-Content-Type-Options, X-Frame-Options, etc.
2. `RequestIdMiddleware` — X-Request-ID header
3. `RateLimitMiddleware` — 100 req/min general, 10 req/min auth
4. `CORSMiddleware` — configurable origins

### Router Organization:
```
/api/v1/auth/*          → auth.py (register, login, refresh, logout, me, password)
/api/v1/generations/*   → generations.py (user-facing CRUD + cancel)
/api/v1/generation-options → options.py (dynamic form config)
/api/v1/generations/{id}/events → generation_events.py (SSE)
/api/v1/projects/*      → projects.py (user projects CRUD)
/api/v1/assets/*        → assets.py (user assets CRUD)
/api/v1/outputs/*       → outputs.py (download, preview, duplicate, variations)
/api/v1/me/*            → users.py (profile, dashboard, password)
/api/v1/me/usage        → usage.py (credits, plan, transactions)
/api/v1/models/*        → models.py (model registry CRUD)
/api/v1/jobs/*          → jobs.py (job management — legacy/admin)
/api/v1/upload          → storage.py (file upload)
/api/v1/files/*         → storage.py (file serving)
/api/v1/storage/*       → storage.py (stats, outputs list, cleanup)
/api/v1/workers         → workers.py (worker list)
/api/v1/stats           → workers.py (dashboard stats)
/api/v1/admin/*         → admin/ (users, logs, models, workers)
/health                 → health.py
/                       → health.py (root)
```

### Dependency Injection:
- `get_db()` — AsyncSession (auto-commit/rollback)
- `get_current_user` — JWT validation → User object
- `get_current_user_optional` — Optional auth
- `require_admin` — ADMIN or SUPER_ADMIN role
- `require_super_admin` — SUPER_ADMIN only

---

## 9. API Endpoints

### Authentication
| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| POST | `/api/v1/auth/register` | No | Đăng ký |
| POST | `/api/v1/auth/login` | No | Đăng nhập → tokens |
| POST | `/api/v1/auth/refresh` | No | Refresh access token |
| POST | `/api/v1/auth/logout` | No | Revoke refresh token |
| GET | `/api/v1/auth/me` | Yes | Get current user |
| POST | `/api/v1/auth/me/password` | Yes | Change password |
| POST | `/api/v1/auth/forgot-password` | No | Request reset (stub) |
| POST | `/api/v1/auth/reset-password` | No | Reset password (not implemented) |

### User-facing Generation
| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| POST | `/api/v1/generations` | Yes | Create generation |
| GET | `/api/v1/generations` | Yes | List user's generations |
| GET | `/api/v1/generations/{id}` | Yes | Get generation detail |
| POST | `/api/v1/generations/{id}/cancel` | Yes | Cancel + refund |
| GET | `/api/v1/generations/{id}/events` | Yes | SSE progress stream |
| POST | `/api/v1/generations/{id}/duplicate` | Yes | Duplicate job |
| POST | `/api/v1/generations/{id}/variations` | Yes | New seed variation |
| GET | `/api/v1/generation-options` | Yes | Dynamic form options |

### Projects & Assets
| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| CRUD | `/api/v1/projects/*` | Yes | Project management |
| CRUD | `/api/v1/assets/*` | Yes | Asset management |
| GET | `/api/v1/outputs/{id}/download` | Yes | Get download URL |
| GET | `/api/v1/outputs/{id}/preview` | Yes | Get preview URL |

### Storage & System
| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| POST | `/api/v1/upload` | No* | Upload file |
| GET | `/api/v1/files/{path}` | No* | Serve file |
| GET | `/api/v1/storage/stats` | No* | Storage stats |
| GET | `/api/v1/storage/outputs` | No* | List outputs |
| DELETE | `/api/v1/files/{path}` | No* | Delete file |
| POST | `/api/v1/storage/cleanup` | No* | Cleanup old files |
| GET | `/api/v1/workers` | No* | Worker list |
| GET | `/api/v1/stats` | No* | Dashboard stats |
| GET | `/health` | No | Health check |

*Chú ý: Các endpoint storage/workers chưa có auth guard — đây là vấn đề bảo mật.

### Admin
| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| GET | `/api/v1/admin/users` | Admin | List users |
| PATCH | `/api/v1/admin/users/{id}` | Admin | Update user role/status |
| GET | `/api/v1/admin/logs` | Admin | Audit logs |
| * | `/api/v1/admin/models/*` | Admin | Model admin |
| * | `/api/v1/admin/workers/*` | Admin | Worker admin |

### Models & Jobs (shared/legacy)
| Method | Endpoint | Auth | Mục đích |
|---|---|---|---|
| CRUD | `/api/v1/models/*` | No* | Model registry |
| CRUD | `/api/v1/jobs/*` | No* | Job management |
| POST | `/api/v1/jobs/{id}/cancel` | No* | Cancel job |

---

## 10. Database Architecture

### Engine
- **Production:** PostgreSQL 16 (asyncpg driver)
- **Development:** SQLite (aiosqlite driver)
- **ORM:** SQLAlchemy 2.0 async với DeclarativeBase
- **Migrations:** Alembic (9 migration files)
- **ID Strategy:** ULID (26 chars) cho hầu hết entities

### Entity Diagram

```mermaid
erDiagram
    User ||--o{ Job : "creates"
    User ||--o{ Project : "owns"
    User ||--o{ Asset : "uploads"
    User ||--o{ CreditTransaction : "has"
    User ||--o{ UsageRecord : "tracks"
    User ||--o| Subscription : "has"
    User ||--o{ RefreshToken : "authenticates"
    Project ||--o{ Job : "contains"
    Job ||--o{ GenerationOutput : "produces"
    AIModel ||--o{ Job : "processes"
```

### Entities

| Entity | Table | File | Vai trò |
|---|---|---|---|
| User | `users` | `core/auth/models.py` | Tài khoản người dùng (role, credits, status) |
| RefreshToken | `refresh_tokens` | `core/auth/models.py` | JWT refresh token storage |
| Job | `jobs` | `core/job_queue/models.py` | Video generation job (trung tâm của hệ thống) |
| AIModel | `ai_models` | `core/model_registry/models.py` | Đăng ký AI model (specs, status, metrics) |
| Project | `projects` | `core/projects/models.py` | Nhóm generations theo project |
| GenerationOutput | `generation_outputs` | `core/projects/models.py` | File output từ generation |
| Asset | `assets` | `core/assets/models.py` | User-owned files (upload/output) |
| UsageRecord | `usage_records` | `core/billing/models.py` | Lịch sử sử dụng tài nguyên |
| CreditTransaction | `credit_transactions` | `core/billing/models.py` | Giao dịch credit (hold/charge/refund/grant) |
| Subscription | `subscriptions` | `core/billing/models.py` | Gói subscription (free/pro/enterprise) |
| AuditLog | `audit_logs` | `core/audit/models.py` | System audit trail |

### Key Relationships:
- `Job.user_id` → User (nullable, legacy jobs không có user)
- `Job.project_id` → Project (nullable)
- `Job.model_id` → AIModel.id (string FK, nullable)
- `Asset.user_id` → User
- `Project.user_id` → User
- `GenerationOutput.job_id` → Job
- `GenerationOutput.user_id` → User

### Alembic Migrations (theo thứ tự):
1. `b558c2d2cfc6` — Initial schema (jobs, ai_models)
2. `c1a2b3d4e5f6` — Add users and auth
3. `d2b3c4e5f6a7` — Add user_id to jobs
4. `a5b6c7d8e9f0` — Add assets
5. `b6c7d8e9f0a1` — Add audit_logs
6. `c7d8e9f0a1b2` — Add usage and billing
7. `e3c4d5f6a7b8` — Enhance models for end-user
8. `f4d5e6a7b8c9` — Add projects and outputs
9. `g5e6f7a8b9c0` — Add constraints and indexes

---

## 11. AI and Video Processing Pipeline

### Architecture Diagram

```mermaid
flowchart LR
    User --> Frontend
    Frontend --> API
    API --> Database
    API --> Redis
    Redis --> Worker
    Worker --> ModelAdapter
    ModelAdapter --> GPU
    Worker --> FFmpeg
    Worker --> Storage
    Storage --> Frontend
```

### Model Adapter Pattern

**Base class:** `model_adapters/base/__init__.py` — `BaseModelAdapter`

Lifecycle:
```
__init__(model_id, config) → load_model() → generate(request) → unload_model()
```

**Implemented Adapters:**

| Adapter | File | Mô tả | GPU Required |
|---|---|---|---|
| `mock` | `model_adapters/mock/__init__.py` | FFmpeg test video (color + pattern) | No |
| `cogvideo` | `model_adapters/cogvideo/__init__.py` | CogVideoX-5B via HuggingFace diffusers | Yes (8-18GB VRAM) |

**Planned Adapters (not implemented):**
- `wan` — Wan 2.1 (seeded in DB nhưng adapter chưa viết)
- `ltx_video` — LTX Video

### Worker Process

**File:** `apps/worker/__init__.py`
**Run command:** `python -m arq apps.worker.WorkerSettings`

**Pipeline trong `process_video_job()`:**
1. Fetch job từ DB, update status → `processing`
2. Resolve model → get adapter instance
3. Load model nếu chưa loaded (LRU cache)
4. Build GenerationRequest → adapter.generate()
5. Post-process: generate thumbnail via FFmpeg
6. Save output metadata to Job
7. Finalize credits (charge on success, refund on failure)
8. Publish progress events qua Redis PubSub

**Features:**
- Retry: max 3 lần (configurable)
- Cancellation check giữa các bước
- Credit hold/charge/refund
- Progress publishing qua Redis PubSub
- Model LRU cache (max 3 loaded models)
- Graceful shutdown (unload all models)

### FFmpeg Post-processing

**File:** `postprocessing/ffmpeg/__init__.py` — `FFmpegProcessor`

**Capabilities:**
- `get_video_info()` — probe metadata via ffprobe
- `process()` — re-encode, resize, fps change, trim, add audio
- `generate_thumbnail()` — extract frame as JPEG
- `concatenate()` — merge multiple videos
- `upscale()` — lanczos upscaling

### Pipelines Module
**Status:** Empty stubs (`pipelines/text_to_video/__init__.py`, `pipelines/image_to_video/__init__.py`)
Chưa được sử dụng. Logic hiện tại nằm trực tiếp trong worker + adapter.

---

## 12. Background Jobs and Workers

### Technology: arq (Redis-backed async job queue)

| Thành phần | Chi tiết |
|---|---|
| Queue | Redis (arq:queue) |
| Worker process | `python -m arq apps.worker.WorkerSettings` |
| Job function | `process_video_job(ctx, job_id, task_type)` |
| Concurrency | Configurable (default: 1) |
| Timeout | 600 seconds (10 min) |
| Max retries | 3 |
| Retry delay | 10 seconds |
| Deduplication | By job_id (`_job_id=f"job:{job_id}"`) |

### Job Status Flow:
```
pending → queued → loading_model → processing → post_processing → completed
                                                                  → failed
                                                                  → cancelled
```

### Progress Tracking:
- **Primary:** Redis PubSub (`channel: job:{job_id}`)
- **Fallback:** DB polling (2s interval, max 10 min)
- **Frontend:** SSE via `/api/v1/generations/{id}/events`

### Credit Flow:
1. User creates generation → credits HELD (deducted from balance)
2. Job completes → credits CHARGED (held amount transferred)
3. Job fails/cancelled → credits REFUNDED (held amount returned)

---

## 13. Storage Architecture

### Current: Local Filesystem

| Directory | Purpose | Configurable |
|---|---|---|
| `uploads/` | User-uploaded files (images, videos) | `UPLOAD_DIR` |
| `outputs/` | Generated video outputs + thumbnails | `OUTPUT_DIR` |
| `models/` | HuggingFace model cache | `MODELS_DIR` |
| `data/` | SQLite database file (dev) | Từ `DATABASE_URL` |

### File Naming:
- Uploads: `{YYYYMMDD}_{HHMMSS}_{uuid8}.{ext}` (không dùng tên gốc)
- Outputs: `{ULID_job_id}.mp4`, `{ULID_job_id}_thumb.jpg`

### Security:
- Path traversal prevention trong `get_file_path()`
- Extension whitelist: `.jpg, .jpeg, .png, .webp, .bmp, .gif, .mp4, .webm, .avi, .mov, .mkv`
- MIME type validation + cross-check extension↔MIME
- Max upload size: configurable (default 100MB)

### Planned: S3/MinIO
Code có comment về việc chuyển sang S3StorageService nhưng chưa implement.

---

## 14. Authentication and Authorization

### JWT-based Authentication
- **Access Token:** 15 min expiry, HS256
- **Refresh Token:** 7 days, stored hashed (SHA-256) in DB
- **Password:** bcrypt, 12 rounds
- **ID generation:** ULID (users), UUID (refresh tokens)

### Roles:
| Role | Quyền |
|---|---|
| `USER` | Tạo generations, quản lý projects/assets, xem usage |
| `ADMIN` | Tất cả USER + quản lý users/models/workers/logs |
| `SUPER_ADMIN` | Tất cả ADMIN + thay đổi roles, system config |

### Auth Dependencies:
- `get_current_user` — Bắt buộc token hợp lệ
- `get_current_user_optional` — Optional (transition period)
- `require_admin` — ADMIN hoặc SUPER_ADMIN
- `require_super_admin` — Chỉ SUPER_ADMIN

### Feature Flag:
`REQUIRE_AUTH=false` (default) — cho phép endpoints cũ hoạt động không cần auth. Set `true` trong production.

---

## 15. Admin and End-user Separation

### Backend:
- **End-user endpoints:** `/api/v1/generations`, `/api/v1/projects`, `/api/v1/assets`, `/api/v1/me`
  - Filter by `user_id` — user chỉ thấy data của mình
  - Dùng `get_current_user` dependency
- **Admin endpoints:** `/api/v1/admin/*`
  - Dùng `require_admin` dependency
  - Truy cập all users, all jobs, all logs
- **Shared endpoints:** `/api/v1/models`, `/api/v1/jobs`, `/api/v1/storage`
  - Hiện chưa có auth gate — cần migration sang admin-only hoặc thêm auth

### Frontend:
- **Admin layout:** Sidebar + Header, dark theme (`admin-theme` class)
  - File: `apps/web/src/app/(admin)/layout.tsx`
  - Guard: `AdminGuard` — redirect USER → `/app`
- **End-user layout:** Top navigation bar, white theme
  - File: `apps/web/src/app/(app)/layout.tsx`
  - Guard: `AuthGuard` — redirect unauthenticated → `/login`
- **Public layout:** Centered card
  - File: `apps/web/src/app/(public)/layout.tsx`

---

## 16. Environment Variables

### Backend (.env.example)
| Biến | Service | Bắt buộc | Ý nghĩa |
|---|---|---|---|
| `DEBUG` | API | No | Enable debug mode + SQL echo |
| `DATABASE_URL` | API, Worker | Yes | DB connection string |
| `REDIS_URL` | API, Worker | Yes | Redis connection |
| `UPLOAD_DIR` | API, Worker | No | Upload directory (default: `uploads`) |
| `OUTPUT_DIR` | API, Worker | No | Output directory (default: `outputs`) |
| `MAX_UPLOAD_SIZE_MB` | API | No | Max file upload size (default: 100) |
| `WORKER_CONCURRENCY` | Worker | No | Concurrent jobs (default: 1) |
| `JOB_TIMEOUT_SECONDS` | Worker | No | Job timeout (default: 600) |
| `MODELS_DIR` | Worker | No | HuggingFace cache dir (default: `models`) |
| `JWT_SECRET` | API | Yes (prod) | JWT signing secret |
| `REQUIRE_AUTH` | API | No | Enforce auth on all endpoints (default: false) |
| `CORS_ORIGINS` | API | No | Allowed CORS origins (default: `*`) |

### Frontend (.env.local)
| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL cho dev (default: `http://localhost:8000`) |
| `NEXT_PUBLIC_USE_MOCK_API` | No | Enable mock mode (bypass real API) |
| `INTERNAL_API_URL` | No (Docker) | Internal API URL cho server-side rewrites |

### Docker Compose Environment
| Biến | Default | Ý nghĩa |
|---|---|---|
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `JWT_SECRET` | `change-me-in-production` | JWT secret |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origin |

---

## 17. Local Development

### Prerequisites:
- Python 3.10+
- Node.js 18+ (cho frontend)
- FFmpeg (cho mock adapter và post-processing)
- Docker (cho PostgreSQL + Redis, hoặc dùng SQLite)

### Quick Start (SQLite, no Docker):
```bash
# Backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -e ".[dev]"
alembic upgrade head
python scripts/seed_models.py
python -m uvicorn apps.api.main:app --reload --port 8000

# Frontend (separate terminal)
cd apps/web
npm install
npm run dev
```

### With Docker (PostgreSQL + Redis):
```powershell
# Start infra
docker compose -f docker-compose.dev.yml up -d

# Update .env
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/ai_video_platform

# Run migrations
alembic upgrade head
python scripts/seed_models.py

# Start API
python -m uvicorn apps.api.main:app --reload --port 8000

# Start worker (separate terminal)
python -m arq apps.worker.WorkerSettings

# Start frontend (separate terminal)
cd apps/web && npm run dev
```

### Full Docker Stack:
```bash
docker compose up -d
# API: http://localhost:8000
# Web: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Dev Script:
```powershell
.\scripts\dev.ps1   # Starts Docker services + API server
```

### Useful Commands:
```bash
# Create new migration
alembic revision --autogenerate -m "description"

# Run migrations
alembic upgrade head

# Seed admin user
python scripts/seed_admin.py

# Seed sample models
python scripts/seed_models.py

# Run tests
python -m pytest tests/ -v

# Lint
ruff check .
ruff format .

# Frontend lint
cd apps/web && npm run lint

# Frontend build
cd apps/web && npm run build
```

---

## 18. Docker and Deployment

### Docker Services

| Service | Image/Build | Port | Dependency | Vai trò |
|---|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | — | Primary database |
| `redis` | redis:7-alpine | 6379 | — | Job queue + PubSub |
| `api` | docker/Dockerfile.api | 8000 | postgres, redis | FastAPI server |
| `worker` | docker/Dockerfile.worker | — | postgres, redis | arq job processor |
| `web` | docker/Dockerfile.web | 3000 | api | Next.js frontend |

### Dockerfile Details:
- **API:** Python 3.11-slim, runs `alembic upgrade head && uvicorn`
- **Worker:** Python 3.11-slim + ffmpeg, runs `arq apps.worker.WorkerSettings`
  - GPU support: commented-out nvidia runtime config
- **Web:** Node-based Next.js standalone build

### Volumes:
- `postgres_data` — PostgreSQL data
- `redis_data` — Redis persistence
- `uploads_data` — Shared upload storage (API + Worker)
- `outputs_data` — Shared output storage (API + Worker)

### Production Notes:
- GPU worker cần nvidia-docker runtime (commented trong docker-compose.yml)
- JWT_SECRET phải thay đổi cho production
- CORS_ORIGINS phải restrict cho production domain
- `REQUIRE_AUTH=true` cho production

---

## 19. Testing, Linting and Type Checking

### Testing:
- **Framework:** pytest + pytest-asyncio
- **Mode:** `asyncio_mode = "auto"`
- **Test paths:** `tests/`
- **Run:** `python -m pytest tests/ -v`

### Existing Tests:
| File | Coverage |
|---|---|
| `tests/test_auth_integration.py` | Register, login, refresh, logout, change password, role check |
| `tests/api/` | Directory exists (empty or minimal) |
| `tests/adapters/` | Directory exists (empty or minimal) |
| `tests/worker/` | Directory exists (empty or minimal) |

### Linting:
- **Tool:** ruff
- **Config:** `pyproject.toml`
- **Rules:** E, F, I, N, W
- **Line length:** 100
- **Target:** Python 3.10
- **Run:** `ruff check .`

### Frontend Linting:
- **Tool:** Next.js built-in ESLint
- **Run:** `cd apps/web && npm run lint`

### Type Checking:
- Backend: Không có mypy/pyright config. Type annotations sử dụng SQLAlchemy Mapped types.
- Frontend: TypeScript strict mode (implicit từ Next.js).

### Modules thiếu test:
- Worker pipeline (`process_video_job`)
- Model adapters (mock, cogvideo)
- Storage service
- FFmpeg processor
- Generation endpoints
- Projects/Assets endpoints
- Credit system
- Admin endpoints

---

## 20. Coding Conventions

### Python (Backend):
- **Naming:** snake_case cho functions/variables, PascalCase cho classes
- **Imports:** absolute imports (`from apps.api.config import ...`, `from core.database import ...`)
- **Async:** Tất cả DB operations và I/O đều async
- **Type annotations:** Sử dụng Mapped types (SQLAlchemy 2.0), Pydantic models
- **Docstrings:** Present trên hầu hết functions/classes, format Google-style
- **Logging:** `logging.getLogger(__name__)` pattern
- **Error handling:** HTTPException cho API errors, try/except trong worker
- **Response models:** Pydantic BaseModel cho request/response schemas
- **ID generation:** ULID cho business entities
- **Config:** pydantic-settings với `.env` file
- **Singleton:** Module-level `_instance: Optional[T] = None` + `get_instance()` pattern

### TypeScript (Frontend):
- **Naming:** camelCase cho variables/functions, PascalCase cho components/types
- **Components:** Function components, "use client" directive khi cần
- **Imports:** Absolute imports via `@/` prefix (src/)
- **Styling:** TailwindCSS utility classes, inline styles khi cần CSS vars
- **State:** TanStack Query cho server state, useState cho local state
- **Forms:** react-hook-form + zod schema validation
- **API calls:** Centralized trong `lib/api/client.ts`
- **Types:** Centralized trong `types/index.ts`
- **File naming:** kebab-case cho files, PascalCase cho components

### Inconsistencies Found:
- Backend có 2 password change endpoints (`/api/v1/auth/me/password` và `/api/v1/me/change-password`) — trùng lặp
- Một số endpoints chưa có auth guard (storage, workers, models, jobs)
- Mock data coexists với real API calls trong frontend
- Comment language: mix English/Vietnamese

---

## 21. Current Feature Matrix

| Module | Frontend | Backend | Database | AI/Worker | Trạng thái |
|---|---|---|---|---|---|
| Authentication | Completed | Completed | Completed | — | **Completed** |
| User Dashboard | Partially | Completed | Completed | — | **Partially implemented** |
| Admin Dashboard | UI + mock | Completed | Completed | — | **Partially implemented** |
| Video Generation | Partially | Completed | Completed | Completed | **Completed** (core flow) |
| Project Management | Partially | Completed | Completed | — | **Partially implemented** |
| Asset Management | Partially | Completed | Completed | — | **Partially implemented** |
| File Upload | Partially | Completed | — | — | **Completed** |
| Job Queue | — | Completed | Completed | Completed | **Completed** |
| Progress Tracking (SSE) | Partially | Completed | Completed | Completed | **Completed** |
| Credit System | UI partially | Completed | Completed | Completed | **Partially implemented** |
| Model Registry | Partially | Completed | Completed | — | **Partially implemented** |
| Model Adapters | — | — | — | Partial (mock+cogvideo) | **Partially implemented** |
| Worker/GPU Monitoring | Mock UI | Completed | — | Completed | **Partially implemented** |
| Storage Management | Partially | Completed | — | — | **Completed** (backend) |
| User Management (Admin) | Partially | Completed | Completed | — | **Partially implemented** |
| Audit Logs | Partially | Stub | Completed | — | **Stub** |
| Billing/Subscription | UI stub | Partial | Completed | — | **Stub** |
| i18n | Partially | — | — | — | **Partially implemented** (en+vi) |
| Video Remix | Not implemented | Not implemented | Not implemented | Not implemented | **Not implemented** |
| Transcript/STT | Not implemented | Not implemented | Not implemented | Not implemented | **Not implemented** |
| Scene Detection | Not implemented | Not implemented | Not implemented | Not implemented | **Not implemented** |

---

## 22. Current Technical Issues and Gaps

### Critical

1. **Storage/Worker endpoints thiếu auth guard**
   - Files: `apps/api/routers/storage.py`, `apps/api/routers/workers.py`, `apps/api/routers/models.py`, `apps/api/routers/jobs.py`
   - Ảnh hưởng: Bất kỳ ai cũng có thể upload, xóa files, xem jobs, quản lý models
   - Giải pháp: Thêm `Depends(get_current_user)` hoặc `Depends(require_admin)`

2. **JWT secret mặc định không an toàn**
   - File: `apps/api/config.py` — `jwt_secret = "dev-secret-change-in-production-please"`
   - Ảnh hưởng: Ai cũng có thể forge token nếu không đổi secret
   - Giải pháp: Enforce non-default secret khi `DEBUG=false`

3. **`REQUIRE_AUTH=false` mặc định**
   - File: `apps/api/config.py`
   - Ảnh hưởng: Legacy endpoints accessible without auth
   - Giải pháp: Migrate tất cả endpoints sang require auth

4. **Upload không validate kích thước trước khi ghi**
   - File: `core/storage/__init__.py` — ghi file xong mới check size, sau đó xóa
   - Ảnh hưởng: Potential disk exhaustion attack
   - Giải pháp: Check `Content-Length` header trước, stream với size limit

### High

5. **Duplicate password change endpoints**
   - Files: `apps/api/routers/auth.py` (`/auth/me/password`) + `apps/api/routers/users.py` (`/me/change-password`)
   - Giải pháp: Chọn 1, xóa còn lại

6. **Admin audit logging chưa implement**
   - Database model có (`AuditLog`) nhưng không có code nào insert records
   - File: `core/audit/models.py`
   - Giải pháp: Add audit middleware hoặc service

7. **Reset password chưa hoàn thiện**
   - File: `apps/api/routers/auth.py` — returns 501
   - Ảnh hưởng: User quên password không thể recover
   - Giải pháp: Implement token-based reset flow

8. **CogVideoX adapter chưa test thực tế**
   - File: `model_adapters/cogvideo/__init__.py`
   - Thiếu test, phụ thuộc vào GPU + large model download
   - Giải pháp: Add integration test với mocked torch

9. **Credit system không có transaction log đầy đủ**
   - `CreditTransaction` model exists nhưng code trong `generations.py` chỉ thay đổi `user.credits` mà không tạo transaction record
   - Giải pháp: Insert CreditTransaction mỗi khi hold/charge/refund

10. **Rate limiter in-memory, không shared giữa processes**
    - File: `apps/api/middleware/security.py`
    - Ảnh hưởng: Reset khi restart, không work với multiple API instances
    - Giải pháp: Migrate sang Redis-based rate limiting

### Medium

11. **Frontend mock data coexists với real API**
    - Files: `apps/web/src/mocks/*`, `apps/web/.env.local` (`USE_MOCK_API=true`)
    - Cần mechanism rõ ràng để chuyển mock → real

12. **Pipelines module empty**
    - Files: `pipelines/text_to_video/__init__.py`, `pipelines/image_to_video/__init__.py`
    - Logic hiện nằm trong worker, cần refactor nếu muốn pipeline phức tạp hơn

13. **Configs directories empty**
    - `configs/environments/`, `configs/models/` — không có file nào
    - Giải pháp: Xóa hoặc populate

14. **Frontend features chưa kết nối đầy đủ API**
    - Nhiều trang admin dùng mock data thay vì real API
    - `src/features/` có components nhưng chưa rõ mức độ kết nối

15. **Subscription management chưa implement**
    - Model `Subscription` exists, API `usage.py` reads nó, nhưng không có endpoint tạo/update subscription
    - Không có payment integration

16. **Email verification chưa implement**
    - `User.email_verified` field exists, default `False`, nhưng không có verification flow

### Low

17. **Translate scripts tại root (`translate-dashboard.js`, etc.)**
    - Có vẻ là one-off scripts, nên move vào `scripts/` hoặc xóa

18. **`apps/worker/__init__.py` quá lớn (~350 lines)**
    - Chứa cả worker settings, job handler, và helper functions
    - Giải pháp: Split thành modules (handler, credits, progress)

19. **Docs directory empty**
    - `docs/` không có nội dung
    - File `MASTER_PLAN.md` và `kiro.md` ở root

20. **`data/` và `logs/` directories tracked nhưng không có `.gitkeep`**
    - Có thể gây issue khi clone fresh

---

## 23. Security Considerations

### Implemented:
- JWT authentication với short-lived access tokens (15 min)
- Password hashing (bcrypt, 12 rounds)
- Refresh token rotation + revocation
- Rate limiting (in-memory)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy)
- Request ID tracing
- Path traversal prevention trong storage
- File extension + MIME type validation
- CORS configuration
- SQL injection prevention (SQLAlchemy parameterized queries)
- Account suspension/deletion handling

### Missing/Needs Improvement:
- CSRF protection (N/A vì JWT, nhưng cần nếu migrate sang cookies)
- Redis-backed rate limiting cho multi-instance
- Input sanitization cho prompts (LLM injection?)
- File content scanning (magic bytes, not just extension)
- API key rotation mechanism
- Secrets management (hiện dùng env vars)
- HTTPS enforcement (handled by reverse proxy)
- Request size limiting (beyond upload)

---

## 24. Performance and Scalability Considerations

### Current Design (Single Worker):
- 1 worker, 1 GPU, sequential processing
- Model LRU cache (max 3 models in memory)
- Job timeout: 10 minutes
- SQLite cho dev (no concurrent writes)

### Scaling Path:
1. **Horizontal API scaling:** Stateless FastAPI → multiple instances behind load balancer
   - Cần: Redis rate limiter, shared storage (S3)
2. **Multiple Workers:** arq supports multiple worker processes
   - Cần: Shared model storage, job routing by capability
3. **GPU Fleet:** Multiple GPU workers với model affinity
   - Cần: Worker registry, smart job routing, health monitoring
4. **Storage:** Migrate local filesystem → S3/MinIO
   - Interface đã chuẩn bị (StorageService abstract design)

### Current Bottlenecks:
- Single worker = sequential processing
- Local filesystem storage = not shared between containers
- In-memory rate limiter = not distributed
- Model loading time (15-60s per model)
- Large model downloads on first run

---

## 25. Rules for Claude Code

1. **Luôn đọc `CLAUDE.md` trước khi sửa code.**
2. Không tự ý thay đổi kiến trúc lớn (monorepo structure, framework choices).
3. Không tự ý đổi framework (FastAPI, Next.js, SQLAlchemy) hoặc package manager.
4. Không cài dependency mới nếu chức năng có thể giải quyết bằng dependency hiện có.
5. Không tạo API endpoint trùng với endpoint đã có (kiểm tra `apps/api/main.py` trước).
6. Phải tìm component/service có thể tái sử dụng trước khi tạo mới.
7. Không đưa mock data vào production flow — mock chỉ dùng khi `NEXT_PUBLIC_USE_MOCK_API=true`.
8. Không hard-code URL, API key, secret hoặc credential. Dùng `apps/api/config.py` Settings.
9. Không sửa migration cũ đã tồn tại — tạo migration mới bằng `alembic revision --autogenerate`.
10. Mọi API mới phải có Pydantic schema cho request và response.
11. Mọi job xử lý video phải chạy qua arq worker — KHÔNG xử lý trong HTTP request.
12. Không chạy FFmpeg hoặc AI inference trực tiếp trong API request handler.
13. Mọi file upload phải validate: extension (whitelist), MIME type, file size.
14. Không dùng tên file upload gốc làm đường dẫn lưu trữ (đã implement UUID-based naming).
15. FFmpeg commands phải dùng list-based arguments (`subprocess_exec(*cmd)`) — KHÔNG shell string.
16. Không ghi secret hoặc token vào log (dùng `logger.info` an toàn).
17. Không xóa code đang hoạt động nếu chưa xác nhận nơi sử dụng.
18. Không thay đổi frontend route paths hoặc API URL contract mà không update cả 2 phía.
19. Giữ sự phân tách giữa admin (`/admin/*`, `require_admin`) và end-user (`/app/*`, `get_current_user`).
20. Mọi endpoint mới cho end-user phải filter by `user_id` — user chỉ thấy data của mình.
21. Khi thêm model adapter mới, implement đầy đủ `BaseModelAdapter` interface và register trong `model_adapters/__init__.py`.
22. Credit cost phải được tính và hold TRƯỚC khi tạo job.
23. Không định vị sản phẩm là công cụ reup, né fingerprint hoặc né bản quyền.
24. Sau mỗi thay đổi backend, chạy `ruff check .` và `python -m pytest tests/ -v`.
25. Sau mỗi thay đổi frontend, chạy `cd apps/web && npm run lint`.
26. Khi không chắc chắn về behavior hiện tại, đọc source code trước — không giả định.
27. Database entities dùng ULID cho primary key (26 chars, string type).
28. Async everywhere — tất cả DB operations phải dùng `await` với `AsyncSession`.
29. Frontend API calls phải qua `lib/api/client.ts` — không fetch trực tiếp.
30. i18n: Mọi text user-facing trong frontend nên dùng `next-intl` thay vì hard-code string.

---

## 26. Recommended Next Development Priorities

### Priority 0 — Blocking Issues
1. **Add auth guards to unprotected endpoints** (storage, workers, models, jobs)
2. **Remove duplicate password change endpoint** (keep one)
3. **Set `REQUIRE_AUTH=true` as default** hoặc add auth to individual endpoints

### Priority 1 — MVP Core (Generation Flow)
1. **Kết nối frontend Generate page với real API** (loại bỏ mock dependency)
2. **Implement real-time progress UI** (connect SSE endpoint)
3. **Implement output preview/download UI** trong user dashboard
4. **Test end-to-end flow** với MockAdapter (no GPU needed)
5. **Implement Wan adapter** (`model_adapters/wan/`) — model đã seeded trong DB

### Priority 2 — Product Completion
1. **Implement credit transaction logging** (insert CreditTransaction records)
2. **Password reset flow** (email + token)
3. **Email verification flow**
4. **Audit log implementation** (middleware hoặc event-based)
5. **Admin dashboard kết nối real API** (thay mock data)
6. **User settings page** (profile update, notification preferences)
7. **Subscription/billing page** (plan info, upgrade flow)
8. **Error states + empty states** trong frontend

### Priority 3 — Scalability and Quality
1. **Migrate storage sang S3/MinIO** (implement S3StorageService)
2. **Redis-based rate limiting**
3. **Comprehensive test suite** (adapters, worker, storage, API endpoints)
4. **GPU worker deployment guide**
5. **Monitoring/alerting** (job failure rates, queue depth, GPU health)
6. **Frontend build optimization** (code splitting, lazy loading)
7. **API documentation** (OpenAPI spec improvements)
8. **CI/CD pipeline** (lint + test + build + deploy)

### Priority 4 — Video Remix Features (Future)
1. Video upload + analysis pipeline
2. Audio extraction + Speech-to-Text (Whisper)
3. Scene detection (PySceneDetect)
4. Video segmentation + classification
5. Timeline remix generation
6. Timeline editor UI
7. Output comparison view

---

## 27. Important Files

| File | Vai trò | Khi nào cần sửa |
|---|---|---|
| `apps/api/main.py` | API entry point, router registration | Thêm router mới |
| `apps/api/config.py` | Application settings | Thêm config mới |
| `core/database.py` | DB engine + session factory | Thay đổi DB config |
| `core/job_queue/__init__.py` | Redis/arq connection + enqueue | Thay đổi queue logic |
| `core/job_queue/models.py` | Job ORM model | Thêm fields vào job |
| `core/auth/models.py` | User + RefreshToken models | Thay đổi user schema |
| `core/model_registry/models.py` | AIModel ORM | Thêm model capabilities |
| `core/storage/__init__.py` | File storage service | Storage behavior |
| `core/monitoring/__init__.py` | GPU monitor + resource manager | Worker resource logic |
| `apps/worker/__init__.py` | Worker job handler (full pipeline) | Video processing logic |
| `model_adapters/base/__init__.py` | Adapter interface (abstract) | Thay đổi adapter contract |
| `model_adapters/__init__.py` | Adapter registry | Register new adapter |
| `model_adapters/mock/__init__.py` | Mock adapter (testing) | Test video generation |
| `postprocessing/ffmpeg/__init__.py` | FFmpeg processor | Video post-processing |
| `apps/api/dependencies/auth.py` | Auth dependencies | Authorization logic |
| `apps/api/services/auth_service.py` | JWT + password + token ops | Auth business logic |
| `apps/api/routers/generations.py` | User generation endpoints | Generation flow |
| `apps/api/routers/generation_events.py` | SSE progress | Real-time updates |
| `apps/web/src/lib/api/client.ts` | Frontend API client | API communication |
| `apps/web/src/lib/auth/provider.tsx` | Frontend auth context | Auth state management |
| `apps/web/src/lib/auth/guard.tsx` | Route protection | Access control UI |
| `apps/web/src/types/index.ts` | Shared TypeScript types | Type definitions |
| `apps/web/src/app/(app)/layout.tsx` | End-user layout + nav | User navigation |
| `apps/web/src/app/(admin)/layout.tsx` | Admin layout | Admin navigation |
| `apps/web/next.config.ts` | Next.js config + API rewrites | Proxy/build config |
| `docker-compose.yml` | Full production stack | Deployment |
| `docker-compose.dev.yml` | Dev infra (postgres+redis) | Local development |
| `pyproject.toml` | Python deps + tool config | Dependencies |
| `alembic.ini` | Migration config | DB migration settings |
| `.env.example` | Environment template | New env vars |

---

## 28. Unknowns Requiring Verification

| Câu hỏi | Lý do chưa xác định | Cần kiểm tra |
|---|---|---|
| Wan adapter đã viết chưa? | `model_adapters/` không có thư mục `wan/` | Confirm với team |
| Production deployment target? | Không có CI/CD config, không rõ cloud provider | Infrastructure decision |
| Object storage production? | Code chỉ có local filesystem, S3 chưa implement | Confirm S3/MinIO/R2 |
| Payment provider cho billing? | Subscription model exists nhưng không có Stripe/payment code | Product decision |
| Email service cho notifications? | Forgot-password stub, không có email sending code | Confirm SendGrid/SES |
| Frontend pages hoàn thiện tới đâu? | Nhiều pages trong `(admin)` và `(app)` chưa đọc chi tiết | Review từng page |
| GPU worker deployment riêng? | Docker Compose có worker service nhưng GPU config commented | Confirm infrastructure |
| `MASTER_PLAN.md` còn relevant? | File ở root, chưa đọc | Review alignment |
| Admin users seeded thế nào? | `scripts/seed_admin.py` exists nhưng chưa đọc | Verify seed process |
| Multi-language support tới đâu? | `next-intl` configured, messages/en.json + vi.json exist | Check translation coverage |
