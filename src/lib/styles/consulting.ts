import type { StylePreset } from "./types";

export const consulting: StylePreset = {
  id: "consulting",
  tokens: {
    ratio: "16:9",
    font: "Inter",
    h1: 32,
    body: 18,
    accent: "#0B3C5D",
    bg: "#FFFFFF",
    muted: "#5A6B7B",
    palette: ["#0B3C5D", "#328CC1", "#D9B310", "#9AA5B1"],
  },
  rules: `
    Judul slide WAJIB kalimat pernyataan berisi temuan, bukan label topik.
      BENAR: "Latensi p99 naik 3x setelah migrasi karena connection pool belum dikonfigurasi"
      SALAH: "Analisis Latensi"
    Satu slide = satu pesan. Maksimal 3 bullet, masing-masing maksimal 12 kata.
    Wajib ada callout yang menunjuk angka kunci pada chart.
    Jika seluruh judul slide dibaca berurutan, harus terbentuk argumen yang utuh.
  `.trim(),
  charts: {
    default: "bar_h",
    gridlines: false,
    dataLabels: true,
    sortDescending: true,
  },
  images: "minimal — hanya slide pembuka dan pemisah bab",
  imageSuffix:
    "clean corporate photography, soft natural light, muted navy and teal palette, spacious negative space, professional atmosphere, no text, no letters, no numbers, no watermark",
};
