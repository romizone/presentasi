import { describe, expect, it } from "vitest";
import { buildImagePrompt, NO_TEXT_CLAUSE } from "./prompt";

describe("buildImagePrompt", () => {
  it("appends style suffix and no-text clause", () => {
    const prompt = buildImagePrompt({
      brief: "Soft paper texture with abstract shapes",
      styleId: "card",
    });
    expect(prompt.toLowerCase()).toContain("warm paper texture");
    expect(prompt.endsWith(NO_TEXT_CLAUSE)).toBe(true);
  });

  it("strips forbidden chart words from the brief", () => {
    const prompt = buildImagePrompt({
      brief: "A bar chart and graph diagram with grafik labels",
      styleId: "consulting",
    });
    expect(prompt.toLowerCase()).not.toMatch(/\bchart\b/);
    expect(prompt.toLowerCase()).not.toMatch(/\bgraph\b/);
    expect(prompt.toLowerCase()).not.toMatch(/\bdiagram\b/);
    expect(prompt.toLowerCase()).not.toMatch(/\bbar\b/);
    expect(prompt.toLowerCase()).not.toMatch(/\bgrafik\b/);
    expect(prompt.endsWith(NO_TEXT_CLAUSE)).toBe(true);
  });

  it("does not duplicate the no-text ending", () => {
    const prompt = buildImagePrompt({
      brief: `mood board, ${NO_TEXT_CLAUSE}`,
      styleId: "editorial",
    });
    const matches = prompt.match(/no text, no letters, no numbers, no watermark/gi);
    expect(matches?.length).toBe(1);
  });
});
