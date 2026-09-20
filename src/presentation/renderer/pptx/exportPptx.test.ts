import { describe, expect, it } from "vitest";
import { sampleIg01Presentation } from "../../dsl/sample-ig01";
import { samplePresentation } from "../../dsl/sample-tr01";
import { themeFromPalette } from "../../themes/palette";
import { strategyConsultingTheme } from "../../themes/strategy-consulting";
import { buildPptxBuffer } from "./exportPptx";

describe("PPTX export", () => {
  it("writes an OOXML presentation from the same DSL", async () => {
    const buffer = await buildPptxBuffer(
      samplePresentation,
      strategyConsultingTheme,
    );

    expect(buffer.subarray(0, 2).toString("utf8")).toBe("PK");
    const asLatin1 = buffer.toString("latin1");
    expect(asLatin1).toContain("ppt/slides/slide1.xml");
    expect(asLatin1).toContain("Automated discovery");
    expect(asLatin1).toContain("<p:sp");
    expect(asLatin1).not.toContain("<p:pic");
    expect(buffer.byteLength).toBeGreaterThan(4000);
  });

  it("writes IG-01 card grids as native text and shapes", async () => {
    const buffer = await buildPptxBuffer(
      sampleIg01Presentation,
      strategyConsultingTheme,
    );
    const asLatin1 = buffer.toString("latin1");

    expect(asLatin1).toContain("ppt/slides/slide1.xml");
    expect(asLatin1).toContain("ppt/slides/slide2.xml");
    // Card copy is real text, and the icons are real shapes, not a flattened
    // picture of the source infographic.
    expect(asLatin1).toContain("Kehadiran siswa naik");
    expect(asLatin1).toContain("+18%");
    expect(asLatin1).toContain("<p:sp");
    expect(asLatin1).not.toContain("<p:pic");
  });

  it("applies a theme derived from source artwork", async () => {
    const derived = themeFromPalette(["#FFF6E8", "#3D5A5B", "#C4703C"]);
    const buffer = await buildPptxBuffer(sampleIg01Presentation, derived);
    const asLatin1 = buffer.toString("latin1");

    expect(asLatin1).toContain(derived.colors.targetAccent.replace("#", ""));
    expect(asLatin1).not.toContain(
      strategyConsultingTheme.colors.targetAccent.replace("#", ""),
    );
  });
});
