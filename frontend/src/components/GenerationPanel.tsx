type GenerationPanelProps = {
  prompt: string;
  objectHints: string;
  setPrompt: (value: string) => void;
  setObjectHints: (value: string) => void;
  onGenerate: () => Promise<void>;
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
};

export function GenerationPanel({
  prompt,
  objectHints,
  setPrompt,
  setObjectHints,
  onGenerate,
  onUpload,
  loading,
}: GenerationPanelProps) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-xl font-semibold text-white">Generate or Inspect</p>
          <p className="mt-1 text-sm text-mist/75">
            Stable Diffusion runs locally on CPU, so generation usually takes 1 to 3 minutes.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 rounded-full border border-signal/30 bg-signal/10 px-4 py-2 text-sm text-signal">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-signal/30 border-t-signal" />
            Working
          </div>
        ) : null}
      </div>

      <label className="mt-6 block">
        <span className="mb-2 block text-sm font-medium text-mist">Prompt</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
          placeholder="A cinematic marketplace with bicycles, fruit stalls, and pedestrians"
          className="w-full rounded-3xl border border-white/10 bg-ink/70 px-4 py-3 font-body text-sm text-white outline-none transition focus:border-signal/50 focus:ring-2 focus:ring-signal/20"
        />
      </label>

      <label className="mt-4 block">
        <span className="mb-2 block text-sm font-medium text-mist">Object Hints</span>
        <textarea
          value={objectHints}
          onChange={(event) => setObjectHints(event.target.value)}
          rows={3}
          placeholder="lamp, desk, phone, paper, notebook"
          className="w-full rounded-3xl border border-white/10 bg-ink/70 px-4 py-3 font-body text-sm text-white outline-none transition focus:border-signal/50 focus:ring-2 focus:ring-signal/20"
        />
        <p className="mt-2 text-xs text-mist/65">
          Use comma-separated labels to help the open-vocabulary detector find more objects.
        </p>
      </label>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => void onGenerate()}
          disabled={loading}
          className="rounded-full bg-flare px-5 py-3 font-display text-sm font-semibold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate Image
        </button>

        <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:border-signal/40 hover:bg-white/10">
          Upload Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={loading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void onUpload(file);
                event.target.value = "";
              }
            }}
          />
        </label>
      </div>
    </section>
  );
}
