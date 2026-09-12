export const SLIDE_WIDTH_IN = 13.3333333333;
export const SLIDE_HEIGHT_IN = 7.5;
export const SLIDE_ASPECT_RATIO = "16:9" as const;

export type LayoutRect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GradientFill = {
  angle: number;
  stops: { color: string; at: number }[];
};

export type LayoutShapeKind =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "chevron"
  | "lightningBolt"
  | "star5"
  | "heart"
  | "donut"
  | "cloud"
  | "plus"
  | "hexagon"
  | "sun"
  | "wave"
  | "gear6"
  | "circularArrow"
  | "ribbon"
  | "flowChartDocument"
  | "cube"
  | "pentagon";

export type SlideIconId =
  | "search"
  | "clipboard"
  | "layers"
  | "eye"
  | "zap"
  | "activity"
  | "link"
  | "check"
  | "sparkles"
  | "utensils"
  | "heart"
  | "graduation"
  | "users"
  | "refresh"
  | "shield"
  | "lightbulb"
  | "arrowRight";

type LayoutNodeBase = {
  id: string;
  role: string;
  zIndex: number;
  frame?: boolean;
};

type Painted = {
  fill: string;
  gradient?: GradientFill;
  stroke?: string;
  strokeWidth?: number;
  transparency?: number;
};

export type RectNode = LayoutNodeBase &
  Painted & {
    kind: "rect";
    rect: LayoutRect;
    radius?: number;
  };

export type ShapeNode = LayoutNodeBase &
  Painted & {
    kind: "shape";
    shape: LayoutShapeKind;
    rect: LayoutRect;
    radius?: number;
  };

export type TextNode = LayoutNodeBase & {
  kind: "text";
  rect: LayoutRect;
  text: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
  color: string;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  italic?: boolean;
};

export type IconNode = LayoutNodeBase & {
  kind: "icon";
  rect: LayoutRect;
  icon: SlideIconId;
  color: string;
};

export type ImageNode = LayoutNodeBase & {
  kind: "image";
  rect: LayoutRect;
  dataUri: string;
  radius?: number;
};

export type LayoutNode = RectNode | ShapeNode | TextNode | IconNode | ImageNode;

export type LayoutIR = {
  slideWidth: typeof SLIDE_WIDTH_IN;
  slideHeight: typeof SLIDE_HEIGHT_IN;
  aspectRatio: typeof SLIDE_ASPECT_RATIO;
  archetype: "TR-01";
  background: string;
  backgroundGradient?: GradientFill;
  nodes: LayoutNode[];
};

export type LayoutOptions = {
  reservePhotoSlots?: boolean;
};
