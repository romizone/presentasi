import { describe, expect, it } from "vitest";
import { Deck } from "@/lib/schema";
import { buildDeckPptxBuffer } from "./pptx-deck";

const sampleDeck = Deck.parse({
  title: "Sample consulting deck",
  style: "consulting",
  storyline: "pyramid",
  slides: [
    {
      actionTitle: "Latency rose after the migration because pools were mis-sized",
      layout: "chart_left",
      body: ["Pools saturated at peak", "Retries amplified load", "Fix: tune max connections"],
      chart: {
        type: "bar_h",
        data: [
          { label: "Before", value: 120 },
          { label: "After", value: 360 },
        ],
        unit: "ms",
        callout: "3× p99 after cutover",
        calloutTarget: "After",
        source: "Internal APM, Q3 2025",
      },
      needsReview: false,
    },
    {
      actionTitle: "One number captures the recovery window we must hit",
      layout: "big_number",
      body: [],
      chart: {
        type: "big_number",
        data: [{ label: "Target p99", value: 150 }],
        unit: "ms",
        source: "SRE runbook v4",
      },
      needsReview: false,
    },
    {
      actionTitle: "Next we sequence the rollout so risk stays contained",
      layout: "section_break",
      body: ["Pilot one region", "Watch error budgets", "Expand only on green"],
      chart: {
        type: "none",
        data: [],
        source: "Narrative separator",
      },
      needsReview: false,
    },
  ],
});

describe("buildDeckPptxBuffer", () => {
  it("returns a real OOXML zip", async () => {
    const buffer = await buildDeckPptxBuffer(sampleDeck);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });
});
