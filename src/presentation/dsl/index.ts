export { findForbiddenLayoutKeys } from "./forbidden";
export { sampleIg01Presentation } from "./sample-ig01";
export { samplePresentation } from "./sample-tr01";
export {
  DSL_VERSION,
  FORBIDDEN_LAYOUT_KEYS,
  IG01_MAX_CARDS,
  IG01_MIN_CARDS,
  REGISTERED_ARCHETYPES,
} from "./types";
export type {
  ArchetypeId,
  CardEmphasis,
  CardGridCard,
  Ig01Content,
  Ig01Slide,
  Ig01Visual,
  Presentation,
  PresentationAssets,
  SceneAsset,
  Slide,
  SlideOf,
  SlideVisual,
  Tr01Content,
  Tr01Slide,
  Tr01Visual,
  VisualEmphasis,
} from "./types";
export { DslValidationError, validatePresentation } from "./validate";
