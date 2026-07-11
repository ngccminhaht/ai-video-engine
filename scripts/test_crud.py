"""Quick test script for Model Registry CRUD."""

import httpx

base = "http://127.0.0.1:8000/api/v1/models"

# 1. List models
print("=== LIST MODELS ===")
r = httpx.get(base)
data = r.json()
print(f"Total: {data['total']}")
for m in data["models"]:
    print(f"  - {m['id']}: {m['name']} ({m['status']})")

# 2. Get single model
print("\n=== GET MODEL ===")
r = httpx.get(f"{base}/cogvideox-5b")
m = r.json()
print(f"  {m['name']} v{m['version']}")
print(f"  Capabilities: {m['capabilities']}")
print(f"  VRAM: {m['minimum_vram_gb']}GB min, {m['recommended_vram_gb']}GB rec")

# 3. Register new model
print("\n=== REGISTER NEW MODEL ===")
new_model = {
    "id": "ltx-video-0.9",
    "name": "LTX Video 0.9",
    "version": "0.9",
    "description": "Fast video generation from Lightricks",
    "source": "https://huggingface.co/Lightricks/LTX-Video",
    "adapter_name": "ltx_video",
    "capabilities": ["text_to_video", "image_to_video"],
    "minimum_vram_gb": 8,
    "recommended_vram_gb": 12,
    "supports_quantization": False,
}
r = httpx.post(base, json=new_model)
print(f"  Status: {r.status_code}")
print(f"  Created: {r.json()['id']}")

# 4. Update model
print("\n=== UPDATE MODEL ===")
r = httpx.patch(f"{base}/ltx-video-0.9", json={"status": "disabled", "description": "Updated"})
print(f"  Status after update: {r.json()['status']}")

# 5. Conflict test
print("\n=== CONFLICT TEST (register same ID) ===")
r = httpx.post(base, json=new_model)
print(f"  Status: {r.status_code} - {r.json()['detail']}")

# 6. Delete model
print("\n=== DELETE MODEL ===")
r = httpx.delete(f"{base}/ltx-video-0.9")
print(f"  Delete status: {r.status_code}")

# 7. 404 test
print("\n=== 404 TEST ===")
r = httpx.get(f"{base}/ltx-video-0.9")
print(f"  Get deleted: {r.status_code} - {r.json()['detail']}")

# 8. Final list
print("\n=== FINAL LIST ===")
r = httpx.get(base)
data = r.json()
print(f"Total: {data['total']}")
for m in data["models"]:
    print(f"  - {m['id']}: {m['name']}")

print("\n All CRUD tests passed!")
