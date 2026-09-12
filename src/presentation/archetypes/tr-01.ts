import type { PresentationAssets, Slide } from "../dsl/types";
import type { Theme } from "../themes/types";
import { centerX } from "./geometry";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_HEIGHT_IN,
  SLIDE_WIDTH_IN,
  type LayoutIR,
  type LayoutNode,
  type LayoutRect,
} from "./layout-types";

const MARGIN_X = 0.5;
const TITLE_Y = 0.32;
const TITLE_H = 0.58;
const RULE_Y = 0.94;
const COLUMN_Y = 1.12;
const COLUMN_H = 4.58;
const GUTTER = 0.16;
const CENTER_W = 1.22;
const HEADER_H = 0.38;
const GRAPHIC_INSET = 0.08;
const GRAPHIC_H = 2.18;
const TAKEAWAY_Y = 5.84;
const TAKEAWAY_H = 0.68;
const FOOTER_Y = 7.18;
const FOOTER_H = 0.2;

function contentWidth(): number {
  return SLIDE_WIDTH_IN - MARGIN_X * 2;
}

function columnGeometry(): {
  current: LayoutRect;
  transform: LayoutRect;
  target: LayoutRect;
} {
  const sideW = (contentWidth() - CENTER_W - GUTTER * 2) / 2;
  const current = { x: MARGIN_X, y: COLUMN_Y, w: sideW, h: COLUMN_H };
  const transform = {
    x: current.x + current.w + GUTTER,
    y: COLUMN_Y,
    w: CENTER_W,
    h: COLUMN_H,
  };
  const target = {
    x: transform.x + transform.w + GUTTER,
    y: COLUMN_Y,
    w: sideW,
    h: COLUMN_H,
  };
  return { current, transform, target };
}

function graphicRect(card: LayoutRect): LayoutRect {
  return {
    x: card.x + GRAPHIC_INSET,
    y: card.y + HEADER_H + GRAPHIC_INSET,
    w: card.w - GRAPHIC_INSET * 2,
    h: GRAPHIC_H,
  };
}

function pushColumn(
  nodes: LayoutNode[],
  opts: {
    id: string;
    role: string;
    rect: LayoutRect;
    fill: string;
    headerFill: string;
    title: string;
    items: string[];
    muted: string;
    rule: string;
    imageUri?: string;
  },
): void {
  nodes.push({
    id: `${opts.id}-card`,
    role: opts.role,
    frame: true,
    zIndex: 2,
    kind: "shape",
    shape: "roundRect",
    rect: opts.rect,
    fill: opts.fill,
    radius: 0.04,
    stroke: opts.rule,
    strokeWidth: 0.75,
  });
  nodes.push({
    id: `${opts.id}-header`,
    role: `${opts.role}-header`,
    zIndex: 3,
    kind: "rect",
    rect: {
      x: opts.rect.x,
      y: opts.rect.y,
      w: opts.rect.w,
      h: HEADER_H,
    },
    fill: opts.headerFill,
  });
  nodes.push({
    id: `${opts.id}-title`,
    role: `${opts.role}-title`,
    zIndex: 4,
    kind: "text",
    rect: {
      x: opts.rect.x + 0.16,
      y: opts.rect.y + 0.04,
      w: opts.rect.w - 0.32,
      h: 0.3,
    },
    text: opts.title,
    fontSize: 12,
    fontWeight: 700,
    color: "#FFFFFF",
    align: "left",
    valign: "middle",
  });

  const graphic = graphicRect(opts.rect);
  if (opts.imageUri) {
    nodes.push({
      id: `${opts.id}-photo`,
      role: `${opts.role}-photo`,
      zIndex: 3,
      kind: "image",
      dataUri: opts.imageUri,
      radius: 0.02,
      rect: graphic,
    });
  } else {
    nodes.push({
      id: `${opts.id}-photo-slot`,
      role: `${opts.role}-photo-slot`,
      zIndex: 3,
      kind: "shape",
      shape: "roundRect",
      fill: "#EEF3F7",
      radius: 0.02,
      rect: graphic,
    });
  }

  const rowH = opts.items.length > 3 ? 0.36 : 0.42;
  const listTop = graphic.y + graphic.h + 0.1;

  opts.items.forEach((item, index) => {
    const y = listTop + index * rowH;
    const label = String(index + 1).padStart(2, "0");
    nodes.push({
      id: `${opts.id}-index-${index}`,
      role: `${opts.role}-index`,
      zIndex: 3,
      kind: "text",
      rect: {
        x: opts.rect.x + 0.16,
        y,
        w: 0.36,
        h: rowH,
      },
      text: label,
      fontSize: 11,
      fontWeight: 700,
      color: opts.headerFill,
      align: "left",
      valign: "middle",
    });
    nodes.push({
      id: `${opts.id}-item-${index}`,
      role: `${opts.role}-item`,
      zIndex: 3,
      kind: "text",
      rect: {
        x: opts.rect.x + 0.54,
        y,
        w: opts.rect.w - 0.7,
        h: rowH,
      },
      text: item,
      fontSize: 13,
      fontWeight: 400,
      color: opts.muted,
      align: "left",
      valign: "middle",
    });
  });
}

export function layoutTr01(
  slide: Slide,
  theme: Theme,
  assets?: PresentationAssets,
): LayoutIR {
  const nodes: LayoutNode[] = [];
  const { colors } = theme;
  const columns = columnGeometry();

  nodes.push({
    id: "top-bar",
    role: "chrome",
    zIndex: 2,
    kind: "rect",
    rect: { x: 0, y: 0, w: SLIDE_WIDTH_IN, h: 0.045 },
    fill: colors.transformFill,
  });

  nodes.push({
    id: "action-title",
    role: "title",
    frame: true,
    zIndex: 3,
    kind: "text",
    rect: {
      x: MARGIN_X,
      y: TITLE_Y,
      w: contentWidth(),
      h: TITLE_H,
    },
    text: slide.actionTitle,
    fontSize: 20,
    fontWeight: 700,
    color: colors.ink,
    align: "left",
    valign: "top",
  });

  nodes.push({
    id: "title-rule",
    role: "chrome",
    zIndex: 2,
    kind: "rect",
    rect: { x: MARGIN_X, y: RULE_Y, w: contentWidth(), h: 0.012 },
    fill: colors.rule,
  });

  pushColumn(nodes, {
    id: "current",
    role: "frame-current",
    rect: columns.current,
    fill: colors.currentFill,
    headerFill: colors.currentAccent,
    title: slide.content.current.title,
    items: slide.content.current.items,
    muted: colors.muted,
    rule: colors.rule,
    imageUri: assets?.currentScene?.dataUri,
  });

  nodes.push({
    id: "transform-frame",
    role: "frame-transform",
    frame: true,
    zIndex: 1,
    kind: "rect",
    rect: columns.transform,
    fill: colors.background,
    transparency: 100,
  });

  const chevronW = 0.92;
  const chevronH = 0.26;
  nodes.push({
    id: "chevron-1",
    role: "transform-shape",
    zIndex: 3,
    kind: "shape",
    shape: "chevron",
    rect: {
      x: centerX(columns.transform, chevronW),
      y: columns.transform.y + columns.transform.h / 2 - 0.42,
      w: chevronW,
      h: chevronH,
    },
    fill: colors.transformFill,
  });
  nodes.push({
    id: "transform-label",
    role: "transform-label",
    zIndex: 3,
    kind: "text",
    rect: {
      x: columns.transform.x,
      y: columns.transform.y + columns.transform.h / 2 - 0.04,
      w: columns.transform.w,
      h: 0.7,
    },
    text: slide.content.transformation.label,
    fontSize: 11,
    fontWeight: 700,
    color: colors.transformFill,
    align: "center",
    valign: "top",
  });

  pushColumn(nodes, {
    id: "target",
    role: "frame-target",
    rect: columns.target,
    fill: colors.targetFill,
    headerFill: colors.targetAccent,
    title: slide.content.target.title,
    items: slide.content.target.items,
    muted: colors.ink,
    rule: colors.rule,
    imageUri: assets?.targetScene?.dataUri,
  });

  const takeaway: LayoutRect = {
    x: MARGIN_X,
    y: TAKEAWAY_Y,
    w: contentWidth(),
    h: TAKEAWAY_H,
  };
  nodes.push({
    id: "takeaway-card",
    role: "frame-takeaway",
    frame: true,
    zIndex: 2,
    kind: "shape",
    shape: "roundRect",
    rect: takeaway,
    fill: colors.takeawayFill,
    radius: 0.03,
    stroke: colors.rule,
    strokeWidth: 0.75,
  });
  nodes.push({
    id: "takeaway-bar",
    role: "takeaway-accent",
    zIndex: 3,
    kind: "rect",
    rect: {
      x: takeaway.x,
      y: takeaway.y,
      w: 0.07,
      h: takeaway.h,
    },
    fill: colors.transformFill,
  });
  nodes.push({
    id: "takeaway-kicker",
    role: "takeaway-kicker",
    zIndex: 3,
    kind: "text",
    rect: {
      x: takeaway.x + 0.22,
      y: takeaway.y + 0.08,
      w: takeaway.w - 0.4,
      h: 0.18,
    },
    text: "IMPLICATION",
    fontSize: 10,
    fontWeight: 700,
    color: colors.transformFill,
    align: "left",
    valign: "middle",
  });
  nodes.push({
    id: "takeaway-text",
    role: "takeaway-text",
    zIndex: 3,
    kind: "text",
    rect: {
      x: takeaway.x + 0.22,
      y: takeaway.y + 0.28,
      w: takeaway.w - 0.4,
      h: 0.32,
    },
    text: slide.content.takeaway,
    fontSize: 15,
    fontWeight: 600,
    color: colors.takeawayAccent,
    align: "left",
    valign: "middle",
  });

  nodes.push({
    id: "footer-left",
    role: "footer",
    zIndex: 2,
    kind: "text",
    rect: { x: MARGIN_X, y: FOOTER_Y, w: 6.2, h: FOOTER_H },
    text: "Source: Presentasi AI analysis",
    fontSize: 9,
    fontWeight: 400,
    color: colors.footer,
    align: "left",
    valign: "middle",
  });
  nodes.push({
    id: "footer-right",
    role: "footer",
    zIndex: 2,
    kind: "text",
    rect: {
      x: MARGIN_X + contentWidth() - 6.2,
      y: FOOTER_Y,
      w: 6.2,
      h: FOOTER_H,
    },
    text: "CONFIDENTIAL  ·  TR-01",
    fontSize: 9,
    fontWeight: 400,
    color: colors.footer,
    align: "right",
    valign: "middle",
  });

  return {
    slideWidth: SLIDE_WIDTH_IN,
    slideHeight: SLIDE_HEIGHT_IN,
    aspectRatio: SLIDE_ASPECT_RATIO,
    archetype: "TR-01",
    background: colors.background,
    nodes,
  };
}
