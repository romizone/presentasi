import type { ReactNode } from "react";
import "@/app/deck.css";

/** Deck routes need scrollable body (root layout uses overflow-hidden). */
export default function DeckLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        background: "#e8eef3",
      }}
    >
      {children}
    </div>
  );
}
