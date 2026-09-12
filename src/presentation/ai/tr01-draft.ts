import { DSL_VERSION, type Presentation, type Tr01Content } from "../dsl/types";

export type Tr01Draft = {
  actionTitle: string;
  keyMessage: string;
  content: Tr01Content;
  currentScene?: string;
  targetScene?: string;
};

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value.trim();
}

function asStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${path} must be an array`);
  }
  const items = value
    .map((item, index) => asString(item, `${path}[${index}]`))
    .slice(0, 4);
  if (items.length < 3) {
    throw new Error(`${path} needs at least 3 items`);
  }
  return items;
}

export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    const start = payload.indexOf("{");
    const end = payload.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(payload.slice(start, end + 1)) as unknown;
    }
    throw new Error("Model did not return valid JSON");
  }
}

export function parseTr01Draft(value: unknown): Tr01Draft {
  const root = asRecord(value, "draft");
  const content = asRecord(root.content ?? root, "content");
  const current = asRecord(content.current, "content.current");
  const target = asRecord(content.target, "content.target");
  const transformation = asRecord(
    content.transformation,
    "content.transformation",
  );
  const takeaway = asString(
    content.takeaway ?? root.takeaway,
    "content.takeaway",
  );

  return {
    actionTitle: asString(root.actionTitle, "actionTitle"),
    keyMessage: asString(root.keyMessage ?? takeaway, "keyMessage"),
    currentScene:
      typeof root.currentScene === "string" && root.currentScene.trim()
        ? root.currentScene.trim()
        : undefined,
    targetScene:
      typeof root.targetScene === "string" && root.targetScene.trim()
        ? root.targetScene.trim()
        : undefined,
    content: {
      current: {
        title: asString(current.title, "content.current.title"),
        items: asStringList(current.items, "content.current.items"),
      },
      transformation: {
        label: asString(transformation.label, "content.transformation.label"),
      },
      target: {
        title: asString(target.title, "content.target.title"),
        items: asStringList(target.items, "content.target.items"),
      },
      takeaway,
    },
  };
}

export function presentationFromDraft(
  draft: Tr01Draft,
  prompt: string,
): Presentation {
  return {
    dslVersion: DSL_VERSION,
    id: `tr01-${Date.now()}`,
    title: draft.actionTitle,
    styleId: "strategyConsulting",
    objective: prompt.slice(0, 240),
    slides: [
      {
        id: "slide-tr01-1",
        archetype: "TR-01",
        actionTitle: draft.actionTitle,
        keyMessage: draft.keyMessage,
        content: draft.content,
        visual: {
          type: "current-target-comparison",
          emphasis: "target",
          currentScene: draft.currentScene,
          targetScene: draft.targetScene,
        },
      },
    ],
  };
}

export const STRATEGIST_SYSTEM_PROMPT = [
  "You are a presentation strategist for Presentasi AI.",
  "Return ONLY a JSON object. No markdown, no commentary, no coordinates.",
  "",
  "The JSON shape:",
  "{",
  '  "actionTitle": "insight-led sentence, max 16 words",',
  '  "keyMessage": "one-sentence takeaway",',
  '  "content": {',
  '    "current": { "title": "Current State or local equivalent", "items": ["a", "b", "c"] },',
  '    "transformation": { "label": "2-4 word verb phrase" },',
  '    "target": { "title": "Target State or local equivalent", "items": ["a", "b", "c"] },',
  '    "takeaway": "one sentence"',
  "  },",
  '  "currentScene": "flat consulting illustration of the current problem, pictograms only, decorative only, no text",',
  '  "targetScene": "flat consulting illustration of the target system, pictograms only, decorative only, no text"',
  "}",
  "",
  "Rules:",
  "- Write like a consulting exhibit.",
  "- actionTitle, column titles, bullets, transformation label, and takeaway MUST use the same language as the user brief.",
  "- Scene descriptions stay in English for the image model.",
  "- Write about the user's actual topic. Never reuse unrelated IT or generic product examples unless asked.",
  "- Expand acronyms in the user's locale. In Indonesian, MBG is Makan Bergizi Gratis.",
  "- actionTitle: complete insight sentence, max 12 words. The so-what, never a topic label.",
  '- Column titles stay short labels such as "Kondisi saat ini" / "Sasaran".',
  "- Transformation label: 2-3 words, verb-led.",
  "- 3 bullets per side, max 6 words each. Parallel structure. No numbering.",
  "- takeaway: one implication sentence, max 14 words.",
  "- currentScene and targetScene: two sentences of a flat decorative consulting illustration — pictograms, objects, composition. Never a photograph, never coordinates, never lettering in the picture. Never mention charts, graphs, diagrams, or bars — decorative illustration only.",
  "- No x, y, w, h, fontSize, or other layout fields.",
].join("\n");

