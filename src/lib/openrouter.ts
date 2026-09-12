import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { enforceAdditionalPropertiesFalse } from "@/lib/schema";
import { getOpenRouterApiKey, openRouterHeaders } from "@/presentation/ai/model-router";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
};

/** Rough USD estimate when OpenRouter omits native cost. */
const FALLBACK_INPUT_PER_M = 0.15;
const FALLBACK_OUTPUT_PER_M = 0.6;

export class CostAccumulator {
  private _total = 0;
  private _calls = 0;

  get total(): number {
    return this._total;
  }

  get calls(): number {
    return this._calls;
  }

  add(usage: ChatUsage): void {
    this._total += usage.costUsd;
    this._calls += 1;
  }
}

type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  cost?: number;
};

type ChatOptions<T extends z.ZodType> = {
  model: string;
  messages: ChatMessage[];
  schema?: T;
  schemaName?: string;
  temperature?: number;
  cost?: CostAccumulator;
};

export type ChatResult<T> = {
  data: T;
  raw: string;
  usage: ChatUsage;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function estimateCost(usage: OpenRouterUsage): number {
  if (typeof usage.cost === "number" && Number.isFinite(usage.cost)) {
    return usage.cost;
  }
  const prompt = usage.prompt_tokens ?? 0;
  const completion = usage.completion_tokens ?? 0;
  return (
    (prompt / 1_000_000) * FALLBACK_INPUT_PER_M +
    (completion / 1_000_000) * FALLBACK_OUTPUT_PER_M
  );
}

function toUsage(raw: OpenRouterUsage | undefined): ChatUsage {
  const promptTokens = raw?.prompt_tokens ?? 0;
  const completionTokens = raw?.completion_tokens ?? 0;
  const totalTokens = raw?.total_tokens ?? promptTokens + completionTokens;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    costUsd: estimateCost(raw ?? {}),
  };
}

function zodSchemaToOpenRouter(
  schema: z.ZodType,
  name: string,
): Record<string, unknown> {
  const converted = zodToJsonSchema(schema, {
    name,
    $refStrategy: "none",
    target: "jsonSchema7",
  }) as Record<string, unknown>;

  const definitions = converted.definitions as
    | Record<string, unknown>
    | undefined;
  const named =
    (definitions?.[name] as Record<string, unknown> | undefined) ?? converted;

  const rest = { ...named };
  delete rest.$schema;
  delete rest.definitions;
  delete rest.$ref;
  return enforceAdditionalPropertiesFalse(rest);
}

async function fetchWithRetry(
  body: Record<string, unknown>,
  attempt = 1,
): Promise<Response> {
  getOpenRouterApiKey();
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
  });

  if (
    (response.status === 429 || response.status >= 500) &&
    attempt < 3
  ) {
    await sleep(250 * 2 ** (attempt - 1));
    return fetchWithRetry(body, attempt + 1);
  }

  return response;
}

export async function chat<T extends z.ZodType>(
  options: ChatOptions<T>,
): Promise<ChatResult<z.infer<T>>> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    temperature: options.temperature ?? 0.3,
  };

  if (options.schema) {
    const name = options.schemaName ?? "response";
    body.response_format = {
      type: "json_schema",
      json_schema: {
        name,
        strict: true,
        schema: zodSchemaToOpenRouter(options.schema, name),
      },
    };
    body.provider = { require_parameters: true };
  }

  const response = await fetchWithRetry(body);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenRouter error ${response.status}: ${detail.slice(0, 400)}`,
    );
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: OpenRouterUsage;
  };

  const raw = payload.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenRouter returned an empty response");
  }

  const usage = toUsage(payload.usage);
  options.cost?.add(usage);

  if (!options.schema) {
    return { data: raw as z.infer<T>, raw, usage };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`OpenRouter returned non-JSON content: ${raw.slice(0, 200)}`);
  }

  const data = options.schema.parse(parsed) as z.infer<T>;
  return { data, raw, usage };
}

export type GenerateImageOptions = {
  prompt: string;
  model?: string;
  /** Raw base64 (no data: prefix) for style-consistency anchor. */
  referenceB64?: string;
  aspectRatio?: string;
  cost?: CostAccumulator;
};

export type GenerateImageResult = {
  b64: string;
  mimeType: string;
  usage: ChatUsage;
};

const IMAGE_FALLBACK_COST_USD = 0.04;

async function fetchImageWithRetry(
  body: Record<string, unknown>,
  attempt = 1,
): Promise<Response> {
  getOpenRouterApiKey();
  const response = await fetch("https://openrouter.ai/api/v1/images", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify(body),
  });

  if ((response.status === 429 || response.status >= 500) && attempt < 3) {
    await sleep(250 * 2 ** (attempt - 1));
    return fetchImageWithRetry(body, attempt + 1);
  }

  return response;
}

function parseImagePayload(payload: unknown): { b64: string; mimeType: string } | null {
  const root = payload as {
    data?: {
      b64_json?: string;
      image_base64?: string;
      media_type?: string;
      url?: string;
    }[];
  };
  const first = root.data?.[0];
  if (!first) return null;

  const mime =
    first.media_type?.startsWith("image/") ? first.media_type : "image/png";

  const raw = first.b64_json ?? first.image_base64;
  if (raw) {
    if (raw.startsWith("data:image/")) {
      const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(raw);
      if (match) {
        return { b64: match[2] ?? "", mimeType: match[1] ?? mime };
      }
    }
    return { b64: raw, mimeType: mime };
  }

  return null;
}

export async function generateImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResult> {
  const { getModel } = await import("@/presentation/ai/model-router");
  const model = options.model ?? getModel("image");
  const aspectRatio = options.aspectRatio ?? "16:9";

  const body: Record<string, unknown> = {
    model,
    prompt: options.prompt,
    n: 1,
    aspect_ratio: aspectRatio,
    quality: "high",
    output_format: "jpeg",
  };

  if (options.referenceB64) {
    body.input_references = [options.referenceB64];
  }

  const response = await fetchImageWithRetry(body);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenRouter image error ${response.status}: ${detail.slice(0, 400)}`,
    );
  }

  const payload: unknown = await response.json();
  const parsed = parseImagePayload(payload);
  if (!parsed?.b64) {
    throw new Error("OpenRouter image response missing b64_json");
  }

  const usageRaw = (payload as { usage?: OpenRouterUsage }).usage;
  const usage: ChatUsage = usageRaw
    ? toUsage(usageRaw)
    : {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        costUsd: IMAGE_FALLBACK_COST_USD,
      };

  options.cost?.add(usage);
  return { b64: parsed.b64, mimeType: parsed.mimeType, usage };
}
