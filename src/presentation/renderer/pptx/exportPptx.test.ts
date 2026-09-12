import { describe, expect, it } from "vitest";
import { samplePresentation } from "../../dsl/sample-tr01";
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
});
