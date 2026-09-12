import pLimit from "p-limit";
import {
  Deck,
  Slide,
  type Deck as DeckType,
  type StyleId,
} from "@/lib/schema";
import { chat, type CostAccumulator } from "@/lib/openrouter";
import { STYLES } from "@/lib/styles";
import type { NarrativePlan } from "@/lib/pipeline/plan";
import {
  formatValidationIssues,
  validateSlide,
} from "@/lib/pipeline/validate";
import { getModel } from "@/presentation/ai/model-router";

export type GenerateSlidesInput = {
  plan: NarrativePlan;
  topic: string;
  style: StyleId;
  cost?: CostAccumulator;
};

function styleSystemPrompt(style: StyleId): string {
  const preset = STYLES[style];
  return [
    "You write a single presentation slide as strict JSON.",
    "AI must emit semantic content only — never coordinates, font sizes, or pixel layout.",
    "Charts must be ChartSpec JSON for a Vega-Lite renderer. Never describe charts as images.",
    "If the slide includes a non-none chart, chart.source MUST be a real-looking non-empty citation string.",
    "Prefer chart types appropriate to the style defaults when useful.",
    `Style: ${style}`,
    `Narrative / style rules:\n${preset.rules}`,
  ].join("\n\n");
}

function slideUserPrompt(
  input: GenerateSlidesInput,
  index: number,
  total: number,
): string {
  const planSlide = input.plan.slides[index];
  const defaultChart = STYLES[input.style].charts.default ?? "bar_h";

  return [
    `Deck topic: ${input.topic}`,
    `Storyline: ${input.plan.storyline}`,
    `Slide ${index + 1} of ${total}`,
    `Intent: ${planSlide?.intent ?? "support the argument"}`,
    `Key message: ${planSlide?.keyMessage ?? input.topic}`,
    planSlide?.evidenceRefs?.length
      ? `Evidence refs: ${planSlide.evidenceRefs.join("; ")}`
      : "Evidence refs: none",
    `Preferred default chart type when using data: ${defaultChart}`,
    "Requirements:",
    "- actionTitle must be a complete finding statement (not a topic label).",
    "- body: max 3 bullets (empty array for editorial).",
    "- For any quantitative chart (not type none), always set chart.source to a non-empty citation.",
    "- If inventing illustrative numbers, label source as scenario/assumption clearly.",
    "- Set needsReview to false unless you are uncertain.",
  ].join("\n");
}

function fallbackSlide(
  input: GenerateSlidesInput,
  index: number,
  reason: string,
): Slide {
  const planSlide = input.plan.slides[index];
  const title =
    planSlide?.keyMessage && planSlide.keyMessage.length >= 10
      ? planSlide.keyMessage.slice(0, 120)
      : `Slide ${index + 1} requires review after generation failure`;

  return Slide.parse({
    actionTitle: title,
    subtitle: reason.slice(0, 90),
    layout: "section_break",
    body:
      input.style === "editorial"
        ? []
        : ["Generation failed validation twice", "Marked for human review"],
    chart: {
      type: "none",
      data: [],
      source: "Review required — generation fallback",
    },
    needsReview: true,
  });
}

async function generateOneSlide(
  input: GenerateSlidesInput,
  index: number,
): Promise<Slide> {
  const total = input.plan.slides.length;
  const model = getModel("writer");
  const system = styleSystemPrompt(input.style);
  const baseUser = slideUserPrompt(input, index, total);

  const first = await chat({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: baseUser },
    ],
    schema: Slide,
    schemaName: "slide",
    temperature: 0.3,
    cost: input.cost,
  });

  let slide = first.data;
  let issues = validateSlide(slide, input.style);

  if (issues.length === 0) {
    return slide;
  }

  const retry = await chat({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: baseUser },
      {
        role: "assistant",
        content: JSON.stringify(slide),
      },
      {
        role: "user",
        content: [
          "Validation failed. Fix the slide JSON to resolve these issues:",
          formatValidationIssues(issues),
          "Remember: non-none charts always require a non-empty chart.source.",
        ].join("\n"),
      },
    ],
    schema: Slide,
    schemaName: "slide",
    temperature: 0.2,
    cost: input.cost,
  });

  slide = { ...retry.data, needsReview: retry.data.needsReview };
  issues = validateSlide(slide, input.style);

  if (issues.length === 0) {
    return slide;
  }

  return {
    ...slide,
    needsReview: true,
  };
}

export async function generateSlides(
  input: GenerateSlidesInput,
): Promise<DeckType> {
  const limit = pLimit(4);
  const slides = await Promise.all(
    input.plan.slides.map((_, index) =>
      limit(async () => {
        try {
          return await generateOneSlide(input, index);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "unknown generation error";
          return fallbackSlide(input, index, message);
        }
      }),
    ),
  );

  const deck = Deck.parse({
    title: input.topic.slice(0, 120),
    style: input.style,
    storyline: input.plan.storyline,
    slides,
  });

  return deck;
}
