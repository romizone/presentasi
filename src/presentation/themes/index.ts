import { strategyConsultingTheme } from "./strategy-consulting";
import type { Theme } from "./types";

export type { Theme, ThemeColors, ThemeId } from "./types";
export { strategyConsultingTheme };
export {
  contrastRatio,
  hue,
  mix,
  parseHex,
  quantizePalette,
  readableOn,
  relativeLuminance,
  saturation,
  themeFromPalette,
  toHex,
} from "./palette";
export type { DerivedThemeOptions, QuantizeOptions, Rgb } from "./palette";

export function getTheme(styleId: string): Theme {
  if (styleId === "strategyConsulting") {
    return strategyConsultingTheme;
  }
  throw new Error(`Unknown styleId "${styleId}"`);
}
