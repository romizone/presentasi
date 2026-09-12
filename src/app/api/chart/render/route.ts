import { NextResponse } from "next/server";
import { z } from "zod";
import { ChartSpec } from "@/lib/schema";
import { renderChartSvg } from "@/lib/chart/vegalite";

export const runtime = "nodejs";

const Body = z.object({
  chart: ChartSpec,
  styleId: z.enum(["consulting", "editorial", "dense", "card"]),
});

export async function POST(request: Request) {
  try {
    const body = Body.parse(await request.json());
    const svg = await renderChartSvg(body.chart, body.styleId);
    return NextResponse.json({ svg });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chart render failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
