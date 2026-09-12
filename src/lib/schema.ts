import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const ChartSpec = z.object({
  type: z.enum([
    "bar_h",
    "bar_v",
    "line",
    "stacked_bar",
    "waterfall",
    "scatter",
    "big_number",
    "none",
  ]),
  data: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        series: z.string().optional(),
      }),
    )
    .max(24),
  unit: z.string().optional(),
  callout: z.string().optional(),
  calloutTarget: z.string().optional(),
  source: z.string().min(1),
});

export const Slide = z.object({
  actionTitle: z.string().min(10).max(120),
  subtitle: z.string().max(90).optional(),
  layout: z.enum([
    "chart_left",
    "full_chart",
    "three_column",
    "quote",
    "big_number",
    "section_break",
  ]),
  body: z.array(z.string().max(90)).max(3),
  chart: ChartSpec,
  imageBrief: z.string().max(300).optional(),
  needsReview: z.boolean().default(false),
});

export const Deck = z.object({
  title: z.string(),
  style: z.enum(["consulting", "editorial", "dense", "card"]),
  storyline: z.enum(["pyramid", "scqa", "chronological"]),
  slides: z.array(Slide).min(3).max(30),
});

export type ChartSpec = z.infer<typeof ChartSpec>;
export type Slide = z.infer<typeof Slide>;
export type Deck = z.infer<typeof Deck>;
export type ChartType = ChartSpec["type"];
export type StyleId = Deck["style"];
export type Storyline = Deck["storyline"];

type JsonSchemaObject = {
  type?: string | string[];
  properties?: Record<string, unknown>;
  items?: unknown;
  anyOf?: unknown[];
  oneOf?: unknown[];
  allOf?: unknown[];
  additionalProperties?: boolean | Record<string, unknown>;
  [key: string]: unknown;
};

/** Recursively set additionalProperties:false on every object node (strict providers). */
export function enforceAdditionalPropertiesFalse(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const visit = (node: unknown): unknown => {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return node;
    }
    const obj = node as JsonSchemaObject;
    const next: JsonSchemaObject = { ...obj };

    if (next.properties && typeof next.properties === "object") {
      const props: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(next.properties)) {
        props[key] = visit(value);
      }
      next.properties = props;
      if (next.additionalProperties === undefined) {
        next.additionalProperties = false;
      }
    }

    if (next.items !== undefined) {
      next.items = visit(next.items);
    }
    for (const key of ["anyOf", "oneOf", "allOf"] as const) {
      const list = next[key];
      if (Array.isArray(list)) {
        next[key] = list.map(visit);
      }
    }

    return next;
  };

  return visit(schema) as Record<string, unknown>;
}

const rawSlideJsonSchema = zodToJsonSchema(Slide, {
  name: "slide",
  $refStrategy: "none",
});

const slideDefinition =
  (rawSlideJsonSchema as { definitions?: { slide?: Record<string, unknown> } })
    .definitions?.slide ?? (rawSlideJsonSchema as Record<string, unknown>);

export const slideJsonSchema = enforceAdditionalPropertiesFalse(
  slideDefinition,
);
