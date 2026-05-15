from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

try:
    from .object_vocabulary import DEFAULT_WORLD_LABEL_GROUPS
except ImportError:
    from object_vocabulary import DEFAULT_WORLD_LABEL_GROUPS

ROOT_DIR = Path(__file__).resolve().parent.parent
LOCAL_CACHE_DIR = ROOT_DIR / ".cache"
HUGGINGFACE_CACHE_DIR = LOCAL_CACHE_DIR / "huggingface"
ULTRALYTICS_CONFIG_DIR = LOCAL_CACHE_DIR / "ultralytics"

load_dotenv(ROOT_DIR / ".env")
load_dotenv(ROOT_DIR / "backend" / ".env")

os.environ.setdefault("HF_HOME", str(HUGGINGFACE_CACHE_DIR))
os.environ.setdefault("TRANSFORMERS_CACHE", str(HUGGINGFACE_CACHE_DIR))
os.environ.setdefault("YOLO_CONFIG_DIR", str(ULTRALYTICS_CONFIG_DIR))


def _parse_origins(value: str) -> tuple[str, ...]:
    origins = [origin.strip() for origin in value.split(",") if origin.strip()]
    return tuple(origins or ["http://127.0.0.1:5173", "http://localhost:5173"])


def _parse_labels(value: str) -> tuple[str, ...]:
    labels = []
    seen: set[str] = set()

    for raw_label in value.replace("\n", ",").split(","):
        label = raw_label.strip()
        normalized = label.casefold()
        if label and normalized not in seen:
            labels.append(label)
            seen.add(normalized)

    if labels:
        return tuple(labels)

    return (
        "book",
        "notebook",
        "paper",
        "document",
        "cell phone",
        "phone",
        "lamp",
        "desk lamp",
        "table lamp",
        "desk",
        "table",
        "chair",
        "pen",
        "pencil",
        "mug",
        "cup",
        "bottle",
        "laptop",
        "keyboard",
        "mouse",
        "monitor",
        "bag",
    )


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    supabase_service_key: str
    supabase_bucket: str
    sd_model_id: str
    yolo_model_path: str
    yolo_world_model_path: str
    cors_origins: tuple[str, ...]
    diffusion_steps: int
    guidance_scale: float
    detection_confidence: float
    world_detection_confidence: float
    world_candidate_labels: tuple[str, ...]
    world_default_label_groups: tuple[tuple[str, ...], ...]
    generated_dir: Path
    huggingface_cache_dir: Path
    ultralytics_config_dir: Path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings(
        supabase_url=os.getenv("SUPABASE_URL", ""),
        supabase_service_key=os.getenv("SUPABASE_SERVICE_KEY", ""),
        supabase_bucket=os.getenv("SUPABASE_BUCKET", "images"),
        sd_model_id=os.getenv("SD_MODEL_ID", "runwayml/stable-diffusion-v1-5"),
        yolo_model_path=os.getenv("YOLO_MODEL_PATH", "yolov8n.pt"),
        yolo_world_model_path=os.getenv("YOLO_WORLD_MODEL_PATH", "yolov8s-worldv2.pt"),
        cors_origins=_parse_origins(os.getenv("CORS_ORIGINS", "")),
        diffusion_steps=int(os.getenv("DIFFUSION_STEPS", "25")),
        guidance_scale=float(os.getenv("GUIDANCE_SCALE", "7.5")),
        detection_confidence=float(os.getenv("DETECTION_CONFIDENCE", "0.25")),
        world_detection_confidence=float(os.getenv("WORLD_DETECTION_CONFIDENCE", "0.14")),
        world_candidate_labels=_parse_labels(os.getenv("WORLD_CANDIDATE_LABELS", "")),
        world_default_label_groups=DEFAULT_WORLD_LABEL_GROUPS,
        generated_dir=ROOT_DIR / "backend" / "generated_images",
        huggingface_cache_dir=HUGGINGFACE_CACHE_DIR,
        ultralytics_config_dir=ULTRALYTICS_CONFIG_DIR,
    )
