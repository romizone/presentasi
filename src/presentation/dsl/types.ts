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

export const REGISTERED_ARCHETYPES = ["TR-01"] as const;
export type ArchetypeId = (typeof REGISTERED_ARCHETYPES)[number];

export type VisualEmphasis = "current" | "target" | "gap" | "balanced";

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

export type SlideVisual = {
  type: "current-target-comparison";
  emphasis: VisualEmphasis;
  currentScene?: string;
  targetScene?: string;
};

export type SceneAsset = {
  mimeType: string;
  dataUri: string;
};

export type PresentationAssets = {
  currentScene?: SceneAsset;
  targetScene?: SceneAsset;
};

export type Slide = {
  id: string;
  archetype: ArchetypeId;
  actionTitle: string;
  keyMessage: string;
  content: Tr01Content;
  visual: SlideVisual;
  notes?: string;
  sources?: string[];
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
