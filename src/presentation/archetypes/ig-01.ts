import type { CardEmphasis, CardGridCard, Ig01Slide } from "../dsl/types";
import type { Theme, ThemeColors } from "../themes/types";
import { iconForCard } from "./icons";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_HEIGHT_IN,
  SLIDE_WIDTH_IN,
  type LayoutIR,
  type LayoutNode,
  type LayoutRect,
} from "./layout-types";

const MARGIN_X = 0.5;
const TOP_BAR_H = 0.045;
const KICKER_Y = 0.3;
const KICKER_H = 0.22;
const TITLE_Y_PLAIN = 0.32;
const TITLE_GAP = 0.06;
const TITLE_H = 0.58;
const RULE_GAP = 0.06;
const RULE_H = 0.012;
const GRID_GAP = 0.18;
const GUTTER = 0.18;
const TAKEAWAY_H = 0.68;
const TAKEAWAY_GAP = 0.16;
const FOOTER_Y = 7.18;
const FOOTER_H = 0.2;
const FOOTER_GAP = 0.14;
const FOOTER_W = 6.0;
const CARD_PAD = 0.2;
const TAKEAWAY_Y = FOOTER_Y - FOOTER_GAP - TAKEAWAY_H;

function contentWidth(): number {
  return SLIDE_WIDTH_IN - MARGIN_X * 2;
}

type Bands = {
  titleY: number;
  ruleY: number;
  gridTop: number;
  gridBottom: number;
};

function bands(hasKicker: boolean, hasTakeaway: boolean): Bands {
  const titleY = hasKicker ? KICKER_Y + KICKER_H + TITLE_GAP : TITLE_Y_PLAIN;
  const ruleY = titleY + TITLE_H + RULE_GAP;
  return {
    titleY,
    ruleY,
    gridTop: ruleY + RULE_H + GRID_GAP,
    gridBottom: hasTakeaway ? TAKEAWAY_Y - TAKEAWAY_GAP : FOOTER_Y - FOOTER_GAP,
  };
}

/**
 * The archetype owns the grid shape. Card count is semantic; rows and columns
 * are not, so the DSL never carries them.
 */
export function gridShape(count: number): { cols: number; rows: number } {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  return { cols: 3, rows: 2 };
}

/**
 * A card only ever needs so much height. Past that the grid stops stretching
 * and the whole block is centred in its band instead, so the slack shows up as
 * balanced margin rather than as dead space under every card.
 */
const MAX_ROW_H: Record<1 | 2, number> = { 1: 3.2, 2: 2.5 };

/**
 * Where the slack goes when the grid is shorter than its band. Splitting it
 * evenly detaches the cards from the title, so a quarter sits above and the
 * rest falls to the bottom, which is the usual editorial rhythm.
 */
const GRID_SLACK_ABOVE = 0.25;

function cardRects(count: number, grid: Bands): LayoutRect[] {
  const { cols, rows } = gridShape(count);
  const gridH = grid.gridBottom - grid.gridTop;
  const cardW = (contentWidth() - GUTTER * (cols - 1)) / cols;
  const available = (gridH - GUTTER * (rows - 1)) / rows;
  const rowH = Math.min(available, MAX_ROW_H[rows === 1 ? 1 : 2]);
  const usedH = rows * rowH + GUTTER * (rows - 1);
  const top = grid.gridTop + (gridH - usedH) * GRID_SLACK_ABOVE;

  const rects: LayoutRect[] = [];
  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    // A short final row is centred rather than left-ragged.
    const inRow = Math.min(cols, count - row * cols);
    const rowW = inRow * cardW + GUTTER * (inRow - 1);
    const rowX = MARGIN_X + (contentWidth() - rowW) / 2;
    rects.push({
      x: rowX + col * (cardW + GUTTER),
      y: top + row * (rowH + GUTTER),
      w: cardW,
      h: rowH,
    });
  }
  return rects;
}

/**
 * Line count estimated from character count. There is no text measurement at
 * layout time, so headings would otherwise need a fixed two-line reservation
 * and every one-line heading would float above a gap.
 */
function estimateLines(
  text: string,
  widthIn: number,
  fontSize: number,
  maxLines: number,
): number {
  // The sans stack averages roughly half an em per glyph.
  const charsPerLine = Math.max(8, Math.floor((widthIn * 72) / (fontSize * 0.5)));
  return Math.min(maxLines, Math.max(1, Math.ceil(text.length / charsPerLine)));
}

function lineHeightIn(fontSize: number): number {
  return (fontSize * 1.25) / 72;
}

type Scale = {
  badge: number;
  metricSize: number;
  headingSize: number;
  bodySize: number;
  headingLines: number;
  ruleW: number;
};

const SCALES: Record<1 | 2, Scale> = {
  1: {
    badge: 0.62,
    metricSize: 30,
    headingSize: 15,
    bodySize: 12,
    headingLines: 3,
    ruleW: 0.9,
  },
  2: {
    badge: 0.5,
    metricSize: 24,
    headingSize: 13,
    bodySize: 11,
    headingLines: 2,
    ruleW: 0.72,
  },
};

function metricSize(scale: Scale, emphasis: CardEmphasis): number {
  return emphasis === "metric" ? scale.metricSize : scale.metricSize - 6;
}

function pushCard(
  nodes: LayoutNode[],
  opts: {
    index: number;
    rect: LayoutRect;
    card: CardGridCard;
    emphasis: CardEmphasis;
    scale: Scale;
    colors: ThemeColors;
  },
): void {
  const { index, rect, card, emphasis, scale, colors } = opts;
  const id = `card-${index}`;

  nodes.push({
    id: `${id}-frame`,
    role: "card",
    frame: true,
    zIndex: 2,
    kind: "shape",
    shape: "roundRect",
    rect,
    fill: colors.targetFill,
    radius: 0.04,
    stroke: colors.rule,
    strokeWidth: 0.75,
  });

  const badge = scale.badge;
  let cursor = rect.y + CARD_PAD;

  nodes.push({
    id: `${id}-badge`,
    role: "card-badge",
    zIndex: 3,
    kind: "shape",
    shape: "roundRect",
    rect: { x: rect.x + CARD_PAD, y: cursor, w: badge, h: badge },
    fill: colors.targetAccent,
    radius: 0.08,
  });

  const inset = badge * 0.24;
  nodes.push({
    id: `${id}-icon`,
    role: "card-icon",
    zIndex: 4,
    kind: "icon",
    rect: {
      x: rect.x + CARD_PAD + inset,
      y: cursor + inset,
      w: badge - inset * 2,
      h: badge - inset * 2,
    },
    icon: iconForCard(index, card.iconHint, card.heading, card.body),
    color: colors.iconOnAccent,
  });

  if (card.metric && emphasis !== "narrative") {
    nodes.push({
      id: `${id}-metric`,
      role: "card-metric",
      zIndex: 3,
      kind: "text",
      rect: {
        x: rect.x + CARD_PAD + badge + 0.14,
        y: cursor,
        w: rect.w - CARD_PAD * 2 - badge - 0.14,
        h: badge,
      },
      text: card.metric,
      fontSize: metricSize(scale, emphasis),
      fontWeight: 700,
      color: colors.targetAccent,
      align: "left",
      valign: "middle",
    });
  }

  cursor += badge + 0.16;

  const innerW = rect.w - CARD_PAD * 2;
  const headingH =
    estimateLines(card.heading, innerW, scale.headingSize, scale.headingLines) *
    lineHeightIn(scale.headingSize);

  nodes.push({
    id: `${id}-heading`,
    role: "card-heading",
    zIndex: 3,
    kind: "text",
    rect: {
      x: rect.x + CARD_PAD,
      y: cursor,
      w: innerW,
      h: headingH,
    },
    text: card.heading,
    fontSize: scale.headingSize,
    fontWeight: 700,
    color: colors.ink,
    align: "left",
    valign: "top",
  });

  cursor += headingH + 0.1;

  nodes.push({
    id: `${id}-rule`,
    role: "card-rule",
    zIndex: 3,
    kind: "rect",
    rect: { x: rect.x + CARD_PAD, y: cursor, w: scale.ruleW, h: 0.03 },
    fill: colors.transformFill,
  });

  cursor += 0.03 + 0.1;

  nodes.push({
    id: `${id}-body`,
    role: "card-body",
    zIndex: 3,
    kind: "text",
    rect: {
      x: rect.x + CARD_PAD,
      y: cursor,
      w: innerW,
      h: Math.max(0.12, rect.y + rect.h - CARD_PAD - cursor),
    },
    text: card.body,
    fontSize: scale.bodySize,
    fontWeight: 400,
    color: colors.muted,
    align: "left",
    valign: "top",
  });
}

export function layoutIg01(slide: Ig01Slide, theme: Theme): LayoutIR {
  const nodes: LayoutNode[] = [];
  const { colors } = theme;
  const { kicker, cards, takeaway } = slide.content;
  const grid = bands(Boolean(kicker), Boolean(takeaway));
  const rects = cardRects(cards.length, grid);
  const scale = SCALES[gridShape(cards.length).rows === 1 ? 1 : 2];

  nodes.push({
    id: "top-bar",
    role: "chrome",
    zIndex: 2,
    kind: "rect",
    rect: { x: 0, y: 0, w: SLIDE_WIDTH_IN, h: TOP_BAR_H },
    fill: colors.transformFill,
  });

  if (kicker) {
    nodes.push({
      id: "kicker",
      role: "kicker",
      zIndex: 3,
      kind: "text",
      rect: { x: MARGIN_X, y: KICKER_Y, w: contentWidth(), h: KICKER_H },
      text: kicker.toUpperCase(),
      fontSize: 10,
      fontWeight: 700,
      color: colors.transformFill,
      align: "left",
      valign: "middle",
    });
  }

  nodes.push({
    id: "action-title",
    role: "title",
    frame: true,
    zIndex: 3,
    kind: "text",
    rect: { x: MARGIN_X, y: grid.titleY, w: contentWidth(), h: TITLE_H },
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
    rect: { x: MARGIN_X, y: grid.ruleY, w: contentWidth(), h: RULE_H },
    fill: colors.rule,
  });

  cards.forEach((card, index) => {
    const rect = rects[index];
    if (!rect) {
      return;
    }
    pushCard(nodes, {
      index,
      rect,
      card,
      emphasis: slide.visual.emphasis,
      scale,
      colors,
    });
  });

  if (takeaway) {
    const band: LayoutRect = {
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
      rect: band,
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
      rect: { x: band.x, y: band.y, w: 0.07, h: band.h },
      fill: colors.transformFill,
    });
    nodes.push({
      id: "takeaway-kicker",
      role: "takeaway-kicker",
      zIndex: 3,
      kind: "text",
      rect: { x: band.x + 0.22, y: band.y + 0.08, w: band.w - 0.4, h: 0.18 },
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
      rect: { x: band.x + 0.22, y: band.y + 0.28, w: band.w - 0.4, h: 0.32 },
      text: takeaway,
      fontSize: 15,
      fontWeight: 600,
      color: colors.takeawayAccent,
      align: "left",
      valign: "middle",
    });
  }

  const sourceLine = slide.sources?.length
    ? `Source: ${slide.sources.join("  ·  ")}`
    : "Source: Presentasi AI analysis";

  nodes.push({
    id: "footer-left",
    role: "footer",
    zIndex: 2,
    kind: "text",
    rect: { x: MARGIN_X, y: FOOTER_Y, w: FOOTER_W, h: FOOTER_H },
    text: sourceLine,
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
      x: MARGIN_X + contentWidth() - FOOTER_W,
      y: FOOTER_Y,
      w: FOOTER_W,
      h: FOOTER_H,
    },
    text: "CONFIDENTIAL  ·  IG-01",
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
    archetype: "IG-01",
    background: colors.background,
    nodes,
  };
}
