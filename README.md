# Presentasi AI

AI-powered presentation maker. A brief becomes a McKinsey-style TR-01 exhibit (Current → Target) with Economist-style infographics, then an editable PPTX.

Live: [https://presentasi.rominur.com](https://presentasi.rominur.com)

## Run

```bash
cp .env.example .env.local
# set OPENROUTER_API_KEY in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Generation calls OpenRouter on the server only.

## Export PPTX

Use **Export PPTX** on the preview page, or:

```bash
curl -o tr-01-current-target.pptx http://localhost:3000/api/export/pptx
```

Open the file in PowerPoint or Keynote and confirm text and shapes remain editable.

## Verify

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
