/**
 * Semantic Presentation DSL.
 * AI and authors emit this structure. It must never contain physical coordinates.
 */

export const DSL_VERSION = "1.0.0" as const;

export const FORBIDDEN_LAYOUT_KEYS = [
  "x",
  "y",
  "w",
  "h",
  "left",
  "top",
  "cx",
  "cy",
  "fontSize",
  "translate",
  "coordinates",
] as const;

export const REGISTERED_ARCHETYPES = ["TR-01", "IG-01"] as const;
export type ArchetypeId = (typeof REGISTERED_ARCHETYPES)[number];

export type VisualEmphasis = "current" | "target" | "gap" | "balanced";

/* ------------------------------------------------------------------ TR-01 */

export type Tr01Content = {
  current: {
    title: string;
    items: string[];
  };
  transformation: {
    label: string;
  };
  target: {
    title: string;
    items: string[];
  };
  takeaway: string;
};

export type Tr01Visual = {
  type: "current-target-comparison";
  emphasis: VisualEmphasis;
  currentScene?: string;
  targetScene?: string;
};

/* ------------------------------------------------------------------ IG-01 */

export const IG01_MIN_CARDS = 2;
export const IG01_MAX_CARDS = 6;

/**
 * How a card grid carries its weight.
 * - `metric`    headline figures lead; the prose supports them.
 * - `narrative` prose leads; figures are suppressed even when present.
 * - `balanced`  both are rendered at equal weight.
 */
export type CardEmphasis = "metric" | "narrative" | "balanced";

export type CardGridCard = {
  heading: string;
  body: string;
  /** Headline figure such as "68%" or "3x". Suppressed when emphasis is `narrative`. */
  metric?: string;
  /**
   * Free-text concept word ("security", "gizi", "automation").
   * The archetype maps it onto a registered icon — a model never names the enum.
   */
  iconHint?: string;
};

export type Ig01Content = {
  kicker?: string;
  cards: CardGridCard[];
  takeaway?: string;
};

export type Ig01Visual = {
  type: "card-grid";
  emphasis: CardEmphasis;
};

/* ------------------------------------------------------------------ slides */

export type SlideVisual = Tr01Visual | Ig01Visual;

type SlideBase = {
  id: string;
  actionTitle: string;
  keyMessage: string;
  notes?: string;
  sources?: string[];
};

export type Tr01Slide = SlideBase & {
  archetype: "TR-01";
  content: Tr01Content;
  visual: Tr01Visual;
};

export type Ig01Slide = SlideBase & {
  archetype: "IG-01";
  content: Ig01Content;
  visual: Ig01Visual;
};

export type Slide = Tr01Slide | Ig01Slide;

/** The slide variant that belongs to a given archetype. */
export type SlideOf<K extends ArchetypeId> = Extract<Slide, { archetype: K }>;

/* ------------------------------------------------------------------ assets */

export type SceneAsset = {
  mimeType: string;
  dataUri: string;
};

export type PresentationAssets = {
  currentScene?: SceneAsset;
  targetScene?: SceneAsset;
};

export type Presentation = {
  dslVersion: typeof DSL_VERSION;
  id: string;
  title: string;
  styleId: "strategyConsulting";
  audience?: string;
  objective?: string;
  slides: Slide[];
  assets?: PresentationAssets;
};
