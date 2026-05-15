from __future__ import annotations

import gc
from threading import Lock
from typing import Any

import numpy as np
import torch
from diffusers import DPMSolverMultistepScheduler, StableDiffusionPipeline
from PIL import Image

try:
    from .config import get_settings
except ImportError:
    from config import get_settings
from ultralytics import YOLO, YOLOWorld


class AIEngine:
    _instance: "AIEngine | None" = None
    _instance_lock = Lock()

    def __new__(cls) -> "AIEngine":
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return

        self._initialized = True
        self._models_ready = False
        self._load_lock = Lock()
        self.diffusion_pipe: StableDiffusionPipeline | None = None
        self.detector: YOLO | None = None
        self.world_detector: YOLOWorld | None = None

    def load_models(self) -> None:
        if self._models_ready:
            return

        settings = get_settings()

        with self._load_lock:
            if self._models_ready:
                return

            if self.diffusion_pipe is None:
                pipe = StableDiffusionPipeline.from_pretrained(
                    settings.sd_model_id,
                    torch_dtype=torch.float32,
                    safety_checker=None,
                    requires_safety_checker=False,
                )
                pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
                pipe.enable_attention_slicing()
                pipe.to("cpu")
                self.diffusion_pipe = pipe

            if self.detector is None:
                self.detector = YOLO(settings.yolo_model_path)

            if self.world_detector is None:
                self.world_detector = YOLOWorld(settings.yolo_world_model_path)

            self._models_ready = True

    def generate_image(self, prompt: str) -> Image.Image:
        self.load_models()
        settings = get_settings()

        if self.diffusion_pipe is None:
            raise RuntimeError("Stable Diffusion pipeline is not available.")

        with torch.no_grad():
            result = self.diffusion_pipe(
                prompt=prompt,
                num_inference_steps=settings.diffusion_steps,
                guidance_scale=settings.guidance_scale,
            )

        image = result.images[0].convert("RGB")
        gc.collect()
        return image

    def _run_standard_detection(self, source: np.ndarray, confidence: float) -> list[dict[str, Any]]:
        if self.detector is None:
            return []

        results = self.detector.predict(
            source=source,
            conf=confidence,
            device="cpu",
            verbose=False,
        )
        return self._serialize_predictions(results, detector_name="yolo")

    def _run_world_detection(
        self,
        source: np.ndarray,
        *,
        confidence: float,
        candidate_labels: tuple[str, ...],
    ) -> list[dict[str, Any]]:
        if self.world_detector is None or not candidate_labels:
            return []

        self.world_detector.set_classes(list(candidate_labels))
        results = self.world_detector.predict(
            source=source,
            conf=confidence,
            device="cpu",
            verbose=False,
        )
        return self._serialize_predictions(results, detector_name="yolo-world")

    def _build_world_label_groups(
        self,
        *,
        base_groups: tuple[tuple[str, ...], ...],
        default_labels: tuple[str, ...],
        candidate_labels: list[str] | tuple[str, ...] | None,
    ) -> list[tuple[str, ...]]:
        groups: list[tuple[str, ...]] = []
        seen_groups: set[tuple[str, ...]] = set()

        def add_group(labels: list[str] | tuple[str, ...]) -> None:
            ordered: list[str] = []
            seen_labels: set[str] = set()
            for raw_label in labels:
                label = raw_label.strip()
                normalized = self._normalize_label(label)
                if label and normalized not in seen_labels:
                    ordered.append(label)
                    seen_labels.add(normalized)

            if not ordered:
                return

            group = tuple(ordered)
            if group not in seen_groups:
                groups.append(group)
                seen_groups.add(group)

        priority_labels = list(candidate_labels or [])
        priority_labels.extend(default_labels)
        add_group(priority_labels)

        for group in base_groups:
            add_group(group)

        return groups

    def _serialize_predictions(self, results: Any, *, detector_name: str) -> list[dict[str, Any]]:
        detections: list[dict[str, Any]] = []
        if not results:
            return detections

        result = results[0]
        class_names = result.names

        for index, box in enumerate(result.boxes):
            class_index = int(box.cls.item())
            label = (
                class_names.get(class_index, str(class_index))
                if isinstance(class_names, dict)
                else class_names[class_index]
            )
            x1, y1, x2, y2 = [round(float(value), 2) for value in box.xyxy[0].tolist()]

            detections.append(
                {
                    "id": index,
                    "label": str(label),
                    "confidence": round(float(box.conf.item()), 4),
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2,
                    "detector": detector_name,
                }
            )

        return detections

    @staticmethod
    def _normalize_label(label: str) -> str:
        return " ".join(label.lower().split())

    @staticmethod
    def _intersection_over_union(first: dict[str, Any], second: dict[str, Any]) -> float:
        left = max(first["x1"], second["x1"])
        top = max(first["y1"], second["y1"])
        right = min(first["x2"], second["x2"])
        bottom = min(first["y2"], second["y2"])

        width = max(0.0, right - left)
        height = max(0.0, bottom - top)
        intersection = width * height

        first_area = max(0.0, first["x2"] - first["x1"]) * max(0.0, first["y2"] - first["y1"])
        second_area = max(0.0, second["x2"] - second["x1"]) * max(0.0, second["y2"] - second["y1"])
        union = first_area + second_area - intersection

        if union <= 0:
            return 0.0

        return intersection / union

    def _merge_detections(self, groups: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []

        for detection_group in groups:
            for detection in detection_group:
                keep_detection = True
                for existing in merged:
                    same_label = self._normalize_label(existing["label"]) == self._normalize_label(
                        detection["label"]
                    )
                    overlap = self._intersection_over_union(existing, detection)
                    if same_label and overlap >= 0.4:
                        if detection["confidence"] > existing["confidence"]:
                            existing.update(detection)
                        keep_detection = False
                        break

                if keep_detection:
                    merged.append(detection.copy())

        merged.sort(key=lambda item: item["confidence"], reverse=True)
        for index, detection in enumerate(merged):
            detection["id"] = index

        return merged

    @staticmethod
    def _labels_are_similar(first_label: str, second_label: str) -> bool:
        first = " ".join(first_label.lower().split())
        second = " ".join(second_label.lower().split())
        return first == second or first in second or second in first

    def detect_objects(
        self,
        image: Image.Image,
        *,
        candidate_labels: list[str] | tuple[str, ...] | None = None,
    ) -> dict[str, Any]:
        self.load_models()
        settings = get_settings()

        if self.detector is None and self.world_detector is None:
            raise RuntimeError("No detector is available.")

        rgb_image = image.convert("RGB")
        source = np.array(rgb_image)
        merged_labels = list(settings.world_candidate_labels)
        seen_merged_labels = {label.casefold() for label in merged_labels}
        if candidate_labels:
            for label in candidate_labels:
                cleaned = label.strip()
                if cleaned and cleaned.casefold() not in seen_merged_labels:
                    merged_labels.append(cleaned)
                    seen_merged_labels.add(cleaned.casefold())

        world_label_groups = self._build_world_label_groups(
            base_groups=settings.world_default_label_groups,
            default_labels=settings.world_candidate_labels,
            candidate_labels=candidate_labels,
        )

        with torch.no_grad():
            standard_detections = self._run_standard_detection(source, settings.detection_confidence)
            world_detection_groups = [
                self._run_world_detection(
                    source,
                    confidence=settings.world_detection_confidence,
                    candidate_labels=label_group,
                )
                for label_group in world_label_groups
            ]

        detections = self._merge_detections([standard_detections, *world_detection_groups])

        final_detections: list[dict[str, Any]] = []
        for detection in detections:
            should_keep = True
            for existing in final_detections:
                overlap = self._intersection_over_union(existing, detection)
                if overlap >= 0.72 and self._labels_are_similar(existing["label"], detection["label"]):
                    if detection["confidence"] > existing["confidence"]:
                        existing.update(detection)
                    should_keep = False
                    break

            if should_keep:
                final_detections.append(detection)

        final_detections.sort(key=lambda item: item["confidence"], reverse=True)
        for index, detection in enumerate(final_detections):
            detection["id"] = index

        gc.collect()
        return {
            "original_width": rgb_image.width,
            "original_height": rgb_image.height,
            "items": final_detections,
            "candidate_labels": merged_labels,
            "world_label_groups": [list(group) for group in world_label_groups],
        }
