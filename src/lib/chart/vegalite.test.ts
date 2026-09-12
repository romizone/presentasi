import { describe, expect, it } from "vitest";
import { CHART_SAMPLES } from "./samples";
import { chartSpecToVegaLite, renderChartSvg } from "./vegalite";
import type { ChartType } from "@/lib/schema";

describe("chart renderer", () => {
  it.each(Object.keys(CHART_SAMPLES) as ChartType[])(
    "renders %s to SVG for consulting",
    async (type) => {
      const spec = CHART_SAMPLES[type];
      const vl = chartSpecToVegaLite(spec, "consulting");
      expect(vl).toBeTruthy();
      const svg = await renderChartSvg(spec, "consulting");
      expect(svg).toContain("<svg");
      expect(svg.length).toBeGreaterThan(20);
    },
  );
});
