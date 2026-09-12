import { findForbiddenLayoutKeys } from "./forbidden";
import {
  DSL_VERSION,
  REGISTERED_ARCHETYPES,
  type Presentation,
  type PresentationAssets,
  type SceneAsset,
  type Slide,
  type Tr01Content,
} from "./types";

export class DslValidationError extends Error {
  constructor(
    message: string,
    readonly issues: string[] = [],
  ) {
    super(message);
    this.name = "DslValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new DslValidationError(`${path} must be a non-empty string`);
  }
  return value;
}

function requireStringArray(value: unknown, path: string, min: number): string[] {
  if (!Array.isArray(value) || value.length < min) {
    throw new DslValidationError(`${path} must be an array with at least ${min} item(s)`);
  }
  return value.map((item, index) => requireString(item, `${path}[${index}]`));
}

function parseTr01Content(value: unknown, path: string): Tr01Content {
  if (!isRecord(value)) {
    throw new DslValidationError(`${path} must be an object`);
  }

  if (!isRecord(value.current)) {
    throw new DslValidationError(`${path}.current must be an object`);
  }
  if (!isRecord(value.transformation)) {
    throw new DslValidationError(`${path}.transformation must be an object`);
  }
  if (!isRecord(value.target)) {
    throw new DslValidationError(`${path}.target must be an object`);
  }

  return {
    current: {
      title: requireString(value.current.title, `${path}.current.title`),
      items: requireStringArray(value.current.items, `${path}.current.items`, 1),
    },
    transformation: {
      label: requireString(value.transformation.label, `${path}.transformation.label`),
    },
    target: {
      title: requireString(value.target.title, `${path}.target.title`),
      items: requireStringArray(value.target.items, `${path}.target.items`, 1),
    },
    takeaway: requireString(value.takeaway, `${path}.takeaway`),
  };
}

function parseSlide(value: unknown, path: string): Slide {
  if (!isRecord(value)) {
    throw new DslValidationError(`${path} must be an object`);
  }

  const archetype = requireString(value.archetype, `${path}.archetype`);
  if (!REGISTERED_ARCHETYPES.includes(archetype as Slide["archetype"])) {
    throw new DslValidationError(
      `${path}.archetype "${archetype}" is not registered`,
      [`Registered archetypes: ${REGISTERED_ARCHETYPES.join(", ")}`],
    );
  }

  if (!isRecord(value.visual)) {
    throw new DslValidationError(`${path}.visual must be an object`);
  }

  const emphasis = requireString(value.visual.emphasis, `${path}.visual.emphasis`);
  if (
    emphasis !== "current" &&
    emphasis !== "target" &&
    emphasis !== "gap" &&
    emphasis !== "balanced"
  ) {
    throw new DslValidationError(`${path}.visual.emphasis is invalid`);
  }

  const visualType = requireString(value.visual.type, `${path}.visual.type`);
  if (visualType !== "current-target-comparison") {
    throw new DslValidationError(`${path}.visual.type is invalid for TR-01`);
  }

  return {
    id: requireString(value.id, `${path}.id`),
    archetype: "TR-01",
    actionTitle: requireString(value.actionTitle, `${path}.actionTitle`),
    keyMessage: requireString(value.keyMessage, `${path}.keyMessage`),
    content: parseTr01Content(value.content, `${path}.content`),
    visual: {
      type: "current-target-comparison",
      emphasis,
      currentScene:
        typeof value.visual.currentScene === "string"
          ? value.visual.currentScene.trim() || undefined
          : undefined,
      targetScene:
        typeof value.visual.targetScene === "string"
          ? value.visual.targetScene.trim() || undefined
          : undefined,
    },
    notes: typeof value.notes === "string" ? value.notes : undefined,
    sources: Array.isArray(value.sources)
      ? value.sources.map((item, index) =>
          requireString(item, `${path}.sources[${index}]`),
        )
      : undefined,
  };
}

export function validatePresentation(input: unknown): Presentation {
  const forbidden = findForbiddenLayoutKeys(input);
  if (forbidden.length > 0) {
    throw new DslValidationError(
      "Presentation DSL must not contain physical layout fields",
      forbidden,
    );
  }

  if (!isRecord(input)) {
    throw new DslValidationError("Presentation must be an object");
  }

  if (input.dslVersion !== DSL_VERSION) {
    throw new DslValidationError(
      `Unsupported dslVersion "${String(input.dslVersion)}". Expected ${DSL_VERSION}`,
    );
  }

  if (!Array.isArray(input.slides) || input.slides.length < 1) {
    throw new DslValidationError("slides must contain at least one slide");
  }

  const styleId = requireString(input.styleId, "styleId");
  if (styleId !== "strategyConsulting") {
    throw new DslValidationError("M0 only supports styleId strategyConsulting");
  }

  return {
    dslVersion: DSL_VERSION,
    id: requireString(input.id, "id"),
    title: requireString(input.title, "title"),
    styleId: "strategyConsulting",
    audience: typeof input.audience === "string" ? input.audience : undefined,
    objective: typeof input.objective === "string" ? input.objective : undefined,
    slides: input.slides.map((slide, index) => parseSlide(slide, `slides[${index}]`)),
    assets: parseAssets(input.assets),
  };
}

function parseSceneAsset(value: unknown, path: string): SceneAsset | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new DslValidationError(`${path} must be an object`);
  }
  const dataUri = requireString(value.dataUri, `${path}.dataUri`);
  if (!dataUri.startsWith("data:image/")) {
    throw new DslValidationError(`${path}.dataUri must be an image data URI`);
  }
  return {
    mimeType: requireString(value.mimeType, `${path}.mimeType`),
    dataUri,
  };
}

function parseAssets(value: unknown): PresentationAssets | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new DslValidationError("assets must be an object");
  }
  const assets: PresentationAssets = {
    currentScene: parseSceneAsset(value.currentScene, "assets.currentScene"),
    targetScene: parseSceneAsset(value.targetScene, "assets.targetScene"),
  };
  if (!assets.currentScene && !assets.targetScene) {
    return undefined;
  }
  return assets;
}
