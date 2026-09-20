import { NextResponse } from "next/server";
import { generateSceneImages } from "@/presentation/ai/generate-images";
import { validatePresentation } from "@/presentation/dsl/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { presentation?: unknown };
    const presentation = validatePresentation(body.presentation);
    const slide = presentation.slides[0];
    if (!slide) {
      return NextResponse.json({ error: "Slide is required" }, { status: 400 });
    }
    if (slide.archetype !== "TR-01") {
      return NextResponse.json(
        { error: "Scene images are only generated for TR-01 slides" },
        { status: 400 },
      );
    }

    const assets = await generateSceneImages(slide);
    return NextResponse.json({ assets: assets ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Image generation failed";
    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
