# DeckForge

Presentation maker berbasis LLM di atas OpenRouter. Input berupa topik atau dokumen,
output deck bergaya editorial/konsultan yang bisa diekspor ke PDF dan PPTX.

## Dokumen

| File | Isi |
|---|---|
| `docs/SPEC.md` | Spesifikasi teknis. Sumber kebenaran. |
| `docs/TASKS.md` | Rencana implementasi bertahap, Task 0–9. |
| `.cursor/rules/deckforge.mdc` | Aturan yang otomatis dimuat Cursor di tiap sesi. |

## Cara pakai di Cursor

1. Salin folder ini jadi root project.
2. Buka di Cursor. File `.mdc` di `.cursor/rules/` akan otomatis aktif karena
   `alwaysApply: true` — tidak perlu di-mention manual.
3. Buka Composer (Cmd+I), lalu mulai dengan:

   ```
   Baca docs/SPEC.md dan docs/TASKS.md. Kerjakan Task 0.
   ```

4. Setelah tiap task, verifikasi kriteria selesainya dulu sebelum lanjut. Kalau agent
   melompat ke task berikutnya, hentikan dan minta selesaikan yang sekarang.

Satu saran berdasarkan pola kegagalan yang umum: **satu task = satu sesi Composer.**
Konteks yang terlalu panjang membuat agent mulai mengabaikan aturan di file rules,
terutama larangan soal chart dan model gambar.

## Konfigurasi

```bash
cp .env.example .env.local
```

```bash
OPENROUTER_API_KEY=sk-or-...
APP_URL=http://localhost:3000

MODEL_PLANNER=deepseek/deepseek-v4-pro-0813
MODEL_WRITER=deepseek/deepseek-v4.1-flash
MODEL_IMAGE=bytedance-seed/seedream-4.5
```

Slug model berganti tiap beberapa bulan. Verifikasi dulu sebelum mulai:

```bash
# model teks
curl "https://openrouter.ai/api/v1/models" -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  | jq -r '.data[] | select(.id|startswith("deepseek/")) | .id'

# model gambar
curl "https://openrouter.ai/api/v1/models?output_modalities=image" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | jq -r '.data[].id'
```

## Yang paling penting dipahami sebelum mulai

Chart **tidak pernah** dihasilkan model gambar. LLM hanya menulis spesifikasi JSON;
Vega-Lite yang menggambar. Model gambar cuma untuk ilustrasi dekoratif, dan dilarang
merender teks apa pun. Alasannya ada di `docs/SPEC.md` bagian 1.

Aturan ini yang membedakan output yang bisa dipakai presentasi beneran dari output yang
cuma terlihat mengesankan di screenshot.
