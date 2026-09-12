import { strategyConsultingTheme } from "./strategy-consulting";
import type { Theme } from "./types";

export type { Theme, ThemeColors } from "./types";
export { strategyConsultingTheme };

export function getTheme(styleId: string): Theme {
  if (styleId === "strategyConsulting") {
    return strategyConsultingTheme;
  }
  throw new Error(`Unknown styleId "${styleId}"`);
}
