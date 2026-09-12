import { NextResponse } from "next/server";
import { samplePresentation } from "@/presentation/dsl/sample-tr01";
import { validatePresentation } from "@/presentation/dsl/validate";
import { buildPptxBuffer } from "@/presentation/renderer/pptx/exportPptx";
import { strategyConsultingTheme } from "@/presentation/themes/strategy-consulting";

export const runtime = "nodejs";

function pptxResponse(buffer: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET() {
  const buffer = await buildPptxBuffer(samplePresentation, strategyConsultingTheme);
  return pptxResponse(buffer, "tr-01-current-target.pptx");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { presentation?: unknown };
    const presentation = validatePresentation(body.presentation);
    const buffer = await buildPptxBuffer(presentation, strategyConsultingTheme);
    const slug = presentation.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    return pptxResponse(buffer, `${slug || "presentasi"}.pptx`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
