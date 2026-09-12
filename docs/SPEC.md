# DeckForge — Spesifikasi Teknis

Presentation maker berbasis LLM. Input berupa topik atau dokumen sumber, output berupa
deck dalam gaya editorial/konsultan yang bisa diekspor ke PDF dan PPTX.

---

## 1. Prinsip desain yang tidak boleh dilanggar

Empat aturan ini menentukan berhasil-tidaknya produk. Semua keputusan implementasi
tunduk pada aturan ini.

### 1.1 Chart dihasilkan oleh kode, bukan oleh model gambar

Model gambar tidak dapat merender angka akurat atau teks kecil yang terbaca. Chart yang
dihasilkan model gambar akan terlihat seperti chart tetapi proporsinya salah dan labelnya
ngawur. Untuk gaya konsultan dan editorial yang intinya presisi data, ini kegagalan total.

LLM hanya menghasilkan **spesifikasi chart dalam JSON**. Renderer (Vega-Lite) yang
menggambar. Jalur ini deterministik: input JSON yang sama selalu menghasilkan SVG yang sama.

### 1.2 Tidak ada teks di dalam gambar hasil generate

Judul, label, angka, sumber — semuanya dirender sebagai HTML/SVG di atas gambar, tidak
pernah diminta ke model gambar. Prompt gambar harus eksplisit melarang teks.

### 1.3 Angka wajib punya sumber

Setiap objek `chart` wajib memiliki field `source` yang tidak kosong. Slide dengan data
numerik tanpa sumber ditolak di tahap validasi, bukan ditampilkan dengan peringatan.
Angka karangan pada deck bergaya konsultan lebih buruk daripada tidak ada deck sama sekali.

### 1.4 Satu tahap pipeline = satu tanggung jawab

Jangan pernah meminta satu prompt menghasilkan konten + memilih warna + menyusun layout
sekaligus. Kualitas jatuh drastis. Pipeline dipecah menjadi tahap-tahap di Bagian 3.

---

## 2. Stack

| Lapis | Pilihan | Alasan |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | Route handler untuk proxy API, streaming bawaan |
| LLM gateway | OpenRouter via `@openrouter/ai-sdk-provider` + Vercel AI SDK | Satu key, ganti model tanpa ubah kode |
| Chart | Vega-Lite → SVG (`vega`, `vega-lite`, `vega-embed`) | Deterministik, spec berupa JSON yang enak ditulis LLM |
| Styling | Tailwind + CSS custom properties per tema | Token tema bisa ditukar saat runtime |
| Export PDF | Playwright (`chromium.launch` → `page.pdf`) | Render persis seperti di browser |
| Export PPTX | `pptxgenjs` | Chart jadi objek native yang bisa diedit user |
| Validasi | `zod` + `zod-to-json-schema` | Satu definisi skema untuk runtime dan API |
| Cache | File system di dev, S3/R2 di produksi | Gambar mahal, wajib di-cache |

Node 20+. Package manager: pnpm.

---

## 3. Pipeline

```
Input (topik / dokumen / CSV)
  │
  ├─[1] Ingest & ground ......... ekstrak fakta + angka + sumber
  ├─[2] Narrative plan .......... SCQA / Pyramid Principle → outline
  ├─[3] Slide spec .............. JSON per slide (structured output, strict)
  ├─[4] Validate ................ zod + aturan gaya; gagal → retry sekali
  ├─[5] Render fan-out
  │      ├── chart spec → Vega-Lite → SVG      (tanpa AI)
  │      ├── image brief → OpenRouter Image API (cache by hash)
  │      └── layout → React component + token tema
  └─[6] Export .................. Playwright→PDF | pptxgenjs→PPTX
```

### Tahap 1 — Ingest & ground

Input dokumen (PDF/DOCX/CSV/teks) diekstrak jadi teks mentah. Panggil model dengan konteks
besar, minta keluaran berupa daftar klaim terstruktur: `{ claim, value?, unit?, period?, source }`.

Aturan: klaim yang tidak bisa ditelusuri ke teks sumber harus ditandai `source: null` dan
dibuang di tahap validasi. Jangan biarkan model mengisi dari pengetahuan internalnya.

### Tahap 2 — Narrative plan

Gunakan model reasoning. Output berupa outline: `{ storyline_type, slides: [{ intent, key_message, evidence_refs }] }`.

Pola cerita yang didukung:
- **Pyramid Principle** (default untuk gaya konsultan) — jawaban di depan, argumen pendukung menyusul, tiap tingkat MECE.
- **SCQA** — Situation, Complication, Question, Answer.
- **Chronological** — untuk laporan progres dan post-mortem.

### Tahap 3 — Slide spec

Model volume tinggi + `response_format: json_schema` dengan `strict: true`. Satu panggilan
per slide (bisa paralel), bukan satu panggilan untuk seluruh deck — deck panjang bikin
model kehilangan disiplin skema di slide-slide akhir.

### Tahap 4 — Validate

Selain validasi skema, ada aturan per gaya (Bagian 5). Jika gagal, retry sekali dengan pesan
error validasi diumpankan balik sebagai pesan user. Gagal dua kali → slide ditandai
`needs_review`, bukan dibuang diam-diam.

---

## 4. Integrasi OpenRouter

### 4.1 Konfigurasi model

Slug model berganti tiap beberapa bulan. **Jangan hardcode di source.** Taruh di env:

```bash
OPENROUTER_API_KEY=sk-or-...

# Tahap 2 (reasoning, volume rendah)
MODEL_PLANNER=deepseek/deepseek-v4-pro-0813

# Tahap 1 & 3 (volume tinggi, konteks besar)
MODEL_WRITER=deepseek/deepseek-v4.1-flash

# Tahap 5 (gambar)
MODEL_IMAGE=bytedance-seed/seedream-4.5
```

Catatan pemilihan:
- `deepseek-v4-pro-0813` — GA release, mendukung `tools`/`tool_choice` dan structured output via JSON schema.
- `deepseek-v4.1-flash` — konteks 1,05 juta token dengan harga sekitar $0,15/M input dan $0,60/M output. Konteks sebesar itu berarti dokumen sumber utuh bisa masuk tanpa perlu RAG. Ini menyederhanakan arsitektur secara signifikan — jangan bangun pipeline embedding sebelum benar-benar terbukti perlu.
- Model gambar teratas saat ini adalah keluarga Nano Banana 2 (Gemini 3.1 Flash Image) dan Seedream 4.5. Varian Lite dari Nano Banana 2 menghasilkan gambar sekitar 4 detik, jauh lebih cepat dari varian penuh, dan cocok untuk pipeline yang butuh banyak gambar kecil. Slug Gemini sering berubah — verifikasi dulu lewat endpoint discovery sebelum dipakai.

Discovery saat runtime, jalankan sekali lalu simpan hasilnya:

```bash
curl "https://openrouter.ai/api/v1/models?output_modalities=image" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"
```

### 4.2 Structured output

```ts
const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.APP_URL,   // untuk atribusi di dashboard OpenRouter
    "X-Title": "DeckForge",
  },
  body: JSON.stringify({
    model: process.env.MODEL_WRITER,
    messages: [
      { role: "system", content: STYLE_PROMPT[style] },
      { role: "user", content: slideBrief },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "slide", strict: true, schema: slideJsonSchema },
    },
    provider: { require_parameters: true },
    temperature: 0.3,
  }),
});
```

**`provider: { require_parameters: true }` wajib ada.** OpenRouter merutekan satu model ke
banyak provider, dan tidak semua provider menghormati `strict` schema. Tanpa flag ini kamu
akan mendapat JSON rusak secara acak dan sulit direproduksi — bug yang mahal waktunya.

### 4.3 Image API

OpenRouter punya endpoint khusus `POST /api/v1/images`. Body minimal berisi `model` dan
`prompt`. Hasilnya base64 di `data[0].b64_json` yang perlu di-decode jadi bytes. Model yang
kompatibel juga menerima reference image opsional — ini yang dipakai untuk menjaga
konsistensi gaya antar slide.

```ts
const r = await fetch("https://openrouter.ai/api/v1/images", {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: process.env.MODEL_IMAGE,
    prompt: `${brief}. ${STYLE_SUFFIX[style]}`,
    // input_references: [anchorImageB64]   // slide ke-2 dan seterusnya
  }),
});
const b64 = (await r.json()).data[0].b64_json;
```

Alternatif: endpoint `/api/v1/chat/completions` dengan `modalities: ["image", "text"]`.
Gunakan endpoint `/images` yang khusus — lebih sederhana dan responsnya lebih mudah diproses.

Model Gemini mendukung rasio aspek lewat parameter `image_config.aspect_ratio`. Parameter
yang didukung berbeda per model, jadi cek kemampuan per-model sebelum mengirim parameter
tambahan.

---

## 5. Preset gaya

Setiap gaya terdiri dari tiga bagian: **token desain**, **aturan naratif**, dan **default chart**.
Definisikan di `lib/styles/*.ts`, bukan di dalam prompt yang ditulis tangan tiap kali.

> **Penamaan.** Gaya-gaya ini adalah bahasa visual, bukan lisensi. Jangan pakai nama merek
> (McKinsey, The Economist, Visual Capitalist, NotebookLM) di UI, nama file, atau materi
> pemasaran. Pakai label netral seperti di bawah.

### `consulting` — deck konsultan

```ts
{
  tokens: {
    ratio: "16:9", font: "Inter", h1: 32, body: 18,
    accent: "#0B3C5D", bg: "#FFFFFF", muted: "#5A6B7B",
    palette: ["#0B3C5D", "#328CC1", "#D9B310", "#9AA5B1"],
  },
  rules: `
    Judul slide WAJIB kalimat pernyataan berisi temuan, bukan label topik.
      BENAR: "Latensi p99 naik 3x setelah migrasi karena connection pool belum dikonfigurasi"
      SALAH: "Analisis Latensi"
    Satu slide = satu pesan. Maksimal 3 bullet, masing-masing maksimal 12 kata.
    Wajib ada callout yang menunjuk angka kunci pada chart.
    Jika seluruh judul slide dibaca berurutan, harus terbentuk argumen yang utuh.
  `,
  charts: { default: "bar_h", gridlines: false, dataLabels: true, sortDescending: true },
  images: "minimal — hanya slide pembuka dan pemisah bab",
}
```

### `editorial` — grafik jurnalistik

```ts
{
  tokens: {
    ratio: "16:9", font: "IBM Plex Sans",
    accentBar: "#E3120B",                       // bar merah kiri-atas
    palette: ["#006BA2", "#3EBCD2", "#EBB434", "#F4364C"],
  },
  rules: `
    Judul deskriptif + sub-judul satu baris yang menjelaskan unit dan periode.
    Tanpa bullet point. Prosa pendek saja.
    Baris sumber di kaki slide WAJIB ada.
  `,
  charts: { gridlines: "horizontal-only", dataInkMax: true, dataLabels: false },
  images: "tidak ada — chart saja",
}
```

Dasar intelektualnya adalah prinsip Edward Tufte: maksimalkan rasio data-ink, hapus
chartjunk. Praktisnya: tanpa border, tanpa gradien, tanpa 3D, tanpa gridline vertikal.

### `dense` — infografis padat

```ts
{
  tokens: { ratio: "9:16", contrast: "high", numeralScale: 4.0, font: "Archivo" },
  rules: `
    Angka besar sebagai titik fokus visual utama tiap blok.
    Hierarki dibentuk lewat ukuran dan warna, bukan lewat kalimat penjelas.
    Kepadatan tinggi diperbolehkan — format ini dibaca sendiri, bukan dipresentasikan.
  `,
  charts: { dataLabels: true, iconAugmented: true },
  images: "ikon dan latar bertekstur, porsi besar",
}
```

Peringatan: format ini dioptimalkan untuk dibaca sendiri sambil scrolling, **bukan** untuk
dipresentasikan. Kepadatannya membuat audiens membaca slide dan berhenti mendengarkan
presenter. Beri peringatan di UI kalau user memilih gaya ini untuk presentasi live.

### `card` — infografis kartu

```ts
{
  tokens: { ratio: "16:9", font: "Söhne", palette: ["#F2EDE4","#3D5A5B","#C4703C","#7A8B8C"] },
  rules: `Satu ide per kartu. Kartu bersih dengan banyak ruang kosong. Ikon garis sebagai penanda.`,
  charts: { default: "big_number", gridlines: false },
  images: "ilustrasi dekoratif per kartu",
}
```

Gaya ini paling ramah image generation karena ilustrasinya memang dekoratif, bukan
pembawa data.

---

## 6. Skema data

`lib/schema.ts` — satu definisi zod, diturunkan jadi JSON Schema untuk API.

```ts
import { z } from "zod";

export const ChartSpec = z.object({
  type: z.enum(["bar_h", "bar_v", "line", "stacked_bar", "waterfall", "scatter", "big_number", "none"]),
  data: z.array(z.object({
    label: z.string(),
    value: z.number(),
    series: z.string().optional(),
  })).max(24),
  unit: z.string().optional(),
  callout: z.string().optional(),      // anotasi panah ke titik data kunci
  calloutTarget: z.string().optional(), // label titik data yang ditunjuk
  source: z.string().min(1),            // WAJIB, lihat prinsip 1.3
});

export const Slide = z.object({
  actionTitle: z.string().min(10).max(120),
  subtitle: z.string().max(90).optional(),
  layout: z.enum(["chart_left", "full_chart", "three_column", "quote", "big_number", "section_break"]),
  body: z.array(z.string().max(90)).max(3),
  chart: ChartSpec,
  imageBrief: z.string().max(300).optional(),
  needsReview: z.boolean().default(false),
});

export const Deck = z.object({
  title: z.string(),
  style: z.enum(["consulting", "editorial", "dense", "card"]),
  storyline: z.enum(["pyramid", "scqa", "chronological"]),
  slides: z.array(Slide).min(3).max(30),
});
```

Saat mengirim ke API, set `additionalProperties: false` di semua level objek. Beberapa
provider menolak schema tanpa flag ini ketika `strict: true`.

---

## 7. Struktur folder

```
deckforge/
├─ app/
│  ├─ api/generate/route.ts       # orkestrasi pipeline, streaming progres
│  ├─ api/image/route.ts          # proxy Image API + cache
│  ├─ api/export/route.ts         # PDF & PPTX
│  └─ deck/[id]/page.tsx          # viewer + editor
├─ lib/
│  ├─ openrouter.ts               # klien, retry, penghitung biaya
│  ├─ schema.ts                   # zod → JSON Schema
│  ├─ pipeline/
│  │  ├─ ingest.ts                # tahap 1
│  │  ├─ plan.ts                  # tahap 2
│  │  ├─ slides.ts                # tahap 3
│  │  └─ validate.ts              # tahap 4
│  ├─ styles/                     # consulting.ts, editorial.ts, dense.ts, card.ts
│  ├─ chart/vegalite.ts           # ChartSpec → Vega-Lite spec → SVG
│  ├─ image/                      # prompt builder, cache, anchor konsistensi
│  └─ export/                     # pdf.ts (Playwright), pptx.ts (pptxgenjs)
├─ components/layouts/            # satu komponen React per nilai enum `layout`
└─ docs/                          # SPEC.md, TASKS.md
```

---

## 8. Masalah yang akan muncul, dan penanganannya

**Konsistensi visual antar slide.** Gambar dari prompt terpisah akan terlihat seperti dibuat
oleh dua puluh orang berbeda. Dua penanganan: (a) satu `STYLE_SUFFIX` yang identik
ditempel di semua prompt gambar; (b) gambar pertama disimpan sebagai anchor dan dikirim
sebagai `input_references` pada semua panggilan berikutnya.

**Biaya.** Generasi gambar adalah sekitar 95% biaya per deck; teks dari model DeepSeek
hampir gratis sebagai perbandingan. Cache berdasarkan `sha256(model + prompt + aspectRatio)`.
Tampilkan estimasi biaya sebelum user menekan generate.

**Export PPTX.** Kalau user akan mengedit di PowerPoint, chart harus jadi objek native
(`pptxgenjs.addChart`), bukan gambar tertanam. Ini berarti `ChartSpec` perlu dua adaptor:
satu ke Vega-Lite untuk tampilan web/PDF, satu ke format pptxgenjs. Rancang `ChartSpec`
sebagai lapis netral sejak awal, jangan sebagai pembungkus tipis Vega-Lite.

**Font.** Playwright di container tidak punya font kustom. Tanam font sebagai file lokal
dan daftarkan lewat `@font-face` dengan `src: url(...)`, jangan andalkan Google Fonts CDN
saat render — hasilnya fallback ke serif default dan deck terlihat rusak.

**Rate limit.** Slide dirender paralel. Batasi konkurensi ke 4–6 untuk panggilan gambar,
pakai `p-limit`. Terapkan exponential backoff pada HTTP 429.

**Long-running export.** Playwright butuh 5–15 detik untuk deck 20 slide. Jangan jalankan
di route handler serverless dengan timeout pendek — pakai background job atau naikkan
`maxDuration`.

---

## 9. Definisi selesai untuk MVP

- [x] Input berupa topik teks menghasilkan deck 8 slide gaya `consulting`
- [x] Setiap slide dengan chart punya `source` yang terisi; validasi menolak yang kosong
- [x] Chart dirender dari Vega-Lite, bukan dari model gambar
- [x] Export PDF berhasil dengan font dan warna yang benar
- [x] Biaya per deck tercatat dan ditampilkan ke user
- [x] Gaya `editorial` bisa dipilih dan menghasilkan tampilan yang jelas berbeda
