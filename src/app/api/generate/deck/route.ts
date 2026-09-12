import { z } from "zod";
import { generateDeckFromTopic } from "@/lib/pipeline/generate";
import { generateDeckImages } from "@/lib/image/generate";
import { CostAccumulator } from "@/lib/openrouter";
import type { GenerateProgress } from "@/lib/pipeline/progress";

export const runtime = "nodejs";
export const maxDuration = 300;

const BodySchema = z.object({
  topic: z.string().min(1),
  style: z
    .enum(["consulting", "editorial", "dense", "card"])
    .default("consulting"),
  storyline: z.enum(["pyramid", "scqa", "chronological"]).optional(),
  materials: z
    .array(
      z.object({
        name: z.string(),
        textExcerpt: z.string().optional(),
      }),
    )
    .optional(),
  generateImages: z.boolean().optional(),
  stream: z.boolean().optional(),
  fast: z.boolean().optional(),
});

type StreamEvent =
  | ({ type: "progress" } & GenerateProgress)
  | {
      type: "result";
      deck: unknown;
      cost: number;
      textCost: number;
      imageCost: number;
      claims?: unknown;
      images?: { slideIndex: number; dataUri: string; cacheHit: boolean }[];
    }
  | { type: "error"; error: string };

function encode(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(request: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid body";
    return Response.json({ error: message }, { status: 400 });
  }

  const stream = body.stream !== false;

  if (!stream) {
    try {
      const result = await generateDeckFromTopic({
        topic: body.topic.trim(),
        style: body.style,
        storyline: body.storyline,
        materials: body.materials,
        fast: body.fast,
      });
      return Response.json({
        deck: result.deck,
        cost: result.cost,
        textCost: result.cost,
        imageCost: 0,
        claims: result.claims,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Generation failed";
      const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;
      return Response.json({ error: message }, { status });
    }
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encode(event));
      };

      try {
        const result = await generateDeckFromTopic({
          topic: body.topic.trim(),
          style: body.style,
          storyline: body.storyline,
          materials: body.materials,
          fast: body.fast,
          onProgress: (progress) => {
            send({ type: "progress", ...progress });
          },
        });

        const wantImages =
          body.generateImages ??
          (body.style === "card" || body.style === "dense");

        let images:
          | { slideIndex: number; dataUri: string; cacheHit: boolean }[]
          | undefined;
        let imageCost = 0;

        if (wantImages) {
          send({
            type: "progress",
            stage: "images",
            message: "Menyusun ilustrasi dekoratif…",
          });
          const imageCostAcc = new CostAccumulator();
          const generated = await generateDeckImages(result.deck, imageCostAcc);
          imageCost = imageCostAcc.total;
          images = generated.images.map((img) => ({
            slideIndex: img.slideIndex,
            dataUri: img.dataUri,
            cacheHit: img.cacheHit,
          }));
        }

        send({
          type: "result",
          deck: result.deck,
          cost: result.cost + imageCost,
          textCost: result.cost,
          imageCost,
          claims: result.claims,
          images,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Generation failed";
        send({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
