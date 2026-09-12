"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { Deck } from "@/lib/schema";
import { DeckViewer } from "@/components/DeckViewer";
import "@/app/deck.css";

const COST_KEY_PREFIX = "deck-cost:";

function storageKey(id: string): string {
  return `deck:${id}`;
}

type DeckSnapshot =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ok"; deck: Deck; cost?: number };

function readDeck(id: string | undefined): DeckSnapshot {
  if (!id) return { status: "missing" };
  try {
    const raw = sessionStorage.getItem(storageKey(id));
    if (!raw) return { status: "missing" };
    const deck = Deck.parse(JSON.parse(raw));
    const costRaw = sessionStorage.getItem(`${COST_KEY_PREFIX}${id}`);
    const costNum = costRaw ? Number(costRaw) : NaN;
    return {
      status: "ok",
      deck,
      cost: Number.isFinite(costNum) ? costNum : undefined,
    };
  } catch {
    return { status: "missing" };
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export default function DeckPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const snapshot = useSyncExternalStore(
    subscribe,
    () => readDeck(id),
    (): DeckSnapshot => ({ status: "loading" }),
  );

  const keyed = useMemo(() => snapshot, [snapshot]);

  if (keyed.status === "loading") {
    return (
      <div style={{ padding: "2rem", color: "#515151" }}>Loading deck…</div>
    );
  }

  if (keyed.status === "missing") {
    return (
      <div
        style={{
          height: "100%",
          overflow: "auto",
          padding: "2rem",
          background: "#e8eef3",
          color: "#1a1a1a",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Deck not found</h1>
        <p>
          No deck is stored for this id. Generate a deck from the home page
          first; the client saves it to <code>sessionStorage</code> under{" "}
          <code>deck:{"{id}"}</code>.
        </p>
      </div>
    );
  }

  return (
    <DeckViewer
      key={keyed.deck.title + keyed.deck.slides.length}
      deck={keyed.deck}
      cost={keyed.cost}
    />
  );
}
