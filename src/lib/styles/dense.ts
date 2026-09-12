import type { StylePreset } from "./types";

export const dense: StylePreset = {
  id: "dense",
  tokens: {
    ratio: "9:16",
    contrast: "high",
    numeralScale: 4.0,
    font: "Archivo",
    palette: ["#111111", "#F5F5F5", "#FF5A1F", "#2F6FED"],
  },
  rules: `
    Angka besar sebagai titik fokus visual utama tiap blok.
    Hierarki dibentuk lewat ukuran dan warna, bukan lewat kalimat penjelas.
    Kepadatan tinggi diperbolehkan — format ini dibaca sendiri, bukan dipresentasikan.
  `.trim(),
  charts: { dataLabels: true, iconAugmented: true },
  images: "ikon dan latar bertekstur, porsi besar",
  imageSuffix:
    "bold textured background, high contrast blocks of color, abstract geometric shapes, mobile-first composition, no text, no letters, no numbers, no watermark",
};
