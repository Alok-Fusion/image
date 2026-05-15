from __future__ import annotations

from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError

try:
    from .ai_engine import AIEngine
    from .config import get_settings
    from .database import SupabaseRepository
except ImportError:
    from ai_engine import AIEngine
    from config import get_settings
    from database import SupabaseRepository

settings = get_settings()
engine = AIEngine()
repository = SupabaseRepository()


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    settings.huggingface_cache_dir.mkdir(parents=True, exist_ok=True)
    settings.ultralytics_config_dir.mkdir(parents=True, exist_ok=True)
    repository.client
    engine.load_models()
    yield


app = FastAPI(title="AI Vision Hub", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=400)
    candidate_labels: list[str] = Field(default_factory=list)


class ImageRecord(BaseModel):
    id: str
    url: str
    detections: dict


def _image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _save_local_copy(image: Image.Image, filename: str) -> Path:
    settings.generated_dir.mkdir(parents=True, exist_ok=True)
    destination = settings.generated_dir / filename
    image.save(destination, format="PNG")
    return destination


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/images", response_model=list[ImageRecord])
def get_images() -> list[dict]:
    try:
        return repository.list_images()
    except Exception as exc:  # pragma: no cover - external service failure
        raise HTTPException(status_code=500, detail=f"Failed to fetch images: {exc}") from exc


@app.post("/generate", response_model=ImageRecord)
def generate_image(payload: GenerateRequest) -> dict:
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    try:
        image = engine.generate_image(prompt)
        detections = engine.detect_objects(image, candidate_labels=payload.candidate_labels)
        detections["source"] = "generated"
        detections["prompt"] = prompt

        image_id = uuid4().hex
        filename = f"{image_id}.png"
        _save_local_copy(image, filename)

        public_url = repository.upload_image_bytes(
            file_bytes=_image_to_png_bytes(image),
            destination_path=f"generated/{filename}",
            content_type="image/png",
        )
        return repository.save_image_metadata(url=public_url, detections=detections)
    except Exception as exc:  # pragma: no cover - model and network failures
        raise HTTPException(status_code=500, detail=f"Image generation failed: {exc}") from exc


@app.post("/upload", response_model=ImageRecord)
async def upload_image(
    file: UploadFile = File(...),
    candidate_labels: str = "",
) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        image = Image.open(BytesIO(file_bytes)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="The uploaded file is not a valid image.") from exc

    suffix = Path(file.filename or "upload.png").suffix or ".png"
    storage_name = f"{uuid4().hex}{suffix.lower()}"
    parsed_candidate_labels = [label.strip() for label in candidate_labels.split(",") if label.strip()]

    try:
        detections = engine.detect_objects(image, candidate_labels=parsed_candidate_labels)
        detections["source"] = "upload"
        detections["original_filename"] = file.filename

        public_url = repository.upload_image_bytes(
            file_bytes=file_bytes,
            destination_path=f"uploads/{storage_name}",
            content_type=file.content_type,
        )
        return repository.save_image_metadata(url=public_url, detections=detections)
    except Exception as exc:  # pragma: no cover - model and network failures
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}") from exc


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
