import { describe, expect, it } from "vitest";
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
});
