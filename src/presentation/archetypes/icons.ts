import type { SlideIconId } from "../archetypes/layout-types";

/**
 * Keyword rules for picking an icon from copy.
 *
 * `whole` terms must match a complete word, `stem` terms may continue into a
 * longer one. The distinction matters: a bare substring search maps "menu"
 * onto "menunjukkan" and "aman" onto "keamanan", which silently hands a slide
 * the wrong icon.
 */
type IconRule = {
  icon: SlideIconId;
  whole?: string[];
  stem?: string[];
};

const ICON_RULES: IconRule[] = [
  {
    icon: "utensils",
    whole: ["menu", "food"],
    stem: ["gizi", "makan", "nutrisi", "utensil"],
  },
  {
    icon: "graduation",
    whole: ["anak"],
    stem: ["sekolah", "siswa", "murid", "school", "student"],
  },
  {
    icon: "heart",
    whole: ["heart"],
    stem: ["kesehatan", "sehat", "health"],
  },
  {
    icon: "clipboard",
    stem: ["manual", "ragu", "lemah", "kurang", "lambat"],
  },
  {
    icon: "layers",
    stem: ["fragment", "pecah", "terpisah", "silo", "layer"],
  },
  {
    icon: "eye",
    whole: ["eye"],
    stem: ["monitor", "lihat", "visib", "awas"],
  },
  {
    icon: "search",
    stem: ["cari", "pencarian", "discover", "search", "temu"],
  },
  {
    icon: "zap",
    whole: ["zap"],
    stem: ["auto", "otomatis", "cepat", "kilat"],
  },
  {
    icon: "activity",
    stem: ["berkelanjut", "contin"],
  },
  {
    icon: "link",
    whole: ["link", "cmdb", "itsm"],
    stem: ["integr", "hubung", "sync"],
  },
  {
    icon: "check",
    whole: ["check", "aman", "siap"],
    stem: ["standar", "selesai"],
  },
  {
    icon: "users",
    stem: ["orang", "user", "pelanggan", "masyarakat"],
  },
  {
    icon: "shield",
    whole: ["shield"],
    stem: ["lindung", "keamanan"],
  },
  {
    icon: "refresh",
    stem: ["ulang", "refresh", "perbarui"],
  },
];

function compile(rule: IconRule): { pattern: RegExp; icon: SlideIconId } {
  const parts: string[] = [];
  if (rule.whole?.length) {
    parts.push(`\\b(?:${rule.whole.join("|")})\\b`);
  }
  if (rule.stem?.length) {
    parts.push(`\\b(?:${rule.stem.join("|")})`);
  }
  return { pattern: new RegExp(parts.join("|"), "i"), icon: rule.icon };
}

const KEYWORD_ICONS = ICON_RULES.map(compile);

function matchIcon(text: string): SlideIconId | undefined {
  return KEYWORD_ICONS.find((rule) => rule.pattern.test(text))?.icon;
}

const CURRENT_FALLBACK: SlideIconId[] = ["clipboard", "layers", "eye", "search"];
const TARGET_FALLBACK: SlideIconId[] = ["zap", "activity", "check", "sparkles"];

export function iconForItem(
  text: string,
  index: number,
  side: "current" | "target",
): SlideIconId {
  const match = matchIcon(text);
  if (match) {
    return match;
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
 * never emitted upstream. They are tried in order rather than concatenated, so
 * a deliberate `iconHint` outranks a word that happens to appear in the body.
 */
export function iconForCard(
  index: number,
  ...hints: (string | undefined)[]
): SlideIconId {
  for (const hint of hints) {
    if (!hint) {
      continue;
    }
    const match = matchIcon(hint);
    if (match) {
      return match;
    }
  }
  return CARD_FALLBACK[index % CARD_FALLBACK.length] ?? "sparkles";
}
