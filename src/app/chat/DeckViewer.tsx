"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import type { Deck } from "@/lib/schema";
import { STYLES } from "@/lib/styles";

export type DeckImageMap = Record<number, string>;

function fileNameFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "deck"}.pptx`;
}

export function DeckViewer({
  deck,
  images,
  cost,
  illustrating = false,
  onClose,
}: {
  deck: Deck;
  images?: DeckImageMap;
  cost?: number;
  illustrating?: boolean;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [chartSvgs, setChartSvgs] = useState<Record<number, string>>({});

  const tokens = STYLES[deck.style].tokens;
  const slide = deck.slides[index];
  const imageUri = images?.[index];
  const chartSvg = chartSvgs[index];

  const cssVars = useMemo(
    () =>
      ({
        "--deck-accent":
          tokens.accent ?? tokens.accentBar ?? tokens.palette[0] ?? "#0B3C5D",
        "--deck-muted": tokens.muted ?? "#5A6B7B",
        "--deck-bg": tokens.bg ?? "#FFFFFF",
      }) as CSSProperties,
    [tokens],
  );

  useEffect(() => {
    let cancelled = false;
    async function loadCharts() {
      const entries = await Promise.all(
        deck.slides.map(async (s, i) => {
          if (s.chart.type === "none") return [i, ""] as const;
          try {
            const res = await fetch("/api/chart/render", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chart: s.chart, styleId: deck.style }),
            });
            if (!res.ok) return [i, ""] as const;
            const payload = (await res.json()) as { svg?: string };
            return [i, payload.svg ?? ""] as const;
          } catch {
            return [i, ""] as const;
          }
        }),
      );
      if (cancelled) return;
      const next: Record<number, string> = {};
      for (const [i, svg] of entries) next[i] = svg;
      setChartSvgs(next);
    }
    void loadCharts();
    return () => {
      cancelled = true;
    };
  }, [deck]);

  const downloadPptx = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/export/deck-pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deck }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error ?? "Gagal mengekspor PPTX");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileNameFromTitle(deck.title);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "Gagal mengekspor PPTX",
      );
    } finally {
      setExporting(false);
    }
  };

  if (!slide) {
    return null;
  }

  return (
    <section
      className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden bg-surface"
      style={cssVars}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-highlight bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-interactive">
            DECK · {deck.style.toUpperCase()}
          </p>
          <h2 className="truncate text-sm font-semibold text-neutral">
            {deck.title}
          </h2>
          {cost !== undefined ? (
            <p className="mt-0.5 text-[11px] text-neutral/55">
              Biaya ≈ ${cost.toFixed(4)} (teks
              {illustrating ? " + gambar…" : ""})
            </p>
          ) : illustrating ? (
            <p className="mt-0.5 text-[11px] text-interactive">
              Menyusun ilustrasi dekoratif…
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-neutral/45">
              Estimasi ≈ $0.02 teks (+ gambar jika card)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void downloadPptx()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-interactive disabled:opacity-50"
          >
            <Download className="size-3.5" />
            {exporting ? "…" : "PPTX"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral hover:bg-surface hover:text-interactive"
            aria-label="Tutup preview"
          >
            <X className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-[var(--deck-bg)] p-5 shadow-[0_10px_40px_rgba(37,86,188,0.08)] ring-1 ring-highlight"
          style={{
            borderLeft:
              deck.style === "editorial"
                ? "4px solid var(--deck-accent)"
                : undefined,
          }}
        >
          <div className="flex min-h-0 flex-1 gap-4 overflow-auto">
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-xl font-semibold leading-snug text-[var(--deck-accent)] sm:text-2xl">
                {slide.actionTitle}
              </h3>
              {slide.subtitle ? (
                <p className="mt-2 text-sm text-[var(--deck-muted)]">
                  {slide.subtitle}
                </p>
              ) : null}
              {chartSvg ? (
                <div
                  className="mt-4 overflow-hidden [&_svg]:h-auto [&_svg]:max-h-64 [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: chartSvg }}
                />
              ) : slide.chart.type !== "none" ? (
                <p className="mt-4 text-xs text-[var(--deck-muted)]">
                  Menyusun chart…
                </p>
              ) : null}
              {slide.chart.callout ? (
                <p className="mt-2 text-sm font-medium text-[var(--deck-accent)]">
                  {slide.chart.callout}
                </p>
              ) : null}
              {slide.chart.source ? (
                <p className="mt-4 text-[11px] text-[var(--deck-muted)]">
                  Source: {slide.chart.source}
                </p>
              ) : null}
              {slide.needsReview ? (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  Needs review
                </p>
              ) : null}
            </div>
            <div className="flex w-[38%] min-w-[140px] shrink-0 flex-col gap-3">
              {imageUri ? (
                // Decorative only — never a chart screenshot
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUri}
                  alt=""
                  className="aspect-video w-full rounded-lg object-cover ring-1 ring-black/5"
                />
              ) : null}
              {slide.body.length > 0 ? (
                <ul className="space-y-2 text-sm leading-5 text-neutral">
                  {slide.body.map((line) => (
                    <li
                      key={line}
                      className="border-l-2 border-[var(--deck-accent)] pl-3"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex shrink-0 items-center justify-between gap-2">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-neutral hover:bg-white disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
            Prev
          </button>
          <p className="text-xs text-neutral/60">
            {index + 1} / {deck.slides.length}
          </p>
          <button
            type="button"
            disabled={index >= deck.slides.length - 1}
            onClick={() =>
              setIndex((i) => Math.min(deck.slides.length - 1, i + 1))
            }
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs text-neutral hover:bg-white disabled:opacity-30"
          >
            Next
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {exportError ? (
        <p className="shrink-0 px-5 pb-3 text-center text-xs text-primary">
          {exportError}
        </p>
      ) : null}
    </section>
  );
}
