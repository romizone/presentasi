"use client";

import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Presentation,
} from "lucide-react";
import { formatBytes, type ChatAttachment, type FileKind } from "./files";

function KindIcon({ kind }: { kind: FileKind }) {
  const className = "size-4 shrink-0";
  if (kind === "image") return <ImageIcon className={className} />;
  if (kind === "spreadsheet") return <FileSpreadsheet className={className} />;
  if (kind === "presentation") return <Presentation className={className} />;
  return <FileText className={className} />;
}

export function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: ChatAttachment;
  onRemove?: () => void;
}) {
  return (
    <div className="flex max-w-full items-center gap-2 rounded-2xl border border-highlight bg-white px-2.5 py-2">
      {attachment.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={attachment.previewUrl}
          alt=""
          className="size-9 rounded-lg object-cover"
        />
      ) : (
        <div className="flex size-9 items-center justify-center rounded-lg bg-surface text-interactive">
          <KindIcon kind={attachment.kind} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-neutral">
          {attachment.name}
        </p>
        <p className="text-[11px] text-neutral/55">
          {attachment.extension.replace(".", "").toUpperCase()} ·{" "}
          {formatBytes(attachment.size)}
        </p>
      </div>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full px-1.5 text-sm text-neutral hover:bg-surface hover:text-interactive"
          aria-label={`Hapus ${attachment.name}`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
