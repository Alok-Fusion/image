from __future__ import annotations

from threading import Lock
from typing import Any

from supabase import Client, create_client

try:
    from .config import get_settings
except ImportError:
    from config import get_settings


class SupabaseRepository:
    _instance: "SupabaseRepository | None" = None
    _instance_lock = Lock()

    def __new__(cls) -> "SupabaseRepository":
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return

        self._initialized = True
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        if self._client is None:
            settings = get_settings()
            if not settings.supabase_url or not settings.supabase_service_key:
                raise RuntimeError(
                    "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_KEY."
                )

            self._client = create_client(settings.supabase_url, settings.supabase_service_key)

        return self._client

    def upload_image_bytes(
        self,
        *,
        file_bytes: bytes,
        destination_path: str,
        content_type: str,
    ) -> str:
        settings = get_settings()
        bucket = self.client.storage.from_(settings.supabase_bucket)
        bucket.upload(
            path=destination_path,
            file=file_bytes,
            file_options={
                "content-type": content_type,
                "cache-control": "3600",
                "upsert": "true",
            },
        )
        return bucket.get_public_url(destination_path)

    def save_image_metadata(self, *, url: str, detections: dict[str, Any]) -> dict[str, Any]:
        response = (
            self.client.table("images_metadata")
            .insert({"url": url, "detections": detections})
            .execute()
        )
        if not response.data:
            raise RuntimeError("Supabase did not return the inserted image metadata.")
        return response.data[0]

    def list_images(self) -> list[dict[str, Any]]:
        response = self.client.table("images_metadata").select("*").execute()
        return response.data or []
