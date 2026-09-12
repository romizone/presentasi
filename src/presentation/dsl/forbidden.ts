import { FORBIDDEN_LAYOUT_KEYS } from "./types";

const FORBIDDEN = new Set<string>(FORBIDDEN_LAYOUT_KEYS);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function findForbiddenLayoutKeys(
  value: unknown,
  path = "$",
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenLayoutKeys(item, `${path}[${index}]`),
    );
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const hits: string[] = [];
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (FORBIDDEN.has(key)) {
      hits.push(childPath);
    }
    hits.push(...findForbiddenLayoutKeys(child, childPath));
  }
  return hits;
}
