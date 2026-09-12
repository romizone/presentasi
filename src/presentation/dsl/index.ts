export { findForbiddenLayoutKeys } from "./forbidden";
export { samplePresentation } from "./sample-tr01";
export { DSL_VERSION, FORBIDDEN_LAYOUT_KEYS, REGISTERED_ARCHETYPES } from "./types";
export type {
  ArchetypeId,
  Presentation,
  PresentationAssets,
  SceneAsset,
  Slide,
  SlideVisual,
  Tr01Content,
  VisualEmphasis,
} from "./types";
export { DslValidationError, validatePresentation } from "./validate";
