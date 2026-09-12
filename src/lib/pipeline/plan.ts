import { z } from "zod";
import { chat, type CostAccumulator } from "@/lib/openrouter";
import type { StyleId, Storyline } from "@/lib/schema";
import { STYLES } from "@/lib/styles";
import type { GroundedClaim } from "@/lib/pipeline/ingest";
import { getModel } from "@/presentation/ai/model-router";

const PlanSlideSchema = z.object({
  intent: z.string().min(3),
  keyMessage: z.string().min(10),
  evidenceRefs: z.array(z.string()).optional(),
});

const NarrativePlanSchema = z.object({
  storyline: z.enum(["pyramid", "scqa", "chronological"]),
  slides: z.array(PlanSlideSchema).min(3).max(30),
});

export type NarrativePlan = z.infer<typeof NarrativePlanSchema>;

export type PlanDeckInput = {
  topic: string;
  style: StyleId;
  storyline?: Storyline;
  materials?: { name: string; textExcerpt?: string }[];
  /** Grounded claims from ingest — preferred over raw materials when present. */
  claims?: GroundedClaim[];
  cost?: CostAccumulator;
};

function defaultSlideCount(style: StyleId): number {
  return style === "consulting" ? 8 : 6;
}

function defaultStoryline(style: StyleId, override?: Storyline): Storyline {
  if (override) return override;
  if (style === "consulting") return "pyramid";
  if (style === "editorial") return "scqa";
  return "chronological";
}

export async function planDeck(input: PlanDeckInput): Promise<NarrativePlan> {
  const style = STYLES[input.style];
  const storyline = defaultStoryline(input.style, input.storyline);
  const slideCount = defaultSlideCount(input.style);

  const materialsBlock =
    input.materials
      ?.filter((m) => m.textExcerpt?.trim())
      .map((m) => `### ${m.name}\n${m.textExcerpt}`)
      .join("\n\n") ?? "";

  const claimsBlock =
    input.claims && input.claims.length > 0
      ? input.claims
          .map((c, i) => {
            const qty =
              c.value !== undefined
                ? ` value=${c.value}${c.unit ? ` ${c.unit}` : ""}${c.period ? ` (${c.period})` : ""}`
                : "";
            return `${i + 1}. ${c.claim}${qty} [source: ${c.source}]`;
          })
          .join("\n")
      : "";

  const system = [
    "You are a presentation narrative planner.",
    "Return only structured JSON matching the schema.",
    "Do not invent precise statistics; leave quantitative claims for later slides with sources.",
    "When grounded claims are provided, build the storyline around them and cite them via evidenceRefs.",
    `Style rules:\n${style.rules}`,
  ].join("\n\n");

  const user = [
    `Topic: ${input.topic}`,
    `Style: ${input.style}`,
    `Storyline: ${storyline}`,
    `Target slide count: ${slideCount}`,
    "Each slide needs: intent (role in the argument), keyMessage (one finding-style sentence).",
    "Optional evidenceRefs may cite claim numbers or material section names.",
    claimsBlock
      ? `Grounded claims (prefer these):\n${claimsBlock}`
      : materialsBlock
        ? `Materials:\n${materialsBlock}`
        : "No source materials provided.",
  ].join("\n\n");

  const { data } = await chat({
    model: getModel("planner"),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    schema: NarrativePlanSchema,
    schemaName: "narrative_plan",
    temperature: 0.4,
    cost: input.cost,
  });

  return {
    ...data,
    storyline: input.storyline ?? data.storyline ?? storyline,
  };
}
