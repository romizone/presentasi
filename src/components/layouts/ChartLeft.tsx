import {
  ChartSlot,
  SlideHeader,
  SlideShell,
  SourceFooter,
  type LayoutProps,
} from "./SlideShell";

export function ChartLeft({ slide, styleId, chartSvg }: LayoutProps) {
  return (
    <SlideShell styleId={styleId}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 0.85fr",
          gap: "1.25rem",
          flex: 1,
          minHeight: 0,
          alignItems: "stretch",
        }}
      >
        <ChartSlot chartSvg={chartSvg} />
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <SlideHeader slide={slide} styleId={styleId} />
          <SourceFooter source={slide.chart.source} />
        </div>
      </div>
    </SlideShell>
  );
}
