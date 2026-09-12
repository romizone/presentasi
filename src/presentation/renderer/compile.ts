import { layoutSlide } from "../archetypes/registry";
import type { LayoutIR, LayoutOptions } from "../archetypes/layout-types";
import { validatePresentation, type Presentation } from "../dsl";
import { getTheme, type Theme } from "../themes";

export type CompiledPresentation = {
  presentation: Presentation;
  layouts: LayoutIR[];
  theme: Theme;
};

export function compilePresentation(
  input: unknown,
  theme?: Theme,
  options?: LayoutOptions,
): CompiledPresentation {
  const presentation = validatePresentation(input);
  const resolvedTheme = theme ?? getTheme(presentation.styleId);
  return {
    presentation,
    theme: resolvedTheme,
    layouts: presentation.slides.map((slide) =>
      layoutSlide(slide, resolvedTheme, presentation.assets, options),
    ),
  };
}
