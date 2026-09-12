import { NextResponse } from "next/server";
import { Deck } from "@/lib/schema";
import { exportDeckPdf } from "@/lib/export/pdf";

export const runtime = "nodejs";
/** Playwright PDF needs headroom; still may fail on slim serverless images. */
export const maxDuration = 60;

type Body = {
  deck?: unknown;
  id?: string;
};

function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    let deck: Deck | undefined;
    let id = body.id?.trim();

    if (body.deck !== undefined) {
      deck = Deck.parse(body.deck);
      if (!id) {
        id = `export-${Date.now()}`;
      }
    }

    if (!id) {
      return NextResponse.json(
        { error: "Provide { deck } and/or { id }" },
        { status: 400 },
      );
    }

    if (!deck) {
      return NextResponse.json(
        {
          error:
            "Send { deck } (and optional { id }) so Playwright can inject sessionStorage before capture. Id-only export cannot read the client's sessionStorage.",
        },
        { status: 400 },
      );
    }

    const htmlUrl = `${appUrl()}/deck/${encodeURIComponent(id)}/print`;
    const pdf = await exportDeckPdf({
      htmlUrl,
      deck,
      deckId: id,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="deck-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF export failed";
    return NextResponse.json(
      {
        error: message,
        note: "Playwright Chromium works locally; serverless may lack the browser binary.",
      },
      { status: 500 },
    );
  }
}
