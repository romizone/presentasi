import { SlideShell, SourceFooter, type LayoutProps } from "./SlideShell";

export function SectionBreak({ slide, styleId }: LayoutProps) {
  return (
    <SlideShell
      styleId={styleId}
      className=""
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1rem",
          background:
            styleId === "consulting" || styleId === "dense"
              ? "var(--df-accent)"
              : "transparent",
          color:
            styleId === "consulting" || styleId === "dense"
              ? "#ffffff"
              : "var(--df-fg)",
          margin: "-4.5% -5.5%",
          padding: "8% 7%",
          minHeight: "100%",
          boxSizing: "border-box",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "calc(var(--df-body) * 0.85)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          Section
        </p>
        <h2
          className="df-slide__title"
          style={{
            color: "inherit",
            fontSize: "calc(var(--df-h1) * 1.35)",
          }}
        >
          {slide.actionTitle}
        </h2>
        {slide.subtitle ? (
          <p
            className="df-slide__subtitle"
            style={{
              color: "inherit",
              opacity: 0.9,
              margin: 0,
            }}
          >
            {slide.subtitle}
          </p>
        ) : null}
      </div>
      {slide.chart.source.trim() ? (
        <div style={{ position: "absolute", left: "5.5%", right: "5.5%", bottom: "4%" }}>
          <SourceFooter source={slide.chart.source} />
        </div>
      ) : null}
    </SlideShell>
  );
}
