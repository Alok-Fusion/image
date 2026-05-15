import { startTransition, useEffect, useState } from "react";
import { GenerationPanel } from "./components/GenerationPanel";
import { ImageGallery } from "./components/ImageGallery";
import { ImageStage } from "./components/ImageStage";
import { fetchImages, generateImage, uploadImage } from "./lib/api";
import type { ImageRecord } from "./lib/types";

export default function App() {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("A sunlit street with bicycles, food carts, and people walking");
  const [objectHints, setObjectHints] = useState("lamp, desk, phone, paper, notebook");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseCandidateLabels(value: string) {
    return value
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean);
  }

  useEffect(() => {
    void loadImages();
  }, []);

  async function loadImages() {
    try {
      const records = await fetchImages();
      startTransition(() => {
        setImages(records);
        if (records.length > 0) {
          setSelectedId((current) => current ?? records[0].id);
        }
      });
      setError(null);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to load saved images.";
      setError(message);
    }
  }

  async function handleGenerate() {
    if (!prompt.trim()) {
      setError("Please enter a prompt before generating.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const record = await generateImage(prompt.trim(), parseCandidateLabels(objectHints));
      startTransition(() => {
        setImages((current) => [record, ...current]);
        setSelectedId(record.id);
      });
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Image generation failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);

    try {
      const record = await uploadImage(file, parseCandidateLabels(objectHints));
      startTransition(() => {
        setImages((current) => [record, ...current]);
        setSelectedId(record.id);
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "Upload failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const selectedRecord = images.find((image) => image.id === selectedId) ?? null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-6 rounded-[36px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur sm:p-8">
          <p className="text-xs uppercase tracking-[0.4em] text-signal/80">AI Vision Hub</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
            <div>
              <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">
                Local image generation meets interactive object detection.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-mist/80">
                Generate with Stable Diffusion v1.5 on your machine, detect with YOLOv8, and
                inspect every detection through a scaled hover overlay.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-ink/45 p-5">
              <p className="font-display text-lg font-semibold text-white">Pipeline</p>
              <p className="mt-3 text-sm text-mist/75">
                <span className="text-flare">Prompt or upload</span> to FastAPI, then the backend
                runs local inference, stores the image in Supabase Storage, and saves the detection
                payload in PostgreSQL.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-3xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-white">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="grid gap-6">
            <GenerationPanel
              prompt={prompt}
              objectHints={objectHints}
              setPrompt={setPrompt}
              setObjectHints={setObjectHints}
              onGenerate={handleGenerate}
              onUpload={handleUpload}
              loading={loading}
            />
            <ImageGallery images={images} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          <ImageStage record={selectedRecord} />
        </div>
      </div>
    </main>
  );
}
