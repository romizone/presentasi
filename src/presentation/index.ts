export { compilePresentation } from "./renderer/compile";
export type { CompiledPresentation } from "./renderer/compile";
export { samplePresentation, validatePresentation } from "./dsl";
export { layoutSlide, SLIDE_HEIGHT_IN, SLIDE_WIDTH_IN } from "./archetypes";
export { strategyConsultingTheme } from "./themes";
export { SlideCanvas } from "./renderer/web";
export { buildPptxBuffer } from "./renderer/pptx";
