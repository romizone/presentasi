export type StyleId = "consulting" | "editorial" | "dense" | "card";

export type StyleTokens = {
  ratio: string;
  font: string;
  h1?: number;
  body?: number;
  accent?: string;
  accentBar?: string;
  bg?: string;
  muted?: string;
  contrast?: string;
  numeralScale?: number;
  palette: string[];
};

export type ChartDefaults = {
  default?: string;
  gridlines?: boolean | string;
  dataLabels?: boolean;
  sortDescending?: boolean;
  dataInkMax?: boolean;
  iconAugmented?: boolean;
};

export type StylePreset = {
  id: StyleId;
  tokens: StyleTokens;
  /** Narrative rules injected into writer prompts. */
  rules: string;
  charts: ChartDefaults;
  /** How images are used for this style (prompt guidance, not layout). */
  images: string;
  /**
   * Appended to every image prompt for visual consistency.
   * Decorative only — never mention chart/graph/diagram.
   * Must end with: no text, no letters, no numbers, no watermark
   */
  imageSuffix: string;
  /** @deprecated Prefer imageSuffix — kept for SPEC naming */
  STYLE_SUFFIX?: string;
};
