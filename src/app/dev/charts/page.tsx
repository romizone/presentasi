import { CHART_SAMPLES } from "@/lib/chart/samples";
import { renderChartSvg } from "@/lib/chart/vegalite";
import type { ChartType, StyleId } from "@/lib/schema";
import "@/app/deck.css";

export const runtime = "nodejs";

const GALLERY_STYLES: StyleId[] = ["consulting", "editorial"];
const CHART_TYPES = Object.keys(CHART_SAMPLES) as ChartType[];

export default async function ChartsGalleryPage() {
  const cards: {
    key: string;
    type: ChartType;
    styleId: StyleId;
    svg: string;
  }[] = [];

  for (const type of CHART_TYPES) {
    const spec = CHART_SAMPLES[type];
    for (const styleId of GALLERY_STYLES) {
      const svg = await renderChartSvg(spec, styleId);
      cards.push({ key: `${type}-${styleId}`, type, styleId, svg });
    }
  }

  return (
    <main className="df-charts-gallery">
      <h1>Chart gallery</h1>
      <p style={{ marginTop: 0, color: "#5a6b7b" }}>
        Sample ChartSpec → Vega-Lite SVG for consulting and editorial styles.
      </p>
      <div className="df-charts-gallery__grid">
        {cards.map((card) => (
          <section key={card.key} className="df-charts-gallery__card">
            <h2>
              {card.type} · {card.styleId}
            </h2>
            <div dangerouslySetInnerHTML={{ __html: card.svg }} />
          </section>
        ))}
      </div>
    </main>
  );
}
