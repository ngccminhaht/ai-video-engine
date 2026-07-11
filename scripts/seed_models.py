"""Seed script: register sample models into the database."""

import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select

from core.database import async_session_factory, engine, Base
from core.model_registry.models import AIModel
from core.job_queue.models import Job  # noqa: F401

SEED_MODELS = [
    {
        "id": "cogvideox-5b",
        "name": "CogVideoX-5B",
        "version": "1.0",
        "description": "Text-to-video and Image-to-video model from Tsinghua (THUDM). "
        "Good quality, moderate speed, supports quantization.",
        "source": "https://huggingface.co/THUDM/CogVideoX-5b",
        "adapter_name": "cogvideo",
        "capabilities": ["text_to_video", "image_to_video"],
        "minimum_vram_gb": 12,
        "recommended_vram_gb": 18,
        "supports_quantization": True,
        "supports_cpu_offload": True,
        "supports_lora": True,
        "max_resolution_width": 720,
        "max_resolution_height": 480,
        "max_duration_seconds": 6,
        "max_fps": 8,
        "status": "available",
    },
    {
        "id": "wan2.1-t2v-1.3b",
        "name": "Wan 2.1 Text-to-Video 1.3B",
        "version": "2.1",
        "description": "Lightweight text-to-video model from Alibaba (Wan-AI). "
        "Fast inference, low VRAM, good for testing.",
        "source": "https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B",
        "adapter_name": "wan",
        "capabilities": ["text_to_video"],
        "minimum_vram_gb": 6,
        "recommended_vram_gb": 8,
        "supports_quantization": True,
        "supports_cpu_offload": True,
        "supports_lora": False,
        "max_resolution_width": 1280,
        "max_resolution_height": 720,
        "max_duration_seconds": 5,
        "max_fps": 16,
        "status": "available",
    },
]


async def seed():
    """Insert seed models if they don't exist."""
    async with async_session_factory() as session:
        for model_data in SEED_MODELS:
            existing = await session.get(AIModel, model_data["id"])
            if existing:
                print(f"  [skip] Model '{model_data['id']}' already exists")
                continue

            model = AIModel(**model_data)
            session.add(model)
            print(f"  [add]  Model '{model_data['id']}' registered")

        await session.commit()
    print("\nSeed complete!")


async def main():
    print("Seeding models...\n")
    await seed()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
