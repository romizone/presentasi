import PptxGenJS from "pptxgenjs";
import { layoutSlide } from "../../archetypes/registry";
import type {
  IconNode,
  LayoutIR,
  LayoutNode,
  ShapeNode,
  SlideIconId,
} from "../../archetypes/layout-types";
import { validatePresentation } from "../../dsl/validate";
import type { Presentation } from "../../dsl/types";
import type { Theme } from "../../themes/types";
import { hexToPptx } from "./colors";

function asBuffer(output: string | ArrayBuffer | Blob | Uint8Array): Buffer {
  if (Buffer.isBuffer(output)) {
    return output;
  }
  if (output instanceof Uint8Array) {
    return Buffer.from(output);
  }
  if (output instanceof ArrayBuffer) {
    return Buffer.from(output);
  }
  if (typeof output === "string") {
    return Buffer.from(output, "binary");
  }
  throw new Error("Unsupported PPTX output type");
}

type PptxSlide = ReturnType<PptxGenJS["addSlide"]>;

function paintFill(node: Extract<LayoutNode, { fill: string }>) {
  const color = hexToPptx(
    node.gradient?.stops[0]?.color ?? node.fill,
  );
  return {
    color,
    transparency: node.transparency ?? 0,
  };
}

function iconShape(
  pptx: PptxGenJS,
  icon: SlideIconId,
): (typeof pptx.ShapeType)[keyof typeof pptx.ShapeType] {
  const map: Record<SlideIconId, (typeof pptx.ShapeType)[keyof typeof pptx.ShapeType]> = {
    search: pptx.ShapeType.ellipse,
    clipboard: pptx.ShapeType.flowChartDocument,
    layers: pptx.ShapeType.cube,
    eye: pptx.ShapeType.donut,
    zap: pptx.ShapeType.lightningBolt,
    activity: pptx.ShapeType.wave,
    link: pptx.ShapeType.donut,
    check: pptx.ShapeType.plus,
    sparkles: pptx.ShapeType.star5,
    utensils: pptx.ShapeType.pentagon,
    heart: pptx.ShapeType.heart,
    graduation: pptx.ShapeType.ribbon,
    users: pptx.ShapeType.ellipse,
    refresh: pptx.ShapeType.circularArrow,
    shield: pptx.ShapeType.pentagon,
    lightbulb: pptx.ShapeType.sun,
    arrowRight: pptx.ShapeType.chevron,
  };
  return map[icon];
}

function extraShape(
  pptx: PptxGenJS,
  node: ShapeNode,
): (typeof pptx.ShapeType)[keyof typeof pptx.ShapeType] | null {
  const extras: Partial<
    Record<ShapeNode["shape"], (typeof pptx.ShapeType)[keyof typeof pptx.ShapeType]>
  > = {
    lightningBolt: pptx.ShapeType.lightningBolt,
    star5: pptx.ShapeType.star5,
    heart: pptx.ShapeType.heart,
    donut: pptx.ShapeType.donut,
    cloud: pptx.ShapeType.cloud,
    plus: pptx.ShapeType.plus,
    hexagon: pptx.ShapeType.hexagon,
    sun: pptx.ShapeType.sun,
    wave: pptx.ShapeType.wave,
    gear6: pptx.ShapeType.gear6,
    circularArrow: pptx.ShapeType.circularArrow,
    ribbon: pptx.ShapeType.ribbon,
    flowChartDocument: pptx.ShapeType.flowChartDocument,
    cube: pptx.ShapeType.cube,
    pentagon: pptx.ShapeType.pentagon,
  };
  return extras[node.shape] ?? null;
}

function addIcon(pptx: PptxGenJS, slide: PptxSlide, node: IconNode): void {
  slide.addShape(iconShape(pptx, node.icon), {
    x: node.rect.x,
    y: node.rect.y,
    w: node.rect.w,
    h: node.rect.h,
    fill: { color: hexToPptx(node.color) },
    line: { color: hexToPptx(node.color), width: 0 },
  });
}

function addNode(
  pptx: PptxGenJS,
  slide: PptxSlide,
  node: LayoutNode,
  fontFace: string,
): void {
  const box = {
    x: node.rect.x,
    y: node.rect.y,
    w: node.rect.w,
    h: node.rect.h,
  };

  if (node.kind === "text") {
    slide.addText(node.text, {
      ...box,
      fontFace,
      fontSize: node.fontSize,
      bold: node.fontWeight >= 600,
      italic: Boolean(node.italic),
      color: hexToPptx(node.color),
      align: node.align,
      valign: node.valign,
      margin: 0,
      wrap: true,
    });
    return;
  }

  if (node.kind === "icon") {
    addIcon(pptx, slide, node);
    return;
  }

  if (node.kind === "image") {
    slide.addImage({
      data: node.dataUri,
      ...box,
      sizing: { type: "cover", ...box },
    });
    return;
  }

  const fill = paintFill(node);
  const line = node.stroke
    ? { color: hexToPptx(node.stroke), width: node.strokeWidth ?? 1 }
    : { color: fill.color, width: 0 };

  if (node.kind === "rect") {
    slide.addShape(pptx.ShapeType.rect, { ...box, fill, line });
    return;
  }

  if (node.shape === "ellipse") {
    slide.addShape(pptx.ShapeType.ellipse, { ...box, fill, line });
    return;
  }

  if (node.shape === "chevron") {
    slide.addShape(pptx.ShapeType.chevron, { ...box, fill, line });
    return;
  }

  if (node.shape === "rect") {
    slide.addShape(pptx.ShapeType.rect, { ...box, fill, line });
    return;
  }

  const mapped = extraShape(pptx, node);
  if (mapped) {
    slide.addShape(mapped, { ...box, fill, line });
    return;
  }

  slide.addShape(pptx.ShapeType.roundRect, {
    ...box,
    fill,
    line,
    rectRadius: node.radius ?? 0.14,
  });
}

export function layoutToPptxPresentation(
  layouts: LayoutIR[],
  presentation: Presentation,
  theme: Theme,
): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.defineLayout({
    name: "PRESENTASI_16x9",
    width: layouts[0]?.slideWidth ?? 13.3333333333,
    height: layouts[0]?.slideHeight ?? 7.5,
  });
  pptx.layout = "PRESENTASI_16x9";
  pptx.title = presentation.title;
  pptx.author = "Presentasi AI";
  pptx.subject = presentation.objective ?? presentation.title;
  pptx.company = "Presentasi AI";

  for (const layout of layouts) {
    const slide = pptx.addSlide();
    slide.background = { color: hexToPptx(layout.background) };
    const nodes = [...layout.nodes].sort((a, b) => a.zIndex - b.zIndex);
    for (const node of nodes) {
      addNode(pptx, slide, node, theme.fonts.pptx);
    }
  }

  return pptx;
}

export async function buildPptxBuffer(
  input: unknown,
  theme: Theme,
): Promise<Buffer> {
  const presentation = validatePresentation(input);
  const layouts = presentation.slides.map((slide) =>
    layoutSlide(slide, theme, presentation.assets),
  );
  const pptx = layoutToPptxPresentation(layouts, presentation, theme);
  const output = await pptx.write({ outputType: "nodebuffer" });
  return asBuffer(output);
}
