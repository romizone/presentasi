import { card } from "./card";
import { consulting } from "./consulting";
import { dense } from "./dense";
import { editorial } from "./editorial";
import type { StyleId, StylePreset } from "./types";

export type { StyleId, StylePreset, StyleTokens, ChartDefaults } from "./types";

export const STYLES: Record<StyleId, StylePreset> = {
  consulting,
  editorial,
  dense,
  card,
};

export function getStyle(id: StyleId): StylePreset {
  return STYLES[id];
}
