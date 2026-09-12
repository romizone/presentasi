import {
  ChartSlot,
  SlideShell,
  SourceFooter,
  type LayoutProps,
} from "./SlideShell";

export function BigNumber({ slide, styleId, chartSvg }: LayoutProps) {
  const point = slide.chart.data[0];
  const valueLabel =
    point !== undefined
      ? `${point.value}${slide.chart.unit ? ` ${slide.chart.unit}` : ""}`
      : null;

  return (
    <SlideShell styleId={styleId}>
      <h2 className="df-slide__title">{slide.actionTitle}</h2>
      {slide.subtitle ? (
        <p className="df-slide__subtitle">{slide.subtitle}</p>
      ) : null}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "0.75rem",
          minHeight: 0,
        }}
      >
        {valueLabel ? (
          <p
            style={{
              margin: 0,
              fontSize: "calc(var(--df-h1) * 2.4)",
              fontWeight: 700,
              lineHeight: 1,
              color: "var(--df-accent)",
              letterSpacing: "-0.02em",
            }}
          >
            {valueLabel}
          </p>
        ) : (
          <ChartSlot chartSvg={chartSvg} />
        )}
        {point?.label ? (
          <p
            style={{
              margin: 0,
              fontSize: "var(--df-body)",
              color: "var(--df-muted)",
            }}
          >
            {point.label}
          </p>
        ) : null}
        {slide.chart.callout ? (
          <p
            style={{
              margin: 0,
              fontSize: "calc(var(--df-body) * 0.95)",
              color: "var(--df-fg)",
            }}
          >
            {slide.chart.callout}
          </p>
        ) : null}
        {styleId !== "editorial" && slide.body.length > 0 ? (
          <ul className="df-slide__body">
            {slide.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <SourceFooter source={slide.chart.source} />
    </SlideShell>
  );
}
