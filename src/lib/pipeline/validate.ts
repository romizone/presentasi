import { Deck, type Deck as DeckType } from "@/lib/schema";

const FINDING_VERB_PATTERN =
  /naik|turun|menjadi|adalah|karena|karna|meningkatkan|menurunkan|drive|increase|decrease|because|after|before|from|to|is|are|was|were|has|have|will|can|should|must|bridges|enables|creates|reduces|improves|memiliki|menyebabkan|menghasilkan|mengurangi|memperbaiki|terjadi|mencapai|menunjukkan/i;

export type ValidateOk = { ok: true; deck: DeckType };
export type ValidateFail = { ok: false; errors: string[] };
export type ValidateResult = ValidateOk | ValidateFail;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function looksLikeFinding(actionTitle: string): boolean {
  const words = wordCount(actionTitle);
  if (words < 4) return false;
  return FINDING_VERB_PATTERN.test(actionTitle);
}

function styleErrors(deck: DeckType): string[] {
  const errors: string[] = [];

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    if (!slide) continue;
    const prefix = `slides[${i}]`;

    if (deck.style === "consulting") {
      if (!looksLikeFinding(slide.actionTitle)) {
        errors.push(
          `${prefix}.actionTitle must be a finding statement (not a short topic label): "${slide.actionTitle}"`,
        );
      }
      for (let j = 0; j < slide.body.length; j++) {
        const bullet = slide.body[j] ?? "";
        if (wordCount(bullet) > 12) {
          errors.push(
            `${prefix}.body[${j}] exceeds 12 words (${wordCount(bullet)} words)`,
          );
        }
      }
    }

    if (deck.style === "editorial" && slide.body.length > 0) {
      errors.push(
        `${prefix}.body must be empty for editorial style (got ${slide.body.length} item(s))`,
      );
    }

    if (slide.chart.type !== "none" && slide.chart.data.length === 0) {
      errors.push(
        `${prefix}.chart.data must not be empty when chart.type is "${slide.chart.type}"`,
      );
    }

    if (!slide.chart.source.trim()) {
      errors.push(`${prefix}.chart.source must be a non-empty string`);
    }
  }

  return errors;
}

export function validateSlide(
  slide: DeckType["slides"][number],
  style: DeckType["style"],
): string[] {
  const probe: DeckType = {
    title: "validation-probe",
    style,
    storyline: "pyramid",
    slides: [slide, slide, slide],
  };
  return styleErrors(probe)
    .filter((error) => error.startsWith("slides[0]"))
    .map((error) => error.replace(/^slides\[0\]/, "slide"));
}

export function formatValidationIssues(errors: string[]): string {
  return errors.join("\n");
}

export function validateDeck(deck: unknown): ValidateResult {
  const parsed = Deck.safeParse(deck);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "deck"}: ${issue.message}`,
      ),
    };
  }

  const errors = styleErrors(parsed.data);
  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, deck: parsed.data };
}
