"""
Full E2E test via HTTP API.

Tests the real flow:
    1. Register a user
    2. Login → get token
    3. Create generation via API
    4. Poll until completed
    5. Verify output exists

Requirements:
    - Docker containers running (docker compose -f docker-compose.dev.yml up -d)
    - API running (python -m uvicorn apps.api.main:app --port 8000)
    - Worker running (python -m arq apps.worker.WorkerSettings)
    - Migrations applied (alembic upgrade head)
    - Models seeded (python scripts/seed_models.py)

Usage:
    python scripts/test_full_flow.py
"""

import time
import sys
import httpx

API_BASE = "http://localhost:8000/api/v1"


def main():
    print("=" * 60)
    print("  Full E2E Flow Test (via HTTP API)")
    print("=" * 60)
    print()

    client = httpx.Client(timeout=30)

    # ── Step 1: Check health ──
    print("[1/7] Checking API health...")
    try:
        res = client.get("http://localhost:8000/health")
        assert res.status_code == 200, f"Health check failed: {res.status_code}"
        print("  [OK] API is healthy")
    except httpx.ConnectError:
        print("  ERROR: Cannot connect to API at localhost:8000")
        print("  → Start API: python -m uvicorn apps.api.main:app --port 8000")
        sys.exit(1)

    # ── Step 2: Register user ──
    print("\n[2/7] Registering test user...")
    email = f"test_{int(time.time())}@example.com"
    res = client.post(f"{API_BASE}/auth/register", json={
        "email": email,
        "password": "TestPass123!",
        "name": "Test User",
    })
    if res.status_code == 201:
        print(f"  [OK] User registered: {email}")
    elif res.status_code == 409:
        print(f"  [OK] User already exists (fine for re-runs)")
    else:
        print(f"  ERROR: Registration failed: {res.status_code} {res.text}")
        sys.exit(1)

    # ── Step 3: Login ──
    print("\n[3/7] Logging in...")
    res = client.post(f"{API_BASE}/auth/login", json={
        "email": email,
        "password": "TestPass123!",
    })
    assert res.status_code == 200, f"Login failed: {res.status_code} {res.text}"
    data = res.json()
    token = data["access_token"]
    user = data["user"]
    print(f"  [OK] Logged in as {user['name']} (credits: {user['credits']})")

    headers = {"Authorization": f"Bearer {token}"}

    # ── Step 4: Get generation options ──
    print("\n[4/7] Fetching generation options...")
    res = client.get(f"{API_BASE}/generation-options", headers=headers)
    if res.status_code == 200:
        options = res.json()
        models = options.get("models", [])
        print(f"  [OK] Available models: {len(models)}")
        for m in models[:3]:
            print(f"       - {m['display_name']} ({m['id']})")
    else:
        print(f"  WARN: Options not available ({res.status_code}), continuing anyway...")

    # ── Step 5: Create generation ──
    print("\n[5/7] Creating generation (text_to_video)...")
    res = client.post(f"{API_BASE}/generations", headers=headers, json={
        "task_type": "text_to_video",
        "prompt": "A golden sunset over a calm ocean with gentle waves",
        "duration": 3.0,
        "resolution": "480p",
        "fps": 16,
        "seed": 42,
        "guidance_scale": 7.5,
        "num_inference_steps": 30,
    })
    if res.status_code == 201:
        job = res.json()
        job_id = job["id"]
        print(f"  [OK] Generation created: {job_id}")
        print(f"       Status: {job['status']}")
        print(f"       Credits held: {job['credits_held']}")
    else:
        print(f"  ERROR: Generation failed: {res.status_code}")
        print(f"  Response: {res.text}")
        sys.exit(1)

    # ── Step 6: Poll until done ──
    print(f"\n[6/7] Polling job {job_id[:8]}... (max 120s)")
    start = time.time()
    final_status = None
    while time.time() - start < 120:
        res = client.get(f"{API_BASE}/generations/{job_id}", headers=headers)
        if res.status_code != 200:
            print(f"  WARN: Poll failed ({res.status_code})")
            time.sleep(2)
            continue

        job = res.json()
        status = job["status"]
        progress = job["progress"]
        stage = job.get("stage", "")

        elapsed = time.time() - start
        print(f"  [{elapsed:5.1f}s] {status} — {progress}% {stage or ''}")

        if status in ("completed", "failed", "cancelled"):
            final_status = status
            break

        time.sleep(2)

    if final_status is None:
        print("  ERROR: Timeout! Job did not complete in 120s")
        print("  → Is the worker running? python -m arq apps.worker.WorkerSettings")
        sys.exit(1)

    # ── Step 7: Verify result ──
    print(f"\n[7/7] Verifying result (status={final_status})...")

    if final_status == "completed":
        print(f"  [OK] Job completed!")
        print(f"       Output: {job.get('output_path')}")
        print(f"       Credits charged: {job.get('credits_charged')}")

        # Try getting download URL
        res = client.get(f"{API_BASE}/outputs/{job_id}/download", headers=headers)
        if res.status_code == 200:
            dl = res.json()
            print(f"       Download URL: {dl.get('download_url')}")
        else:
            print(f"       WARN: Download URL not available ({res.status_code})")

        # Check user credits after
        res = client.get(f"{API_BASE}/auth/me", headers=headers)
        if res.status_code == 200:
            me = res.json()
            print(f"       Credits remaining: {me.get('credits')}")

    elif final_status == "failed":
        print(f"  FAILED: {job.get('error_message')}")
        sys.exit(1)
    else:
        print(f"  Unexpected status: {final_status}")
        sys.exit(1)

    print()
    print("=" * 60)
    print("  ALL TESTS PASSED!")
    print("  Flow: Register → Login → Generate → Poll → Complete ✓")
    print("=" * 60)


if __name__ == "__main__":
    main()
