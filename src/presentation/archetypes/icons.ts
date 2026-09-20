import type { SlideIconId } from "../archetypes/layout-types";

const KEYWORD_ICONS: { pattern: RegExp; icon: SlideIconId }[] = [
  { pattern: /gizi|makan|menu|nutrisi|utensil|food/i, icon: "utensils" },
  { pattern: /sekolah|siswa|anak|murid|school|student/i, icon: "graduation" },
  { pattern: /kesehatan|heart|sehat|health/i, icon: "heart" },
  { pattern: /manual|ragu|lemah|kurang|lambat/i, icon: "clipboard" },
  { pattern: /fragment|pecah|terpisah|silo|layer/i, icon: "layers" },
  { pattern: /monitor|lihat|visib|awas|eye/i, icon: "eye" },
  { pattern: /cari|discover|search|temu/i, icon: "search" },
  { pattern: /auto|otomatis|cepat|zap|kilat/i, icon: "zap" },
  { pattern: /monitor(?:ing)?|berkelanjut|contin/i, icon: "activity" },
  { pattern: /integr|hubung|sync|cmdb|itsm|link/i, icon: "link" },
  { pattern: /standar|check|siap|selesai|aman/i, icon: "check" },
  { pattern: /orang|user|pelanggan|masyarakat/i, icon: "users" },
  { pattern: /lindung|shield|keamanan/i, icon: "shield" },
  { pattern: /ulang|refresh|perbarui/i, icon: "refresh" },
];

const CURRENT_FALLBACK: SlideIconId[] = ["clipboard", "layers", "eye", "search"];
const TARGET_FALLBACK: SlideIconId[] = ["zap", "activity", "check", "sparkles"];

export function iconForItem(
  text: string,
  index: number,
  side: "current" | "target",
): SlideIconId {
  const match = KEYWORD_ICONS.find((rule) => rule.pattern.test(text));
  if (match) {
    return match.icon;
  }
  const fallback = side === "current" ? CURRENT_FALLBACK : TARGET_FALLBACK;
  return fallback[index % fallback.length] ?? "sparkles";
}

const CARD_FALLBACK: SlideIconId[] = [
  "lightbulb",
  "layers",
  "activity",
  "link",
  "shield",
  "users",
];

/**
 * Pick a registered icon for a card grid cell.
 *
 * Hints are free text supplied by an author or a model — the enum itself is
 * never emitted upstream. Matching runs over every hint joined together so a
 * heading like "Keamanan data" resolves even when `iconHint` is absent.
 */
export function iconForCard(
  index: number,
  ...hints: (string | undefined)[]
): SlideIconId {
  const haystack = hints.filter(Boolean).join(" ");
  const match = KEYWORD_ICONS.find((rule) => rule.pattern.test(haystack));
  if (match) {
    return match.icon;
  }
  return CARD_FALLBACK[index % CARD_FALLBACK.length] ?? "sparkles";
}
