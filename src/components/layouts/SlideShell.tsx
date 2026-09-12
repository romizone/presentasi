import type { CSSProperties, ReactNode } from "react";
import type { Slide, StyleId } from "@/lib/schema";
import { STYLES } from "@/lib/styles";

export type LayoutProps = {
  slide: Slide;
  styleId: StyleId;
  chartSvg?: string;
};

function parseRatio(ratio: string): { w: number; h: number } {
  const parts = ratio.split(":");
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { w: 16, h: 9 };
  }
  return { w, h };
}

export function styleVars(styleId: StyleId): CSSProperties {
  const tokens = STYLES[styleId].tokens;
  const { w, h } = parseRatio(tokens.ratio);
  return {
    ["--df-accent" as string]: tokens.accent ?? tokens.palette[0] ?? "#0B3C5D",
    ["--df-accent-bar" as string]:
      tokens.accentBar ?? tokens.accent ?? "#E3120B",
    ["--df-bg" as string]: tokens.bg ?? "#FFFFFF",
    ["--df-muted" as string]: tokens.muted ?? "#5A6B7B",
    ["--df-fg" as string]:
      tokens.contrast === "high" ? "#111111" : "#1A1A1A",
    ["--df-font" as string]: `"${tokens.font}", system-ui, sans-serif`,
    ["--df-h1" as string]: `${tokens.h1 ?? 32}px`,
    ["--df-body" as string]: `${tokens.body ?? 18}px`,
    ["--df-ratio-w" as string]: String(w),
    ["--df-ratio-h" as string]: String(h),
  };
}

export function SlideShell({
  styleId,
  children,
  className = "",
}: {
  styleId: StyleId;
  children: ReactNode;
  className?: string;
}) {
  const isEditorial = styleId === "editorial";
  const isDense = styleId === "dense";
  const classes = [
    "df-slide",
    isEditorial ? "df-slide--editorial" : "",
    isDense ? "df-slide--dense" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} style={styleVars(styleId)} data-style={styleId}>
      {isEditorial ? <div className="df-slide__accent-bar" aria-hidden /> : null}
      <div className="df-slide__inner">{children}</div>
    </div>
  );
}

export function SlideHeader({
  slide,
  styleId,
}: {
  slide: Slide;
  styleId: StyleId;
}) {
  return (
    <header>
      <h2 className="df-slide__title">{slide.actionTitle}</h2>
      {slide.subtitle ? (
        <p className="df-slide__subtitle">{slide.subtitle}</p>
      ) : null}
      {styleId !== "editorial" && slide.body.length > 0 ? (
        <ul className="df-slide__body">
          {slide.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

export function SourceFooter({ source }: { source: string }) {
  if (!source.trim()) return null;
  return <footer className="df-slide__source">Source: {source}</footer>;
}

export function ChartSlot({
  chartSvg,
  className = "",
}: {
  chartSvg?: string;
  className?: string;
}) {
  if (!chartSvg) {
    return <div className={`df-slide__chart ${className}`.trim()} />;
  }
  return (
    <div
      className={`df-slide__chart ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: chartSvg }}
    />
  );
}
