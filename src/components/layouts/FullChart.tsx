import {
  ChartSlot,
  SlideHeader,
  SlideShell,
  SourceFooter,
  type LayoutProps,
} from "./SlideShell";

export function FullChart({ slide, styleId, chartSvg }: LayoutProps) {
  return (
    <SlideShell styleId={styleId}>
      <SlideHeader slide={slide} styleId={styleId} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: "0.75rem",
          display: "flex",
        }}
      >
        <ChartSlot chartSvg={chartSvg} />
      </div>
      <SourceFooter source={slide.chart.source} />
    </SlideShell>
  );
}
