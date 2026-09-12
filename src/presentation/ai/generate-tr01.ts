import { getModel, openRouterHeaders } from "./model-router";
import {
  parseJsonObject,
  parseTr01Draft,
  presentationFromDraft,
  STRATEGIST_SYSTEM_PROMPT,
} from "./tr01-draft";
import type { Presentation } from "../dsl/types";

export type GenerateInput = {
  prompt: string;
  materials?: { name: string; textExcerpt?: string }[];
};

const TOPIC_HINTS: { pattern: RegExp; hint: string }[] = [
  {
    pattern: /\bmbg\b/i,
    hint: "MBG means Makan Bergizi Gratis, Indonesia's national free nutritious meal program for schoolchildren. Do not treat it as a commercial product, SaaS, or generic brand.",
  },
];

function topicContext(prompt: string): string {
  const matched = TOPIC_HINTS.filter((item) => item.pattern.test(prompt)).map(
    (item) => item.hint,
  );
  if (matched.length > 0) {
    return matched.join(" ");
  }
  return "Expand acronyms using the standard meaning in the user's locale. Do not invent an unrelated industry.";
}

export async function generateTr01Presentation(
  input: GenerateInput,
): Promise<Presentation> {
  const materialBlock =
    input.materials
      ?.filter((item) => item.textExcerpt)
      .map((item) => `File ${item.name}:\n${item.textExcerpt}`)
      .join("\n\n") ?? "";

  const userContent = [
    `Brief:\n${input.prompt}`,
    `Topic context:\n${topicContext(input.prompt)}`,
    materialBlock ? `Source material:\n${materialBlock}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: openRouterHeaders(),
    body: JSON.stringify({
      model: getModel("strategist"),
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: STRATEGIST_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${detail.slice(0, 400)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenRouter returned an empty response");
  }

  const draft = parseTr01Draft(parseJsonObject(content));
  return presentationFromDraft(draft, input.prompt);
}
