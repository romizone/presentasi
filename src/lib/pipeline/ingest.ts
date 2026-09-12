import { z } from "zod";
import { chat, type CostAccumulator } from "@/lib/openrouter";
import { getModel } from "@/presentation/ai/model-router";

const ClaimSchema = z.object({
  claim: z.string().min(3),
  value: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  period: z.string().optional().nullable(),
  source: z.string().nullable(),
});

const ClaimsResponseSchema = z.object({
  claims: z.array(ClaimSchema).max(80),
});

export type GroundedClaim = {
  claim: string;
  value?: number;
  unit?: string;
  period?: string;
  source: string;
};

export type IngestMaterialsInput = {
  files: { name: string; text: string }[];
  cost?: CostAccumulator;
};

/**
 * Extract grounded claims from source materials.
 * Claims with source: null are dropped — never invent from model knowledge.
 */
export async function ingestMaterials(
  input: IngestMaterialsInput,
): Promise<GroundedClaim[]> {
  const corpus = input.files
    .map((f) => f.text.trim())
    .filter(Boolean)
    .join("\n\n---\n\n");

  if (!corpus.trim()) {
    return [];
  }

  const named = input.files
    .filter((f) => f.text.trim())
    .map((f) => `### ${f.name}\n${f.text.trim()}`)
    .join("\n\n");

  const { data } = await chat({
    model: getModel("writer"),
    messages: [
      {
        role: "system",
        content: [
          "You extract grounded factual claims from source materials.",
          "Return structured JSON only.",
          "Every claim MUST quote or paraphrase something present in the materials.",
          "Set source to the document name and a short locator (section/heading/snippet).",
          "If a claim cannot be traced to the materials, set source to null — it will be discarded.",
          "Do not invent statistics from world knowledge.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Extract claims from these materials:\n\n${named}`,
      },
    ],
    schema: ClaimsResponseSchema,
    schemaName: "grounded_claims",
    temperature: 0.1,
    cost: input.cost,
  });

  return data.claims
    .filter((c): c is typeof c & { source: string } =>
      Boolean(c.source && c.source.trim()),
    )
    .map((c) => ({
      claim: c.claim.trim(),
      value: c.value ?? undefined,
      unit: c.unit?.trim() || undefined,
      period: c.period?.trim() || undefined,
      source: c.source.trim(),
    }));
}
