import { describe, expect, it } from "vitest";
import { sampleIg01Presentation } from "../dsl/sample-ig01";
import type { CardEmphasis, CardGridCard, Ig01Slide } from "../dsl/types";
import { strategyConsultingTheme } from "../themes/strategy-consulting";
import { rectsOverlap, rectWithin, slideBounds } from "./geometry";
import { gridShape, layoutIg01 } from "./ig-01";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_HEIGHT_IN,
  SLIDE_WIDTH_IN,
  type LayoutIR,
} from "./layout-types";
import { layoutSlide } from "./registry";

const MARGIN_X = 0.5;
const CONTENT_W = SLIDE_WIDTH_IN - MARGIN_X * 2;

function card(index: number, withMetric: boolean): CardGridCard {
  return {
    heading: `Pilar ${index + 1}`,
    body: "Kalimat penjelas yang cukup panjang untuk mengisi kartu sampai penuh.",
    metric: withMetric ? `${(index + 1) * 12}%` : undefined,
    iconHint: index % 2 === 0 ? "monitoring" : "integrasi",
  };
}

function slideWith(options: {
  count: number;
  kicker?: boolean;
  takeaway?: boolean;
  metrics?: boolean;
  emphasis?: CardEmphasis;
}): Ig01Slide {
  return {
    id: `ig01-${options.count}`,
    archetype: "IG-01",
    actionTitle: "Enam pilar operasional menopang pelaksanaan harian program",
    keyMessage: "Setiap pilar punya penanggung jawab sendiri.",
    content: {
      kicker: options.kicker ? "Ringkasan program" : undefined,
      cards: Array.from({ length: options.count }, (_, index) =>
        card(index, options.metrics ?? true),
      ),
      takeaway: options.takeaway ? "Perluasan layak dijalankan." : undefined,
    },
    visual: { type: "card-grid", emphasis: options.emphasis ?? "metric" },
  };
}

function build(options: Parameters<typeof slideWith>[0]): LayoutIR {
  return layoutIg01(slideWith(options), strategyConsultingTheme);
}

/** Every permutation of card count and optional bands. */
const VARIANTS = [2, 3, 4, 5, 6].flatMap((count) =>
  [false, true].flatMap((kicker) =>
    [false, true].map((takeaway) => ({ count, kicker, takeaway })),
  ),
);

describe("IG-01 card grid engine", () => {
  it("uses a 16:9 canvas in inches", () => {
    const layout = build({ count: 3 });
    expect(layout.aspectRatio).toBe(SLIDE_ASPECT_RATIO);
    expect(layout.archetype).toBe("IG-01");
    expect(layout.slideWidth).toBeCloseTo(SLIDE_WIDTH_IN);
    expect(layout.slideHeight).toBeCloseTo(SLIDE_HEIGHT_IN);
    expect(layout.slideWidth / layout.slideHeight).toBeCloseTo(16 / 9, 5);
  });

  it("is deterministic", () => {
    const options = { count: 5, kicker: true, takeaway: true };
    expect(JSON.stringify(build(options))).toBe(JSON.stringify(build(options)));
  });

  for (const variant of VARIANTS) {
    const label = `${variant.count} cards${variant.kicker ? " + kicker" : ""}${
      variant.takeaway ? " + takeaway" : ""
    }`;

    describe(label, () => {
      const layout = build(variant);
      const bounds = slideBounds(layout.slideWidth, layout.slideHeight);

      it("keeps every node inside the slide", () => {
        for (const node of layout.nodes) {
          expect(rectWithin(node.rect, bounds), node.id).toBe(true);
          expect(node.rect.w, node.id).toBeGreaterThan(0);
          expect(node.rect.h, node.id).toBeGreaterThan(0);
        }
      });

      it("does not overlap primary frames", () => {
        const frames = layout.nodes.filter((node) => node.frame);
        for (let i = 0; i < frames.length; i += 1) {
          for (let j = i + 1; j < frames.length; j += 1) {
            const a = frames[i];
            const b = frames[j];
            if (!a || !b) continue;
            expect(rectsOverlap(a.rect, b.rect), `${a.id} overlaps ${b.id}`).toBe(
              false,
            );
          }
        }
      });

      it("keeps card content inside its own card", () => {
        for (let index = 0; index < variant.count; index += 1) {
          const frame = layout.nodes.find((n) => n.id === `card-${index}-frame`);
          expect(frame, `card-${index}-frame`).toBeTruthy();
          if (!frame) continue;
          const children = layout.nodes.filter(
            (n) => n.id.startsWith(`card-${index}-`) && n.id !== frame.id,
          );
          expect(children.length).toBeGreaterThan(0);
          for (const child of children) {
            expect(rectWithin(child.rect, frame.rect), child.id).toBe(true);
          }
        }
      });

      it("gives every card the same footprint", () => {
        const frames = layout.nodes.filter((n) => n.id.endsWith("-frame"));
        expect(frames).toHaveLength(variant.count);
        const first = frames[0];
        if (!first) return;
        for (const frame of frames) {
          expect(frame.rect.w).toBeCloseTo(first.rect.w, 6);
          expect(frame.rect.h).toBeCloseTo(first.rect.h, 6);
        }
      });

      it("gives every card exactly one icon", () => {
        const icons = layout.nodes.filter((node) => node.kind === "icon");
        expect(icons).toHaveLength(variant.count);
      });

      it("renders optional bands only when the content has them", () => {
        expect(layout.nodes.some((n) => n.id === "kicker")).toBe(variant.kicker);
        expect(layout.nodes.some((n) => n.id === "takeaway-card")).toBe(
          variant.takeaway,
        );
      });
    });
  }

  it("shapes the grid from the card count alone", () => {
    expect(gridShape(2)).toEqual({ cols: 2, rows: 1 });
    expect(gridShape(3)).toEqual({ cols: 3, rows: 1 });
    expect(gridShape(4)).toEqual({ cols: 2, rows: 2 });
    expect(gridShape(5)).toEqual({ cols: 3, rows: 2 });
    expect(gridShape(6)).toEqual({ cols: 3, rows: 2 });
  });

  it("reads cards left to right, then top to bottom", () => {
    const layout = build({ count: 6 });
    const frames = [0, 1, 2, 3, 4, 5].map((index) =>
      layout.nodes.find((node) => node.id === `card-${index}-frame`),
    );
    for (const frame of frames) {
      expect(frame).toBeTruthy();
    }
    const [a, b, c, d, e, f] = frames;
    if (!a || !b || !c || !d || !e || !f) return;

    expect(a.rect.x).toBeLessThan(b.rect.x);
    expect(b.rect.x).toBeLessThan(c.rect.x);
    expect(a.rect.y).toBeCloseTo(b.rect.y, 6);
    expect(d.rect.y).toBeGreaterThan(a.rect.y);
    expect(d.rect.x).toBeCloseTo(a.rect.x, 6);
    expect(f.rect.x).toBeCloseTo(c.rect.x, 6);
  });

  it("centres a short final row instead of leaving it ragged", () => {
    const layout = build({ count: 5 });
    const fourth = layout.nodes.find((node) => node.id === "card-3-frame");
    const fifth = layout.nodes.find((node) => node.id === "card-4-frame");
    expect(fourth && fifth).toBeTruthy();
    if (!fourth || !fifth) return;

    const leftGap = fourth.rect.x - MARGIN_X;
    const rightGap = MARGIN_X + CONTENT_W - (fifth.rect.x + fifth.rect.w);
    expect(leftGap).toBeCloseTo(rightGap, 6);
    expect(leftGap).toBeGreaterThan(0);
  });

  it("suppresses metrics under narrative emphasis", () => {
    const withMetrics = build({ count: 3, emphasis: "metric" });
    const narrative = build({ count: 3, emphasis: "narrative" });
    expect(withMetrics.nodes.filter((n) => n.id.endsWith("-metric"))).toHaveLength(3);
    expect(narrative.nodes.filter((n) => n.id.endsWith("-metric"))).toHaveLength(0);
  });

  it("sets metrics larger under metric emphasis than under balanced", () => {
    const lead = build({ count: 3, emphasis: "metric" }).nodes.find(
      (n) => n.id === "card-0-metric",
    );
    const balanced = build({ count: 3, emphasis: "balanced" }).nodes.find(
      (n) => n.id === "card-0-metric",
    );
    expect(lead?.kind).toBe("text");
    expect(balanced?.kind).toBe("text");
    if (lead?.kind !== "text" || balanced?.kind !== "text") return;
    expect(lead.fontSize).toBeGreaterThan(balanced.fontSize);
  });

  it("omits the metric node when a card has no figure", () => {
    const layout = build({ count: 3, metrics: false, emphasis: "metric" });
    expect(layout.nodes.filter((n) => n.id.endsWith("-metric"))).toHaveLength(0);
  });

  it("scales type down when the grid runs to two rows", () => {
    const oneRow = build({ count: 3 }).nodes.find((n) => n.id === "card-0-heading");
    const twoRows = build({ count: 6 }).nodes.find((n) => n.id === "card-0-heading");
    if (oneRow?.kind !== "text" || twoRows?.kind !== "text") {
      throw new Error("headings missing");
    }
    expect(twoRows.fontSize).toBeLessThan(oneRow.fontSize);
  });

  it("puts the source line in the footer when the slide cites one", () => {
    const slide = slideWith({ count: 3 });
    const cited = layoutIg01(
      { ...slide, sources: ["Laporan program, 2026"] },
      strategyConsultingTheme,
    );
    const footer = cited.nodes.find((node) => node.id === "footer-left");
    if (footer?.kind !== "text") throw new Error("footer missing");
    expect(footer.text).toContain("Laporan program, 2026");
  });

  it("routes through the registry from the canonical sample", () => {
    for (const slide of sampleIg01Presentation.slides) {
      const layout = layoutSlide(slide, strategyConsultingTheme);
      expect(layout.archetype).toBe("IG-01");
      const bounds = slideBounds(layout.slideWidth, layout.slideHeight);
      for (const node of layout.nodes) {
        expect(rectWithin(node.rect, bounds), node.id).toBe(true);
      }
    }
  });

  it("keeps a heading that wraps from pushing body copy out of the card", () => {
    const base = slideWith({ count: 6 });
    const longHeadings: Ig01Slide = {
      ...base,
      content: {
        ...base.content,
        cards: base.content.cards.map((entry) => ({
          ...entry,
          heading:
            "Keterlibatan orang tua dan pendamping sekolah sepanjang tahun ajaran",
        })),
      },
    };
    const layout = layoutIg01(longHeadings, strategyConsultingTheme);

    for (let index = 0; index < 6; index += 1) {
      const frame = layout.nodes.find((n) => n.id === `card-${index}-frame`);
      const body = layout.nodes.find((n) => n.id === `card-${index}-body`);
      const heading = layout.nodes.find((n) => n.id === `card-${index}-heading`);
      expect(frame && body && heading).toBeTruthy();
      if (!frame || !body || !heading) continue;
      expect(rectWithin(body.rect, frame.rect), `card-${index}-body`).toBe(true);
      expect(body.rect.h).toBeGreaterThan(0.12);
      expect(heading.rect.y + heading.rect.h).toBeLessThanOrEqual(body.rect.y);
    }
  });

  it("sizes a one-line heading tighter than a wrapping one", () => {
    const base = slideWith({ count: 3 });
    const short = layoutIg01(base, strategyConsultingTheme).nodes.find(
      (n) => n.id === "card-0-heading",
    );
    const long = layoutIg01(
      {
        ...base,
        content: {
          ...base.content,
          cards: base.content.cards.map((entry) => ({
            ...entry,
            heading:
              "Kehadiran siswa naik di seluruh sekolah percontohan sepanjang kuartal pertama tahun ini",
          })),
        },
      },
      strategyConsultingTheme,
    ).nodes.find((n) => n.id === "card-0-heading");

    expect(short && long).toBeTruthy();
    if (!short || !long) return;
    expect(long.rect.h).toBeGreaterThan(short.rect.h);
  });

  it("does not stretch a sparse grid into dead space", () => {
    // Three cards on a full-height band must not become full-height cards.
    const layout = build({ count: 3, kicker: false, takeaway: false });
    const frame = layout.nodes.find((node) => node.id === "card-0-frame");
    expect(frame).toBeTruthy();
    if (!frame) return;
    expect(frame.rect.h).toBeLessThanOrEqual(3.2);
  });
});
