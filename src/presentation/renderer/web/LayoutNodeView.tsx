"use client";

import type { CSSProperties } from "react";
import type {
  LayoutNode,
  RectNode,
  ShapeNode,
} from "../../archetypes/layout-types";
import { IconGlyph } from "./IconGlyph";

function Chevron({ fill }: { fill: string }) {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 88 28"
    >
      <path d="M0 10.5h52V3.2L86 14 52 24.8V17.5H0V10.5Z" fill={fill} />
    </svg>
  );
}

function strokeStyle(
  node: LayoutNode,
  pxPerInch: number,
): string | undefined {
  if (
    node.kind === "text" ||
    node.kind === "icon" ||
    node.kind === "image" ||
    !node.stroke
  ) {
    return undefined;
  }
  const points = node.strokeWidth ?? 0.75;
  const px = Math.max(1, (points / 72) * pxPerInch);
  return `${px}px solid ${node.stroke}`;
}

function paintBackground(node: RectNode | ShapeNode): string {
  if (node.gradient) {
    const stops = node.gradient.stops
      .map((stop) => `${stop.color} ${stop.at * 100}%`)
      .join(", ");
    return `linear-gradient(${node.gradient.angle}deg, ${stops})`;
  }
  return node.fill;
}

function paintOpacity(node: RectNode | ShapeNode): number | undefined {
  if (node.transparency == null) {
    return undefined;
  }
  return Math.max(0, 1 - node.transparency / 100);
}

export function LayoutNodeView({
  node,
  pxPerInch,
}: {
  node: LayoutNode;
  pxPerInch: number;
}) {
  const style: CSSProperties = {
    position: "absolute",
    left: node.rect.x * pxPerInch,
    top: node.rect.y * pxPerInch,
    width: node.rect.w * pxPerInch,
    height: node.rect.h * pxPerInch,
    zIndex: node.zIndex,
    boxSizing: "border-box",
  };

  if (node.kind === "text") {
    return (
      <div
        style={{
          ...style,
          display: "flex",
          flexDirection: "column",
          alignItems:
            node.align === "left"
              ? "flex-start"
              : node.align === "right"
                ? "flex-end"
                : "center",
          justifyContent:
            node.valign === "top"
              ? "flex-start"
              : node.valign === "bottom"
                ? "flex-end"
                : "center",
          color: node.color,
          fontSize: (node.fontSize / 72) * pxPerInch,
          fontWeight: node.fontWeight,
          fontStyle: node.italic ? "italic" : "normal",
          textAlign: node.align,
          lineHeight: node.fontSize >= 18 ? 1.15 : 1.28,
          letterSpacing:
            node.fontWeight === 700 && node.fontSize <= 11 ? "0.12em" : undefined,
          overflow: "hidden",
          overflowWrap: "break-word",
          wordBreak: "normal",
        }}
      >
        {node.text}
      </div>
    );
  }

  if (node.kind === "icon") {
    return (
      <div style={{ ...style, overflow: "visible" }}>
        <IconGlyph icon={node.icon} color={node.color} />
      </div>
    );
  }

  if (node.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={node.dataUri}
        alt=""
        style={{
          ...style,
          objectFit: "cover",
          objectPosition: "center",
          borderRadius: (node.radius ?? 0.02) * pxPerInch,
        }}
      />
    );
  }

  if (node.kind === "rect") {
    return (
      <div
        style={{
          ...style,
          background: paintBackground(node),
          opacity: paintOpacity(node),
          border: strokeStyle(node, pxPerInch),
        }}
      />
    );
  }

  if (node.shape === "chevron") {
    return (
      <div style={{ ...style, overflow: "visible", opacity: paintOpacity(node) }}>
        <Chevron fill={node.fill} />
      </div>
    );
  }

  if (node.shape === "ellipse") {
    return (
      <div
        style={{
          ...style,
          background: paintBackground(node),
          opacity: paintOpacity(node),
          borderRadius: 999,
        }}
      />
    );
  }

  const radiusPx =
    (node.radius ?? (node.shape === "roundRect" ? 0.14 : 0)) * pxPerInch;

  return (
    <div
      className={node.role.endsWith("-photo-slot") ? "photo-slot-pulse" : undefined}
      style={{
        ...style,
        background: paintBackground(node),
        opacity: paintOpacity(node),
        borderRadius: radiusPx,
        overflow: "hidden",
        border: strokeStyle(node, pxPerInch),
      }}
    />
  );
}
