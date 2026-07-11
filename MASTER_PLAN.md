# AI Video Platform - Master Plan

## Tổng quan

Plan này chia dự án thành các bước nhỏ, mỗi bước có deliverable rõ ràng.
Các điểm cần chủ dự án quyết định được đánh dấu: **[DECISION NEEDED]**

---

## Phase 1: Foundation (Backend Core)

### Bước 1.1: Khởi tạo project structure + environment

**Mục tiêu:** Tạo skeleton project, cài đặt dependencies, chạy được "hello world" API.

**Công việc:**
- Tạo cấu trúc thư mục theo thiết kế
- Setup Python virtual environment (hoặc Poetry/uv)
- Cài FastAPI + Uvicorn
- Setup Docker Compose cho dev (PostgreSQL + Redis)
- Tạo `.env.example`, `.gitignore`, `README.md`
- Config linting (ruff) + formatting (black)

**Deliverable:** `python -m uvicorn app:app` chạy được, trả JSON `{"status": "ok"}`

**[DECISION NEEDED]**
- Python package manager: `uv` (nhanh, mới) hay `poetry` (phổ biến, ổn định) hay `pip + requirements.txt` (đơn giản nhất)?
- Python version: 3.10 hay 3.11 hay 3.12? (3.10 tương thích tốt nhất với PyTorch hiện tại)

---

### Bước 1.2: Database schema + Model Registry

**Mục tiêu:** Thiết kế database, tạo bảng, build Model Registry API.

**Công việc:**
- Setup SQLAlchemy + Alembic (migration)
- Thiết kế schema:
  - `models` — danh sách model đã đăng ký
  - `jobs` — job tạo video
  - `job_results` — kết quả output
- Build Model Registry API:
  - `POST /api/v1/models` — đăng ký model mới
  - `GET /api/v1/models` — danh sách model
  - `GET /api/v1/models/{id}` — chi tiết model
  - `PATCH /api/v1/models/{id}` — cập nhật trạng thái
  - `DELETE /api/v1/models/{id}` — gỡ model
- Seed data: đăng ký sẵn 2 model đầu tiên

**Deliverable:** CRUD model registry hoạt động, có migration, test được qua Swagger UI

---

### Bước 1.3: Job API + Job Queue

**Mục tiêu:** Client gửi request tạo video → nhận job ID ngay → job được đẩy vào queue.

**Công việc:**
- Thiết kế Job schema (status, metadata, timestamps)
- Build Job API:
  - `POST /api/v1/jobs` — tạo job mới (text-to-video hoặc image-to-video)
  - `GET /api/v1/jobs/{id}` — xem trạng thái + kết quả
  - `GET /api/v1/jobs` — danh sách job (filter, pagination)
  - `POST /api/v1/jobs/{id}/cancel` — hủy job
- Tích hợp job queue (đẩy job vào Redis queue)
- Validate input theo task_type
- Upload input files (image) vào storage

**Deliverable:** Gọi API tạo job → nhận job_id → job nằm trong queue chờ xử lý

**[DECISION NEEDED]**
- Job queue library: `Celery` (phổ biến, nhiều feature, hơi nặng) hay `arq` (lightweight, async-native, dùng Redis) hay `Redis Queue (RQ)` (đơn giản nhất)?
- Gợi ý: `arq` nếu muốn nhẹ + async, `Celery` nếu muốn ecosystem lớn + nhiều monitoring tool

---

### Bước 1.4: GPU Worker + Model Adapter Interface

**Mục tiêu:** Worker nhận job từ queue, gọi model adapter, chạy inference, trả kết quả.

**Công việc:**
- Định nghĩa `BaseModelAdapter` abstract class:
  ```python
  class BaseModelAdapter:
      def load_model(self) -> None
      def unload_model(self) -> None
      def generate(self, request: GenerationRequest) -> GenerationResult
      def get_capabilities(self) -> ModelCapabilities
      def get_vram_usage(self) -> float
  ```
- Build Worker process:
  - Nhận job từ queue
  - Xác định adapter cần dùng
  - Load model (nếu chưa load)
  - Chạy inference
  - Lưu output video
  - Cập nhật job status + metadata (thời gian, VRAM, etc.)
- Build 1 adapter "mock" (tạo video giả bằng FFmpeg) để test pipeline end-to-end
- Xử lý error + retry logic

**Deliverable:** Full pipeline chạy end-to-end: API → Queue → Worker → Mock video output → Job completed

---

### Bước 1.5: Storage layer

**Mục tiêu:** Quản lý upload input + lưu output video + serve file.

**Công việc:**
- Abstract storage interface (local filesystem ban đầu, sau switch MinIO/S3)
- Upload endpoint cho input files (ảnh, video reference)
- Lưu output video từ worker
- Serve file qua API hoặc static path
- Tạo thumbnail cho video output
- Cleanup logic (xóa file cũ)

**Deliverable:** Upload ảnh → tạo job image-to-video → worker xử lý → video output có thể download

---

### Bước 1.6: Tích hợp Model thật đầu tiên (Text-to-Video)

**Mục tiêu:** Adapter cho 1 model text-to-video thật, chạy inference trên GPU.

**Công việc:**
- Viết adapter cho model được chọn
- Xử lý model loading (quantization, CPU offload nếu cần)
- Map parameters: prompt, negative_prompt, resolution, duration, fps, seed
- Xử lý output: save video frames → encode MP4
- Ghi metadata: inference time, VRAM peak, model version
- Test end-to-end với GPU thật

**[DECISION NEEDED] — Chọn model Text-to-Video đầu tiên:**

| Model | VRAM | Chất lượng | Tốc độ | Ghi chú |
|-------|------|-----------|--------|---------|
| **CogVideoX-5B** | ~18GB (quantized ~12GB) | Tốt | Trung bình | Từ Tsinghua, hỗ trợ tốt, diffusers native |
| **Wan2.1-T2V-14B** | ~24GB+ | Rất tốt | Chậm | Từ Alibaba, mới nhất, chất lượng cao |
| **Wan2.1-T2V-1.3B** | ~6GB | Khá | Nhanh | Phiên bản nhẹ của Wan, phù hợp test |
| **LTX-Video** | ~12GB | Khá | Nhanh nhất | Từ Lightricks, realtime-ish |
| **HunyuanVideo** | ~24GB+ | Rất tốt | Chậm | Từ Tencent, chất lượng rất cao |
| **Mochi-1** | ~18GB | Tốt | Trung bình | Từ Genmo |

Gợi ý: 
- Nếu GPU <= 16GB VRAM → bắt đầu với **CogVideoX-5B** (quantized) hoặc **Wan2.1-1.3B**
- Nếu GPU >= 24GB VRAM → **Wan2.1-14B** hoặc **HunyuanVideo**
- Nếu muốn tốc độ nhanh để test → **LTX-Video**

**→ Bạn đang có GPU gì? (model, VRAM bao nhiêu?)**

---

### Bước 1.7: Tích hợp Model thật thứ hai (Image-to-Video)

**Mục tiêu:** Adapter cho 1 model image-to-video, chứng minh hệ thống multi-model hoạt động.

**Công việc:**
- Viết adapter cho model I2V được chọn
- Xử lý input image (resize, format validation)
- Map parameters: image, prompt, duration, motion strength
- Test chạy song song/tuần tự với model T2V
- Verify model loading/unloading đúng

**[DECISION NEEDED] — Chọn model Image-to-Video:**

| Model | VRAM | Ghi chú |
|-------|------|---------|
| **Wan2.1-I2V-14B** | ~24GB+ | Chất lượng cao nhất hiện tại cho I2V |
| **Wan2.1-I2V-1.3B** | ~6GB | Phiên bản nhẹ |
| **CogVideoX-5B-I2V** | ~18GB | Ổn định, diffusers native |
| **Stable Video Diffusion (SVD)** | ~12GB | Từ Stability AI, phổ biến |
| **HunyuanVideo-I2V** | ~24GB+ | Mới, chất lượng tốt |

Gợi ý: Nếu T2V đã chọn Wan thì I2V cũng chọn Wan cho đồng bộ adapter code.

---

## Phase 2: Model Platform (Nâng cao)

### Bước 2.1: Model Scheduler + Resource Management

**Công việc:**
- Theo dõi VRAM GPU real-time (nvidia-smi / pynvml)
- Logic load/unload model thông minh (LRU cache)
- Từ chối job nếu không đủ VRAM
- Support multi-GPU (sau này)
- Model warm-up / keep-alive

---

### Bước 2.2: Model Router (Auto mode)

**Công việc:**
- Khi client gửi `model_id: "auto"`, hệ thống tự chọn model phù hợp
- Routing logic dựa trên:
  - Task type
  - Model availability
  - VRAM hiện tại
  - Chất lượng vs tốc độ preference
- Fallback logic khi model chính unavailable

---

### Bước 2.3: Benchmark + Monitoring

**Công việc:**
- API benchmark: chạy cùng prompt trên nhiều model, so sánh
- Dashboard metrics: job count, success rate, avg inference time, VRAM usage
- Alerting: job failed, GPU OOM, model crash
- Prometheus + Grafana (hoặc đơn giản hơn)

**[DECISION NEEDED]**
- Monitoring stack: `Prometheus + Grafana` (standard) hay đơn giản hơn (log + SQLite metrics)?

---

### Bước 2.4: Tích hợp thêm models

**Công việc:**
- Mỗi model mới = 1 adapter mới
- Test compatibility
- Benchmark so sánh
- Cập nhật model registry

Models tiềm năng để thêm:
- HunyuanVideo
- LTX-Video
- Mochi-1
- Open-Sora
- AnimateDiff
- Kling (nếu có open-source)

---

## Phase 3: Post-processing + Pipelines

### Bước 3.1: FFmpeg post-processing layer

**Công việc:**
- Encode output (H.264, H.265)
- Resize / crop / change aspect ratio
- Add audio track
- Frame interpolation (RIFE)
- Video upscaling (Real-ESRGAN)
- Thumbnail generation
- Format conversion

---

### Bước 3.2: Pipeline engine cho multi-step tasks

**Công việc:**
- Pipeline definition format (YAML hoặc JSON)
- Orchestrator chạy nhiều step tuần tự
- Support cho: Storyboard → multi-shot → compose
- Step dependencies và data passing

---

## Phase 4: Admin Frontend

### Bước 4.1: Admin Dashboard

**Công việc:**
- Setup frontend project
- Dashboard: thống kê job, model status, GPU usage
- Model management: list, register, enable/disable
- Job management: list, view detail, cancel, retry
- Job result viewer: preview video, download

**[DECISION NEEDED]**
- Frontend framework: `Next.js` (React, SSR, đầy đủ) hay `Vue 3 + Vite` (nhẹ, SPA) hay `Nuxt 3` (Vue SSR)?
- UI library: `Tailwind + shadcn/ui` hay `Ant Design` hay `Element Plus`?
- Hoặc skip FE, dùng Swagger UI + CLI trong giai đoạn đầu?

---

### Bước 4.2: Job submission UI

**Công việc:**
- Form tạo job text-to-video
- Form tạo job image-to-video (upload ảnh)
- Realtime status tracking (polling hoặc WebSocket)
- Video preview player
- Prompt history / favorites

---

## Phase 5: Advanced Features (Sau MVP)

### 5.1: Reference-to-Video pipeline
### 5.2: First/Last Frame-to-Video
### 5.3: Storyboard-to-Video
### 5.4: Video-to-Video
### 5.5: Video Editing (inpainting, object removal)
### 5.6: Character Animation / Motion Transfer
### 5.7: Audio-to-Video (lip-sync)
### 5.8: Voice integration (TTS → lip-sync)
### 5.9: ComfyUI integration (workflow-based generation)

---

## Tổng hợp các quyết định cần từ bạn

| # | Câu hỏi | Gợi ý |
|---|---------|-------|
| 1 | Python package manager? | `uv` (nhanh nhất) hoặc `pip + requirements.txt` (đơn giản nhất) |
| 2 | Python version? | 3.10 (safe nhất cho PyTorch) |
| 3 | Job queue library? | `arq` (nhẹ, async) hoặc `Celery` (nhiều feature) |
| 4 | GPU bạn đang có? (model + VRAM) | Quyết định chọn model nào |
| 5 | Model T2V đầu tiên? | Phụ thuộc GPU |
| 6 | Model I2V đầu tiên? | Phụ thuộc GPU |
| 7 | Monitoring stack? | Đơn giản trước, Prometheus sau |
| 8 | Frontend framework? | Hoặc skip FE giai đoạn đầu |
| 9 | Có muốn ComfyUI integration không? | Nhiều model đã có node ComfyUI sẵn |

---

## Timeline ước tính

| Phase | Thời gian | Output |
|-------|-----------|--------|
| Phase 1 (Bước 1.1-1.5) | 1-2 tuần | Backend core chạy end-to-end với mock |
| Phase 1 (Bước 1.6-1.7) | 1 tuần | 2 model thật hoạt động |
| Phase 2 | 2-3 tuần | Model platform hoàn chỉnh |
| Phase 3 | 1-2 tuần | Post-processing + pipeline |
| Phase 4 | 1-2 tuần | Admin dashboard |
| Phase 5 | Ongoing | Mở rộng feature |

**Tổng MVP (Phase 1 hoàn chỉnh): ~2-3 tuần**

---

## Ghi chú kỹ thuật

### Tại sao không tham khảo cấu trúc Voice-Oriagent?

- Voice-Oriagent là **realtime streaming** (WebSocket + MQTT + asyncio) → AI Video Platform là **batch processing** (queue + worker)
- Voice-Oriagent dùng Java Spring Boot cho management API → quá nặng cho project này
- Voice-Oriagent không có job queue / GPU worker pattern
- Voice-Oriagent dùng Vue 2 (đã EOL)

### Điều có thể tham khảo:
- Docker Compose multi-service pattern
- Provider/adapter pattern (ASR/TTS providers tương tự model adapters)
- Config YAML structure cho plugin system
