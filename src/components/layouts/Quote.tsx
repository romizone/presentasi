import { SlideShell, SourceFooter, type LayoutProps } from "./SlideShell";

export function Quote({ slide, styleId }: LayoutProps) {
  const quote = slide.body[0] ?? slide.subtitle ?? slide.actionTitle;

  return (
    <SlideShell styleId={styleId}>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1.25rem",
          maxWidth: "90%",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "calc(var(--df-h1) * 1.05)",
            fontWeight: 600,
            lineHeight: 1.25,
            color: "var(--df-accent)",
          }}
        >
          “{quote}”
        </p>
        {slide.subtitle && quote !== slide.subtitle ? (
          <p className="df-slide__subtitle" style={{ margin: 0 }}>
            {slide.subtitle}
          </p>
        ) : null}
        <p
          style={{
            margin: 0,
            fontSize: "calc(var(--df-body) * 0.9)",
            color: "var(--df-muted)",
          }}
        >
          {slide.actionTitle}
        </p>
      </div>
      <SourceFooter source={slide.chart.source} />
    </SlideShell>
  );
}
