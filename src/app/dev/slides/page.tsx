"use client";

import { useMemo } from "react";
import { sampleIg01Presentation } from "@/presentation/dsl/sample-ig01";
import { samplePresentation } from "@/presentation/dsl/sample-tr01";
import type { Presentation } from "@/presentation/dsl/types";
import { compilePresentation } from "@/presentation/renderer/compile";
import { SlideCanvas } from "@/presentation/renderer/web/SlideCanvas";
import { themeFromPalette } from "@/presentation/themes/palette";
import { strategyConsultingTheme } from "@/presentation/themes/strategy-consulting";
import type { Theme } from "@/presentation/themes/types";

/** A palette of the kind an infographic would yield once decoded. */
const DERIVED_PALETTE = ["#FFF6E8", "#3D5A5B", "#C4703C", "#7A8B8C"];

const SAMPLES: Presentation[] = [samplePresentation, sampleIg01Presentation];

function Gallery({ theme, label }: { theme: Theme; label: string }) {
  const slides = useMemo(
    () =>
      SAMPLES.flatMap((presentation) => {
        const compiled = compilePresentation(presentation, theme);
        return compiled.layouts.map((layout, index) => ({
          key: `${presentation.id}-${index}`,
          id: presentation.slides[index]?.id ?? `${index}`,
          archetype: layout.archetype,
          layout,
        }));
      }),
    [theme],
  );

  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 12px" }}>
        {label}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {slides.map((slide) => (
          <figure key={slide.key} style={{ margin: 0 }}>
            <figcaption
              style={{
                font: "500 12px/1.4 system-ui",
                color: "#5a6b7b",
                marginBottom: 6,
              }}
            >
              {slide.archetype} · {slide.id}
            </figcaption>
            <div
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                background: "#fff",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 8px 28px rgba(5,28,44,.12)",
              }}
            >
              <SlideCanvas layout={slide.layout} />
            </div>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function SlidesGalleryPage() {
  const derived = useMemo(() => themeFromPalette(DERIVED_PALETTE), []);

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: 28 }}>
      <h1 style={{ font: "700 22px/1.2 system-ui", margin: "0 0 4px" }}>
        Archetype gallery
      </h1>
      <p style={{ font: "400 13px/1.5 system-ui", color: "#5a6b7b", margin: "0 0 28px" }}>
        Every registered archetype rendered through the real web renderer, in
        the built-in theme and in a theme derived from a source palette.
      </p>
      <Gallery theme={strategyConsultingTheme} label="Built-in — Strategy Consulting" />
      <Gallery theme={derived} label={`Derived — ${DERIVED_PALETTE.join(" ")}`} />
    </main>
  );
}
