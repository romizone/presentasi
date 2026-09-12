import pLimit from "p-limit";
import {
  generateImage,
  type CostAccumulator,
} from "@/lib/openrouter";
import type { Deck, Slide } from "@/lib/schema";
import { buildImagePrompt } from "@/lib/image/prompt";
import {
  imageCacheKey,
  readImageCache,
  writeImageCache,
} from "@/lib/image/cache";
import { getModel } from "@/presentation/ai/model-router";

export type SlideImageAsset = {
  slideIndex: number;
  dataUri: string;
  prompt: string;
  cacheHit: boolean;
};

export type GenerateDeckImagesResult = {
  images: SlideImageAsset[];
  /** First generated image b64 (no data: prefix), for debugging / re-use. */
  anchorB64?: string;
};

function concurrency(): number {
  const raw = Number(process.env.IMAGE_CONCURRENCY ?? "4");
  if (!Number.isFinite(raw) || raw < 1) return 4;
  return Math.min(8, Math.floor(raw));
}

/**
 * Styles / slides that should receive decorative images.
 * Editorial is charts-only — never call the image model.
 */
export function slideWantsImage(deck: Deck, slide: Slide): boolean {
  if (deck.style === "editorial") return false;
  if (deck.style === "card") return true;
  if (slide.layout === "section_break") return true;
  if (slide.imageBrief?.trim()) return true;
  return false;
}

function briefForSlide(slide: Slide): string {
  const authored = slide.imageBrief?.trim();
  if (authored) return authored;
  if (slide.layout === "section_break") {
    return `Decorative atmospheric backdrop for a section divider: ${slide.actionTitle}`;
  }
  return `Soft decorative illustration mood for: ${slide.actionTitle}`;
}

/**
 * Generate decorative images for slides that want them.
 * First successful image becomes the style anchor for subsequent calls.
 * Images run with limited concurrency; cache keyed by sha256(model+prompt+aspect).
 */
export async function generateDeckImages(
  deck: Deck,
  cost?: CostAccumulator,
): Promise<GenerateDeckImagesResult> {
  const targets = deck.slides
    .map((slide, slideIndex) => ({ slide, slideIndex }))
    .filter(({ slide }) => slideWantsImage(deck, slide));

  if (targets.length === 0) {
    return { images: [] };
  }

  const model = getModel("image");
  const aspect = "16:9";
  const limit = pLimit(concurrency());

  let anchorB64: string | undefined;
  const images: SlideImageAsset[] = [];

  // Sequential for the first image so we establish an anchor; remaining can parallelize.
  const [first, ...rest] = targets;

  async function runOne(
    slideIndex: number,
    slide: Slide,
    referenceB64?: string,
  ): Promise<SlideImageAsset> {
    const prompt = buildImagePrompt({
      brief: briefForSlide(slide),
      styleId: deck.style,
    });
    const key = imageCacheKey({ model, prompt, aspect });
    const cached = await readImageCache(key);
    if (cached) {
      return {
        slideIndex,
        dataUri: `data:${cached.mimeType};base64,${cached.b64}`,
        prompt,
        cacheHit: true,
      };
    }

    const result = await generateImage({
      prompt,
      model,
      aspectRatio: aspect,
      referenceB64,
      cost,
    });
    await writeImageCache(key, {
      b64: result.b64,
      mimeType: result.mimeType,
    });
    return {
      slideIndex,
      dataUri: `data:${result.mimeType};base64,${result.b64}`,
      prompt,
      cacheHit: false,
    };
  }

  if (first) {
    const asset = await runOne(first.slideIndex, first.slide);
    images.push(asset);
    const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(asset.dataUri);
    anchorB64 = match?.[1] ?? undefined;
  }

  if (rest.length > 0) {
    const more = await Promise.all(
      rest.map(({ slide, slideIndex }) =>
        limit(() => runOne(slideIndex, slide, anchorB64)),
      ),
    );
    images.push(...more);
  }

  images.sort((a, b) => a.slideIndex - b.slideIndex);
  return { images, anchorB64 };
}
