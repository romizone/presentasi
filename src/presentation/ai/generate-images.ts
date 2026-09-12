import { getModel, openRouterHeaders } from "./model-router";
import type { PresentationAssets, SceneAsset, Slide } from "../dsl/types";

const QUALITY_LOCK = [
  "Flat vector consulting illustration, landscape 16:9 exhibit panel.",
  "Limited palette only: navy #1B365D, blue #2556BC, steel #467DDB, ice #85C3E5, charcoal #515151, paper #F4F7FA.",
  "Geometric pictograms, thick and thin line work, generous negative space, isometric or flat 2-D.",
  "Decorative illustration only — never a data visualization.",
  "No photograph, no photorealism, no cinematic lighting, no 3-D render, no collage, no UI.",
  "no text, no letters, no numbers, no watermark",
].join(" ");

/** Strip words that would push the image model toward fake charts. */
const FORBIDDEN_IMAGE_WORDS =
  /\b(chart|graph|diagram|bar|grafik|infographic|table|tabel)\b/gi;

function sanitizeSceneBrief(text: string): string {
  return text
    .replace(FORBIDDEN_IMAGE_WORDS, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export type ImageRef = {
  dataUri?: string;
  url?: string;
  mimeType?: string;
};

export function scenePrompt(slide: Slide, side: "current" | "target"): string {
  const authored =
    side === "current" ? slide.visual.currentScene : slide.visual.targetScene;
  const items = slide.content[side].items.join("; ");
  const mood =
    side === "current"
      ? "Fragmented, scattered composition. Cooler steel-blue. The problem as pictograms."
      : "Ordered, aligned composition. Deeper navy. The resolved system as pictograms.";
  const subject = sanitizeSceneBrief(
    authored?.trim() || `${slide.content[side].title}: ${items}`,
  );
  const topic = sanitizeSceneBrief(slide.actionTitle);
  const prompt = `${QUALITY_LOCK} ${mood} Depict: ${subject}. Exhibit about: ${topic}.`;
  if (/no text,\s*no letters,\s*no numbers,\s*no watermark\s*$/i.test(prompt)) {
    return prompt;
  }
  return `${prompt.replace(/[.\s]+$/g, "")}, no text, no letters, no numbers, no watermark`;
}

function mimeFromDataUri(value: string): string {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);/i.exec(value);
  return match?.[1] ?? "image/png";
}

function assetFromDataUri(dataUri: string, mimeType?: string): SceneAsset {
  return {
    mimeType: mimeType?.startsWith("image/") ? mimeType : mimeFromDataUri(dataUri),
    dataUri,
  };
}

function pushCandidate(candidates: string[], value: unknown): void {
  if (typeof value === "string" && value.trim()) {
    candidates.push(value.trim());
  }
}

function collectImageCandidates(payload: unknown): string[] {
  const root = payload as {
    data?: {
      b64_json?: string;
      image_base64?: string;
      media_type?: string;
      url?: string;
    }[];
    images?: { url?: string; image_url?: { url?: string } }[];
    choices?: {
      message?: {
        images?: { image_url?: { url?: string }; url?: string }[];
        content?: unknown;
      };
    }[];
  };
  const candidates: string[] = [];
  const first = root.data?.[0];
  if (first?.b64_json) {
    candidates.push(
      first.b64_json.startsWith("data:image/")
        ? first.b64_json
        : `data:${first.media_type?.startsWith("image/") ? first.media_type : "image/jpeg"};base64,${first.b64_json}`,
    );
  }
  if (first?.image_base64) {
    candidates.push(
      first.image_base64.startsWith("data:image/")
        ? first.image_base64
        : `data:image/png;base64,${first.image_base64}`,
    );
  }
  pushCandidate(candidates, first?.url);
  for (const image of root.images ?? []) {
    pushCandidate(candidates, image.url);
    pushCandidate(candidates, image.image_url?.url);
  }

  const message = root.choices?.[0]?.message;
  for (const image of message?.images ?? []) {
    pushCandidate(candidates, image.image_url?.url);
    pushCandidate(candidates, image.url);
  }

  const content = message?.content;
  if (typeof content === "string") {
    const embedded = content.match(
      /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/,
    );
    pushCandidate(candidates, embedded?.[0]);
    const remote = content.match(/https?:\/\/\S+\.(?:png|jpe?g|webp)/i);
    pushCandidate(candidates, remote?.[0]);
  }
  if (Array.isArray(content)) {
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const record = part as {
        image_url?: { url?: string };
        url?: string;
        inline_data?: { data?: string; mime_type?: string };
        inlineData?: { data?: string; mimeType?: string };
      };
      pushCandidate(candidates, record.image_url?.url);
      pushCandidate(candidates, record.url);
      if (record.inline_data?.data) {
        const mime = record.inline_data.mime_type?.startsWith("image/")
          ? record.inline_data.mime_type
          : "image/png";
        candidates.push(`data:${mime};base64,${record.inline_data.data}`);
      }
      if (record.inlineData?.data) {
        const mime = record.inlineData.mimeType?.startsWith("image/")
          ? record.inlineData.mimeType
          : "image/png";
        candidates.push(`data:${mime};base64,${record.inlineData.data}`);
      }
    }
  }

  return candidates;
}

export function imageRefFromPayload(payload: unknown): ImageRef | null {
  for (const candidate of collectImageCandidates(payload)) {
    if (candidate.startsWith("data:image/")) {
      return { dataUri: candidate, mimeType: mimeFromDataUri(candidate) };
    }
    if (/^https?:\/\//i.test(candidate)) {
      return { url: candidate };
    }
  }
  return null;
}

export function dataUriFromImagePayload(payload: unknown): SceneAsset | null {
  const ref = imageRefFromPayload(payload);
  if (!ref?.dataUri) {
    return null;
  }
  return assetFromDataUri(ref.dataUri, ref.mimeType);
}

function imageModels(): string[] {
  const models = [
    getModel("image"),
    process.env.OPENROUTER_MODEL_IMAGE_FALLBACK?.trim(),
  ].filter((value): value is string => Boolean(value));
  return [...new Set(models)];
}

async function assetFromRef(ref: ImageRef): Promise<SceneAsset | undefined> {
  if (ref.dataUri?.startsWith("data:image/")) {
    return assetFromDataUri(ref.dataUri, ref.mimeType);
  }
  if (!ref.url || !/^https?:\/\//i.test(ref.url)) {
    return undefined;
  }

  const response = await fetch(ref.url);
  if (!response.ok) {
    return undefined;
  }
  const mime = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    ?.trim();
  if (!mime?.startsWith("image/")) {
    return undefined;
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    mimeType: mime,
    dataUri: `data:${mime};base64,${bytes.toString("base64")}`,
  };
}

async function assetFromPayload(payload: unknown): Promise<SceneAsset | undefined> {
  const ref = imageRefFromPayload(payload);
  if (!ref) {
    return undefined;
  }
  return assetFromRef(ref);
}

async function requestImageApi(
  model: string,
  prompt: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  const bodies = [
    {
      model,
      prompt,
      n: 1,
      aspect_ratio: "16:9",
      quality: "high",
      output_format: "jpeg",
    },
    { model, prompt, aspect_ratio: "16:9", quality: "high" },
    { model, prompt },
  ];

  for (const body of bodies) {
    const response = await fetch("https://openrouter.ai/api/v1/images", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) {
      return response.json();
    }
    const detail = (await response.text()).slice(0, 240);
    console.warn("[presentasi] image api", model, response.status, detail);
    if (response.status !== 400 && response.status !== 422) {
      return null;
    }
  }
  return null;
}

async function generateOne(prompt: string): Promise<SceneAsset | undefined> {
  const headers = openRouterHeaders();

  for (const model of imageModels()) {
    const imagePayload = await requestImageApi(model, prompt, headers);
    if (imagePayload) {
      const parsed = await assetFromPayload(imagePayload);
      if (parsed) return parsed;
    }

    const chatResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          modalities: ["image", "text"],
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );

    if (chatResponse.ok) {
      const parsed = await assetFromPayload(await chatResponse.json());
      if (parsed) return parsed;
    } else {
      const detail = (await chatResponse.text()).slice(0, 240);
      console.warn("[presentasi] image chat", model, chatResponse.status, detail);
    }
  }

  return undefined;
}

export async function generateSceneImages(
  slide: Slide,
): Promise<PresentationAssets | undefined> {
  const [currentScene, targetScene] = await Promise.all([
    generateOne(scenePrompt(slide, "current")),
    generateOne(scenePrompt(slide, "target")),
  ]);

  if (!currentScene && !targetScene) {
    return undefined;
  }

  return { currentScene, targetScene };
}
