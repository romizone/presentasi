import { SlideShell, SourceFooter, type LayoutProps } from "./SlideShell";

export function ThreeColumn({ slide, styleId }: LayoutProps) {
  const columns =
    slide.body.length > 0
      ? slide.body
      : styleId === "editorial"
        ? []
        : [slide.subtitle].filter((v): v is string => Boolean(v));

  return (
    <SlideShell styleId={styleId}>
      <header>
        <h2 className="df-slide__title">{slide.actionTitle}</h2>
        {slide.subtitle ? (
          <p className="df-slide__subtitle">{slide.subtitle}</p>
        ) : null}
      </header>
      {columns.length > 0 ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: "1.25rem",
            flex: 1,
            marginTop: "1.25rem",
            alignContent: "start",
          }}
        >
          {columns.map((text, index) => (
            <div
              key={`${index}-${text}`}
              style={{
                borderTop: "3px solid var(--df-accent)",
                paddingTop: "0.75rem",
                fontSize: "var(--df-body)",
                lineHeight: 1.4,
              }}
            >
              {text}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
      <SourceFooter source={slide.chart.source} />
    </SlideShell>
  );
}
