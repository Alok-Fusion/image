# AI Vision Hub

AI Vision Hub is a local-first full-stack application for:

- generating images on the machine with Stable Diffusion v1.5
- detecting objects inside generated or uploaded images
- storing image metadata in Supabase
- inspecting detections interactively through a hover-based visual stage

The project is designed for a Windows development workflow, Python virtual environments, and CPU-oriented inference on modest hardware such as an i5 10th Gen system with 16 GB RAM.

## Core Features

- FastAPI backend with a singleton AI engine
- Stable Diffusion v1.5 image generation through `diffusers`
- Standard YOLO detection through `ultralytics`
- Open-vocabulary detection through `YOLOWorld`
- Built-in object vocabulary expanded to 600+ labels
- Supabase Storage integration for image files
- Supabase PostgreSQL integration for image metadata
- React + Tailwind frontend
- Interactive hover overlay with bounding boxes, focused preview, and contextual object information
- Local cache directories for Hugging Face and Ultralytics assets

## Current Detection Capability

The project currently ships with:

- `yolov8n.pt` for closed-set YOLO detection
- `yolov8s-worldv2.pt` for open-vocabulary detection
- `621` built-in open-vocabulary object labels grouped across multiple detection passes

Important note:
The app can search across 600+ object names, but no CPU-friendly detector can guarantee perfect recognition of every object in every image. Small objects, occluded objects, low-contrast regions, or unusual viewpoints may still be missed.

## Technology Stack

### Backend

- Python 3.10
- FastAPI
- Uvicorn
- Diffusers
- Transformers
- PyTorch
- Ultralytics
- Pillow
- NumPy
- Supabase Python client
- python-dotenv

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS

### Data and Storage

- Supabase Storage bucket: `images`
- Supabase PostgreSQL table: `images_metadata`

## Project Structure

```text
image_hover/
  .env.example
  README.md
  requirements.txt
  backend/
    .env
    __init__.py
    ai_engine.py
    config.py
    database.py
    main.py
    object_vocabulary.py
    generated_images/
  frontend/
    .env
    package.json
    src/
      App.tsx
      index.css
      main.tsx
      components/
        GenerationPanel.tsx
        ImageGallery.tsx
        ImageStage.tsx
      lib/
        api.ts
        types.ts
  supabase/
    schema.sql
```

## How the System Works

### Generation Flow

1. The user enters a prompt in the frontend.
2. The frontend sends a request to `POST /generate`.
3. The backend generates an image locally with Stable Diffusion.
4. The backend runs object detection on the generated image.
5. The backend uploads the image to Supabase Storage.
6. The backend saves the image URL and detections JSON into `images_metadata`.
7. The frontend displays the stored record and renders interactive overlays.

### Upload Flow

1. The user uploads an image from the frontend.
2. The frontend sends the image to `POST /upload`.
3. The backend opens the image with Pillow.
4. The backend runs standard YOLO plus grouped `YOLOWorld` detection.
5. The backend uploads the original file to Supabase Storage.
6. The backend stores the metadata record in PostgreSQL.
7. The frontend shows the image in the interactive stage.

### Hover Inspection Flow

1. The frontend fetches detections from the stored record.
2. The image is rendered inside a container.
3. An SVG overlay is rendered above the displayed image.
4. YOLO coordinates are scaled to match the displayed image size.
5. Hovering a detection highlights only the hovered region.
6. The rest of the image is dimmed.
7. A focused preview and object details are shown alongside the image.

## Bounding Box Scaling Formula

The frontend uses the required scaling logic:

```text
scaleX = displayedWidth / originalWidth
scaleY = displayedHeight / originalHeight
```

Each detection is projected from original image coordinates into display coordinates:

```text
displayX = x1 * scaleX
displayY = y1 * scaleY
displayWidth = (x2 - x1) * scaleX
displayHeight = (y2 - y1) * scaleY
```

This logic is implemented in [frontend/src/components/ImageStage.tsx](/c:/Users/ak500/OneDrive/Desktop/IT/image_hover/frontend/src/components/ImageStage.tsx:1).

## Backend Architecture

### `backend/main.py`

Main FastAPI application entrypoint.

Responsibilities:

- create the FastAPI app
- initialize lifespan startup behavior
- expose API routes
- validate upload and generate requests
- orchestrate generation, detection, storage, and persistence

### `backend/ai_engine.py`

Central AI runtime.

Responsibilities:

- load Stable Diffusion once
- load YOLO once
- load YOLOWorld once
- generate images
- run standard detection
- run grouped open-vocabulary detection
- merge overlapping detections

### `backend/config.py`

Configuration loader.

Responsibilities:

- load `.env` values
- support root `.env` and `backend/.env`
- define runtime settings
- register local cache directories
- provide default detection thresholds and label lists

### `backend/database.py`

Supabase data access layer.

Responsibilities:

- create the Supabase client
- upload image bytes to storage
- insert metadata records
- fetch saved image records

### `backend/object_vocabulary.py`

Large built-in label library for open-vocabulary search.

Responsibilities:

- organize object names into grouped detection passes
- keep configuration cleaner
- support broad coverage without hardcoding all labels inside `config.py`

## Frontend Architecture

### `frontend/src/App.tsx`

Top-level application state.

Responsibilities:

- fetch image history
- manage prompt and object hints
- handle uploads and generation requests
- control selected image state

### `frontend/src/components/GenerationPanel.tsx`

Prompt and upload controls.

Responsibilities:

- collect prompt text
- collect object hint labels
- show loading status
- trigger generation and upload actions

### `frontend/src/components/ImageGallery.tsx`

Stored image list.

Responsibilities:

- render saved image records
- show source metadata
- allow selecting the active image

### `frontend/src/components/ImageStage.tsx`

Interactive inspection stage.

Responsibilities:

- calculate display scaling
- render SVG overlays
- highlight hovered objects
- dim non-focused areas
- show context preview
- show detection coordinates and metadata

### `frontend/src/lib/api.ts`

API wrapper for:

- `GET /images`
- `POST /generate`
- `POST /upload`

## Environment Configuration

### Backend env locations

The backend supports both of these:

- [`/.env`](</c:/Users/ak500/OneDrive/Desktop/IT/image_hover/.env>)
- [`backend/.env`](</c:/Users/ak500/OneDrive/Desktop/IT/image_hover/backend/.env>)

The backend currently loads root `.env` first and then `backend/.env`.

### Frontend env location

- [`frontend/.env`](</c:/Users/ak500/OneDrive/Desktop/IT/image_hover/frontend/.env>)

### Backend variables

Use [`.env.example`](/c:/Users/ak500/OneDrive/Desktop/IT/image_hover/.env.example:1) as the template.

Important variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_BUCKET`
- `SD_MODEL_ID`
- `YOLO_MODEL_PATH`
- `YOLO_WORLD_MODEL_PATH`
- `CORS_ORIGINS`
- `DIFFUSION_STEPS`
- `GUIDANCE_SCALE`
- `DETECTION_CONFIDENCE`
- `WORLD_DETECTION_CONFIDENCE`
- `WORLD_CANDIDATE_LABELS`

### Frontend variables

Use [frontend/.env.example](/c:/Users/ak500/OneDrive/Desktop/IT/image_hover/frontend/.env.example:1).

Important variable:

- `VITE_API_URL`

## Database Setup

Run [supabase/schema.sql](/c:/Users/ak500/OneDrive/Desktop/IT/image_hover/supabase/schema.sql:1) in the Supabase SQL editor.

Schema:

- table: `images_metadata`
- columns:
  - `id uuid primary key default gen_random_uuid()`
  - `url text not null`
  - `detections jsonb not null`

Also create a public Supabase Storage bucket named `images`.

## Setup Instructions

### 1. Create the virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

All Python backend work should run through `.venv`.

### 2. Install frontend dependencies

```powershell
cd frontend
npm install
```

### 3. Configure env files

- copy `.env.example` to `.env` or `backend/.env`
- copy `frontend/.env.example` to `frontend/.env`

### 4. Start the backend

Preferred:

```powershell
.\.venv\Scripts\python -m uvicorn backend.main:app --reload
```

Alternative:

```powershell
cd backend
..\ .venv\Scripts\python.exe main.py
```

If you use the alternative command, remove the extra space after `..`:

```powershell
..\ .venv\Scripts\python.exe main.py
```

Correct Windows form:

```powershell
..\.venv\Scripts\python.exe main.py
```

### 5. Start the frontend

```powershell
cd frontend
npm run dev
```

## API Reference

### `GET /health`

Returns a basic health response.

Example response:

```json
{
  "status": "ok"
}
```

### `GET /images`

Returns all saved metadata records from Supabase.

### `POST /generate`

Generates an image locally from a prompt, runs detection, uploads the image, stores metadata, and returns the saved record.

Request body:

```json
{
  "prompt": "A bright office desk with a monitor, chair, lamp, books, and a plant",
  "candidate_labels": ["monitor", "chair", "lamp", "plant", "book"]
}
```

### `POST /upload`

Uploads an image file, runs detection, stores metadata, and returns the saved record.

Multipart fields:

- `file`
- `candidate_labels`

## Performance Notes

This project is intentionally optimized for CPU usage rather than GPU requirements.

Current optimizations:

- Stable Diffusion pinned to CPU
- attention slicing enabled
- `DPMSolverMultistepScheduler` enabled
- `torch.no_grad()` used during inference
- singleton model loading
- local cache directories for repeated startup runs

Expected tradeoffs:

- generation may take 1 to 3 minutes on CPU
- detection becomes slower as vocabulary size increases
- open-vocabulary grouped passes are more flexible but slower than closed-set YOLO only

## Troubleshooting

### Backend starts but nothing happens

Running `python main.py` without a proper server runner used to only import the file. The backend now includes a `__main__` runner, but `uvicorn backend.main:app --reload` is still the preferred workflow.

### Only some objects are detected

Possible reasons:

- the object is outside the model vocabulary
- the object is too small
- the object is partially hidden
- the confidence threshold is too high
- the scene is visually ambiguous

Try:

- lowering `WORLD_DETECTION_CONFIDENCE`
- re-uploading the image
- adding candidate labels in the frontend
- using a clearer or higher-resolution image

### Old images do not show new detections

Previously stored records keep the old detection JSON. Re-upload the image or create a new generated image to see updated results.

### Ultralytics tries to write outside the workspace

This project redirects Ultralytics configuration into the local `.cache` folder. If you still see cache-related issues, ensure the backend is started from the project workspace and that `.cache/ultralytics` is writable.

### Frontend shows no data

Check:

- backend is running
- `frontend/.env` has the correct `VITE_API_URL`
- Supabase credentials are valid
- browser console does not show failed API requests

## Known Limitations

- detection is broad, not exhaustive
- CPU inference is slower than GPU inference
- broad open-vocabulary search can increase false positives
- generated images may contain surreal or stylized objects that are harder to detect cleanly
- existing saved detections are not retroactively reprocessed

## Recommended Git Workflow

```powershell
git status
git add .
git commit -m "Add AI Vision Hub documentation"
```

If you want a cleaner history, commit logical changes separately:

- backend model changes
- frontend interaction changes
- documentation changes

## Additional Documentation

For a deeper text-based engineering document, see [PROJECT_DOCUMENTATION.txt](/c:/Users/ak500/OneDrive/Desktop/IT/image_hover/PROJECT_DOCUMENTATION.txt:1).

"# image" 
