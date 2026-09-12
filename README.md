# Presentasi AI (DeckForge)

Presentation maker di atas OpenRouter. Brief atau dokumen → deck `consulting` /
`editorial` dengan chart Vega-Lite, lalu PPTX (chart native) atau PDF.

Sumber kebenaran: [`docs/SPEC.md`](docs/SPEC.md) · urutan kerja: [`docs/TASKS.md`](docs/TASKS.md)

Live: [https://presentasi-inky.vercel.app](https://presentasi-inky.vercel.app)

## Run

```bash
cp .env.example .env.local
# set OPENROUTER_API_KEY
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Galeri chart: `/dev/charts`.

## Scripts

```bash
npm run smoke              # OpenRouter + structured output
npm run generate:deck -- "Topik deck consulting"
npm run typecheck && npm test && npm run lint && npm run build
```

## Prinsip keras

- Chart: LLM menulis `ChartSpec` → Vega-Lite → SVG (bukan model gambar)
- Prompt gambar diakhiri `no text, no letters, no numbers, no watermark`
- Tanpa nama merek di UI/kode — pakai `consulting` / `editorial` / `dense` / `card`
- Model lewat env `MODEL_PLANNER`, `MODEL_WRITER`, `MODEL_IMAGE`
