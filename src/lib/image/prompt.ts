import type { StyleId } from "@/lib/schema";
import { STYLES } from "@/lib/styles";

/** Words that must never appear in image prompts (charts are code-rendered). */
const FORBIDDEN = /\b(chart|graph|diagram|bar|grafik|infographic|table|tabel)\b/gi;

export const NO_TEXT_CLAUSE =
  "no text, no letters, no numbers, no watermark";

const NO_TEXT_RE =
  /,?\s*no text,\s*no letters,\s*no numbers,\s*no watermark\s*/gi;

function stripForbiddenWords(brief: string): string {
  return brief
    .replace(FORBIDDEN, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripNoTextClause(text: string): string {
  return text
    .replace(NO_TEXT_RE, " ")
    .replace(/[.\s,]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type BuildImagePromptInput = {
  brief: string;
  styleId: StyleId;
};

/**
 * Build a decorative-only image prompt: cleaned brief + style suffix + no-text clause.
 */
export function buildImagePrompt(input: BuildImagePromptInput): string {
  const cleaned = stripNoTextClause(stripForbiddenWords(input.brief));
  const rawSuffix =
    STYLES[input.styleId].imageSuffix ??
    STYLES[input.styleId].STYLE_SUFFIX ??
    "";
  const suffix = stripNoTextClause(rawSuffix);
  const parts = [cleaned, suffix].filter(Boolean);
  return `${parts.join(". ")}, ${NO_TEXT_CLAUSE}`;
}
