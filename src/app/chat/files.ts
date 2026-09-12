export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_FILES = 12;

export const ACCEPTED_EXTENSIONS = [
  ".pdf",
  ".ppt",
  ".pptx",
  ".key",
  ".doc",
  ".docx",
  ".txt",
  ".md",
  ".rtf",
  ".csv",
  ".xls",
  ".xlsx",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".rtf"]);
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
]);

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export type FileKind =
  | "image"
  | "pdf"
  | "presentation"
  | "document"
  | "spreadsheet"
  | "text"
  | "other";

export type ChatAttachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: FileKind;
  extension: string;
  textExcerpt?: string;
  previewUrl?: string;
};

export function extensionOf(name: string): string {
  const match = /\.[^.]+$/.exec(name.toLowerCase());
  return match ? match[0] : "";
}

export function kindOf(name: string, mime: string): FileKind {
  const ext = extensionOf(name);
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith("image/")) return "image";
  if (ext === ".pdf" || mime === "application/pdf") return "pdf";
  if ([".ppt", ".pptx", ".key"].includes(ext)) return "presentation";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "spreadsheet";
  if ([".doc", ".docx"].includes(ext)) return "document";
  if (TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/")) return "text";
  return "other";
}

export function isAcceptedFile(file: File): boolean {
  const ext = extensionOf(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext as (typeof ACCEPTED_EXTENSIONS)[number]);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function readTextExcerpt(file: File): Promise<string | undefined> {
  const ext = extensionOf(file.name);
  if (!TEXT_EXTENSIONS.has(ext) && !file.type.startsWith("text/")) {
    return undefined;
  }
  const text = await file.text();
  return text.slice(0, 4000);
}

export function validateIncomingFiles(
  incoming: File[],
  alreadyCount: number,
): { accepted: File[]; error?: string } {
  if (alreadyCount + incoming.length > MAX_FILES) {
    return {
      accepted: [],
      error: `Maksimal ${MAX_FILES} file per pesan.`,
    };
  }

  const accepted: File[] = [];
  for (const file of incoming) {
    if (!isAcceptedFile(file)) {
      return {
        accepted: [],
        error: `"${file.name}" tidak didukung. Unggah PDF, PPTX, DOCX, Excel, teks, atau gambar.`,
      };
    }
    if (file.size > MAX_FILE_BYTES) {
      return {
        accepted: [],
        error: `"${file.name}" melebihi 25 MB.`,
      };
    }
    accepted.push(file);
  }

  return { accepted };
}
