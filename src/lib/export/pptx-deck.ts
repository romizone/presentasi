import PptxGenJS from "pptxgenjs";
import type { ChartSpec, Deck, Slide } from "@/lib/schema";
import { STYLES } from "@/lib/styles";

function asBuffer(output: string | ArrayBuffer | Blob | Uint8Array): Buffer {
  if (Buffer.isBuffer(output)) return output;
  if (output instanceof Uint8Array) return Buffer.from(output);
  if (output instanceof ArrayBuffer) return Buffer.from(output);
  if (typeof output === "string") return Buffer.from(output, "binary");
  throw new Error("Unsupported PPTX output type");
}

function hexNoHash(value: string | undefined, fallback: string): string {
  const raw = (value ?? fallback).replace(/^#/, "");
  return raw.length === 6 ? raw : fallback.replace(/^#/, "");
}

function chartSeries(chart: ChartSpec): { name: string; labels: string[]; values: number[] }[] {
  const bySeries = new Map<string, { labels: string[]; values: number[] }>();
  for (const row of chart.data) {
    const name = row.series?.trim() || "Series";
    const bucket = bySeries.get(name) ?? { labels: [], values: [] };
    bucket.labels.push(row.label);
    bucket.values.push(row.value);
    bySeries.set(name, bucket);
  }
  return [...bySeries.entries()].map(([name, data]) => ({
    name,
    labels: data.labels,
    values: data.values,
  }));
}

function addNativeChart(
  pptx: PptxGenJS,
  slide: ReturnType<PptxGenJS["addSlide"]>,
  chart: ChartSpec,
  accent: string,
): boolean {
  const series = chartSeries(chart);
  if (series.length === 0) return false;

  const labels = series[0]?.labels ?? [];
  const data = series.map((s) => ({
    name: s.name,
    labels,
    values: s.values,
  }));

  const opts = {
    x: 0.6,
    y: 2.2,
    w: 7.2,
    h: 4.2,
    showTitle: false,
    showLegend: series.length > 1,
    chartColors: [accent],
    showValue: true,
  };

  switch (chart.type) {
    case "bar_h":
      slide.addChart(pptx.ChartType.bar, data, {
        ...opts,
        barDir: "bar",
        barGrouping: "clustered",
      });
      return true;
    case "bar_v":
    case "stacked_bar":
      slide.addChart(pptx.ChartType.bar, data, {
        ...opts,
        barDir: "col",
        barGrouping: chart.type === "stacked_bar" ? "stacked" : "clustered",
      });
      return true;
    case "line":
      slide.addChart(pptx.ChartType.line, data, opts);
      return true;
    case "scatter":
      slide.addChart(pptx.ChartType.scatter, data, opts);
      return true;
    default:
      return false;
  }
}

function addFallbackChartVisual(
  pptx: PptxGenJS,
  slide: ReturnType<PptxGenJS["addSlide"]>,
  chart: ChartSpec,
  accent: string,
): void {
  if (chart.type === "big_number" && chart.data[0]) {
    const point = chart.data[0];
    const unit = chart.unit ? ` ${chart.unit}` : "";
    slide.addText(`${point.value}${unit}`, {
      x: 0.6,
      y: 2.4,
      w: 12,
      h: 1.4,
      fontSize: 54,
      bold: true,
      color: accent,
      fontFace: "Calibri",
    });
    slide.addText(point.label, {
      x: 0.6,
      y: 3.9,
      w: 12,
      h: 0.5,
      fontSize: 16,
      color: "5A6B7B",
      fontFace: "Calibri",
    });
    if (chart.callout) {
      slide.addText(chart.callout, {
        x: 0.6,
        y: 4.5,
        w: 12,
        h: 0.4,
        fontSize: 14,
        color: accent,
        fontFace: "Calibri",
      });
    }
    return;
  }

  if (chart.type === "waterfall" && chart.data.length > 0) {
    const rows = chart.data
      .map((d) => `${d.label}: ${d.value}${chart.unit ? ` ${chart.unit}` : ""}`)
      .join("\n");
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.6,
      y: 2.3,
      w: 8,
      h: Math.min(4.2, 0.5 + chart.data.length * 0.35),
      fill: { color: "F4F7FA" },
      line: { color: accent, width: 1 },
    });
    slide.addText(`Waterfall\n${rows}`, {
      x: 0.8,
      y: 2.45,
      w: 7.6,
      h: Math.min(3.9, 0.4 + chart.data.length * 0.35),
      fontSize: 13,
      color: "1A1A1A",
      fontFace: "Calibri",
      valign: "top",
    });
    return;
  }

  if (chart.type !== "none" && chart.data.length > 0) {
    const rows = chart.data
      .slice(0, 8)
      .map((d) => `• ${d.label}: ${d.value}`)
      .join("\n");
    slide.addText(rows, {
      x: 0.6,
      y: 2.4,
      w: 8,
      h: 3.5,
      fontSize: 14,
      color: "1A1A1A",
      fontFace: "Calibri",
      valign: "top",
    });
  }
}

function paintSlide(
  pptx: PptxGenJS,
  deckSlide: Slide,
  styleId: Deck["style"],
): void {
  const tokens = STYLES[styleId].tokens;
  const accent = hexNoHash(tokens.accent ?? tokens.accentBar ?? tokens.palette[0], "0B3C5D");
  const bg = hexNoHash(tokens.bg ?? "#FFFFFF", "FFFFFF");
  const muted = hexNoHash(tokens.muted ?? "#5A6B7B", "5A6B7B");

  const slide = pptx.addSlide();
  slide.background = { color: bg };

  if (tokens.accentBar) {
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 0.12,
      h: 7.5,
      fill: { color: hexNoHash(tokens.accentBar, "E3120B") },
      line: { color: hexNoHash(tokens.accentBar, "E3120B") },
    });
  }

  slide.addText(deckSlide.actionTitle, {
    x: 0.55,
    y: 0.35,
    w: 12.2,
    h: 0.9,
    fontSize: tokens.h1 ?? 28,
    bold: true,
    color: accent,
    fontFace: tokens.font ?? "Calibri",
    valign: "top",
  });

  if (deckSlide.subtitle) {
    slide.addText(deckSlide.subtitle, {
      x: 0.55,
      y: 1.2,
      w: 12.2,
      h: 0.4,
      fontSize: 14,
      color: muted,
      fontFace: tokens.font ?? "Calibri",
    });
  }

  if (deckSlide.body.length > 0) {
    const bodyY = deckSlide.subtitle ? 1.65 : 1.35;
    slide.addText(
      deckSlide.body.map((line) => ({ text: line, options: { breakLine: true } })),
      {
        x: 8.2,
        y: bodyY,
        w: 4.5,
        h: 3.5,
        fontSize: tokens.body ?? 14,
        color: "1A1A1A",
        fontFace: tokens.font ?? "Calibri",
        valign: "top",
        paraSpaceAfter: 8,
      },
    );
  }

  const chart = deckSlide.chart;
  if (chart.type !== "none") {
    const placed = addNativeChart(pptx, slide, chart, accent);
    if (!placed) {
      addFallbackChartVisual(pptx, slide, chart, accent);
    }
  }

  if (chart.source.trim()) {
    slide.addText(`Source: ${chart.source}`, {
      x: 0.55,
      y: 7.05,
      w: 12.2,
      h: 0.3,
      fontSize: 10,
      color: muted,
      fontFace: tokens.font ?? "Calibri",
    });
  }

  if (deckSlide.needsReview) {
    slide.addText("Needs review", {
      x: 11.2,
      y: 0.2,
      w: 1.8,
      h: 0.3,
      fontSize: 10,
      color: "B45309",
      fontFace: "Calibri",
      align: "right",
    });
  }
}

/**
 * Build an editable PPTX buffer from a DeckForge deck.
 * Charts map to native pptxgenjs objects where possible (bar/line/scatter);
 * waterfall / big_number / none use text or shapes — never full-slide screenshots.
 */
export async function buildDeckPptxBuffer(deck: Deck): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "WIDE_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "WIDE_16x9";
  pptx.author = "Presentasi AI";
  pptx.title = deck.title;

  for (const slide of deck.slides) {
    paintSlide(pptx, slide, deck.style);
  }

  const output = await pptx.write({ outputType: "nodebuffer" });
  return asBuffer(output as Uint8Array | Buffer | ArrayBuffer | string);
}
