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
import type { ProgressHandler } from "@/lib/pipeline/progress";
import { validateSlide } from "@/lib/pipeline/validate";
import { getModel } from "@/presentation/ai/model-router";

export type GenerateSlidesInput = {
  plan: NarrativePlan;
  topic: string;
  style: StyleId;
  cost?: CostAccumulator;
  onProgress?: ProgressHandler;
  /** Skip LLM retry on validation failure (faster). Default true. */
  fast?: boolean;
};

function styleSystemPrompt(style: StyleId): string {
  const preset = STYLES[style];
  return [
    "You write a single presentation slide as strict JSON.",
    "AI must emit semantic content only — never coordinates, font sizes, or pixel layout.",
    "Charts must be ChartSpec JSON for a Vega-Lite renderer. Never describe charts as images.",
    "If the slide includes a non-none chart, chart.source MUST be a real-looking non-empty citation string.",
    "Prefer chart types appropriate to the style defaults when useful.",
    "Keep actionTitle under 16 words. Keep body bullets under 10 words each.",
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

/** Cheap local repairs so we avoid a second LLM round-trip. */
function autoRepairSlide(slide: Slide, style: StyleId): Slide {
  let next = { ...slide, chart: { ...slide.chart } };

  if (style === "editorial" && next.body.length > 0) {
    next = { ...next, body: [] };
  }

  if (next.chart.type !== "none") {
    if (!next.chart.source?.trim()) {
      next.chart = {
        ...next.chart,
        source: "Illustrative scenario — verify before presenting",
      };
    }
    if (next.chart.data.length === 0) {
      next.chart = {
        ...next.chart,
        type: "none",
        source: "No quantitative series for this slide",
      };
    }
  } else if (!next.chart.source?.trim()) {
    next.chart = { ...next.chart, source: "Narrative slide — no chart" };
  }

  if (next.actionTitle.trim().split(/\s+/).length < 4) {
    next = {
      ...next,
      actionTitle: `${next.actionTitle.trim()} requires a clearer finding statement`,
      needsReview: true,
    };
  }

  return Slide.parse(next);
}

async function generateOneSlide(
  input: GenerateSlidesInput,
  index: number,
): Promise<Slide> {
  const total = input.plan.slides.length;
  const model = getModel("writer");
  const system = styleSystemPrompt(input.style);
  const baseUser = slideUserPrompt(input, index, total);
  const fast = input.fast !== false;

  const first = await chat({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: baseUser },
    ],
    schema: Slide,
    schemaName: "slide",
    temperature: 0.25,
    cost: input.cost,
  });

  let slide = autoRepairSlide(first.data, input.style);
  let issues = validateSlide(slide, input.style);

  if (issues.length === 0) {
    return slide;
  }

  if (fast) {
    return { ...slide, needsReview: true };
  }

  const retry = await chat({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: baseUser },
      { role: "assistant", content: JSON.stringify(slide) },
      {
        role: "user",
        content: [
          "Validation failed. Fix the slide JSON to resolve these issues:",
          issues.join("\n"),
          "Remember: non-none charts always require a non-empty chart.source.",
        ].join("\n"),
      },
    ],
    schema: Slide,
    schemaName: "slide",
    temperature: 0.2,
    cost: input.cost,
  });

  slide = autoRepairSlide(retry.data, input.style);
  issues = validateSlide(slide, input.style);

  if (issues.length === 0) {
    return slide;
  }

  return { ...slide, needsReview: true };
}

export async function generateSlides(
  input: GenerateSlidesInput,
): Promise<DeckType> {
  const total = input.plan.slides.length;
  const limit = pLimit(6);
  let done = 0;

  input.onProgress?.({
    stage: "slides",
    message: `Menulis slide 0/${total}…`,
    done: 0,
    total,
  });

  const slides = await Promise.all(
    input.plan.slides.map((_, index) =>
      limit(async () => {
        try {
          const slide = await generateOneSlide(input, index);
          done += 1;
          input.onProgress?.({
            stage: "slides",
            message: `Menulis slide ${done}/${total}…`,
            done,
            total,
          });
          return slide;
        } catch (error) {
          done += 1;
          input.onProgress?.({
            stage: "slides",
            message: `Menulis slide ${done}/${total}…`,
            done,
            total,
          });
          const message =
            error instanceof Error ? error.message : "unknown generation error";
          return fallbackSlide(input, index, message);
        }
      }),
    ),
  );

  return Deck.parse({
    title: input.topic.slice(0, 120),
    style: input.style,
    storyline: input.plan.storyline,
    slides,
  });
}
