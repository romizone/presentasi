import { z } from "zod";
import { chat, CostAccumulator } from "../src/lib/openrouter";
import { getModel } from "../src/presentation/ai/model-router";

const SmokeSchema = z.object({
  ok: z.boolean(),
  message: z.string().min(1).max(80),
});

async function main(): Promise<void> {
  const cost = new CostAccumulator();
  const { data, usage } = await chat({
    model: getModel("writer"),
    messages: [
      {
        role: "system",
        content: "Reply with tiny JSON matching the schema. Keep message short.",
      },
      {
        role: "user",
        content: 'Confirm the smoke test works with ok=true and message="smoke ok".',
      },
    ],
    schema: SmokeSchema,
    schemaName: "smoke",
    temperature: 0,
    cost,
  });

  console.log(JSON.stringify(data, null, 2));
  console.log(
    `usage tokens=${usage.totalTokens} callCost=${usage.costUsd.toFixed(6)} totalCost=${cost.total.toFixed(6)}`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
