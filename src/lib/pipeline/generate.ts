import { CostAccumulator } from "@/lib/openrouter";
import { Deck, type StyleId, type Storyline } from "@/lib/schema";
import { ingestMaterials, type GroundedClaim } from "@/lib/pipeline/ingest";
import { planDeck } from "@/lib/pipeline/plan";
import { generateSlides } from "@/lib/pipeline/slides";
import { validateDeck } from "@/lib/pipeline/validate";
import type { ProgressHandler } from "@/lib/pipeline/progress";

export type GenerateDeckInput = {
  topic: string;
  style: StyleId;
  storyline?: Storyline;
  materials?: { name: string; textExcerpt?: string }[];
  /** When true (default if materials have text), run ingest before plan. */
  ingest?: boolean;
  onProgress?: ProgressHandler;
  /** Faster path: fewer LLM retries. Default true. */
  fast?: boolean;
};

export type GenerateDeckResult = {
  deck: Deck;
  cost: number;
  claims?: GroundedClaim[];
};

export async function generateDeckFromTopic(
  input: GenerateDeckInput,
): Promise<GenerateDeckResult> {
  const cost = new CostAccumulator();
  const onProgress = input.onProgress;

  const textFiles =
    input.materials
      ?.filter((m) => m.textExcerpt?.trim())
      .map((m) => ({ name: m.name, text: m.textExcerpt!.trim() })) ?? [];

  let claims: GroundedClaim[] | undefined;
  const shouldIngest = input.ingest ?? textFiles.length > 0;
  if (shouldIngest && textFiles.length > 0) {
    onProgress?.({
      stage: "ingest",
      message: "Mengekstrak klaim dari materi…",
    });
    claims = await ingestMaterials({ files: textFiles, cost });
  }

  onProgress?.({
    stage: "plan",
    message: "Menyusun outline argumen…",
  });
  const plan = await planDeck({
    topic: input.topic,
    style: input.style,
    storyline: input.storyline,
    materials: input.materials,
    claims,
    cost,
  });

  const draft = await generateSlides({
    plan,
    topic: input.topic,
    style: input.style,
    cost,
    onProgress,
    fast: input.fast,
  });

  onProgress?.({
    stage: "validate",
    message: "Memvalidasi deck…",
  });
  const validated = validateDeck(draft);
  if (validated.ok) {
    onProgress?.({ stage: "done", message: "Deck siap" });
    return { deck: validated.deck, cost: cost.total, claims };
  }

  const reviewed = Deck.parse({
    ...draft,
    slides: draft.slides.map((slide, index) => {
      const hasIssue = validated.errors.some((error) =>
        error.startsWith(`slides[${index}]`),
      );
      return hasIssue ? { ...slide, needsReview: true } : slide;
    }),
  });

  onProgress?.({ stage: "done", message: "Deck siap" });
  return { deck: reviewed, cost: cost.total, claims };
}
