import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const CACHE_ROOT = path.join(process.cwd(), ".cache", "images");

export type ImageCacheKeyInput = {
  model: string;
  prompt: string;
  aspect: string;
};

export function imageCacheKey(input: ImageCacheKeyInput): string {
  return createHash("sha256")
    .update(`${input.model}\0${input.prompt}\0${input.aspect}`)
    .digest("hex");
}

function cachePath(key: string, ext = "bin"): string {
  return path.join(CACHE_ROOT, `${key}.${ext}`);
}

export type CachedImage = {
  b64: string;
  mimeType: string;
};

export async function readImageCache(
  key: string,
): Promise<CachedImage | null> {
  try {
    const metaRaw = await readFile(cachePath(key, "json"), "utf8");
    const meta = JSON.parse(metaRaw) as { mimeType?: string };
    const bytes = await readFile(cachePath(key, "bin"));
    return {
      b64: bytes.toString("base64"),
      mimeType: meta.mimeType?.startsWith("image/")
        ? meta.mimeType
        : "image/jpeg",
    };
  } catch {
    return null;
  }
}

export async function writeImageCache(
  key: string,
  image: CachedImage,
): Promise<void> {
  await mkdir(CACHE_ROOT, { recursive: true });
  await writeFile(cachePath(key, "bin"), Buffer.from(image.b64, "base64"));
  await writeFile(
    cachePath(key, "json"),
    JSON.stringify({ mimeType: image.mimeType }, null, 2),
    "utf8",
  );
}
