/**
 * Dev-only: render every archetype sample to a static HTML sheet.
 *
 * Geometry tests prove nodes stay in bounds; they cannot tell you a card is
 * two thirds empty. Run this after touching a layout function:
 *   pnpm preview:slides out.html
 */
import { writeFileSync } from "node:fs";
import { sampleIg01Presentation } from "../src/presentation/dsl/sample-ig01";
import { samplePresentation } from "../src/presentation/dsl/sample-tr01";
import { layoutSlide } from "../src/presentation/archetypes/registry";
import type { LayoutIR, LayoutNode } from "../src/presentation/archetypes/layout-types";
import { themeFromPalette } from "../src/presentation/themes/palette";
import { strategyConsultingTheme } from "../src/presentation/themes/strategy-consulting";

const PX = 96;

function nodeHtml(node: LayoutNode): string {
  const base = `position:absolute;left:${node.rect.x * PX}px;top:${node.rect.y * PX}px;width:${node.rect.w * PX}px;height:${node.rect.h * PX}px;z-index:${node.zIndex};`;
  if (node.kind === "text") {
    return `<div style="${base}font-size:${node.fontSize * (PX / 72)}px;font-weight:${node.fontWeight};color:${node.color};text-align:${node.align};display:flex;align-items:${node.valign === "middle" ? "center" : node.valign === "bottom" ? "flex-end" : "flex-start"};justify-content:${node.align === "center" ? "center" : node.align === "right" ? "flex-end" : "flex-start"};line-height:1.25;overflow:hidden;">${node.text}</div>`;
  }
  if (node.kind === "icon") {
    return `<div style="${base}border:2.5px solid ${node.color};border-radius:4px;"></div>`;
  }
  if (node.kind === "image") {
    return `<img src="${node.dataUri}" style="${base}object-fit:cover;" />`;
  }
  const stroke = node.stroke ? `border:${node.strokeWidth ?? 1}px solid ${node.stroke};` : "";
  const radius = node.kind === "shape" && node.shape === "roundRect" ? `border-radius:${(node.radius ?? 0.04) * PX}px;` : "";
  const ellipse = node.kind === "shape" && node.shape === "ellipse" ? "border-radius:50%;" : "";
  return `<div style="${base}background:${node.fill};${stroke}${radius}${ellipse}"></div>`;
}

function slideHtml(layout: LayoutIR, label: string): string {
  const nodes = [...layout.nodes].sort((a, b) => a.zIndex - b.zIndex).map(nodeHtml).join("");
  return `<figure><figcaption>${label}</figcaption><div style="position:relative;width:${layout.slideWidth * PX}px;height:${layout.slideHeight * PX}px;background:${layout.background};box-shadow:0 2px 18px rgba(0,0,0,.18);overflow:hidden;">${nodes}</div></figure>`;
}

const derived = themeFromPalette(["#FFF6E8", "#3D5A5B", "#C4703C", "#7A8B8C"]);
const sections = [samplePresentation, sampleIg01Presentation].flatMap(
  (presentation) =>
    presentation.slides.flatMap((slide) => [
      slideHtml(
        layoutSlide(slide, strategyConsultingTheme, presentation.assets),
        `${slide.id} — built-in theme`,
      ),
      slideHtml(
        layoutSlide(slide, derived, presentation.assets),
        `${slide.id} — derived theme`,
      ),
    ]),
);

writeFileSync(
  process.argv[2] ?? "slides-preview.html",
  `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:24px;background:#EEF1F4;font-family:'Source Sans 3',Arial,sans-serif;display:flex;flex-direction:column;gap:24px;align-items:flex-start;">${sections.join("")}</body>`,
);
