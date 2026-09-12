import { describe, expect, it } from "vitest";
import { validateDeck } from "./validate";
import type { Deck } from "@/lib/schema";

function baseSlide(
  overrides: Partial<Deck["slides"][number]> = {},
): Deck["slides"][number] {
  return {
    actionTitle:
      "Latensi p99 naik 3x setelah migrasi karena connection pool belum dikonfigurasi",
    layout: "chart_left",
    body: ["Pool size tetap 10 setelah traffic naik", "Retry storm memperparah antrian"],
    chart: {
      type: "bar_h",
      data: [
        { label: "Sebelum", value: 120 },
        { label: "Sesudah", value: 360 },
      ],
      unit: "ms",
      callout: "p99 tripled",
      calloutTarget: "Sesudah",
      source: "SRE dashboard Q3 2025",
    },
    needsReview: false,
    ...overrides,
  };
}

function goodDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    title: "Migrasi latency review",
    style: "consulting",
    storyline: "pyramid",
    slides: [
      baseSlide(),
      baseSlide({
        actionTitle:
          "Connection pool adalah bottleneck utama setelah traffic peak harian",
        body: ["Max connections tercapai tiap jam sibuk"],
      }),
      baseSlide({
        actionTitle:
          "Meningkatkan pool size mengurangi p99 dan menstabilkan error rate",
        body: ["Target pool 80 sebelum peak", "Monitor saturasinya tiap deploy"],
        chart: {
          type: "line",
          data: [
            { label: "Sen", value: 12 },
            { label: "Sel", value: 9 },
            { label: "Rab", value: 7 },
          ],
          source: "Incident postmortem 2025-08",
        },
      }),
    ],
    ...overrides,
  };
}

describe("validateDeck", () => {
  it("accepts a valid consulting deck", () => {
    const result = validateDeck(goodDeck());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.deck.slides).toHaveLength(3);
      expect(result.deck.style).toBe("consulting");
    }
  });

  it("rejects consulting topic-label actionTitle", () => {
    const result = validateDeck(
      goodDeck({
        slides: [
          baseSlide({ actionTitle: "Analisis Latensi Sistem" }),
          baseSlide(),
          baseSlide(),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("finding statement"))).toBe(
        true,
      );
    }
  });

  it("rejects empty chart.source", () => {
    const result = validateDeck(
      goodDeck({
        slides: [
          baseSlide({
            chart: {
              type: "bar_h",
              data: [{ label: "A", value: 1 }],
              source: "",
            },
          }),
          baseSlide(),
          baseSlide(),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some(
          (e) =>
            e.toLowerCase().includes("source") ||
            e.includes("Too small") ||
            e.includes("at least"),
        ),
      ).toBe(true);
    }
  });

  it("rejects consulting body bullets longer than 12 words", () => {
    const longBullet =
      "Satu dua tiga empat lima enam tujuh delapan sembilan sepuluh sebelas dua belas tiga belas";
    const result = validateDeck(
      goodDeck({
        slides: [
          baseSlide({ body: [longBullet] }),
          baseSlide(),
          baseSlide(),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("exceeds 12 words"))).toBe(
        true,
      );
    }
  });

  it("rejects empty chart data when type is not none", () => {
    const result = validateDeck(
      goodDeck({
        slides: [
          baseSlide({
            chart: {
              type: "bar_v",
              data: [],
              source: "Ops metrics",
            },
          }),
          baseSlide(),
          baseSlide(),
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) => e.includes("chart.data must not be empty")),
      ).toBe(true);
    }
  });
});
