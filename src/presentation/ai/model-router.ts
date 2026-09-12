export type ModelRole = "strategist" | "visualQa" | "escalation" | "image";

const ENV_KEYS: Record<ModelRole, string> = {
  strategist: "OPENROUTER_MODEL_STRATEGIST",
  visualQa: "OPENROUTER_MODEL_VISUAL_QA",
  escalation: "OPENROUTER_MODEL_ESCALATION",
  image: "OPENROUTER_MODEL_IMAGE",
};

const DEFAULT_MODELS: Record<ModelRole, string> = {
  strategist: "deepseek/deepseek-chat",
  visualQa: "z-ai/glm-4.5v",
  escalation: "qwen/qwen3-235b-a22b",
  image: "openai/gpt-image-2",
};

export function getModel(role: ModelRole): string {
  const fromEnv = process.env[ENV_KEYS[role]]?.trim();
  return fromEnv || DEFAULT_MODELS[role];
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
    "HTTP-Referer": "https://presentasi.rominur.com",
    "X-Title": "Presentasi AI",
  };
}
