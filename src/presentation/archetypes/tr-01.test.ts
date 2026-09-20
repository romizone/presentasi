import { describe, expect, it } from "vitest";
import { samplePresentation } from "../dsl/sample-tr01";
import { strategyConsultingTheme } from "../themes/strategy-consulting";
import { rectsOverlap, rectWithin, slideBounds } from "./geometry";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_HEIGHT_IN,
  SLIDE_WIDTH_IN,
} from "./layout-types";
import { layoutTr01 } from "./tr-01";

describe("TR-01 layout engine", () => {
  const slide = samplePresentation.slides[0];

  if (!slide || slide.archetype !== "TR-01") {
    throw new Error("sample presentation is missing TR-01");
  }

  const layout = layoutTr01(slide, strategyConsultingTheme);

  it("uses a 16:9 canvas in inches", () => {
    expect(layout.aspectRatio).toBe(SLIDE_ASPECT_RATIO);
    expect(layout.slideWidth).toBeCloseTo(SLIDE_WIDTH_IN);
    expect(layout.slideHeight).toBeCloseTo(SLIDE_HEIGHT_IN);
    expect(layout.slideWidth / layout.slideHeight).toBeCloseTo(16 / 9, 5);
  });

  it("is deterministic", () => {
    const again = layoutTr01(slide, strategyConsultingTheme);
    expect(JSON.stringify(again)).toBe(JSON.stringify(layout));
  });

  it("keeps every node inside the slide", () => {
    const bounds = slideBounds(layout.slideWidth, layout.slideHeight);
    for (const node of layout.nodes) {
      expect(rectWithin(node.rect, bounds), node.id).toBe(true);
    }
  });

  it("does not overlap primary frames", () => {
    const frames = layout.nodes.filter((node) => node.frame);
    for (let i = 0; i < frames.length; i += 1) {
      for (let j = i + 1; j < frames.length; j += 1) {
        const a = frames[i];
        const b = frames[j];
        if (!a || !b) {
          continue;
        }
        expect(
          rectsOverlap(a.rect, b.rect),
          `${a.id} overlaps ${b.id}`,
        ).toBe(false);
      }
    }
  });

  it("places current left, transformation center, and target right", () => {
    const current = layout.nodes.find((node) => node.id === "current-card");
    const transform = layout.nodes.find((node) => node.id === "transform-frame");
    const target = layout.nodes.find((node) => node.id === "target-card");
    const title = layout.nodes.find((node) => node.id === "action-title");
    const takeaway = layout.nodes.find((node) => node.id === "takeaway-card");

    expect(current && transform && target && title && takeaway).toBeTruthy();
    if (!current || !transform || !target || !title || !takeaway) {
      return;
    }

    expect(current.rect.x).toBeLessThan(transform.rect.x);
    expect(transform.rect.x).toBeLessThan(target.rect.x);
    expect(title.rect.y + title.rect.h).toBeLessThan(current.rect.y);
    expect(current.rect.y + current.rect.h).toBeLessThan(takeaway.rect.y);
  });

  it("keeps current and target cards the same height", () => {
    const current = layout.nodes.find((node) => node.id === "current-card");
    const target = layout.nodes.find((node) => node.id === "target-card");
    expect(current && target).toBeTruthy();
    if (!current || !target) {
      return;
    }
    expect(current.rect.h).toBe(target.rect.h);
    expect(current.rect.y).toBe(target.rect.y);
  });

  it("always reserves decorative graphic panels", () => {
    expect(layout.nodes.some((node) => node.id === "current-photo-slot")).toBe(
      true,
    );
    expect(layout.nodes.some((node) => node.id === "target-photo-slot")).toBe(
      true,
    );
    expect(layout.nodes.some((node) => node.kind === "image")).toBe(false);
    expect(layout.nodes.some((node) => node.id === "blob-tr")).toBe(false);
    expect(layout.nodes.some((node) => node.id === "current-index-0")).toBe(
      true,
    );
  });

  it("places decorative scene images when scene assets exist", () => {
    const photo =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const withPhotos = layoutTr01(slide, strategyConsultingTheme, {
      currentScene: { mimeType: "image/png", dataUri: photo },
      targetScene: { mimeType: "image/png", dataUri: photo },
    });
    const currentPhoto = withPhotos.nodes.find((node) => node.id === "current-photo");
    const targetPhoto = withPhotos.nodes.find((node) => node.id === "target-photo");
    expect(currentPhoto?.kind).toBe("image");
    expect(targetPhoto?.kind).toBe("image");
    const bounds = slideBounds(withPhotos.slideWidth, withPhotos.slideHeight);
    if (currentPhoto) {
      expect(rectWithin(currentPhoto.rect, bounds)).toBe(true);
    }
  });

  it("keeps photo bands aligned when only one scene exists", () => {
    const photo =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const layout = layoutTr01(slide, strategyConsultingTheme, {
      currentScene: { mimeType: "image/png", dataUri: photo },
    });
    const currentPhoto = layout.nodes.find((node) => node.id === "current-photo");
    const targetSlot = layout.nodes.find((node) => node.id === "target-photo-slot");
    expect(currentPhoto && targetSlot).toBeTruthy();
    if (!currentPhoto || !targetSlot) {
      return;
    }
    expect(currentPhoto.rect.y).toBe(targetSlot.rect.y);
    expect(currentPhoto.rect.h).toBe(targetSlot.rect.h);
  });

  it("keeps an insight action title above the exhibit", () => {
    const title = layout.nodes.find((node) => node.id === "action-title");
    const rule = layout.nodes.find((node) => node.id === "title-rule");
    expect(title?.kind).toBe("text");
    expect(rule?.kind).toBe("rect");
    if (title?.kind === "text") {
      expect(title.fontSize).toBe(20);
      expect(title.fontWeight).toBe(700);
    }
  });
});
