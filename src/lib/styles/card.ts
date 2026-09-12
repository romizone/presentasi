import type { StylePreset } from "./types";

export const card: StylePreset = {
  id: "card",
  tokens: {
    ratio: "16:9",
    font: "Söhne",
    palette: ["#F2EDE4", "#3D5A5B", "#C4703C", "#7A8B8C"],
  },
  rules: `Satu ide per kartu. Kartu bersih dengan banyak ruang kosong. Ikon garis sebagai penanda.`,
  charts: { default: "big_number", gridlines: false },
  images: "ilustrasi dekoratif per kartu",
  imageSuffix:
    "warm paper texture, soft line illustration accents, calm sage and terracotta tones, generous whitespace, decorative only, no text, no letters, no numbers, no watermark",
};
