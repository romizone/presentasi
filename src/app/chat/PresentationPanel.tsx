"use client";

import type { Presentation } from "@/presentation/dsl/types";
import { compilePresentation } from "@/presentation/renderer/compile";
import { SlideCanvas } from "@/presentation/renderer/web/SlideCanvas";
import { strategyConsultingTheme } from "@/presentation/themes/strategy-consulting";
import { useMemo, useState } from "react";
import { Download, X } from "lucide-react";

function fileNameFromTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "presentasi"}.pptx`;
}

export function PresentationPanel({
  presentation,
  illustrating = false,
  onClose,
}: {
  presentation: Presentation;
  illustrating?: boolean;
  onClose: () => void;
}) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const layout = useMemo(() => {
    const compiled = compilePresentation(
      presentation,
      strategyConsultingTheme,
      {
        reservePhotoSlots:
          illustrating && !presentation.assets?.currentScene && !presentation.assets?.targetScene,
      },
    );
    const slide = compiled.layouts[0];
    if (!slide) {
      throw new Error("Expected TR-01 layout");
    }
    return slide;
  }, [illustrating, presentation]);

  const downloadPptx = async () => {
    if (exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const response = await fetch("/api/export/pptx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presentation }),
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
      link.download = fileNameFromTitle(presentation.title);
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

  return (
    <section className="flex h-full min-h-0 min-w-0 w-full max-w-full flex-col overflow-hidden bg-surface">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-highlight bg-white px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-interactive">
            ARTIFACT
          </p>
          <h2 className="truncate text-sm font-semibold text-neutral">
            {presentation.title || "TR-01 Current → Target"}
          </h2>
          {illustrating ? (
            <p className="mt-0.5 text-[11px] text-interactive">
              Menyusun ilustrasi dekoratif…
            </p>
          ) : null}
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
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-5">
        <div className="h-full min-h-0 min-w-0 w-full overflow-hidden rounded-xl bg-white shadow-[0_10px_40px_rgba(37,86,188,0.08)] ring-1 ring-highlight">
          <SlideCanvas layout={layout} />
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
