"use client";

import { ArrowUp, Menu, Paperclip, Plus, SquarePen } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { AttachmentChip } from "./AttachmentChip";
import {
  ACCEPT_ATTRIBUTE,
  kindOf,
  readTextExcerpt,
  validateIncomingFiles,
  type ChatAttachment,
} from "./files";
import { PresentationPanel } from "./PresentationPanel";
import type { Presentation } from "@/presentation/dsl/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments: ChatAttachment[];
};

const STARTERS = [
  {
    label: "Slide tentang MBG",
    prompt:
      "Buatkan 1 slide Current → Target tentang program Makan Bergizi Gratis (MBG): dari distribusi yang belum merata ke menu bergizi terstandar di sekolah.",
  },
  {
    label: "Digitalisasi layanan publik",
    prompt:
      "Susun slide kondisi sekarang vs sasaran untuk digitalisasi layanan publik yang masih manual dan terfragmentasi.",
  },
  {
    label: "Transformasi rantai pasok",
    prompt:
      "Presentasikan Current → Target untuk rantai pasok yang lambat menuju operasi terintegrasi dan terukur.",
  },
];

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function filesToAttachments(files: File[]): Promise<ChatAttachment[]> {
  return Promise.all(
    files.map(async (file) => {
      const extensionMatch = /\.[^.]+$/.exec(file.name.toLowerCase());
      const extension = extensionMatch ? extensionMatch[0] : "";
      const kind = kindOf(file.name, file.type);
      const textExcerpt = await readTextExcerpt(file);
      return {
        id: createId(),
        name: file.name,
        type: file.type,
        size: file.size,
        kind,
        extension,
        textExcerpt,
        previewUrl:
          kind === "image" ? URL.createObjectURL(file) : undefined,
      };
    }),
  );
}

export function ChatApp() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [illustrating, setIllustrating] = useState(false);
  const [showArtifact, setShowArtifact] = useState(false);
  const [presentation, setPresentation] = useState<Presentation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragDepth = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  useEffect(() => {
    return () => {
      pending.forEach((file) => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
      });
    };
  }, [pending]);

  const addFiles = useCallback(async (list: File[]) => {
    const result = validateIncomingFiles(list, pending.length);
    if (result.error) {
      setError(result.error);
      return;
    }
    setError(null);
    const next = await filesToAttachments(result.accepted);
    setPending((current) => [...current, ...next]);
  }, [pending.length]);

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const files = [...event.dataTransfer.files];
    if (files.length) await addFiles(files);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if ((!trimmed && pending.length === 0) || isGenerating) return;

    const attachments = pending;
    setPending([]);
    setDraft("");
    setError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: trimmed,
      attachments,
    };
    setMessages((current) => [...current, userMessage]);
    setIsGenerating(true);
    setIllustrating(false);

    const prompt =
      trimmed ||
      `Buatkan slide Current → Target berdasarkan materi: ${attachments
        .map((file) => file.name)
        .join(", ")}`;

    try {
      const response = await fetch("/api/generate/slide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          materials: attachments.map((file) => ({
            name: file.name,
            textExcerpt: file.textExcerpt,
          })),
        }),
      });
      const payload = (await response.json()) as {
        presentation?: Presentation;
        error?: string;
      };
      if (!response.ok || !payload.presentation) {
        throw new Error(payload.error ?? "Gagal menyusun slide");
      }

      const slide = payload.presentation.slides[0];
      const materialNote =
        attachments.length > 0
          ? `Saya memakai ${attachments.length} file materi (${attachments
              .map((file) => file.name)
              .join(", ")}).`
          : "Saya memakai brief Anda.";
      const summary = slide
        ? `${slide.actionTitle}${
            slide.content.takeaway ? ` ${slide.content.takeaway}` : ""
          }`
        : "Slide Current → Target sudah disusun.";

      setPresentation(payload.presentation);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content: `${materialNote} ${summary}`,
          attachments: [],
        },
      ]);
      setShowArtifact(true);
      setSidebarOpen(false);
      setIllustrating(true);

      try {
        const imageResponse = await fetch("/api/generate/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presentation: payload.presentation }),
        });
        const imagePayload = (await imageResponse.json()) as {
          assets?: Presentation["assets"] | null;
        };
        if (imageResponse.ok && imagePayload.assets) {
          setPresentation({
            ...payload.presentation,
            assets: imagePayload.assets,
          });
        }
      } catch {
        // Slide stays visible without photos.
      } finally {
        setIllustrating(false);
      }
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Gagal menyusun slide";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: createId(),
          role: "assistant",
          content:
            "Slide tidak bisa disusun dari brief itu. Coba tulis topiknya lebih jelas, atau kirim lagi.",
          attachments: [],
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await send(draft);
  };

  const onKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await send(draft);
    }
  };

  const newChat = () => {
    pending.forEach((file) => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
    });
    setMessages([]);
    setPending([]);
    setDraft("");
    setError(null);
    setShowArtifact(false);
    setPresentation(null);
    setIllustrating(false);
    setIsGenerating(false);
  };

  const conversationTitle =
    messages.find((message) => message.role === "user" && message.content)?.content ??
    messages.find((message) => message.attachments.length)?.attachments[0]?.name ??
    "Percakapan baru";

  const empty = messages.length === 0 && !isGenerating;

  return (
    <div
      className="relative flex h-full min-h-0 bg-surface text-neutral"
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <aside
        className={`${
          sidebarOpen ? "flex" : "hidden"
        } w-[272px] shrink-0 flex-col border-r border-highlight bg-white`}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <p className="font-serif text-lg tracking-tight text-primary">Presentasi</p>
          <button
            type="button"
            className="rounded-lg p-1.5 text-neutral hover:bg-surface lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <Menu className="size-4" />
          </button>
        </div>
        <div className="px-3">
          <button
            type="button"
            onClick={newChat}
            className="flex w-full items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-interactive"
          >
            <SquarePen className="size-4" />
            Chat baru
          </button>
        </div>
        <div className="mt-6 px-3">
          <p className="px-1 text-[11px] font-semibold tracking-[0.14em] text-primary">
            PERCAKAPAN
          </p>
          {messages.length === 0 ? (
            <p className="mt-3 px-1 text-sm text-neutral/50">Belum ada chat.</p>
          ) : (
            <button
              type="button"
              className="mt-2 w-full truncate rounded-xl bg-surface px-3 py-2 text-left text-sm text-neutral ring-1 ring-highlight"
            >
              {conversationTitle}
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${showArtifact ? "lg:w-[380px] lg:shrink-0" : "flex-1"}`}>
          <header className="flex items-center gap-2 px-3 py-3 lg:px-6">
            <button
              type="button"
              className="rounded-lg p-2 text-neutral hover:bg-white hover:text-interactive"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Sidebar"
            >
              <Menu className="size-5" />
            </button>
            <span className="text-sm font-medium text-primary">Presentasi AI</span>
          </header>

          <div className="relative min-h-0 flex-1 overflow-y-auto">
            {empty ? (
              <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center px-4 pb-8">
                <h1 className="font-serif text-4xl tracking-tight text-primary sm:text-[2.6rem]">
                  Mau bikin presentasi apa?
                </h1>
                <p className="mt-3 max-w-md text-center text-[15px] leading-6 text-neutral/70">
                  Tulis brief, atau unggah materi sumber — PDF, PowerPoint, Word, Excel, teks, atau gambar.
                </p>
              </div>
            ) : (
              <div className="mx-auto w-full max-w-2xl px-4 py-6">
                {messages.map((message) => (
                  <article key={message.id} className="mb-8">
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-[22px] bg-white px-4 py-3 text-neutral ring-1 ring-highlight">
                          {message.attachments.length > 0 ? (
                            <div className="mb-2 grid gap-2">
                              {message.attachments.map((file) => (
                                <AttachmentChip key={file.id} attachment={file} />
                              ))}
                            </div>
                          ) : null}
                          {message.content ? (
                            <p className="whitespace-pre-wrap text-[15px] leading-6">
                              {message.content}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-[15px] leading-7 text-neutral">
                        {message.content}
                      </p>
                    )}
                  </article>
                ))}
                {isGenerating ? (
                  <p className="text-sm text-interactive">
                    {illustrating
                      ? "Menyusun infografis editorial…"
                      : "Menyusun kerangka slide…"}
                  </p>
                ) : null}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <div className="px-4 pb-5">
            <form
              onSubmit={onSubmit}
              className="mx-auto w-full max-w-2xl"
            >
              {empty ? (
                <div className="mb-3 flex flex-wrap justify-center gap-2">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter.label}
                      type="button"
                      onClick={() => {
                        setDraft(starter.prompt);
                        textareaRef.current?.focus();
                      }}
                      className="rounded-full border border-highlight bg-white px-3 py-1.5 text-xs text-neutral hover:border-interactive hover:bg-surface hover:text-interactive"
                    >
                      {starter.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div
                className={`rounded-[28px] border bg-white p-3 shadow-[0_8px_30px_rgba(37,86,188,0.08)] ${
                  dragging ? "border-interactive" : "border-highlight"
                }`}
              >
                {pending.length > 0 ? (
                  <div className="mb-2 grid gap-2 sm:grid-cols-2">
                    {pending.map((file) => (
                      <AttachmentChip
                        key={file.id}
                        attachment={file}
                        onRemove={() => {
                          if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
                          setPending((current) =>
                            current.filter((item) => item.id !== file.id),
                          );
                        }}
                      />
                    ))}
                  </div>
                ) : null}

                <textarea
                  ref={textareaRef}
                  value={draft}
                  rows={1}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    event.target.style.height = "auto";
                    event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
                  }}
                  onKeyDown={onKeyDown}
                  placeholder="Tulis brief, atau lampirkan materi sumber…"
                  className="block w-full resize-none bg-transparent px-2 py-2 text-[15px] leading-6 text-neutral outline-none placeholder:text-neutral/40"
                />

                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ACCEPT_ATTRIBUTE}
                      className="hidden"
                      onChange={(event) => {
                        const files = event.target.files ? [...event.target.files] : [];
                        void addFiles(files);
                        event.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full p-2 text-neutral hover:bg-surface hover:text-interactive"
                      aria-label="Lampirkan file"
                    >
                      <Paperclip className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-full p-2 text-neutral hover:bg-surface hover:text-interactive"
                      aria-label="Tambah materi"
                    >
                      <Plus className="size-5" />
                    </button>
                    <span className="hidden text-[11px] text-neutral/45 sm:inline">
                      PDF, PPTX, DOCX, Excel, teks, gambar
                    </span>
                  </div>
                  <button
                    type="submit"
                    disabled={isGenerating || (!draft.trim() && pending.length === 0)}
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-white hover:bg-interactive disabled:opacity-30"
                    aria-label="Kirim"
                  >
                    <ArrowUp className="size-4" />
                  </button>
                </div>
              </div>
              {error ? (
                <p className="mt-2 text-center text-xs text-primary">{error}</p>
              ) : (
                <p className="mt-2 text-center text-[11px] text-neutral/45">
                  M0 memakai layout TR-01. Materi terlampir ikut ke dalam percakapan.
                </p>
              )}
            </form>
          </div>
        </div>

        {showArtifact && presentation ? (
          <div className="h-[46vh] min-h-0 min-w-0 w-full flex-1 overflow-hidden border-t border-highlight bg-surface lg:h-auto lg:border-t-0 lg:border-l">
            <PresentationPanel
              presentation={presentation}
              illustrating={illustrating}
              onClose={() => setShowArtifact(false)}
            />
          </div>
        ) : null}
      </div>

      {dragging ? (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center bg-surface/80">
          <div className="rounded-3xl border border-dashed border-interactive bg-white px-8 py-6 text-center shadow-sm">
            <p className="font-medium text-primary">Lepaskan file materi di sini</p>
            <p className="mt-1 text-sm text-neutral/70">
              PDF, PPTX, DOCX, Excel, teks, atau gambar
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
