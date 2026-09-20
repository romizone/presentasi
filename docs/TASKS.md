# Rencana Implementasi

Kerjakan berurutan. Setiap task punya kriteria selesai yang bisa diverifikasi — jangan
lanjut sebelum kriterianya terpenuhi. Di Cursor, cukup perintahkan: *"kerjakan Task 3 di
docs/TASKS.md"*.

Urutannya sengaja menunda image generation sampai akhir. Bagian yang paling berisiko gagal
adalah disiplin skema dan kualitas naratif, bukan gambar — dan gambar adalah bagian yang
paling mahal untuk diiterasi.

---

## Task 0 — Scaffold

Buat project Next.js 15 + TypeScript + Tailwind dengan pnpm. Pasang: `zod`,
`zod-to-json-schema`, `p-limit`, `vega`, `vega-lite`, `pptxgenjs`, `playwright`.

Buat `.env.example` berisi semua variabel dari SPEC bagian 4.1. Jangan commit `.env.local`.

**Selesai ketika:** `pnpm dev` jalan, `pnpm typecheck` bersih, `.env.example` lengkap.

---

## Task 1 — Klien OpenRouter

`lib/openrouter.ts`. Satu modul, tidak ada `fetch` ke OpenRouter dari tempat lain.

Isi:
- `chat({ model, messages, schema?, temperature? })` — kalau `schema` ada, pasang
  `response_format: { type: "json_schema", json_schema: { strict: true, ... } }` **dan**
  `provider: { require_parameters: true }`.
- `generateImage({ prompt, referenceB64? })` — `POST /api/v1/images`, decode `data[0].b64_json`.
- Retry dengan exponential backoff pada 429 dan 5xx, maksimal 3 percobaan.
- Catat `usage` tiap panggilan ke sebuah akumulator biaya per-request.
- Header `HTTP-Referer` dan `X-Title` untuk atribusi.

**Selesai ketika:** ada script `pnpm tsx scripts/smoke.ts` yang memanggil `chat()` dengan
schema sederhana dan mencetak JSON valid + biaya.

---

## Task 2 — Skema & preset gaya

`lib/schema.ts` sesuai SPEC bagian 6. `lib/styles/consulting.ts` dan `editorial.ts` sesuai
bagian 5. Ekspor `STYLES` sebagai record bertipe.

Tulis `lib/pipeline/validate.ts`: validasi zod + aturan per gaya (misal `consulting` menolak
judul yang tidak mengandung kata kerja; `editorial` menolak slide yang punya `body` non-kosong).

**Selesai ketika:** unit test membuktikan slide bagus lolos, dan empat kasus buruk
(judul label, source kosong, bullet kepanjangan, chart data kosong) ditolak dengan pesan jelas.

---

## Task 3 — Pipeline teks (tanpa gambar, tanpa chart)

`lib/pipeline/plan.ts` dan `slides.ts`. Input topik teks, output `Deck` tervalidasi.
Slide dihasilkan paralel dengan `p-limit(4)`. Retry sekali dengan pesan error validasi
diumpankan balik.

**Selesai ketika:** perintah CLI menghasilkan deck 8 slide gaya `consulting` yang lolos
validasi, dan membaca seluruh `actionTitle` berurutan membentuk argumen yang masuk akal.
Ini kriteria kualitas yang sebenarnya — kalau gagal, perbaiki prompt sebelum lanjut.

---

## Task 4 — Renderer chart

`lib/chart/vegalite.ts`: `ChartSpec` → spec Vega-Lite → SVG string. Terapkan token gaya
(palet, gridline, data label) dari preset. Implementasikan `callout` sebagai layer anotasi
Vega-Lite yang menunjuk `calloutTarget`.

Rancang sebagai lapis netral — nanti ada adaptor kedua ke pptxgenjs.

**Selesai ketika:** semua nilai enum `ChartSpec.type` punya renderer, dan halaman galeri
`/dev/charts` menampilkan contoh tiap tipe dalam dua gaya.

---

## Task 5 — Layout & viewer

Satu komponen React per nilai `Slide.layout`. Token gaya sebagai CSS custom properties di
elemen pembungkus, supaya ganti gaya cukup ganti satu kelas.

Tanam font sebagai file lokal dengan `@font-face`. Jangan andalkan CDN — Playwright akan
gagal memuatnya dan deck jatuh ke serif default.

**Selesai ketika:** `/deck/[id]` menampilkan deck lengkap, dan menukar gaya mengubah
tampilan secara nyata tanpa regenerasi konten.

---

## Task 6 — Export PDF

`lib/export/pdf.ts` dengan Playwright. Ukuran halaman mengikuti rasio gaya.
`waitForFunction(() => document.fonts.ready)` sebelum capture.

**Selesai ketika:** PDF 8 slide keluar dengan font, warna, dan chart yang identik dengan
tampilan browser. Buka di viewer lain untuk memastikan font tertanam.

---

## Task 7 — Generasi gambar

`lib/image/`. Prompt builder yang menempelkan `STYLE_SUFFIX` dan akhiran
`no text, no letters, no numbers, no watermark`. Cache berkunci
`sha256(model + prompt + aspectRatio)`. Gambar pertama disimpan sebagai anchor dan dikirim
sebagai `input_references` untuk slide berikutnya.

Tampilkan estimasi biaya di UI **sebelum** user menekan generate.

**Selesai ketika:** deck gaya `card` punya ilustrasi yang konsisten antar slide, cache hit
terbukti pada regenerasi kedua, dan biaya tercatat akurat.

---

## Task 8 — Export PPTX

`lib/export/pptx.ts`. Adaptor kedua dari `ChartSpec` ke `pptxgenjs.addChart` supaya chart
jadi objek native yang bisa diedit user di PowerPoint, bukan gambar tertanam.

**Selesai ketika:** file `.pptx` dibuka di PowerPoint, chart bisa diklik dan datanya bisa diedit.

---

## Task 9 — Ingest dokumen

`lib/pipeline/ingest.ts`. Terima PDF/DOCX/CSV/teks. Ekstrak jadi klaim terstruktur dengan
sumber. Klaim tanpa sumber dibuang.

Karena `MODEL_WRITER` punya konteks sekitar satu juta token, dokumen utuh bisa langsung
dimasukkan. **Jangan bangun pipeline embedding/RAG di tahap ini** — tambahkan hanya kalau
sudah terbukti ada dokumen yang tidak muat.

**Selesai ketika:** unggah PDF laporan menghasilkan deck yang setiap angkanya bisa
ditelusuri balik ke halaman sumbernya.

---

## Task 9 — Impor gambar infografis jadi PPTX editable

Infografis dari NotebookLM atau model gambar adalah raster: teksnya sudah jadi piksel.
Arahnya **bangun ulang, bukan jiplak** — VLM *membaca* isi dan strukturnya, lalu isinya
masuk DSL dan dilayout ulang oleh archetype. Hasilnya tidak identik piksel dengan aslinya,
tetapi seluruh teks dan bentuknya native dan bisa diedit di PowerPoint.

Jangan tempuh jalur sebaliknya (OCR bbox lalu tempel teks di atas gambar asli): koordinat
dari model meleset 5–15% kanvas, fontnya tidak akan pernah cocok, dan hasil akhirnya tetap
satu gambar besar per slide — persis yang dilarang aturan "PPTX must stay editable".

```
PNG infografis
  ├─[1] Ekstrak palet ..... median cut          deterministik, tanpa AI
  ├─[2] Baca (VLM) ........ 1 panggilan/gambar, structured output
  ├─[3] Crop sprite ....... hanya untuk ilustrasi asli, bukan teks
  ├─[4] Map → DSL ......... pilih archetype
  └─[5] layoutSlide() ..... → LayoutIR → web + PPTX   (sudah ada)
```

### 9a — Fondasi deterministik ✅

- `Slide` jadi discriminated union per archetype; `LayoutIR.archetype` ikut melebar.
- Archetype `IG-01` (grid kartu 2–6, ikon + angka + heading + body) di
  `archetypes/ig-01.ts`. Jumlah kolom/baris ditentukan archetype dari jumlah kartu —
  DSL tidak pernah membawanya.
- `themes/palette.ts`: `quantizePalette` (median cut) dan `themeFromPalette` yang
  memetakan palet ke 17 token tema. Jaminan kontras dibangun secara konstruktif, bukan
  diharapkan: body 7:1, sekunder 4.5:1, isi di atas fill aksen 4.5:1 (teks) dan 3:1 (ikon) —
  diperiksa terhadap permukaan paling gelap di tema, bukan hanya terhadap background.
- `pnpm preview:slides out.html` merender semua sampel archetype untuk diperiksa mata.
  Tes geometri membuktikan node tidak keluar kanvas; ia tidak bisa memberi tahu bahwa
  sebuah kartu dua pertiganya kosong.

### 9b — Decoder gambar

Butuh PNG/JPEG → buffer RGBA untuk memberi makan `quantizePalette`. Pakai `sharp`, dan
turunkan gambar ke sisi panjang maksimal 1920px sebelum diproses.

**Selesai ketika:** unggah satu PNG menghasilkan `Theme` yang warnanya jelas berasal dari
gambar itu, dan hasilnya sama persis pada unggahan kedua.

### 9c — Pembaca VLM

`presentation/importer/read-infographic.ts`. Satu panggilan per gambar ke `getModel("visualQa")`
dengan structured output: `{ kicker, cards[], pictureRegions[], suggestedSlideSplit }`.
Model tidak boleh mengeluarkan koordinat slide, nama ikon dari enum, atau ukuran font —
hanya isi. `iconHint` berupa kata bebas; `iconForCard` yang memetakannya ke enum.

Infografis padat sebaiknya pecah jadi 3–5 slide. Biarkan model mengusulkan pemecahannya.

**Selesai ketika:** satu infografis 1024×1024 menghasilkan deck yang lolos validasi, dan
membaca seluruh `actionTitle` berurutan tetap masuk akal.

### 9d — Sprite ilustrasi

Crop `pictureRegions` dari PNG asli jadi `ImageNode`. Bbox dari model boleh meleset di sini —
potong agak longgar. Yang tidak boleh: menempatkan gambar sebagai latar seluruh slide.

### 9e — Chart yang terbaca dari gambar

Kalau infografis punya bar/pie, VLM boleh membacanya jadi `ChartSpec` supaya jadi chart
native. Angkanya hasil membaca gambar, bukan dari sumber — wajib `needsReview: true` dan
baris sumber yang menyatakan itu. Jangan diloloskan diam-diam (lihat SPEC 1.3).

### 9f — Archetype lanjutan

`IG-02` baris KPI dan `IG-03` proses/timeline, mengikuti empat langkah di `AGENTS.md`.

---

## Setelah MVP

Kandidat berikutnya, berdasarkan nilai per usaha:

- Mode edit per slide (regenerasi satu slide tanpa menyentuh yang lain)
- Gaya `dense` dan `card` dilengkapi
- Impor tema perusahaan: unggah satu deck lama, ekstrak palet dan font jadi preset baru
- Kolaborasi dan versioning
