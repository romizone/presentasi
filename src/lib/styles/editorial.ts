import type { StylePreset } from "./types";

export const editorial: StylePreset = {
  id: "editorial",
  tokens: {
    ratio: "16:9",
    font: "IBM Plex Sans",
    accentBar: "#E3120B",
    palette: ["#006BA2", "#3EBCD2", "#EBB434", "#F4364C"],
  },
  rules: `
    Judul deskriptif + sub-judul satu baris yang menjelaskan unit dan periode.
    Tanpa bullet point. Prosa pendek saja.
    Baris sumber di kaki slide WAJIB ada.
  `.trim(),
  charts: {
    gridlines: "horizontal-only",
    dataInkMax: true,
    dataLabels: false,
  },
  images: "tidak ada — chart saja",
  imageSuffix:
    "editorial documentary photo, high contrast, restrained color, newsroom aesthetic, no text, no letters, no numbers, no watermark",
};
