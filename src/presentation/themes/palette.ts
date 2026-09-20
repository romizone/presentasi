import type { Theme, ThemeColors } from "./types";

/**
 * Colour utilities and a deterministic image palette -> theme mapping.
 *
 * Nothing here calls a model. Given the same pixels you get the same palette,
 * and given the same palette you get the same seventeen theme tokens.
 */

export type Rgb = { r: number; g: number; b: number };

const WHITE = "#FFFFFF";
const BLACK = "#000000";
const SEED_ACCENT = "#2556BC";

/* ---------------------------------------------------------------- parsing */

export function parseHex(value: string): Rgb {
  const raw = value.trim().replace(/^#/, "");
  const expanded =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    throw new Error(`Invalid hex colour "${value}"`);
  }

  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16),
  };
}

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

export function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b]
    .map((channel) => clampByte(channel).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

/* ------------------------------------------------------------- perception */

export function relativeLuminance(rgb: Rgb): number {
  const channel = (value: number): number => {
    const srgb = clampByte(value) / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : Math.pow((srgb + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b)
  );
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(parseHex(a));
  const lb = relativeLuminance(parseHex(b));
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Linear sRGB blend. `t` of 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, t: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  const ratio = Math.min(1, Math.max(0, t));
  return toHex({
    r: from.r + (to.r - from.r) * ratio,
    g: from.g + (to.g - from.g) * ratio,
    b: from.b + (to.b - from.b) * ratio,
  });
}

export function saturation(rgb: Rgb): number {
  const r = clampByte(rgb.r) / 255;
  const g = clampByte(rgb.g) / 255;
  const b = clampByte(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) {
    return 0;
  }
  const lightness = (max + min) / 2;
  const denominator = 1 - Math.abs(2 * lightness - 1);
  return denominator === 0 ? 0 : (max - min) / denominator;
}

export function hue(rgb: Rgb): number {
  const r = clampByte(rgb.r) / 255;
  const g = clampByte(rgb.g) / 255;
  const b = clampByte(rgb.b) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) {
    return 0;
  }
  let value: number;
  if (max === r) {
    value = ((g - b) / delta) % 6;
  } else if (max === g) {
    value = (b - r) / delta + 2;
  } else {
    value = (r - g) / delta + 4;
  }
  const degrees = value * 60;
  return degrees < 0 ? degrees + 360 : degrees;
}

function hueDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, 360 - raw);
}

/**
 * The first preferred colour that clears `min` against `fill`, otherwise
 * whichever of pure white or pure black contrasts more. That fallback pair is
 * never worse than 4.58:1 for any possible fill, so the result is always legible.
 */
export function readableOn(
  fill: string,
  preferred: string[],
  min: number,
): string {
  for (const candidate of preferred) {
    if (contrastRatio(candidate, fill) >= min) {
      return candidate;
    }
  }
  return contrastRatio(WHITE, fill) >= contrastRatio(BLACK, fill) ? WHITE : BLACK;
}

/** Push `color` away from `against` until it clears `min`. */
function ensureContrast(color: string, against: string, min: number): string {
  if (contrastRatio(color, against) >= min) {
    return color;
  }
  const toward = relativeLuminance(parseHex(against)) > 0.5 ? BLACK : WHITE;
  for (let step = 1; step <= 25; step += 1) {
    const candidate = mix(color, toward, step * 0.04);
    if (contrastRatio(candidate, against) >= min) {
      return candidate;
    }
  }
  return toward;
}

/** Fade `ink` toward `background` as far as `min` allows. */
function softened(
  ink: string,
  background: string,
  start: number,
  min: number,
): string {
  for (let t = start; t > 0; t -= 0.04) {
    const candidate = mix(ink, background, t);
    if (contrastRatio(candidate, background) >= min) {
      return candidate;
    }
  }
  return ink;
}

/* ------------------------------------------------------------ median cut */

export type QuantizeOptions = {
  /** 3 for RGB buffers, 4 for RGBA. Defaults to 4. */
  channels?: 3 | 4;
  maxColors?: number;
  /** Sample every nth pixel. Deterministic, unlike random sampling. */
  stride?: number;
  alphaThreshold?: number;
};

type Channel = "r" | "g" | "b";
const CHANNELS: Channel[] = ["r", "g", "b"];

function channelRange(box: Rgb[], channel: Channel): number {
  let min = Infinity;
  let max = -Infinity;
  for (const pixel of box) {
    const value = pixel[channel];
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return max - min;
}

function widestChannel(box: Rgb[]): Channel {
  let best: Channel = "r";
  let bestRange = -1;
  for (const channel of CHANNELS) {
    const range = channelRange(box, channel);
    if (range > bestRange) {
      bestRange = range;
      best = channel;
    }
  }
  return best;
}

function widestBoxIndex(boxes: Rgb[][]): number {
  let best = -1;
  let bestRange = 0;
  boxes.forEach((box, index) => {
    if (box.length < 2) {
      return;
    }
    const range = channelRange(box, widestChannel(box));
    if (range > bestRange) {
      bestRange = range;
      best = index;
    }
  });
  return best;
}

/**
 * Split point for a sorted box: the median, nudged to the nearest place where
 * the channel value actually changes. Flat artwork holds long runs of one
 * colour, and cutting through a run would average two distinct colours into
 * one muddy swatch.
 */
function splitIndex(sorted: Rgb[], channel: Channel): number {
  const mid = Math.floor(sorted.length / 2);
  for (let offset = 0; offset < sorted.length; offset += 1) {
    for (const candidate of [mid - offset, mid + offset]) {
      if (candidate < 1 || candidate > sorted.length - 1) {
        continue;
      }
      const previous = sorted[candidate - 1];
      const here = sorted[candidate];
      if (previous && here && previous[channel] !== here[channel]) {
        return candidate;
      }
    }
  }
  return mid;
}

function average(box: Rgb[]): Rgb {
  const total = box.reduce(
    (acc, pixel) => ({
      r: acc.r + pixel.r,
      g: acc.g + pixel.g,
      b: acc.b + pixel.b,
    }),
    { r: 0, g: 0, b: 0 },
  );
  return {
    r: total.r / box.length,
    g: total.g / box.length,
    b: total.b / box.length,
  };
}

/**
 * Median cut over raw pixel bytes. Fully deterministic: no seeding, no
 * convergence loop, so the same image always yields the same palette.
 * Returns hex colours ordered by how much of the image they cover.
 */
export function quantizePalette(
  pixels: ArrayLike<number>,
  options: QuantizeOptions = {},
): string[] {
  const channels = options.channels ?? 4;
  const maxColors = Math.max(1, Math.floor(options.maxColors ?? 5));
  const stride = Math.max(1, Math.floor(options.stride ?? 1));
  const alphaThreshold = options.alphaThreshold ?? 16;

  const samples: Rgb[] = [];
  const pixelCount = Math.floor(pixels.length / channels);
  for (let index = 0; index < pixelCount; index += stride) {
    const base = index * channels;
    if (channels === 4 && (pixels[base + 3] ?? 0) < alphaThreshold) {
      continue;
    }
    samples.push({
      r: pixels[base] ?? 0,
      g: pixels[base + 1] ?? 0,
      b: pixels[base + 2] ?? 0,
    });
  }

  if (samples.length === 0) {
    return [];
  }

  let boxes: Rgb[][] = [samples];
  while (boxes.length < maxColors) {
    const index = widestBoxIndex(boxes);
    const box = index < 0 ? undefined : boxes[index];
    if (!box) {
      break;
    }
    const channel = widestChannel(box);
    const sorted = [...box].sort(
      (a, b) => a[channel] - b[channel] || a.r - b.r || a.g - b.g || a.b - b.b,
    );
    const mid = splitIndex(sorted, channel);
    boxes = [
      ...boxes.slice(0, index),
      sorted.slice(0, mid),
      sorted.slice(mid),
      ...boxes.slice(index + 1),
    ];
  }

  const ordered = boxes
    .filter((box) => box.length > 0)
    .map((box) => ({ hex: toHex(average(box)), count: box.length }))
    .sort((a, b) => b.count - a.count || a.hex.localeCompare(b.hex));

  const seen = new Set<string>();
  return ordered
    .filter((entry) => {
      if (seen.has(entry.hex)) {
        return false;
      }
      seen.add(entry.hex);
      return true;
    })
    .map((entry) => entry.hex);
}

/* -------------------------------------------------------- palette -> theme */

function normalize(colors: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const color of colors) {
    let hex: string;
    try {
      hex = toHex(parseHex(color));
    } catch {
      continue;
    }
    if (!seen.has(hex)) {
      seen.add(hex);
      out.push(hex);
    }
  }
  return out;
}

/** How brand-like a colour is: saturated, and not too close to paper or ink. */
function accentScore(hex: string): number {
  const rgb = parseHex(hex);
  const fit = 1 - Math.min(1, Math.abs(relativeLuminance(rgb) - 0.25) / 0.6);
  return saturation(rgb) * 0.75 + fit * 0.25;
}

function bestBy(
  colors: string[],
  score: (hex: string) => number,
): string | undefined {
  return [...colors].sort(
    (a, b) => score(b) - score(a) || a.localeCompare(b),
  )[0];
}

export type DerivedThemeOptions = {
  name?: string;
  fontPptx?: string;
};

/**
 * Map an ordered palette onto the seventeen theme tokens.
 *
 * Every readability guarantee is constructive rather than hoped for:
 * body copy clears 7:1, secondary copy 4.5:1, and anything sitting on the
 * accent fill clears 4.5:1 for text and 3:1 for icon shapes.
 */
export function themeFromPalette(
  colors: string[],
  options: DerivedThemeOptions = {},
): Theme {
  const normalized = normalize(colors);
  const pool = normalized.length > 0 ? normalized : [SEED_ACCENT];

  const lightest =
    bestBy(pool, (hex) => relativeLuminance(parseHex(hex))) ?? SEED_ACCENT;
  const background =
    relativeLuminance(parseHex(lightest)) >= 0.8
      ? lightest
      : mix(lightest, WHITE, 0.86);

  // An accent has two jobs: host white-ish content as a fill, and read as text
  // on its own pale tint. Prefer candidates that can already do the first.
  const strong = pool.filter((hex) => contrastRatio(hex, WHITE) >= 4.5);
  const seed =
    bestBy(strong, accentScore) ?? bestBy(pool, accentScore) ?? SEED_ACCENT;

  let accent = ensureContrast(seed, background, 4.5);
  for (let pass = 0; pass < 8; pass += 1) {
    const tint = mix(accent, background, 0.93);
    if (contrastRatio(accent, tint) >= 4.5) {
      break;
    }
    accent = ensureContrast(accent, tint, 4.5);
  }
  const accentHue = hue(parseHex(accent));

  const targetFill = mix(accent, background, 0.93);
  const takeawayFill = mix(accent, background, 0.95);

  // Every text token is checked against the dimmest surface it can land on,
  // not just against the page background.
  const dimmest = [background, targetFill, takeawayFill].reduce((acc, candidate) =>
    relativeLuminance(parseHex(candidate)) < relativeLuminance(parseHex(acc))
      ? candidate
      : acc,
  );

  const darkest =
    bestBy(pool, (hex) => -relativeLuminance(parseHex(hex))) ?? SEED_ACCENT;
  const ink = ensureContrast(darkest, dimmest, 7);

  const distinct = pool.filter(
    (hex) =>
      saturation(parseHex(hex)) >= 0.12 &&
      hueDistance(hue(parseHex(hex)), accentHue) >= 40,
  );
  const secondary = ensureContrast(
    bestBy(distinct, accentScore) ?? mix(accent, ink, 0.4),
    background,
    4.5,
  );

  const themeColors: ThemeColors = {
    background,
    ink,
    muted: ensureContrast(softened(ink, background, 0.38, 4.5), dimmest, 4.5),
    rule: mix(ink, background, 0.84),
    currentFill: background,
    currentAccent: secondary,
    targetFill,
    targetAccent: accent,
    transformFill: accent,
    transformOnFill: readableOn(accent, [background, ink], 4.5),
    takeawayFill,
    takeawayAccent: ink,
    footer: ensureContrast(softened(ink, background, 0.55, 3), dimmest, 3),
    blob: mix(accent, background, 0.92),
    blobDeep: mix(accent, background, 0.78),
    iconOnAccent: readableOn(accent, [background, ink], 3),
  };

  return {
    id: "derived",
    name: options.name ?? "Derived from source artwork",
    colors: themeColors,
    fonts: { pptx: options.fontPptx ?? "Arial" },
  };
}
