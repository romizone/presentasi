import type { LayoutRect } from "./layout-types";

export function rectsOverlap(
  a: LayoutRect,
  b: LayoutRect,
  epsilon = 0.001,
): boolean {
  return (
    a.x + a.w > b.x + epsilon &&
    b.x + b.w > a.x + epsilon &&
    a.y + a.h > b.y + epsilon &&
    b.y + b.h > a.y + epsilon
  );
}

export function rectWithin(
  inner: LayoutRect,
  outer: LayoutRect,
  epsilon = 0.001,
): boolean {
  return (
    inner.x >= outer.x - epsilon &&
    inner.y >= outer.y - epsilon &&
    inner.x + inner.w <= outer.x + outer.w + epsilon &&
    inner.y + inner.h <= outer.y + outer.h + epsilon
  );
}

export function slideBounds(width: number, height: number): LayoutRect {
  return { x: 0, y: 0, w: width, h: height };
}

export function centerX(rect: LayoutRect, width: number): number {
  return rect.x + (rect.w - width) / 2;
}
