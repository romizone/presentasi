import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  mix,
  parseHex,
  quantizePalette,
  readableOn,
  themeFromPalette,
  toHex,
} from "./palette";

/** RGBA buffer built from a list of [hex, repeat] pairs. */
function buffer(pairs: [string, number][], alpha = 255): number[] {
  const out: number[] = [];
  for (const [hex, count] of pairs) {
    const { r, g, b } = parseHex(hex);
    for (let i = 0; i < count; i += 1) {
      out.push(r, g, b, alpha);
    }
  }
  return out;
}

describe("colour maths", () => {
  it("round-trips hex, including the three-digit form", () => {
    expect(toHex(parseHex("#1B365D"))).toBe("#1B365D");
    expect(toHex(parseHex("f0a"))).toBe("#FF00AA");
  });

  it("rejects anything that is not a colour", () => {
    expect(() => parseHex("#12345")).toThrow(/Invalid hex/);
    expect(() => parseHex("rebeccapurple")).toThrow(/Invalid hex/);
  });

  it("matches the WCAG extremes", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("mixes linearly between endpoints", () => {
    expect(mix("#000000", "#FFFFFF", 0)).toBe("#000000");
    expect(mix("#000000", "#FFFFFF", 1)).toBe("#FFFFFF");
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
  });

  it("falls back to pure black or white when nothing preferred is legible", () => {
    // Mid grey: neither candidate clears 4.5, so the fallback pair decides.
    const picked = readableOn("#767676", ["#808080"], 4.5);
    expect(["#FFFFFF", "#000000"]).toContain(picked);
    expect(contrastRatio(picked, "#767676")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("median cut palette extraction", () => {
  it("separates flat colour regions without muddying them", () => {
    const pixels = buffer([
      ["#FF0000", 8],
      ["#0000FF", 4],
    ]);
    expect(quantizePalette(pixels, { maxColors: 2 })).toEqual([
      "#FF0000",
      "#0000FF",
    ]);
  });

  it("orders colours by how much of the image they cover", () => {
    const pixels = buffer([
      ["#0000FF", 3],
      ["#FF0000", 9],
      ["#00FF00", 6],
    ]);
    expect(quantizePalette(pixels, { maxColors: 3 })).toEqual([
      "#FF0000",
      "#00FF00",
      "#0000FF",
    ]);
  });

  it("is deterministic", () => {
    const pixels = buffer([
      ["#1B365D", 40],
      ["#E3120B", 17],
      ["#F4F7FA", 91],
      ["#2556BC", 23],
    ]);
    const first = quantizePalette(pixels, { maxColors: 5 });
    const second = quantizePalette(pixels, { maxColors: 5 });
    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThan(1);
  });

  it("skips transparent pixels", () => {
    const opaque = buffer([["#FF0000", 4]]);
    const transparent = buffer([["#00FF00", 4]], 0);
    expect(quantizePalette([...opaque, ...transparent], { maxColors: 2 })).toEqual(
      ["#FF0000"],
    );
  });

  it("reads RGB buffers when told there is no alpha channel", () => {
    expect(
      quantizePalette([255, 0, 0, 255, 0, 0], { channels: 3, maxColors: 1 }),
    ).toEqual(["#FF0000"]);
  });

  it("returns nothing for an empty image", () => {
    expect(quantizePalette([], { maxColors: 4 })).toEqual([]);
  });
});

describe("themeFromPalette", () => {
  const palettes: Record<string, string[]> = {
    brandBlue: ["#F4F7FA", "#1B365D", "#2556BC", "#85C3E5"],
    warmInfographic: ["#FFF6E8", "#C4703C", "#3D5A5B", "#7A8B8C"],
    greyscale: ["#FFFFFF", "#9A9A9A", "#2B2B2B"],
    allBlack: ["#000000"],
    allWhite: ["#FFFFFF"],
    midGrey: ["#767676"],
    singleNeon: ["#39FF14"],
    empty: [],
    garbage: ["not-a-colour", "#12345"],
  };

  for (const [name, palette] of Object.entries(palettes)) {
    describe(name, () => {
      const { colors } = themeFromPalette(palette);

      it("keeps body copy at 7:1 or better", () => {
        expect(contrastRatio(colors.ink, colors.background)).toBeGreaterThanOrEqual(7);
      });

      it("keeps secondary copy at 4.5:1 or better", () => {
        expect(contrastRatio(colors.muted, colors.background)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.takeawayAccent, colors.takeawayFill)).toBeGreaterThanOrEqual(4.5);
      });

      it("keeps card content legible on the card fill, not just on paper", () => {
        // IG-01 paints headings in ink, body in muted, and the metric in the
        // accent, all on targetFill — a tint of the accent itself.
        expect(contrastRatio(colors.ink, colors.targetFill)).toBeGreaterThanOrEqual(7);
        expect(contrastRatio(colors.muted, colors.targetFill)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.targetAccent, colors.targetFill)).toBeGreaterThanOrEqual(4.5);
      });

      it("keeps footers and accents visible", () => {
        expect(contrastRatio(colors.footer, colors.background)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(colors.targetAccent, colors.background)).toBeGreaterThanOrEqual(3);
        expect(contrastRatio(colors.currentAccent, colors.background)).toBeGreaterThanOrEqual(3);
      });

      it("keeps anything sitting on the accent fill legible", () => {
        expect(contrastRatio(colors.transformOnFill, colors.transformFill)).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(colors.iconOnAccent, colors.transformFill)).toBeGreaterThanOrEqual(3);
      });

      it("emits a full, well-formed token set", () => {
        const values = Object.values(colors);
        expect(values).toHaveLength(16);
        for (const value of values) {
          expect(value).toMatch(/^#[0-9A-F]{6}$/);
        }
      });
    });
  }

  it("is deterministic", () => {
    const first = themeFromPalette(palettes.brandBlue ?? []);
    const second = themeFromPalette(palettes.brandBlue ?? []);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("prefers an accent that can host white content", () => {
    // Gold is the most saturated colour here, but it cannot carry white text
    // and it disappears on its own pale tint. Navy wins.
    const { colors } = themeFromPalette(["#FFFFFF", "#0B3C5D", "#D9B310"]);
    expect(contrastRatio(colors.targetAccent, "#0B3C5D")).toBeLessThan(2);
    expect(contrastRatio(colors.transformOnFill, colors.transformFill)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a rejected brand colour available as the secondary accent", () => {
    const { colors } = themeFromPalette(["#FFFFFF", "#0B3C5D", "#D9B310"]);
    expect(colors.currentAccent).not.toBe(colors.targetAccent);
    expect(contrastRatio(colors.currentAccent, colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("marks derived themes so they are never mistaken for the built-in one", () => {
    expect(themeFromPalette(["#2556BC"]).id).toBe("derived");
  });
});
