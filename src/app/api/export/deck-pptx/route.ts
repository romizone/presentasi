import { NextResponse } from "next/server";
import { Deck } from "@/lib/schema";
import { buildDeckPptxBuffer } from "@/lib/export/pptx-deck";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { deck?: unknown };
    const deck = Deck.parse(body.deck);
    const buffer = await buildDeckPptxBuffer(deck);
    const slug = deck.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    return pptxResponse(buffer, `${slug || "deck"}.pptx`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
