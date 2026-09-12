import { NextResponse } from "next/server";
import { generateTr01Presentation } from "@/presentation/ai/generate-tr01";
import { validatePresentation } from "@/presentation/dsl/validate";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      materials?: { name: string; textExcerpt?: string }[];
    };
    const prompt = body.prompt?.trim() ?? "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const generated = await generateTr01Presentation({
      prompt,
      materials: body.materials,
    });
    const presentation = validatePresentation(generated);

    return NextResponse.json({ presentation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    const status = message.includes("OPENROUTER_API_KEY") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
