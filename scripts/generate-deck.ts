import { generateDeckFromTopic } from "../src/lib/pipeline/generate";
import type { StyleId } from "../src/lib/schema";

async function main(): Promise<void> {
  const topic = process.argv.slice(2).join(" ").trim();
  if (!topic) {
    console.error('Usage: tsx scripts/generate-deck.ts "topic"');
    process.exitCode = 1;
    return;
  }

  const style = (process.env.DECK_STYLE?.trim() || "consulting") as StyleId;
  const { deck, cost } = await generateDeckFromTopic({ topic, style });

  console.log(`title: ${deck.title}`);
  console.log(`style: ${deck.style} storyline: ${deck.storyline}`);
  console.log(`slides: ${deck.slides.length} costUsd: ${cost.toFixed(6)}`);
  console.log("--- actionTitles ---");
  for (const [index, slide] of deck.slides.entries()) {
    const flag = slide.needsReview ? " [needsReview]" : "";
    console.log(`${index + 1}. ${slide.actionTitle}${flag}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
