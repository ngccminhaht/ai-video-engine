"""
End-to-end pipeline test for Phase 1.4.

Tests the full flow:
    1. Create a job in the DB (simulates API)
    2. Call the worker function directly (bypasses Redis for testing)
    3. Verify job completed + video file exists on disk

Requirements:
    - FFmpeg installed and in PATH
    - Database migrated (alembic upgrade head)
    - No Redis needed (worker function called directly)

Usage:
    python scripts/test_pipeline.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def main():
    print("=" * 60)
    print("  Phase 1.4 — End-to-End Pipeline Test")
    print("=" * 60)
    print()

    # ── Step 0: Check FFmpeg ──
    import shutil

    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        print("ERROR: FFmpeg not found in PATH!")
        print("Install: https://ffmpeg.org/download.html")
        sys.exit(1)
    print(f"[OK] FFmpeg found: {ffmpeg_path}")

    # ── Step 1: Import modules ──
    print("\n[1/6] Importing modules...")
    try:
        from ulid import ULID

        from apps.api.config import get_settings
        from apps.worker import process_video_job
        from core.database import async_session_factory
        from core.job_queue.models import Job
        from core.model_registry.models import AIModel
        from model_adapters import list_registered_adapters

        settings = get_settings()
        print(f"  - Registered adapters: {list_registered_adapters()}")
        print(f"  - Output dir: {settings.output_dir}")
        print("  [OK] All imports successful")
    except Exception as e:
        print(f"  ERROR: Import failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # ── Step 2: Ensure output directory exists ──
    print("\n[2/6] Setting up directories...")
    settings.output_dir.mkdir(parents=True, exist_ok=True)
    print(f"  [OK] Output dir ready: {settings.output_dir}")

    # ── Step 3: Ensure a mock model exists in DB ──
    print("\n[3/6] Checking model registry...")
    async with async_session_factory() as session:
        model = await session.get(AIModel, "mock-test-model")
        if not model:
            print("  Creating test model 'mock-test-model'...")
            model = AIModel(
                id="mock-test-model",
                name="Mock Test Model",
                version="1.0",
                description="Test model for pipeline validation",
                adapter_name="mock",
                capabilities=["text_to_video", "image_to_video"],
                minimum_vram_gb=0,
                recommended_vram_gb=0,
                max_resolution_width=1920,
                max_resolution_height=1080,
                max_duration_seconds=30,
                max_fps=60,
                status="available",
            )
            session.add(model)
            await session.commit()
            print("  [OK] Model created")
        else:
            print(f"  [OK] Model exists: {model.name} (adapter={model.adapter_name})")

    # ── Step 4: Create a test job ──
    print("\n[4/6] Creating test job...")
    job_id = str(ULID())
    async with async_session_factory() as session:
        job = Job(
            id=job_id,
            task_type="text_to_video",
            status="queued",
            model_id="mock-test-model",
            inputs={
                "prompt": "A beautiful sunset over the ocean with waves crashing",
                "negative_prompt": "blurry, low quality",
            },
            generation_params={
                "duration": 3.0,
                "resolution": "720p",
                "fps": 24,
                "seed": 42,
                "guidance_scale": 7.5,
                "num_inference_steps": 30,
            },
            priority=5,
        )
        session.add(job)
        await session.commit()
        print(f"  [OK] Job created: {job_id}")
        print("       Task: text_to_video")
        print("       Model: mock-test-model")
        print(f"       Prompt: '{job.inputs['prompt'][:50]}...'")

    # ── Step 5: Run worker function directly ──
    print("\n[5/6] Running worker (process_video_job)...")
    print("  " + "-" * 40)

    ctx = {}  # arq context (not needed for direct call)
    try:
        result = await process_video_job(ctx, job_id=job_id, task_type="text_to_video")
        print("  " + "-" * 40)
        print(f"  [OK] Worker returned: {result}")
    except Exception as e:
        print(f"  ERROR: Worker failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # ── Step 6: Verify results ──
    print("\n[6/6] Verifying results...")

    async with async_session_factory() as session:
        job = await session.get(Job, job_id)
        assert job is not None, "Job not found in DB!"

        print(f"  Job status:        {job.status}")
        print(f"  Output path:       {job.output_path}")
        print(f"  Thumbnail path:    {job.thumbnail_path}")
        print(f"  Queue time:        {job.queue_time_seconds}s")
        print(f"  Load model time:   {job.load_model_time_seconds}s")
        print(f"  Inference time:    {job.inference_time_seconds}s")
        print(f"  Total time:        {job.total_time_seconds}s")
        print(f"  Peak VRAM:         {job.peak_vram_gb} GB")
        print(f"  Output metadata:   {job.output_metadata}")

        # Assertions
        errors = []

        if job.status != "completed":
            errors.append(f"Expected status='completed', got '{job.status}'")

        if not job.output_path:
            errors.append("output_path is empty")
        elif not os.path.exists(job.output_path):
            errors.append(f"Output file not found: {job.output_path}")
        else:
            size_mb = os.path.getsize(job.output_path) / (1024 * 1024)
            print(f"  Video file size:   {size_mb:.2f} MB")

        if job.thumbnail_path and os.path.exists(job.thumbnail_path):
            thumb_size = os.path.getsize(job.thumbnail_path) / 1024
            print(f"  Thumbnail size:    {thumb_size:.1f} KB")
        else:
            errors.append(f"Thumbnail not found: {job.thumbnail_path}")

        if job.total_time_seconds is None or job.total_time_seconds <= 0:
            errors.append("total_time_seconds not set")

        if job.output_metadata is None:
            errors.append("output_metadata not set")

        if errors:
            print(f"\n  FAILURES ({len(errors)}):")
            for err in errors:
                print(f"    ✗ {err}")
            sys.exit(1)

    # ── Done ──
    print()
    print("=" * 60)
    print("  ALL TESTS PASSED!")
    print("  Pipeline: API → Queue → Worker → MockAdapter → Video ✓")
    print("=" * 60)

    # Also test with auto model_id
    print("\n\n--- Bonus: Testing with model_id='auto' ---")
    job_id_2 = str(ULID())
    async with async_session_factory() as session:
        job2 = Job(
            id=job_id_2,
            task_type="text_to_video",
            status="queued",
            model_id="auto",
            inputs={"prompt": "A cat playing piano in space"},
            generation_params={"duration": 2.0, "resolution": "480p", "fps": 16, "seed": 123},
            priority=5,
        )
        session.add(job2)
        await session.commit()

    result2 = await process_video_job(ctx, job_id=job_id_2, task_type="text_to_video")
    print(f"  Auto-mode result: {result2}")

    async with async_session_factory() as session:
        job2 = await session.get(Job, job_id_2)
        assert job2.status == "completed", f"Auto job failed: {job2.status}"
        print(f"  [OK] Auto job completed: {job2.output_path}")

    print("\n  ALL DONE. Phase 1.4 pipeline is working!")


if __name__ == "__main__":
    asyncio.run(main())
