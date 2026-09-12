export type ModelRole =
  | "planner"
  | "writer"
  | "strategist"
  | "visualQa"
  | "escalation"
  | "image";

const ENV_KEYS: Record<ModelRole, string[]> = {
  planner: ["MODEL_PLANNER", "OPENROUTER_MODEL_STRATEGIST"],
  writer: ["MODEL_WRITER", "OPENROUTER_MODEL_STRATEGIST"],
  strategist: ["MODEL_WRITER", "OPENROUTER_MODEL_STRATEGIST"],
  visualQa: ["OPENROUTER_MODEL_VISUAL_QA"],
  escalation: ["OPENROUTER_MODEL_ESCALATION"],
  image: ["MODEL_IMAGE", "OPENROUTER_MODEL_IMAGE"],
};

const DEFAULT_MODELS: Record<ModelRole, string> = {
  planner: "deepseek/deepseek-chat",
  writer: "deepseek/deepseek-chat",
  strategist: "deepseek/deepseek-chat",
  visualQa: "z-ai/glm-4.5v",
  escalation: "qwen/qwen3-235b-a22b",
  image: "bytedance-seed/seedream-4.5",
};

export function getModel(role: ModelRole): string {
  for (const key of ENV_KEYS[role]) {
    const fromEnv = process.env[key]?.trim();
    if (fromEnv) return fromEnv;
  }
  return DEFAULT_MODELS[role];
}

export function getOpenRouterApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set on the server");
  }
  return key;
}

export function openRouterHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getOpenRouterApiKey()}`,
    "Content-Type": "application/json",
    "HTTP-Referer":
      process.env.APP_URL?.trim() || "https://presentasi.rominur.com",
    "X-Title": "Presentasi AI",
  };
}
