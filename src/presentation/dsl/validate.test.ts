import { describe, expect, it } from "vitest";
import { sampleIg01Presentation } from "./sample-ig01";
import { samplePresentation } from "./sample-tr01";
import { DslValidationError, validatePresentation } from "./validate";

describe("Presentation DSL validation", () => {
  it("accepts the canonical TR-01 sample", () => {
    const presentation = validatePresentation(samplePresentation);
    expect(presentation.slides).toHaveLength(1);
    expect(presentation.slides[0]?.archetype).toBe("TR-01");
    expect(presentation.slides[0]?.actionTitle).toContain("Automated discovery");
  });

  it("rejects physical coordinates in the DSL", () => {
    const invalid = {
      ...samplePresentation,
      slides: [
        {
          ...samplePresentation.slides[0],
          x: 1.2,
          y: 0.4,
        },
      ],
    };

    expect(() => validatePresentation(invalid)).toThrow(DslValidationError);
    try {
      validatePresentation(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(DslValidationError);
      if (error instanceof DslValidationError) {
        expect(error.issues.some((issue) => issue.endsWith(".x"))).toBe(true);
      }
    }
  });

  it("rejects nested layout fields such as fontSize", () => {
    const invalid = structuredClone(samplePresentation);
    const slide = invalid.slides[0];
    if (!slide) {
      throw new Error("missing slide");
    }
    Object.assign(slide.content, { fontSize: 18 });

    expect(() => validatePresentation(invalid)).toThrow(/physical layout/i);
  });

  it("rejects a missing action title", () => {
    const invalid = {
      ...samplePresentation,
      slides: [
        {
          ...samplePresentation.slides[0],
          actionTitle: "",
        },
      ],
    };

    expect(() => validatePresentation(invalid)).toThrow(/actionTitle/);
  });

  it("rejects an unregistered archetype", () => {
    const invalid = {
      ...samplePresentation,
      slides: [
        {
          ...samplePresentation.slides[0],
          archetype: "EX-01",
        },
      ],
    };

    expect(() => validatePresentation(invalid)).toThrow(/not registered/);
  });

  it("accepts the canonical IG-01 sample", () => {
    const presentation = validatePresentation(sampleIg01Presentation);
    expect(presentation.slides).toHaveLength(2);
    const first = presentation.slides[0];
    expect(first?.archetype).toBe("IG-01");
    if (first?.archetype !== "IG-01") {
      throw new Error("expected an IG-01 slide");
    }
    expect(first.content.cards).toHaveLength(3);
    expect(first.content.cards[0]?.metric).toBe("+18%");
    expect(first.visual.emphasis).toBe("metric");
  });

  it("rejects a card grid that is too dense for one slide", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { content: { cards: unknown[] } }[];
    };
    const slide = invalid.slides[0];
    if (!slide) throw new Error("missing slide");
    slide.content.cards = Array.from({ length: 7 }, () => ({
      heading: "Pilar",
      body: "Penjelasan",
    }));

    expect(() => validatePresentation(invalid)).toThrow(/between 2 and 6 cards/);
  });

  it("rejects a card grid with a single card", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { content: { cards: unknown[] } }[];
    };
    const slide = invalid.slides[0];
    if (!slide) throw new Error("missing slide");
    slide.content.cards = [{ heading: "Pilar", body: "Penjelasan" }];

    expect(() => validatePresentation(invalid)).toThrow(/between 2 and 6 cards/);
  });

  it("rejects a card without body copy", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { content: { cards: { body: string }[] } }[];
    };
    const card = invalid.slides[0]?.content.cards[0];
    if (!card) throw new Error("missing card");
    card.body = "";

    expect(() => validatePresentation(invalid)).toThrow(/cards\[0\]\.body/);
  });

  it("rejects an emphasis that does not belong to IG-01", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { visual: { emphasis: string } }[];
    };
    const slide = invalid.slides[0];
    if (!slide) throw new Error("missing slide");
    slide.visual.emphasis = "target";

    expect(() => validatePresentation(invalid)).toThrow(/visual.emphasis is invalid/);
  });

  it("rejects a TR-01 visual on an IG-01 slide", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { visual: { type: string } }[];
    };
    const slide = invalid.slides[0];
    if (!slide) throw new Error("missing slide");
    slide.visual.type = "current-target-comparison";

    expect(() => validatePresentation(invalid)).toThrow(/invalid for IG-01/);
  });

  it("still rejects an unregistered archetype", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { archetype: string }[];
    };
    const slide = invalid.slides[0];
    if (!slide) throw new Error("missing slide");
    slide.archetype = "IG-99";

    expect(() => validatePresentation(invalid)).toThrow(/is not registered/);
  });

  it("rejects physical coordinates inside a card", () => {
    const invalid = structuredClone(sampleIg01Presentation) as {
      slides: { content: { cards: Record<string, unknown>[] } }[];
    };
    const card = invalid.slides[0]?.content.cards[0];
    if (!card) throw new Error("missing card");
    card.w = 3.2;

    expect(() => validatePresentation(invalid)).toThrow(/physical layout/);
  });
});
