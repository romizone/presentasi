"use client";

import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { Deck } from "@/lib/schema";
import { DeckViewer } from "@/components/DeckViewer";
import "@/app/deck.css";

/**
 * Print target for Playwright PDF capture.
 * Deck is read from sessionStorage (`deck:{id}`). The PDF exporter injects
 * that key via addInitScript before navigation so capture works without a
 * prior browser session.
 */

type Snapshot =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; deck: Deck };

function readPrintDeck(id: string | undefined): Snapshot {
  if (!id) return { status: "error", message: "Missing deck id" };
  try {
    const raw = sessionStorage.getItem(`deck:${id}`);
    if (!raw) return { status: "error", message: "Deck not in sessionStorage" };
    return { status: "ok", deck: Deck.parse(JSON.parse(raw)) };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Failed to load deck",
    };
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function DeckPrintPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const snapshot = useSyncExternalStore(
    subscribe,
    () => readPrintDeck(id),
    (): Snapshot => ({ status: "loading" }),
  );

  if (snapshot.status === "error") {
    return (
      <div style={{ padding: "2rem", color: "#1a1a1a" }}>
        <p>{snapshot.message}</p>
      </div>
    );
  }

  if (snapshot.status === "loading") {
    return (
      <div style={{ padding: "2rem", color: "#515151" }}>Preparing print…</div>
    );
  }

  return (
    <DeckViewer
      key={snapshot.deck.title + snapshot.deck.slides.length}
      deck={snapshot.deck}
      printMode
    />
  );
}
