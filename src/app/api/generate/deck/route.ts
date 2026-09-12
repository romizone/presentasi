import { NextResponse } from "next/server";
import { z } from "zod";
import { generateDeckFromTopic } from "@/lib/pipeline/generate";
import { generateDeckImages } from "@/lib/image/generate";
import { CostAccumulator } from "@/lib/openrouter";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  topic: z.string().min(1),
  style: z.enum(["consulting", "editorial", "dense", "card"]).default("consulting"),
  storyline: z.enum(["pyramid", "scqa", "chronological"]).optional(),
  materials: z
    .array(
      z.object({
        name: z.string(),
        textExcerpt: z.string().optional(),
      }),
    )
    .optional(),
  /** Generate decorative images when the style/slides want them (default: card only). */
  generateImages: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json: unknown = await request.json();
    const body = BodySchema.parse(json);

    const result = await generateDeckFromTopic({
      topic: body.topic.trim(),
      style: body.style,
      storyline: body.storyline,
      materials: body.materials,
    });

    const wantImages =
      body.generateImages ?? (body.style === "card" || body.style === "dense");

    let images:
      | { slideIndex: number; dataUri: string; cacheHit: boolean }[]
      | undefined;
    let imageCost = 0;

    if (wantImages) {
      const imageCostAcc = new CostAccumulator();
      const generated = await generateDeckImages(result.deck, imageCostAcc);
      imageCost = imageCostAcc.total;
      images = generated.images.map((img) => ({
        slideIndex: img.slideIndex,
        dataUri: img.dataUri,
        cacheHit: img.cacheHit,
      }));
    }

    return NextResponse.json({
      deck: result.deck,
      cost: result.cost + imageCost,
      textCost: result.cost,
      imageCost,
      claims: result.claims,
      images,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("OPENROUTER_API_KEY")
      ? 500
      : message.includes("Zod") || message.toLowerCase().includes("invalid")
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
