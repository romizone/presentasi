"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import type { Deck, StyleId } from "@/lib/schema";
import { STYLES } from "@/lib/styles";
import { renderChartSvg } from "@/lib/chart/vegalite";
import { SlideView } from "@/components/layouts/SlideView";
import "@/app/deck.css";

export type DeckViewerProps = {
  deck: Deck;
  cost?: number;
  /** When true, hide chrome (used by print route). */
  printMode?: boolean;
};

const STYLE_OPTIONS = Object.keys(STYLES) as StyleId[];

export function DeckViewer({ deck, cost, printMode = false }: DeckViewerProps) {
  const [styleId, setStyleId] = useState<StyleId>(deck.style);
  const [index, setIndex] = useState(0);
  const [chartSvgs, setChartSvgs] = useState<Record<number, string>>({});
  const [chartsReady, setChartsReady] = useState(false);
  const renderGen = useRef(0);

  const slides = deck.slides;
  const safeIndex = Math.min(Math.max(index, 0), Math.max(slides.length - 1, 0));
  const current = slides[safeIndex];

  useEffect(() => {
    let cancelled = false;
    const gen = ++renderGen.current;

    async function renderAll() {
      const entries = await Promise.all(
        slides.map(async (slide, i) => {
          try {
            const svg = await renderChartSvg(slide.chart, styleId);
            return [i, svg] as const;
          } catch {
            return [i, ""] as const;
          }
        }),
      );
      if (cancelled || gen !== renderGen.current) return;
      const next: Record<number, string> = {};
      for (const [i, svg] of entries) {
        next[i] = svg;
      }
      setChartSvgs(next);
      setChartsReady(true);
    }

    void renderAll();
    return () => {
      cancelled = true;
    };
  }, [slides, styleId]);

  const title = useMemo(() => deck.title, [deck.title]);

  if (printMode) {
    return (
      <div className="df-print" data-df-ready={chartsReady ? "true" : "false"}>
        {slides.map((slide, i) => (
          <div className="df-print__slide" key={`${i}-${slide.actionTitle}`}>
            <SlideView
              slide={slide}
              styleId={styleId}
              chartSvg={chartSvgs[i]}
            />
          </div>
        ))}
      </div>
    );
  }

  if (!current) {
    return (
      <div className="df-viewer">
        <p style={{ padding: "1.5rem" }}>This deck has no slides.</p>
      </div>
    );
  }

  return (
    <div className="df-viewer">
      <div className="df-viewer__toolbar">
        <strong style={{ marginRight: "auto" }}>{title}</strong>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#515151" }}>Style</span>
          <select
            value={styleId}
            onChange={(e) => {
              setStyleId(e.target.value as StyleId);
              setChartsReady(false);
            }}
            aria-label="Style"
          >
            {STYLE_OPTIONS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        {cost !== undefined ? (
          <span style={{ fontSize: "0.875rem", color: "#515151" }}>
            Cost: ${cost.toFixed(4)}
          </span>
        ) : null}
        <button
          type="button"
          disabled={safeIndex <= 0}
          onClick={() => setIndex((v) => Math.max(0, v - 1))}
        >
          Prev
        </button>
        <span
          style={{
            fontSize: "0.875rem",
            minWidth: "4.5rem",
            textAlign: "center",
          }}
        >
          {safeIndex + 1} / {slides.length}
        </span>
        <button
          type="button"
          disabled={safeIndex >= slides.length - 1}
          onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
        >
          Next
        </button>
      </div>
      <div className="df-viewer__stage">
        <div className="df-viewer__stage-inner">
          <SlideView
            slide={current}
            styleId={styleId}
            chartSvg={chartSvgs[safeIndex]}
          />
        </div>
      </div>
    </div>
  );
}
