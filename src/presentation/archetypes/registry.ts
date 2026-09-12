import type { ArchetypeId, PresentationAssets, Slide } from "../dsl/types";
import type { Theme } from "../themes/types";
import type { LayoutIR, LayoutOptions } from "./layout-types";
import { layoutTr01 } from "./tr-01";

type LayoutFn = (
  slide: Slide,
  theme: Theme,
  assets?: PresentationAssets,
  options?: LayoutOptions,
) => LayoutIR;

const layouts: Record<ArchetypeId, LayoutFn> = {
  "TR-01": layoutTr01,
};

export function layoutSlide(
  slide: Slide,
  theme: Theme,
  assets?: PresentationAssets,
  options?: LayoutOptions,
): LayoutIR {
  const layout = layouts[slide.archetype];
  if (!layout) {
    throw new Error(`No layout function registered for archetype ${slide.archetype}`);
  }
  return layout(slide, theme, assets, options);
}

