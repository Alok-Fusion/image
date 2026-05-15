import type { ImageRecord } from "../lib/types";

type ImageGalleryProps = {
  images: ImageRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function ImageGallery({ images, selectedId, onSelect }: ImageGalleryProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-glow backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-white">Image Library</p>
          <p className="text-sm text-mist/75">{images.length} records from Supabase</p>
        </div>
      </div>

      <div className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1">
        {images.map((image) => {
          const active = image.id === selectedId;
          const detectionCount = image.detections.items.length;

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => onSelect(image.id)}
              className={`grid grid-cols-[88px_1fr] gap-3 rounded-3xl border p-3 text-left transition ${
                active
                  ? "border-signal/60 bg-signal/10"
                  : "border-white/10 bg-ink/40 hover:border-white/20 hover:bg-white/5"
              }`}
            >
              <img
                src={image.url}
                alt="Generated or uploaded"
                className="h-24 w-full rounded-2xl object-cover"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-white">
                  {image.detections.prompt ?? image.detections.original_filename ?? "Vision result"}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.28em] text-mist/55">
                  {image.detections.source ?? "stored"}
                </p>
                <p className="mt-3 text-sm text-mist/80">
                  {detectionCount} detection{detectionCount === 1 ? "" : "s"}
                </p>
              </div>
            </button>
          );
        })}

        {images.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-mist/70">
            Generate or upload an image to start building the hover map.
          </div>
        ) : null}
      </div>
    </section>
  );
}

