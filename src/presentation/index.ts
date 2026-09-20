export { compilePresentation } from "./renderer/compile";
export type { CompiledPresentation } from "./renderer/compile";
export {
  sampleIg01Presentation,
  samplePresentation,
  validatePresentation,
} from "./dsl";
export { layoutSlide, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "./archetypes";
export {
  quantizePalette,
  strategyConsultingTheme,
  themeFromPalette,
} from "./themes";
export { SlideCanvas } from "./renderer/web";
export { buildPptxBuffer } from "./renderer/pptx";
