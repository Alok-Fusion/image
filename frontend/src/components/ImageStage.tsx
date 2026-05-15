import { useEffect, useRef, useState } from "react";
import type { ImageRecord } from "../lib/types";

type ImageStageProps = {
  record: ImageRecord | null;
};

type DisplayBox = {
  id: number;
  label: string;
  confidence: number;
  detector?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function ImageStage({ record }: ImageStageProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isInspecting, setIsInspecting] = useState(false);
  const [hoveredBoxId, setHoveredBoxId] = useState<number | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) {
      return;
    }

    const updateSize = () => {
      setDisplaySize({
        width: image.clientWidth,
        height: image.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(image);
    window.addEventListener("resize", updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [record?.url]);

  useEffect(() => {
    setHoveredBoxId(null);
    setIsInspecting(false);
  }, [record?.id]);

  const originalWidth = record?.detections.original_width ?? 1;
  const originalHeight = record?.detections.original_height ?? 1;
  const scaleX = displaySize.width / originalWidth;
  const scaleY = displaySize.height / originalHeight;

  const displayBoxes: DisplayBox[] =
    record?.detections.items.map((item) => ({
      id: item.id,
      label: item.label,
      confidence: item.confidence,
      detector: item.detector,
      x: item.x1 * scaleX,
      y: item.y1 * scaleY,
      width: (item.x2 - item.x1) * scaleX,
      height: (item.y2 - item.y1) * scaleY,
    })) ?? [];

  const hoveredBox = displayBoxes.find((box) => box.id === hoveredBoxId) ?? null;
  const hoveredItem = record?.detections.items.find((item) => item.id === hoveredBoxId) ?? null;

  const contextPadding = hoveredBox ? Math.max(18, Math.min(hoveredBox.width, hoveredBox.height) * 0.2) : 0;
  const focusX = hoveredBox ? clamp(hoveredBox.x - contextPadding, 0, Math.max(displaySize.width - 1, 0)) : 0;
  const focusY = hoveredBox ? clamp(hoveredBox.y - contextPadding, 0, Math.max(displaySize.height - 1, 0)) : 0;
  const focusWidth = hoveredBox
    ? clamp(hoveredBox.width + contextPadding * 2, 24, Math.max(displaySize.width - focusX, 24))
    : 0;
  const focusHeight = hoveredBox
    ? clamp(hoveredBox.height + contextPadding * 2, 24, Math.max(displaySize.height - focusY, 24))
    : 0;

  const previewWidth = hoveredBox ? 220 : 0;
  const previewHeight = hoveredBox ? clamp((focusHeight / Math.max(focusWidth, 1)) * previewWidth, 120, 220) : 0;

  const previewBackgroundSize =
    displaySize.width > 0 && displaySize.height > 0
      ? `${displaySize.width}px ${displaySize.height}px`
      : "cover";
  const previewBackgroundPosition = hoveredBox ? `-${focusX}px -${focusY}px` : "center";

  return (
    <section className="rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-glow backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-2xl font-semibold text-white">Interactive Vision Stage</p>
          <p className="mt-1 text-sm text-mist/75">
            Hover the image to inspect YOLO detections projected onto the displayed size.
          </p>
        </div>
        {record ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.32em] text-mist/70">
            {record.detections.items.length} Objects
          </div>
        ) : null}
      </div>

      {record ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="rounded-[28px] border border-white/10 bg-ink/40 p-4">
            <div
              className="relative overflow-hidden rounded-[24px]"
              onMouseEnter={() => setIsInspecting(true)}
              onMouseLeave={() => {
                setIsInspecting(false);
                setHoveredBoxId(null);
              }}
              >
                <img
                  ref={imageRef}
                src={record.url}
                alt="Selected record"
                className="block max-h-[70vh] w-full rounded-[24px] object-contain"
              />

              {isInspecting && hoveredBox ? (
                <>
                  <div className="pointer-events-none absolute inset-0 bg-ink/68 backdrop-blur-[1px]" />
                  <div
                    className="pointer-events-none absolute overflow-hidden rounded-[24px] border border-signal/40 shadow-[0_18px_60px_rgba(115,240,255,0.18)]"
                    style={{
                      left: focusX,
                      top: focusY,
                      width: focusWidth,
                      height: focusHeight,
                      backgroundImage: `url(${record.url})`,
                      backgroundSize: `${displaySize.width}px ${displaySize.height}px`,
                      backgroundPosition: `-${focusX}px -${focusY}px`,
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/18 to-transparent" />
                  </div>
                </>
              ) : null}

              <svg
                className="pointer-events-auto absolute left-0 top-0 h-full w-full"
                width={displaySize.width}
                height={displaySize.height}
                viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
              >
                {isInspecting
                  ? displayBoxes.map((box) => {
                      const active = box.id === hoveredBoxId;
                      return (
                        <g
                          key={box.id}
                          onMouseEnter={() => setHoveredBoxId(box.id)}
                          onMouseLeave={() => setHoveredBoxId(null)}
                        >
                          <rect
                            x={box.x}
                            y={box.y}
                            width={box.width}
                            height={box.height}
                            rx={14}
                            fill={active ? "rgba(115, 240, 255, 0.18)" : "rgba(255, 184, 77, 0.04)"}
                            stroke={active ? "#73f0ff" : "rgba(255, 184, 77, 0.42)"}
                            strokeWidth={active ? 3 : 2}
                          />
                          {active ? (
                            <>
                              <rect
                                x={Math.max(box.x, 10)}
                                y={Math.max(box.y - 34, 10)}
                                width={Math.min(Math.max(box.label.length * 8 + 82, 120), Math.max(displaySize.width - box.x - 10, 120))}
                                height={28}
                                rx={14}
                                fill="rgba(9, 17, 26, 0.92)"
                                stroke="rgba(115, 240, 255, 0.35)"
                              />
                              <text
                                x={Math.max(box.x + 12, 22)}
                                y={Math.max(box.y - 16, 28)}
                                fill="#ffffff"
                                fontSize="12"
                                fontFamily="IBM Plex Sans, sans-serif"
                              >
                                {`${box.label} • ${(box.confidence * 100).toFixed(1)}%`}
                              </text>
                            </>
                          ) : null}
                        </g>
                      );
                    })
                  : null}
              </svg>

              {isInspecting && hoveredBox ? (
                <div
                  className="pointer-events-none absolute z-10 min-w-44 rounded-2xl border border-signal/30 bg-ink/92 px-3 py-3 text-sm text-white shadow-2xl"
                  style={{
                    left: Math.min(
                      hoveredBox.x + hoveredBox.width + 14,
                      Math.max(displaySize.width - 220, 12),
                    ),
                    top: Math.max(hoveredBox.y, 12),
                  }}
                >
                  <p className="font-display text-sm font-semibold">{hoveredBox.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.28em] text-signal/80">
                    {(hoveredBox.confidence * 100).toFixed(1)}% confidence
                  </p>
                  {hoveredItem?.detector ? (
                    <p className="mt-2 text-xs text-mist/70">Detected by {hoveredItem.detector}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-mist/70">
                    Focus area shows the hovered object with nearby background context.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-ink/40 p-4">
            <p className="font-display text-lg font-semibold text-white">Detection Map</p>
            <p className="mt-1 text-sm text-mist/75">
              Scale factors: <span className="text-signal">X {scaleX.toFixed(3)}</span> and{" "}
              <span className="text-signal">Y {scaleY.toFixed(3)}</span>
            </p>
            {hoveredBox ? (
              <div className="mt-4 rounded-[24px] border border-signal/30 bg-white/5 p-3">
                <p className="mb-3 font-display text-sm font-semibold text-white">Focused Preview</p>
                <div
                  className="overflow-hidden rounded-[20px] border border-white/10 bg-ink/70"
                  style={{
                    width: `${previewWidth}px`,
                    height: `${previewHeight}px`,
                    maxWidth: "100%",
                    backgroundImage: `url(${record.url})`,
                    backgroundSize: previewBackgroundSize,
                    backgroundPosition: previewBackgroundPosition,
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  <div className="flex h-full items-end bg-gradient-to-t from-ink/55 via-transparent to-transparent p-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-white">{hoveredBox.label}</p>
                      <p className="text-xs text-mist/75">
                        Context crop around the hovered detection
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-mist/65">
                Hover a marked region to isolate that object and preview the surrounding background.
              </div>
            )}
            <div className="mt-4 grid gap-3">
              {record.detections.items.map((item) => {
                const active = item.id === hoveredBoxId;
                return (
                  <div
                    key={item.id}
                    onMouseEnter={() => {
                      setIsInspecting(true);
                      setHoveredBoxId(item.id);
                    }}
                    onMouseLeave={() => setHoveredBoxId(null)}
                    className={`rounded-2xl border px-4 py-3 transition ${
                      active ? "border-signal/50 bg-signal/10" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <p className="font-display text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-mist/75">
                      [{item.x1}, {item.y1}] to [{item.x2}, {item.y2}]
                    </p>
                    {item.detector ? (
                      <p className="mt-2 text-[11px] uppercase tracking-[0.24em] text-mist/50">
                        {item.detector}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-white/15 bg-ink/40 px-6 py-16 text-center text-mist/75">
          Choose an image from the library or create one with the generator to see bounding boxes here.
        </div>
      )}
    </section>
  );
}
