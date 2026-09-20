import type {
  ArchetypeId,
  PresentationAssets,
  Slide,
  SlideOf,
} from "../dsl/types";
import type { Theme } from "../themes/types";
import { layoutIg01 } from "./ig-01";
import type { LayoutIR, LayoutOptions } from "./layout-types";
import { layoutTr01 } from "./tr-01";

type LayoutFn<S extends Slide> = (
  slide: S,
  theme: Theme,
  assets?: PresentationAssets,
  options?: LayoutOptions,
) => LayoutIR;

/**
 * Every registered archetype, keyed by id. Adding one here is a compile error
 * until its layout function accepts the matching slide variant.
 */
const layouts: { [K in ArchetypeId]: LayoutFn<SlideOf<K>> } = {
  "TR-01": layoutTr01,
  "IG-01": layoutIg01,
};

export function layoutSlide(
  slide: Slide,
  theme: Theme,
  assets?: PresentationAssets,
  options?: LayoutOptions,
): LayoutIR {
  switch (slide.archetype) {
    case "TR-01":
      return layouts["TR-01"](slide, theme, assets, options);
    case "IG-01":
      return layouts["IG-01"](slide, theme, assets, options);
    default: {
      const exhaustive: never = slide;
      throw new Error(
        `No layout function registered for archetype ${
          (exhaustive as Slide).archetype
        }`,
      );
    }
  }
}
